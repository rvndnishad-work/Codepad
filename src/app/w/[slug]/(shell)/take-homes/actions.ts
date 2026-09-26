"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { parseIds, parseTemplateItems, DEFAULT_QUESTION_MINUTES, type TemplateItem } from "@/lib/take-home/status";
import { bulkCreateTakeHomeSessions, type BulkRecipient } from "../candidates/actions";
import { takeHomePassMarkOf } from "@/lib/take-home/pass-mark";
import { cleanReminderPlan, describeReminderPlan, type ReminderPlan } from "@/lib/take-home/reminders";

/**
 * Take home actions: invite management (remind, extend, cancel, resend),
 * sending from the composer, and saved templates. Every action checks
 * `takehome:create`, scopes rows to the workspace and writes an audit row.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

const fail = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof ActionError || err instanceof Error ? err.message : "Something went wrong.",
});

const MAX_EXTEND_DAYS = 30;
const REMIND_COOLDOWN_MS = 60 * 60 * 1000;

async function assertWriter(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new ActionError("You are signed out.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, name: true, members: { select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) throw new ActionError("Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member || !(await canMember(member, "takehome:create"))) {
    throw new ActionError("You don't have permission to manage take-homes.");
  }
  return { workspace, userId: session.user.id, email: session.user.email ?? null };
}

type Writer = Awaited<ReturnType<typeof assertWriter>>;

function audit(w: Writer, action: string, targetType: string, targetId: string | null, meta: Record<string, unknown>) {
  void writeWorkspaceAuditEntry({ workspaceId: w.workspace.id, actorUserId: w.userId, actorEmail: w.email, action, targetType, targetId, meta });
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}/take-homes`, "layout");
  revalidatePath(`/w/${slug}`, "layout");
}

/** A take-home in this workspace, from either table. */
async function findTakeHome(workspaceId: string, id: string) {
  const s = await prisma.interviewSession.findFirst({
    where: { id, workspaceId, type: "take-home" },
    select: {
      id: true,
      title: true,
      status: true,
      deadlineAt: true,
      reminderSentAt: true,
      candidateName: true,
      candidateAccessToken: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      candidate: { select: { email: true } },
    },
  });
  if (s) return { kind: "session" as const, s };
  const a = await prisma.takeHomeAssignment.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      status: true,
      token: true,
      expiresAt: true,
      reminderSentAt: true,
      candidateName: true,
      candidateEmail: true,
      challenge: { select: { title: true } },
    },
  });
  if (a) return { kind: "legacy" as const, a };
  throw new ActionError("That take-home no longer exists.");
}

async function startedCount(sessionId: string) {
  return prisma.challengeAttempt.count({ where: { sessionId, status: { in: ["passed", "failed"] } } });
}

