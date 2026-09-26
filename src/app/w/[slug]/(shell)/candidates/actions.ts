"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  writeWorkspaceAuditEntry,
  WORKSPACE_AUDIT_ACTIONS,
} from "@/lib/workspace-audit";
import { upsertCandidateForWorkflow } from "@/lib/crm/auto-create";
import { cleanReminderPlan, type ReminderPlan } from "@/lib/take-home/reminders";
import { takeHomePassMarkOf } from "@/lib/take-home/pass-mark";
import { advanceCandidateStage } from "@/lib/crm/advance";
import { canMember, type Permission } from "@/lib/permissions";

/**
 * Authorize as a member of the workspace + return the workspace id.
 * Mirrors the pattern used in /w/[slug]/ats/actions.ts.
 *
 * Pass `permission` to additionally enforce a workspace permission via the
 * shared engine (IP-73) — a VIEWER should not be able to move stages or delete
 * candidates just because they can read the board.
 */
async function assertWorkspaceMember(slug: string, permission?: Permission) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");
  if (permission && !(await canMember(member, permission))) {
    throw new Error("You don't have permission to perform this action.");
  }
  return {
    workspaceId: workspace.id,
    role: member.role,
    member,
    // Actor context for audit writes (IP-37). Email snapshot lets rows stay
    // readable even after the actor account is deleted.
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Take-home dispatch — shared types + limits
 * ──────────────────────────────────────────────────────────────────────────
 * The legacy single-challenge dispatch (IP-35, `bulkDispatchTakeHomesAction`)
 * was retired in the IP-88 convergence: ALL take-home creation now flows
 * through `bulkCreateTakeHomeSessions` below (quick form and pipeline bulk
 * dialog send 1-question sessions). The recipient/result types stay because
 * the session path and its dialogs share them.
 */

const BULK_DISPATCH_MAX = 100;
const TIME_LIMIT_MIN = 15;
const TIME_LIMIT_MAX = 1440;
const DAYS_TO_EXPIRE_MIN = 1;
const DAYS_TO_EXPIRE_MAX = 90;

export type BulkRecipient = { name: string; email: string };

export type BulkDispatchPerRow =
  | { email: string; status: "dispatched"; tokenPreview: string; candidateId: string }
  | { email: string; status: "skipped"; reason: string }
  | { email: string; status: "errored"; reason: string };

export type BulkDispatchResult = {
  dispatched: number;
  skipped: number;
  errored: number;
  /** How many invite emails Resend accepted (IP-72). May be < dispatched if
   *  some recipients are on the suppression list or the transport failed. */
  emailed: number;
  details: BulkDispatchPerRow[];
  challengeTitle: string;
};

/* ──────────────────────────────────────────────────────────────────────────
 * Multi-question take-home sessions (IP-88)
 * ──────────────────────────────────────────────────────────────────────────
 * The take-home builder curates a SET of questions (DSA + prompt + playground)
 * and assigns to N selected candidates. Each candidate gets one async,
 * tokenized InterviewSession (type="take-home") sharing the curated set, with a
 * per-question timer map + a start deadline. Candidate upsert/dedup flows
 * through upsertCandidateForWorkflow, and invites email via the IP-72 batch
 * path. This is the ONLY take-home creation path (IP-88 convergence).
 */
const DEFAULT_QUESTION_MIN = 30;

export type TakeHomeCuration = {
  challengeIds: string[];
  playgroundIds: string[];
  promptScenarioIds: string[];
  /** sourceId -> minutes (per-question timer). Missing → DEFAULT_QUESTION_MIN. */
  perQuestionMinutes: Record<string, number>;
};

export type CreateTakeHomeSessionsInput = {
  title: string;
  curation: TakeHomeCuration;
  recipients: BulkRecipient[];
  daysToExpire: number;
  scenario?: string | null;
  /** The saved question set this send came from (already checked to be in this workspace). */
  templateId?: string | null;
  /** Pass mark for this send (already clamped). Omitted = the default. */
  passMark?: number | null;
  /** Automatic reminder schedule (already cleaned). Omitted = the column defaults. */
  reminders?: ReminderPlan | null;
};

export type CreateTakeHomeSessionsResult = {
  created: number;
  emailed: number;
  skipped: number;
  errored: number;
  details: BulkDispatchPerRow[];
};

export async function bulkCreateTakeHomeSessions(
  slug: string,
  input: CreateTakeHomeSessionsInput,
): Promise<CreateTakeHomeSessionsResult> {
  const { workspaceId, actorUserId, actorEmail } = await assertWorkspaceMember(
    slug,
    "takehome:create",
  );

  const challengeIds = [...new Set(input.curation.challengeIds ?? [])];
  const playgroundIds = [...new Set(input.curation.playgroundIds ?? [])];
  const promptScenarioIds = [...new Set(input.curation.promptScenarioIds ?? [])];
  const totalQuestions = challengeIds.length + playgroundIds.length + promptScenarioIds.length;

  if (totalQuestions === 0) throw new Error("Add at least one question to the take-home.");
  // Completion is keyed on coding-challenge attempts (the runner can't execute
  // playground/prompt questions yet), so a session without at least one
  // challenge could never reach "completed" — reject it up front.
  if (challengeIds.length === 0) {
    throw new Error(
      "Include at least one coding challenge — playground and prompt questions aren't candidate-runnable yet, so a take-home needs a challenge to be completable.",
    );
  }
  if (input.daysToExpire < DAYS_TO_EXPIRE_MIN || input.daysToExpire > DAYS_TO_EXPIRE_MAX) {
    throw new Error(`Days to expire must be between ${DAYS_TO_EXPIRE_MIN} and ${DAYS_TO_EXPIRE_MAX}.`);
  }
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
    throw new Error("Pick at least one candidate.");
  }
  if (input.recipients.length > BULK_DISPATCH_MAX) {
    throw new Error(`Capped at ${BULK_DISPATCH_MAX} candidates per send.`);
  }

  // Validate the auto-gradable sources exist (challenges + prompt scenarios).
  // Playgrounds are open snippets/templates — trusted as-is in Phase 1.
  const [foundChallenges, foundPrompts] = await Promise.all([
    challengeIds.length
      ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true } })
      : Promise.resolve([]),
    promptScenarioIds.length
      ? prisma.promptScenario.findMany({ where: { id: { in: promptScenarioIds } }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  if (foundChallenges.length !== challengeIds.length) throw new Error("One or more challenges no longer exist.");
  if (foundPrompts.length !== promptScenarioIds.length) throw new Error("One or more prompt challenges no longer exist.");

  // Per-question limits + the whole-session ceiling (sum of per-question budgets).
  const perQuestionMinutes: Record<string, number> = {};
  let totalMinutes = 0;
  for (const id of [...challengeIds, ...playgroundIds, ...promptScenarioIds]) {
    const m = Number(input.curation.perQuestionMinutes?.[id]) || DEFAULT_QUESTION_MIN;
    const clamped = Math.min(Math.max(m, TIME_LIMIT_MIN), TIME_LIMIT_MAX);
    perQuestionMinutes[id] = clamped;
    totalMinutes += clamped;
  }

  const sourceTypeCount = [challengeIds.length, playgroundIds.length, promptScenarioIds.length].filter((n) => n > 0).length;
  const sourceType =
    sourceTypeCount > 1
      ? "combined"
      : challengeIds.length
        ? "challenge"
        : playgroundIds.length
          ? "playground"
          : "prompt";

  // Recipient dedup + validation (same rules as bulk dispatch).
  const seenEmails = new Set<string>();
  const cleaned: BulkRecipient[] = [];
  const details: BulkDispatchPerRow[] = [];
  for (const r of input.recipients) {
    const email = (r.email ?? "").toLowerCase().trim();
    const name = (r.name ?? "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      details.push({ email: r.email ?? "(empty)", status: "errored", reason: "Invalid email" });
      continue;
    }
    if (!name) {
      details.push({ email, status: "errored", reason: "Missing name" });
      continue;
    }
    if (seenEmails.has(email)) {
      details.push({ email, status: "skipped", reason: "Duplicate in this batch" });
      continue;
    }
    seenEmails.add(email);
    cleaned.push({ name, email });
  }
  if (cleaned.length === 0) throw new Error("No valid candidates after dedup / validation.");

  const deadlineAt = new Date();
  deadlineAt.setDate(deadlineAt.getDate() + input.daysToExpire);

  const sessionsJson = {
    challengeIds: JSON.stringify(challengeIds),
    playgroundIds: JSON.stringify(playgroundIds),
    promptScenarioIds: JSON.stringify(promptScenarioIds),
    questionTimeLimitsJson: JSON.stringify(perQuestionMinutes),
  };

  const sendGroupId = crypto.randomUUID();
  const reminders = input.reminders ? cleanReminderPlan(input.reminders) : null;
  const createdRows: { name: string; email: string; token: string; sessionId: string }[] = [];
  // Pre-existing candidates to forward-advance to TAKE_HOME after commit (IP-69).
  const advanceIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const r of cleaned) {
      try {
        const { candidateId, created: isNew } = await upsertCandidateForWorkflow(
          {
            workspaceId,
            name: r.name,
            email: r.email,
            source: "take-home-dispatch",
            initialStage: "SCREENING",
          },
          tx,
        );
        if (!isNew) advanceIds.push(candidateId);

        const token = crypto.randomBytes(32).toString("hex");
        const created = await tx.interviewSession.create({
          data: {
            userId: actorUserId,
            workspaceId,
            candidateId,
            candidateName: r.name,
            title: input.title?.trim() || "Take-home assessment",
            type: "take-home",
            creatorRole: "interviewer",
            status: "scheduled",
            sourceType,
            challengeIds: sessionsJson.challengeIds,
            playgroundIds: sessionsJson.playgroundIds,
            promptScenarioIds: sessionsJson.promptScenarioIds,
            questionTimeLimitsJson: sessionsJson.questionTimeLimitsJson,
            scenario: input.scenario?.trim() || null,
            totalSec: totalMinutes * 60,
            shareToken: crypto.randomBytes(16).toString("hex"),
            candidateAccessToken: token,
            deadlineAt,
            takeHomeTemplateId: input.templateId ?? null,
            // One send shares its pass mark and reminder schedule; the group
            // id lets a later change reach every take-home in it.
            setupGroupId: sendGroupId,
            ...(input.passMark != null ? { takeHomePassMark: takeHomePassMarkOf(input.passMark) } : {}),
            ...(reminders
              ? {
                  reminderStartAfterHours: reminders.startAfterHours,
                  reminderBeforeDeadlineHours: reminders.beforeDeadlineHours,
                  remindersOff: reminders.off,
                }
              : {}),
          },
          select: { id: true },
        });

        details.push({ email: r.email, status: "dispatched", tokenPreview: token.slice(0, 8) + "…", candidateId });
        createdRows.push({ name: r.name, email: r.email, token, sessionId: created.id });
      } catch (err) {
        details.push({ email: r.email, status: "errored", reason: (err as Error).message?.slice(0, 200) ?? "unknown" });
      }
    }
  });

  // IP-69: forward-advance pre-existing candidates to TAKE_HOME (post-commit).
  for (const candidateId of advanceIds) {
    await advanceCandidateStage({
      workspaceId,
      candidateId,
      toStage: "SCREENING",
      source: "auto:take-home-session-dispatch",
      actorUserId,
      actorEmail,
    });
  }

  const created = details.filter((d) => d.status === "dispatched").length;
  const skipped = details.filter((d) => d.status === "skipped").length;
  const errored = details.filter((d) => d.status === "errored").length;

  // Batch invite emails (IP-72), after the transaction commits.
  let emailed = 0;
  if (createdRows.length > 0) {
    try {
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
      const { sendBulkTakeHomeSessionInvites } = await import("@/lib/take-home/emails");
      const res = await sendBulkTakeHomeSessionInvites({
        workspaceId,
        workspaceName: ws?.name ?? "your workspace",
        title: input.title?.trim() || "Take-home assessment",
        questionCount: totalQuestions,
        deadlineAt,
        rows: createdRows,
      });
      emailed = res.sent;
    } catch (err) {
      console.error("[take-home-sessions] invite emails failed:", err);
    }
  }

  void writeWorkspaceAuditEntry({
    workspaceId,
    actorUserId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.BULK_TAKE_HOME_DISPATCHED,
    targetType: "take-home-session-batch",
    targetId: null,
    meta: {
      title: input.title,
      questionCount: totalQuestions,
      created,
      emailed,
      skipped,
      errored,
      daysToExpire: input.daysToExpire,
      sampleRecipients: details.filter((d) => d.status === "dispatched").slice(0, 5).map((d) => d.email),
    },
  });

  revalidatePath(`/w/${slug}`);
  revalidatePath(`/w/${slug}/emails`);

  return { created, emailed, skipped, errored, details };
}

