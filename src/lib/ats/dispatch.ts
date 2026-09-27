/**
 * Sends the screening an ATS job is mapped to, for one imported candidate.
 * Server only. Uses the same session builders and invite emails as the
 * recruiter-facing flows, so an imported candidate gets the normal invite.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { effectivePlanAllowsAiScreening } from "@/lib/billing/trial";
import { appOrigin } from "@/lib/interview/links";
import { advanceCandidateStage } from "@/lib/crm/advance";
import { parseTemplateItems } from "@/lib/take-home/status";
import type { RoundSpecInput } from "@/lib/ai-interview/rounds";
import { SCREENING_KIND_LABELS } from "./settings";
import { loadWorkspaceSettings } from "@/lib/workspace/settings-server";
import { screeningStartValues } from "@/lib/workspace/settings";
import { takeHomePassMarkOf } from "@/lib/take-home/pass-mark";

export type DispatchResult = { ok: true; sessionId: string; emailed: boolean; reused?: boolean } | { ok: false; error: string };

/** Used only when the workspace settings cannot be read. */
const TAKE_HOME_DAYS = 7;
const MIN_QUESTION_MINUTES = 15;
const MAX_QUESTION_MINUTES = 1440;

/**
 * The person recorded as the creator of take-home sessions made by an import:
 * whoever connected the ATS, else the workspace owner.
 */
async function systemActor(workspaceId: string): Promise<{ userId: string; email: string | null } | null> {
  const integration = await prisma.atsIntegration.findUnique({ where: { workspaceId }, select: { connectedById: true } });
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true, role: true, user: { select: { email: true } } },
  });
  const pick =
    members.find((m) => m.userId === integration?.connectedById) ??
    members.find((m) => m.role === "OWNER") ??
    members.find((m) => m.role === "ADMIN") ??
    members[0];
  return pick ? { userId: pick.userId, email: pick.user.email } : null;
}

async function sendAiScreening(
  ws: { id: string; name: string; planName: string; trialEndsAt: Date | null; stripeSubscriptionId: string | null },
  batchId: string,
  candidate: { id: string; name: string; email: string },
): Promise<DispatchResult> {
  if (!effectivePlanAllowsAiScreening(ws)) return { ok: false, error: "This workspace plan does not include AI screening." };
  const batch = await prisma.aIScreeningBatch.findFirst({
    where: { id: batchId, workspaceId: ws.id },
    include: { roundSpecs: { orderBy: { order: "asc" } } },
  });
  if (!batch) return { ok: false, error: "The mapped AI screening no longer exists. Pick another one in the job mapping." };
  if (!batch.roundSpecs.length) return { ok: false, error: "The mapped AI screening has no rounds." };

  const existing = await prisma.aIInterviewSession.findFirst({
    where: { batchId: batch.id, workspaceId: ws.id, OR: [{ candidateId: candidate.id }, { candidateEmail: candidate.email }] },
    select: { id: true },
  });
  if (existing) return { ok: true, sessionId: existing.id, emailed: false, reused: true };

  const [{ loadCreditSummary }, { creditCheck, expiryDate, DEFAULT_EXPIRY_DAYS }, create, { parseTheorySettings }, { deliverInvite }] =
    await Promise.all([
      import("@/lib/ai-interview/console-server"),
      import("@/lib/ai-interview/console"),
      import("@/lib/ai-interview/screening-create"),
      import("@/lib/ai-interview/theory"),
      import("@/lib/ai-interview/invites"),
    ]);

  const credits = await loadCreditSummary(ws.id);
  const check = creditCheck(credits.balance, credits.held, 1, batch.engagementLevel);
  if (!check.ok) return { ok: false, error: "Not enough AI credits to send this screening. Buy credits, then send it again." };

  const rounds: RoundSpecInput[] = batch.roundSpecs.map((r) => ({
    paradigm: r.paradigm as RoundSpecInput["paradigm"],
    language: r.language ?? undefined,
    frameworkLabel: r.frameworkLabel ?? undefined,
    sourceKind: r.sourceKind as RoundSpecInput["sourceKind"],
    sourceId: r.sourceId ?? undefined,
    templateId: r.templateId ?? undefined,
    estimatedMinutes: r.estimatedMinutes,
    ...(r.paradigm === "theory" ? { theory: parseTheorySettings(r.theoryJson) } : {}),
  }));
  let theoryQuestions;
  try {
    theoryQuestions = await create.loadTheoryQuestions(rounds, ws.id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "A questionnaire could not be loaded." };
  }
  const starters = await create.snapshotStarters(rounds, ws.id);
  const sessions = await prisma.$transaction((tx) =>
    create.createSessions(tx, {
      workspaceId: ws.id,
      batchId: batch.id,
      positionTitle: batch.positionTitle,
      candidates: [candidate],
      rounds,
      starters,
      theoryQuestions,
      settings: {
        engagementLevel: batch.engagementLevel,
        expiresAt: expiryDate(new Date(), batch.expiresAfterDays ?? DEFAULT_EXPIRY_DAYS),
        maxExtensions: 1,
        extensionMinutes: 5,
      },
    }),
  );
  const session = sessions[0];
  const delivery = await deliverInvite(session, ws, await appOrigin());
  return { ok: true, sessionId: session.id, emailed: delivery.sent };
}