/** Email the candidate a reminder to start. */
export async function remindTakeHomeAction(slug: string, id: string): Promise<Result> {
  try {
    const w = await assertWriter(slug);
    const t = await findTakeHome(w.workspace.id, id);
    const now = Date.now();
    const { sendTakeHomeReminder, sendTakeHomeSessionReminder } = await import("@/lib/take-home/emails");
    if (t.kind === "session") {
      const { s } = t;
      if (s.status !== "scheduled" && s.status !== "in_progress") throw new ActionError("Only open take-homes can be reminded.");
      if (!s.deadlineAt || s.deadlineAt.getTime() <= now) throw new ActionError("The deadline has passed. Extend it first.");
      if (!s.candidate?.email || !s.candidateAccessToken) throw new ActionError("This candidate has no email address.");
      if (s.reminderSentAt && now - s.reminderSentAt.getTime() < REMIND_COOLDOWN_MS) throw new ActionError("A reminder went out in the last hour.");
      const res = await sendTakeHomeSessionReminder({
        candidateName: s.candidateName ?? "there",
        candidateEmail: s.candidate.email,
        title: s.title,
        workspaceName: w.workspace.name,
        token: s.candidateAccessToken,
        deadlineAt: s.deadlineAt,
        hoursLeft: Math.max(1, Math.ceil((s.deadlineAt.getTime() - now) / 3_600_000)),
        workspaceId: w.workspace.id,
        sessionId: s.id,
        manual: true,
      });
      if (!res.sent) throw new ActionError(`The reminder could not be sent${res.reason ? `: ${res.reason}` : "."}`);
      await prisma.interviewSession.update({ where: { id: s.id }, data: { reminderSentAt: new Date() } });
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_REMINDED, "interviewSession", s.id, { candidateName: s.candidateName });
    } else {
      const { a } = t;
      if (a.status !== "PENDING" && a.status !== "ACTIVE") throw new ActionError("Only open take-homes can be reminded.");
      if (a.expiresAt.getTime() <= now) throw new ActionError("The deadline has passed. Extend it first.");
      if (a.reminderSentAt && now - a.reminderSentAt.getTime() < REMIND_COOLDOWN_MS) throw new ActionError("A reminder went out in the last hour.");
      const res = await sendTakeHomeReminder({
        candidateName: a.candidateName,
        candidateEmail: a.candidateEmail,
        challengeTitle: a.challenge.title,
        workspaceName: w.workspace.name,
        token: a.token,
        expiresAt: a.expiresAt,
        hoursLeft: Math.max(1, Math.ceil((a.expiresAt.getTime() - now) / 3_600_000)),
        workspaceId: w.workspace.id,
        takeHomeId: a.id,
        manual: true,
      });
      if (!res.sent) throw new ActionError(`The reminder could not be sent${res.reason ? `: ${res.reason}` : "."}`);
      await prisma.takeHomeAssignment.update({ where: { id: a.id }, data: { reminderSentAt: new Date() } });
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_REMINDED, "takeHomeAssignment", a.id, { candidateName: a.candidateName });
    }
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Push the deadline out by `days`, counted from now when it already passed.
 * An expired, unstarted take-home opens again.
 */
export async function extendTakeHomeAction(slug: string, id: string, days: number): Promise<Result<{ deadlineAt: string }>> {
  try {
    const w = await assertWriter(slug);
    const n = Math.round(Number(days));
    if (!Number.isFinite(n) || n < 1 || n > MAX_EXTEND_DAYS) throw new ActionError(`Extend by 1 to ${MAX_EXTEND_DAYS} days.`);
    const t = await findTakeHome(w.workspace.id, id);
    const from = (d: Date | null) => Math.max(Date.now(), d?.getTime() ?? 0);
    let deadlineAt: Date;
    if (t.kind === "session") {
      const { s } = t;
      if (s.status === "completed" || s.status === "cancelled") throw new ActionError("This take-home is closed.");
      deadlineAt = new Date(from(s.deadlineAt) + n * 86_400_000);
      await prisma.interviewSession.update({
        where: { id: s.id },
        data: {
          deadlineAt,
          reminderSentAt: null,
          ...(s.status === "expired" || s.status === "abandoned" ? { status: (await startedCount(s.id)) ? "in_progress" : "scheduled" } : {}),
        },
      });
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_EXTENDED, "interviewSession", s.id, { candidateName: s.candidateName, days: n });
    } else {
      const { a } = t;
      if (a.status === "SUBMITTED" || a.status === "CANCELLED") throw new ActionError("This take-home is closed.");
      deadlineAt = new Date(from(a.expiresAt) + n * 86_400_000);
      await prisma.takeHomeAssignment.update({
        where: { id: a.id },
        data: { expiresAt: deadlineAt, reminderSentAt: null, ...(a.status === "EXPIRED" ? { status: "PENDING" } : {}) },
      });
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_EXTENDED, "takeHomeAssignment", a.id, { candidateName: a.candidateName, days: n });
    }
    refresh(slug);
    return { ok: true, deadlineAt: deadlineAt.toISOString() };
  } catch (err) {
    return fail(err);
  }
}

