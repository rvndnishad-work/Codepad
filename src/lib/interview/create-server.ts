/**
 * Creates one InterviewSession. Shared by POST /api/interview (the practice
 * builder) and the workspace interview wizard, so both link candidates,
 * move them to Screening and send the invite the same way. Server-only.
 */
import { customAlphabet, nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { templatesById } from "@/lib/templates";
import { upsertCandidateForWorkflow } from "@/lib/crm/auto-create";
import { advanceCandidateStage } from "@/lib/crm/advance";

export type CreateInterviewInput = {
  /** Session owner. For live interviews this is the host who runs it. */
  ownerId: string;
  /** The person creating it, when that is not the host. */
  actor: { id: string; email: string | null };
  title: string;
  type: "mock" | "live";
  creatorRole: "interviewer" | "candidate";
  challengeIds: string[];
  playgroundIds: string[];
  promptScenarioIds: string[];
  /** Zero rounds are fine (questions picked later, or no set questions). */
  allowEmpty?: boolean;
  /** Copy every playground into a fresh editor for this room. */
  freshPlaygrounds?: boolean;
  scenario?: string | null;
  totalSec: number;
  stackJson?: string | null;
  scheduledAt?: Date | null;
  workspaceId?: string | null;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  sendInvite?: boolean;
  wizard?: {
    format: string;
    panelIds: string[];
    questionPlan: "set" | "later" | "open";
    questionsOwnerId: string | null;
    questionsNote: string | null;
    guideTemplateId: string | null;
    interviewerBrief: string | null;
    setupGroupId: string | null;
    toolsJson?: string | null;
  };
};

export type CreateInterviewResult =
  | { ok: true; id: string; shareToken: string; shortCode: string | null; candidateId: string | null }
  | { ok: false; status: number; error: string };

/**
 * Resolve requested rounds to ids the room can load, keeping order.
 * Playgrounds must belong to the owner (the room loads them by owner), so
 * starter templates and the actor's own snippets are copied to the owner;
 * the owner's snippets (including earlier copies) are used as they are.
 */
export async function resolveRounds(input: {
  ownerId: string;
  actorId: string;
  workspaceId: string | null;
  challengeIds: string[];
  playgroundIds: string[];
  promptScenarioIds: string[];
  /**
   * Owner snippets that may be used as they are. Anything else is copied so
   * each room gets its own editor. Omitted: every owner snippet is reused.
   */
  reuse?: Set<string>;
}): Promise<{ challengeIds: string[]; playgroundIds: string[]; promptScenarioIds: string[] }> {
  const visible = input.workspaceId ? [{ published: true, workspaceId: null }, { workspaceId: input.workspaceId }] : [{ published: true }];

  let challengeIds: string[] = [];
  if (input.challengeIds.length) {
    const rows = await prisma.challenge.findMany({ where: { id: { in: input.challengeIds }, OR: visible }, select: { id: true } });
    const ok = new Set(rows.map((r) => r.id));
    challengeIds = input.challengeIds.filter((id) => ok.has(id));
  }

  let promptScenarioIds: string[] = [];
  if (input.promptScenarioIds.length) {
    const rows = await prisma.promptScenario.findMany({ where: { id: { in: input.promptScenarioIds }, OR: visible }, select: { id: true } });
    const ok = new Set(rows.map((r) => r.id));
    promptScenarioIds = input.promptScenarioIds.filter((id) => ok.has(id));
  }

  const playgroundIds: string[] = [];
  if (input.playgroundIds.length) {
    const snippetIds = input.playgroundIds.filter((id) => !id.startsWith("template:"));
    const owned = snippetIds.length
      ? await prisma.snippet.findMany({
          where: { id: { in: snippetIds }, userId: { in: [input.actorId, input.ownerId] } },
          select: { id: true, userId: true, title: true, template: true, files: true },
        })
      : [];
    const byId = new Map(owned.map((s) => [s.id, s]));
    for (const reqId of input.playgroundIds) {
      if (reqId.startsWith("template:")) {
        const t = templatesById[reqId.slice("template:".length)];
        if (!t) continue;
        const s = await prisma.snippet.create({
          data: { slug: nanoid(10), title: `${t.title} Session`, template: t.id, files: JSON.stringify(t.files), visibility: "private", userId: input.ownerId },
          select: { id: true },
        });
        playgroundIds.push(s.id);
        continue;
      }
      const src = byId.get(reqId);
      if (!src) continue;
      if (src.userId === input.ownerId && (!input.reuse || input.reuse.has(src.id))) {
        playgroundIds.push(src.id);
      } else {
        const copy = await prisma.snippet.create({
          data: { slug: nanoid(10), title: src.title, template: src.template, files: src.files, visibility: "private", userId: input.ownerId },
          select: { id: true },
        });
        playgroundIds.push(copy.id);
      }
    }
  }

  return { challengeIds, playgroundIds, promptScenarioIds };
}

async function uniqueShortCode(): Promise<string> {
  const gen = customAlphabet("0123456789", 4);
  for (let i = 0; i < 10; i++) {
    const code = gen();
    const exists = await prisma.interviewSession.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  // The 4-digit space is crowded; fall back to 6 characters.
  return nanoid(6).toUpperCase();
}

export function sourceTypeOf(r: { challengeIds: string[]; playgroundIds: string[]; promptScenarioIds: string[] }): "challenge" | "playground" | "prompt" | "combined" {
  const kinds = [r.challengeIds.length && "challenge", r.playgroundIds.length && "playground", r.promptScenarioIds.length && "prompt"].filter(Boolean) as ("challenge" | "playground" | "prompt")[];
  return kinds.length === 1 ? kinds[0] : "combined";
}

export async function createInterviewSession(input: CreateInterviewInput): Promise<CreateInterviewResult> {
  const workspaceId = input.workspaceId ?? null;
  const rounds = await resolveRounds({
    ownerId: input.ownerId,
    actorId: input.actor.id,
    workspaceId,
    challengeIds: input.challengeIds,
    playgroundIds: input.playgroundIds,
    promptScenarioIds: input.promptScenarioIds,
    reuse: input.freshPlaygrounds ? new Set() : undefined,
  });
  const total = rounds.challengeIds.length + rounds.playgroundIds.length + rounds.promptScenarioIds.length;
  if (total === 0 && !input.allowEmpty) return { ok: false, status: 400, error: "no valid rounds selected" };

  // Candidate linkage: email is the dedup key. A name without an email gets
  // no CRM row; the name stays on the session.
  let candidateId = input.candidateId ?? null;
  if (workspaceId) {
    if (candidateId) {
      const exists = await prisma.candidate.findFirst({ where: { id: candidateId, workspaceId }, select: { id: true } });
      if (!exists) return { ok: false, status: 400, error: "Candidate not found in this workspace" };
    } else if (input.candidateEmail?.trim()) {
      const { candidateId: linked } = await upsertCandidateForWorkflow({
        workspaceId,
        name: input.candidateName?.trim() || "Candidate",
        email: input.candidateEmail.trim().toLowerCase(),
        source: "interview-schedule",
        initialStage: "SCREENING",
      });
      candidateId = linked;
    }
    if (candidateId && input.type === "live") {
      await advanceCandidateStage({
        workspaceId,
        candidateId,
        toStage: "SCREENING",
        source: "auto:interview-created",
        actorUserId: input.actor.id,
        actorEmail: input.actor.email,
      });
    }
  }

  let candidateName = input.candidateName?.trim() || null;
  let inviteEmail = input.candidateEmail?.trim().toLowerCase() || null;
  if (candidateId && (!candidateName || !inviteEmail)) {
    const row = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { name: true, email: true } });
    candidateName ??= row?.name ?? null;
    inviteEmail ??= row?.email ?? null;
  }

  const w = input.wizard;
  const created = await prisma.interviewSession.create({
    data: {
      userId: input.ownerId,
      title: input.title,
      candidateName,
      type: input.type,
      sourceType: total === 0 ? "combined" : sourceTypeOf(rounds),
      challengeIds: JSON.stringify(rounds.challengeIds),
      playgroundIds: JSON.stringify(rounds.playgroundIds),
      promptScenarioIds: JSON.stringify(rounds.promptScenarioIds),
      scenario: input.scenario ?? null,
      totalSec: input.totalSec,
      shareToken: nanoid(24),
      shortCode: await uniqueShortCode(),
      status: "scheduled",
      creatorRole: input.creatorRole,
      stackJson: input.stackJson ?? null,
      scheduledAt: input.scheduledAt ?? null,
      workspaceId,
      candidateId,
      ...(w
        ? {
            format: w.format,
            panelJson: w.panelIds.length ? JSON.stringify(w.panelIds) : null,
            questionPlan: w.questionPlan,
            questionsOwnerId: w.questionPlan === "later" ? w.questionsOwnerId : null,
            questionsNote: w.questionPlan === "later" ? w.questionsNote : null,
            guideTemplateId: w.guideTemplateId,
            interviewerBrief: w.interviewerBrief,
            createdById: input.actor.id === input.ownerId ? null : input.actor.id,
            setupGroupId: w.setupGroupId,
            toolsJson: w.toolsJson ?? null,
          }
        : {}),
    },
    select: { id: true, shareToken: true, shortCode: true },
  });

  // Tell the candidate. Fire-and-forget: the session exists either way and
  // the recruiter can still copy the link.
  if (workspaceId && input.type === "live" && inviteEmail && input.sendInvite !== false) {
    void sendInvite({ workspaceId, session: created, email: inviteEmail, candidateName, title: input.title, scheduledAt: input.scheduledAt ?? null, totalSec: input.totalSec, actorId: input.actor.id });
  }

  return { ok: true, id: created.id, shareToken: created.shareToken, shortCode: created.shortCode, candidateId };
}