/**
 * Grouped take-home dispatch (IP-89). Each group pairs its own curated question
 * set with its own candidate subset, so one send can assign different questions
 * to different cohorts. Reuses bulkCreateTakeHomeSessions per group. Candidates
 * are deduped ACROSS groups (one group each) — a candidate listed in two groups
 * is kept in the first and skipped in later ones.
 */
export type TakeHomeGroupInput = {
  curation: TakeHomeCuration;
  recipients: BulkRecipient[];
};

export async function createTakeHomeGroups(
  slug: string,
  input: { title: string; daysToExpire: number; scenario?: string | null; groups: TakeHomeGroupInput[] },
): Promise<{ created: number; emailed: number; skipped: number; errored: number; groups: number }> {
  if (!Array.isArray(input.groups) || input.groups.length === 0) {
    throw new Error("Add at least one assignment group.");
  }
  const agg = { created: 0, emailed: 0, skipped: 0, errored: 0 };
  const seenAcross = new Set<string>();
  let dispatchedGroups = 0;

  for (const g of input.groups) {
    const totalQ =
      (g.curation.challengeIds?.length ?? 0) +
      (g.curation.playgroundIds?.length ?? 0) +
      (g.curation.promptScenarioIds?.length ?? 0);
    // Drop candidates already assigned in an earlier group (one group each).
    const recips = (g.recipients ?? []).filter((r) => {
      const k = (r.email ?? "").toLowerCase().trim();
      if (!k || seenAcross.has(k)) return false;
      seenAcross.add(k);
      return true;
    });
    if (totalQ === 0 || recips.length === 0) continue;

    const res = await bulkCreateTakeHomeSessions(slug, {
      title: input.title,
      curation: g.curation,
      recipients: recips,
      daysToExpire: input.daysToExpire,
      scenario: input.scenario ?? null,
    });
    agg.created += res.created;
    agg.emailed += res.emailed;
    agg.skipped += res.skipped;
    agg.errored += res.errored;
    dispatchedGroups++;
  }

  if (dispatchedGroups === 0) {
    throw new Error("Every group needs at least one question and one candidate.");
  }
  return { ...agg, groups: dispatchedGroups };
}