/** Close an unsubmitted take-home. The candidate link stops working. */
export async function cancelTakeHomeAction(slug: string, id: string): Promise<Result> {
  try {
    const w = await assertWriter(slug);
    const t = await findTakeHome(w.workspace.id, id);
    if (t.kind === "session") {
      const res = await prisma.interviewSession.updateMany({
        where: { id: t.s.id, status: { notIn: ["completed", "cancelled"] } },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
      if (!res.count) throw new ActionError("Submitted take-homes cannot be cancelled.");
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_CANCELLED, "interviewSession", t.s.id, { candidateName: t.s.candidateName });
    } else {
      const res = await prisma.takeHomeAssignment.updateMany({
        where: { id: t.a.id, status: { notIn: ["SUBMITTED", "CANCELLED"] } },
        data: { status: "CANCELLED" },
      });
      if (!res.count) throw new ActionError("Submitted take-homes cannot be cancelled.");
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_CANCELLED, "takeHomeAssignment", t.a.id, { candidateName: t.a.candidateName });
    }
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Send the invite email again, with the same link. */
export async function resendTakeHomeAction(slug: string, id: string): Promise<Result> {
  try {
    const w = await assertWriter(slug);
    const t = await findTakeHome(w.workspace.id, id);
    const { sendBulkTakeHomeSessionInvites } = await import("@/lib/take-home/emails");
    if (t.kind === "session") {
      const { s } = t;
      if (s.status !== "scheduled" && s.status !== "in_progress") throw new ActionError("Only open take-homes can be resent.");
      if (!s.deadlineAt || s.deadlineAt.getTime() <= Date.now()) throw new ActionError("The deadline has passed. Extend it first.");
      if (!s.candidate?.email || !s.candidateAccessToken) throw new ActionError("This candidate has no email address.");
      const res = await sendBulkTakeHomeSessionInvites({
        workspaceId: w.workspace.id,
        workspaceName: w.workspace.name,
        title: s.title,
        questionCount: parseIds(s.challengeIds).length + parseIds(s.playgroundIds).length + parseIds(s.promptScenarioIds).length,
        deadlineAt: s.deadlineAt,
        rows: [{ name: s.candidateName ?? "there", email: s.candidate.email, token: s.candidateAccessToken, sessionId: s.id }],
      });
      if (!res.sent) throw new ActionError("The invite could not be sent.");
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_INVITE_RESENT, "interviewSession", s.id, { candidateName: s.candidateName });
    } else {
      // Old single-question invites dedupe their email by id, so a resend
      // would be dropped. Their link can still be copied.
      throw new ActionError("Old single-question invites cannot be resent. Copy the link instead.");
    }
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ── Pass mark and reminders ─────────────────────────────────────────────── */

/**
 * The take-homes a setting change applies to: every session sent in the same
 * run as `id` (they share a group id), or just `id` for older sends.
 */
async function sendGroup(workspaceId: string, id: string) {
  const s = await prisma.interviewSession.findFirst({
    where: { id, workspaceId, type: "take-home" },
    select: {
      id: true,
      title: true,
      setupGroupId: true,
      takeHomePassMark: true,
      reminderStartAfterHours: true,
      reminderBeforeDeadlineHours: true,
      remindersOff: true,
    },
  });
  if (!s) {
    const legacy = await prisma.takeHomeAssignment.count({ where: { id, workspaceId } });
    throw new ActionError(legacy ? "Old single-question invites keep the default settings." : "That take-home no longer exists.");
  }
  const where = s.setupGroupId ? { workspaceId, type: "take-home", setupGroupId: s.setupGroupId } : { id: s.id, workspaceId, type: "take-home" };
  return { s, where };
}

/**
 * Change the pass mark for a take-home and everything sent with it. Scores
 * stay as graded and nobody is passed or failed: results are only relabelled.
 */
export async function updateTakeHomePassMarkAction(slug: string, id: string, value: number): Promise<Result<{ passMark: number; count: number }>> {
  try {
    const w = await assertWriter(slug);
    if (!Number.isFinite(Number(value))) throw new ActionError("Pick a pass mark between 30 and 95.");
    const { s, where } = await sendGroup(w.workspace.id, id);
    const passMark = takeHomePassMarkOf(Number(value));
    const res = await prisma.interviewSession.updateMany({ where, data: { takeHomePassMark: passMark } });
    audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_PASS_MARK_CHANGED, "interviewSession", s.id, {
      title: s.title,
      from: takeHomePassMarkOf(s.takeHomePassMark),
      to: passMark,
      takeHomes: res.count,
    });
    refresh(slug);
    revalidatePath(`/w/${slug}/candidates`, "layout");
    return { ok: true, passMark, count: res.count };
  } catch (err) {
    return fail(err);
  }
}

/** Change or switch off the automatic reminders for a take-home and everything sent with it. */
export async function updateTakeHomeRemindersAction(slug: string, id: string, plan: ReminderPlan): Promise<Result<{ reminders: ReminderPlan; count: number }>> {
  try {
    const w = await assertWriter(slug);
    const { s, where } = await sendGroup(w.workspace.id, id);
    const reminders = cleanReminderPlan(plan);
    const res = await prisma.interviewSession.updateMany({
      where,
      data: {
        reminderStartAfterHours: reminders.startAfterHours,
        reminderBeforeDeadlineHours: reminders.beforeDeadlineHours,
        remindersOff: reminders.off,
      },
    });
    const before: ReminderPlan = { startAfterHours: s.reminderStartAfterHours, beforeDeadlineHours: s.reminderBeforeDeadlineHours, off: s.remindersOff };
    audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_REMINDERS_CHANGED, "interviewSession", s.id, {
      title: s.title,
      from: describeReminderPlan(before),
      to: describeReminderPlan(reminders),
      takeHomes: res.count,
    });
    refresh(slug);
    return { ok: true, reminders, count: res.count };
  } catch (err) {
    return fail(err);
  }
}

/* ── Sending ─────────────────────────────────────────────────────────────── */

export type SendInput = {
  title: string;
  items: TemplateItem[];
  candidateIds: string[];
  /** New people typed or pasted in: they become candidates on send. */
  newPeople: BulkRecipient[];
  daysToExpire: number;
  templateId: string | null;
  /** Also save these questions as a new template with this name. */
  saveAsTemplate: string | null;
  /** Score results need to read as a good match. Omitted = the default (60). */
  passMark?: number | null;
  /** Automatic reminder schedule. Omitted = the last call 24 hours before the deadline. */
  reminders?: ReminderPlan | null;
};

export async function sendTakeHomeAction(
  slug: string,
  input: SendInput,
): Promise<Result<{ created: number; emailed: number; skipped: string[] }>> {
  try {
    const w = await assertWriter(slug);
    const items = parseTemplateItems(JSON.stringify(input.items));
    if (!items.length) throw new ActionError("Add at least one question.");

    const candidates = input.candidateIds.length
      ? await prisma.candidate.findMany({
          where: { id: { in: input.candidateIds.slice(0, 100) }, workspaceId: w.workspace.id },
          select: { name: true, email: true },
        })
      : [];
    const noEmail = candidates.filter((c) => !c.email).map((c) => c.name);
    const recipients: BulkRecipient[] = [
      ...candidates.filter((c) => !!c.email).map((c) => ({ name: c.name, email: c.email! })),
      ...input.newPeople,
    ];
    if (!recipients.length) throw new ActionError("Add at least one candidate with an email address.");

    let templateId = input.templateId;
    if (templateId) {
      const t = await prisma.takeHomeTemplate.findFirst({ where: { id: templateId, workspaceId: w.workspace.id }, select: { id: true } });
      templateId = t?.id ?? null;
    }
    if (!templateId && input.saveAsTemplate?.trim()) {
      const t = await prisma.takeHomeTemplate.create({
        data: { workspaceId: w.workspace.id, name: input.saveAsTemplate.trim().slice(0, 120), itemsJson: JSON.stringify(items), createdById: w.userId },
        select: { id: true },
      });
      templateId = t.id;
      audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_TEMPLATE_SAVED, "takeHomeTemplate", t.id, { name: input.saveAsTemplate.trim() });
    }

    const res = await bulkCreateTakeHomeSessions(slug, {
      title: input.title.trim() || "Take-home",
      curation: {
        challengeIds: items.map((i) => i.challengeId),
        playgroundIds: [],
        promptScenarioIds: [],
        perQuestionMinutes: Object.fromEntries(items.map((i) => [i.challengeId, i.minutes])),
      },
      recipients,
      daysToExpire: input.daysToExpire,
      templateId,
      passMark: input.passMark != null ? takeHomePassMarkOf(input.passMark) : null,
      reminders: input.reminders ? cleanReminderPlan(input.reminders) : null,
    });
    refresh(slug);
    const skipped = [
      ...noEmail.map((n) => `${n}: no email address`),
      ...res.details.filter((d) => d.status !== "dispatched").map((d) => `${d.email}: ${"reason" in d ? d.reason : "skipped"}`),
    ];
    if (!res.created) throw new ActionError(skipped[0] ?? "Nothing was sent.");
    return { ok: true, created: res.created, emailed: res.emailed, skipped };
  } catch (err) {
    return fail(err);
  }
}