async function sendInvite(a: {
  workspaceId: string;
  session: { id: string; shareToken: string; shortCode: string | null };
  email: string;
  candidateName: string | null;
  title: string;
  scheduledAt: Date | null;
  totalSec: number;
  actorId: string;
}) {
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: a.workspaceId }, select: { name: true, slug: true } });
    const { sendEmail } = await import("@/lib/email");
    const { candidateRoomUrl } = await import("./room-server");
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    // Workspace interviews open the workspace room with a private, expiring
    // link. No short code: four digits are too easy to guess.
    const roomUrl = ws ? candidateRoomUrl({ id: a.session.id, shareToken: a.session.shareToken, scheduledAt: a.scheduledAt, totalSec: a.totalSec }, ws.slug) : null;
    const res = await sendEmail({
      template: "interview-invite",
      to: a.email,
      props: {
        candidateName: a.candidateName || "there",
        workspaceName: ws?.name ?? "the team",
        title: a.title,
        joinUrl: roomUrl ?? `${baseUrl}/interview/${a.session.id}?token=${a.session.shareToken}`,
        shortCode: roomUrl ? null : a.session.shortCode,
        scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : null,
        durationMin: Math.round(a.totalSec / 60),
      },
      workspaceId: a.workspaceId,
      sessionId: a.session.id,
      idempotencyKey: `interview-invite:${a.session.id}`,
    });
    if (!res.sent) console.warn(`[interview-invite] ${a.email}: ${res.reason}`);
    const { notifyInterviewScheduled } = await import("@/lib/notifications/triggers");
    await notifyInterviewScheduled({
      sessionId: a.session.id,
      shareToken: a.session.shareToken,
      title: a.title,
      type: "live",
      candidateEmail: a.email,
      actorId: a.actorId,
    });
  } catch (err) {
    console.error("[interview-invite] dispatch failed:", err);
  }
}