async function sendTakeHome(
  ws: { id: string; name: string },
  templateId: string,
  candidate: { id: string; name: string; email: string },
): Promise<DispatchResult> {
  const template = await prisma.takeHomeTemplate.findFirst({ where: { id: templateId, workspaceId: ws.id } });
  if (!template) return { ok: false, error: "The mapped take home template no longer exists. Pick another one in the job mapping." };
  const items = parseTemplateItems(template.itemsJson);
  const found = items.length
    ? await prisma.challenge.findMany({ where: { id: { in: items.map((i) => i.challengeId) } }, select: { id: true } })
    : [];
  const live = items.filter((i) => found.some((f) => f.id === i.challengeId));
  if (!live.length) return { ok: false, error: "The mapped take home template has no questions left." };

  const existing = await prisma.interviewSession.findFirst({
    where: { workspaceId: ws.id, type: "take-home", takeHomeTemplateId: template.id, candidateId: candidate.id, status: { in: ["scheduled", "in_progress"] } },
    select: { id: true },
  });
  if (existing) return { ok: true, sessionId: existing.id, emailed: false, reused: true };

  const actor = await systemActor(ws.id);
  if (!actor) return { ok: false, error: "This workspace has no members to send the take home from." };

  const limits: Record<string, number> = {};
  let total = 0;
  for (const i of live) {
    const m = Math.min(Math.max(Number(i.minutes) || 30, MIN_QUESTION_MINUTES), MAX_QUESTION_MINUTES);
    limits[i.challengeId] = m;
    total += m;
  }
  // A take-home sent from an ATS starts from the workspace's screening defaults.
  const settings = await loadWorkspaceSettings(ws.id);
  const start = settings ? screeningStartValues(settings).takeHome : null;
  const deadlineAt = new Date(Date.now() + (start?.expiresInDays ?? TAKE_HOME_DAYS) * 86_400_000);
  const token = crypto.randomBytes(32).toString("hex");
  const session = await prisma.interviewSession.create({
    data: {
      userId: actor.userId,
      workspaceId: ws.id,
      candidateId: candidate.id,
      candidateName: candidate.name,
      title: template.name,
      type: "take-home",
      creatorRole: "interviewer",
      status: "scheduled",
      sourceType: "challenge",
      challengeIds: JSON.stringify(live.map((i) => i.challengeId)),
      playgroundIds: "[]",
      promptScenarioIds: "[]",
      questionTimeLimitsJson: JSON.stringify(limits),
      totalSec: total * 60,
      shareToken: crypto.randomBytes(16).toString("hex"),
      candidateAccessToken: token,
      deadlineAt,
      takeHomeTemplateId: template.id,
      ...(start
        ? {
            takeHomePassMark: takeHomePassMarkOf(start.passMark),
            reminderStartAfterHours: start.reminders.startAfterHours,
            reminderBeforeDeadlineHours: start.reminders.beforeDeadlineHours,
            remindersOff: start.reminders.off,
          }
        : {}),
    },
    select: { id: true },
  });

  let emailed = false;
  try {
    const { sendBulkTakeHomeSessionInvites } = await import("@/lib/take-home/emails");
    const res = await sendBulkTakeHomeSessionInvites({
      workspaceId: ws.id,
      workspaceName: ws.name,
      title: template.name,
      questionCount: live.length,
      deadlineAt,
      rows: [{ name: candidate.name, email: candidate.email, token, sessionId: session.id }],
    });
    emailed = res.sent > 0;
  } catch (err) {
    console.error("[ats] take home invite email failed:", err);
  }
  return { ok: true, sessionId: session.id, emailed };
}

/**
 * Sends the mapped screening for one request and records the outcome on it.
 * Returns what happened; never throws.
 */
export async function sendRequestScreening(requestId: string, opts: { actorUserId?: string | null; actorEmail?: string | null } = {}): Promise<DispatchResult> {
  try {
    const req = await prisma.atsTestRequest.findUnique({
      where: { id: requestId },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        workspace: { select: { id: true, name: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true } },
      },
    });
    if (!req) return { ok: false, error: "That request no longer exists." };
    if (req.sessionId) return { ok: true, sessionId: req.sessionId, emailed: false, reused: true };
    const email = req.candidate.email?.trim().toLowerCase();
    if (!email) return fail(req.id, "This candidate has no email address.");
    if (!req.screeningId || (req.screeningKind !== "ai" && req.screeningKind !== "takehome")) {
      return fail(req.id, "This job is not mapped to a screening.");
    }
    const person = { id: req.candidate.id, name: req.candidate.name, email };
    const res =
      req.screeningKind === "ai"
        ? await sendAiScreening(req.workspace, req.screeningId, person)
        : await sendTakeHome(req.workspace, req.screeningId, person);
    if (!res.ok) return fail(req.id, res.error);

    await prisma.atsTestRequest.update({
      where: { id: req.id },
      data: { sessionId: res.sessionId, status: "sent", sentAt: new Date() },
    });
    await advanceCandidateStage({
      workspaceId: req.workspaceId,
      candidateId: req.candidateId,
      toStage: "SCREENING",
      source: `auto:${req.provider}-import`,
      actorUserId: opts.actorUserId ?? null,
      actorEmail: opts.actorEmail ?? null,
    });
    return res;
  } catch (err) {
    console.error(`[ats] sending screening for request ${requestId} failed:`, err);
    return fail(requestId, "Something went wrong while sending the screening.");
  }
}

async function fail(requestId: string, error: string): Promise<DispatchResult> {
  await prisma.atsTestRequest
    .update({ where: { id: requestId }, data: { status: "failed" } })
    .catch(() => undefined);
  return { ok: false, error };
}

export function screeningNoun(kind: string): string {
  return kind === "ai" ? SCREENING_KIND_LABELS.ai : kind === "takehome" ? "take home" : "screening";
}