/* ── Templates ───────────────────────────────────────────────────────────── */

async function checkItems(items: TemplateItem[]): Promise<TemplateItem[]> {
  const clean = parseTemplateItems(JSON.stringify(items)).map((i) => ({
    ...i,
    minutes: Math.min(Math.max(i.minutes || DEFAULT_QUESTION_MINUTES, 15), 240),
  }));
  if (!clean.length) throw new ActionError("Add at least one question.");
  const found = await prisma.challenge.count({ where: { id: { in: clean.map((i) => i.challengeId) } } });
  if (found !== clean.length) throw new ActionError("One or more questions no longer exist.");
  return clean;
}

export async function saveTemplateAction(
  slug: string,
  input: { id: string | null; name: string; items: TemplateItem[] },
): Promise<Result<{ id: string }>> {
  try {
    const w = await assertWriter(slug);
    const name = input.name.trim().slice(0, 120);
    if (!name) throw new ActionError("Give the template a name.");
    const items = await checkItems(input.items);
    let id: string;
    if (input.id) {
      const res = await prisma.takeHomeTemplate.updateMany({
        where: { id: input.id, workspaceId: w.workspace.id },
        data: { name, itemsJson: JSON.stringify(items) },
      });
      if (!res.count) throw new ActionError("That template no longer exists.");
      id = input.id;
    } else {
      id = (
        await prisma.takeHomeTemplate.create({
          data: { workspaceId: w.workspace.id, name, itemsJson: JSON.stringify(items), createdById: w.userId },
          select: { id: true },
        })
      ).id;
    }
    audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_TEMPLATE_SAVED, "takeHomeTemplate", id, { name, questions: items.length });
    refresh(slug);
    return { ok: true, id };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTemplateAction(slug: string, id: string): Promise<Result> {
  try {
    const w = await assertWriter(slug);
    const t = await prisma.takeHomeTemplate.findFirst({ where: { id, workspaceId: w.workspace.id }, select: { id: true, name: true } });
    if (!t) throw new ActionError("That template no longer exists.");
    // Sent take-homes keep their questions; they only lose the link to the template.
    await prisma.takeHomeTemplate.delete({ where: { id: t.id } });
    audit(w, WORKSPACE_AUDIT_ACTIONS.TAKE_HOME_TEMPLATE_DELETED, "takeHomeTemplate", t.id, { name: t.name });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
