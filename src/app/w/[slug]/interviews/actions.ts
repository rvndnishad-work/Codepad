"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { createInterviewSession, resolveRounds, sourceTypeOf } from "@/lib/interview/create-server";
import { notifyInterviewQuestionsRequested } from "@/lib/notifications/triggers";
import { TOOL_IDS, defaultTools, initialTools } from "@/lib/interview/tools";
import { inviteGuests } from "@/lib/interview/guests";
import {
  formatOf,
  isEmail,
  isInterviewerFor,
  MAX_CANDIDATES,
  MAX_MINUTES,
  MAX_GUESTS,
  MAX_PANEL,
  MAX_ROUNDS,
  MIN_MINUTES,
  normalizeGuests,
  plansFor,
} from "@/lib/interview/wizard";

/**
 * Live interview actions: schedule from the wizard (one session per
 * candidate) and pick the questions later. Scheduling needs
 * `interview:conduct`; picking questions is open to the teammate asked, the
 * interviewers, and anyone who can schedule.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

const fail = (err: unknown): { ok: false; error: string } => {
  if (!(err instanceof ActionError)) console.error("[interviews] action failed:", err);
  return { ok: false, error: err instanceof ActionError ? err.message : "Something went wrong. Try again." };
};

async function loadActor(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new ActionError("You are signed out.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, name: true, members: { select: { userId: true, role: true, permissions: true } } },
  });
  if (!workspace) throw new ActionError("Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new ActionError("You are not a member of this workspace.");
  return {
    workspace,
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? session.user.email ?? "A teammate",
    canSchedule: await canMember(member, "interview:conduct"),
    memberIds: new Set(workspace.members.filter((m) => m.role !== "VIEWER").map((m) => m.userId)),
  };
}

const round = z.object({ kind: z.enum(["challenge", "playground", "prompt"]), id: z.string().min(1).max(80) });

const scheduleSchema = z.object({
  format: z.enum(["coding", "discussion", "behavioural", "intro", "mixed"]),
  title: z.string().trim().min(1).max(120),
  candidates: z
    .array(
      z.object({
        id: z.string().max(40).nullable(),
        name: z.string().trim().max(80),
        email: z
          .string()
          .trim()
          .max(200)
          .refine((v) => !v || isEmail(v)),
        time: z.string().datetime().nullable(),
      }),
    )
    .max(MAX_CANDIDATES),
  hostId: z.string().min(1),
  panelIds: z.array(z.string().min(1)).max(MAX_PANEL),
  guests: z
    .array(z.string().trim().max(200).refine((v) => isEmail(v)))
    .max(MAX_GUESTS)
    .optional(),
  plan: z.enum(["set", "later", "open"]),
  rounds: z.array(round).max(MAX_ROUNDS),
  guideId: z.string().nullable(),
  questionsOwnerId: z.string().nullable(),
  questionsNote: z.string().trim().max(500),
  minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
  brief: z.string().trim().max(2000),
  candidateBrief: z.string().trim().max(2000),
  sendInvites: z.boolean(),
  tools: z.array(z.enum(TOOL_IDS)).max(TOOL_IDS.length).optional(),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type Scheduled = { id: string; name: string | null; shortCode: string | null; shareToken: string; scheduledAt: string | null };

function splitRounds(rounds: { kind: string; id: string }[]) {
  return {
    challengeIds: rounds.filter((r) => r.kind === "challenge").map((r) => r.id),
    playgroundIds: rounds.filter((r) => r.kind === "playground").map((r) => r.id),
    promptScenarioIds: rounds.filter((r) => r.kind === "prompt").map((r) => r.id),
  };
}

async function assertGuide(workspaceId: string, guideId: string | null) {
  if (!guideId) return;
  const g = await prisma.aIInterviewTemplate.findFirst({ where: { id: guideId, workspaceId, kind: "conversation" }, select: { id: true } });
  if (!g) throw new ActionError("That question guide is no longer in the library.");
}

export async function scheduleInterviewsAction(slug: string, raw: ScheduleInput): Promise<Result<{ created: Scheduled[] }>> {
  try {
    const a = await loadActor(slug);
    if (!a.canSchedule) throw new ActionError("You do not have permission to schedule interviews.");
    const parsed = scheduleSchema.safeParse(raw);
    if (!parsed.success) throw new ActionError("Some details are missing or too long. Check each step and try again.");
    const d = parsed.data;
    const format = formatOf(d.format)!;

    if (!plansFor(format).includes(d.plan)) throw new ActionError("Coding rounds need questions, now or from a teammate.");
    if (!a.memberIds.has(d.hostId)) throw new ActionError("The host is not a member of this workspace.");
    const panelIds = [...new Set(d.panelIds)].filter((id) => id !== d.hostId);
    if (panelIds.some((id) => !a.memberIds.has(id))) throw new ActionError("Someone on the panel is not a member of this workspace.");
    if (d.plan === "later" && (!d.questionsOwnerId || !a.memberIds.has(d.questionsOwnerId))) throw new ActionError("Choose a teammate to pick the questions.");

    const rounds = d.plan === "set" && format.coding ? d.rounds : [];
    const guideId = d.plan === "set" && format.guide ? d.guideId : null;
    if (d.plan === "set" && format.coding && rounds.length === 0) throw new ActionError("Add at least one coding round.");
    if (d.plan === "set" && !format.coding && !guideId) throw new ActionError("Choose a question guide.");
    await assertGuide(a.workspace.id, guideId);

    // No named people means one session with an open link.
    const people = d.candidates.length ? d.candidates : [{ id: null, name: "", email: "", time: null }];
    const setupGroupId = people.length > 1 ? randomUUID() : null;
    const created: Scheduled[] = [];
    for (const p of people) {
      const res = await createInterviewSession({
        ownerId: d.hostId,
        actor: { id: a.userId, email: a.email },
        title: d.title,
        type: "live",
        creatorRole: "interviewer",
        ...splitRounds(rounds),
        allowEmpty: true,
        freshPlaygrounds: true,
        scenario: d.candidateBrief || null,
        totalSec: d.minutes * 60,
        scheduledAt: p.time ? new Date(p.time) : null,
        workspaceId: a.workspace.id,
        candidateId: p.id,
        candidateName: p.name || null,
        candidateEmail: p.email || null,
        sendInvite: d.sendInvites,
        wizard: {
          format: d.format,
          panelIds,
          questionPlan: d.plan,
          questionsOwnerId: d.questionsOwnerId,
          questionsNote: d.questionsNote || null,
          guideTemplateId: guideId,
          interviewerBrief: d.brief || null,
          setupGroupId,
          toolsJson: JSON.stringify(initialTools(d.tools ?? defaultTools(d.format))),
        },
      });
      if (!res.ok) throw new ActionError(res.error);
      created.push({ id: res.id, name: p.name || null, shortCode: res.shortCode, shareToken: res.shareToken, scheduledAt: p.time });
    }

    // Interviewers outside the workspace get the details and their own link.
    const guests = normalizeGuests(d.guests ?? []);
    if (guests.length) {
      const host = await prisma.user.findUnique({ where: { id: d.hostId }, select: { name: true, email: true } });
      void inviteGuests({
        workspaceId: a.workspace.id,
        emails: guests,
        rooms: created.map((c) => ({ id: c.id, candidateName: c.name, scheduledAt: c.scheduledAt ? new Date(c.scheduledAt) : null })),
        title: d.title,
        format: d.format,
        minutes: d.minutes,
        hostName: host?.name || host?.email || "the host",
        inviterName: a.name,
        brief: d.brief || null,
      });
    }

    if (d.plan === "later" && d.questionsOwnerId) {
      void notifyInterviewQuestionsRequested({
        userId: d.questionsOwnerId,
        actorId: a.userId,
        actorName: a.name,
        workspaceSlug: slug,
        sessionIds: created.map((c) => c.id),
        title: d.title,
        note: d.questionsNote || null,
      });
    }
    void writeWorkspaceAuditEntry({
      workspaceId: a.workspace.id,
      actorUserId: a.userId,
      actorEmail: a.email,
      action: WORKSPACE_AUDIT_ACTIONS.INTERVIEWS_SCHEDULED,
      targetType: "interviewSession",
      targetId: created[0]?.id ?? null,
      meta: { count: created.length, format: d.format, plan: d.plan, hostId: d.hostId, panel: panelIds.length, guests: guests.length },
    });
    revalidatePath(`/w/${slug}/interviews`, "layout");
    revalidatePath(`/w/${slug}`, "layout");
    return { ok: true, created };
  } catch (err) {
    return fail(err);
  }
}

const questionsSchema = z.object({
  plan: z.enum(["set", "open"]),
  rounds: z.array(round).max(MAX_ROUNDS),
  guideId: z.string().nullable(),
  /** Also apply to the other interviews scheduled with this one that still need questions. */
  applyToSiblings: z.boolean(),
});

const SESSION_SELECT = { id: true, userId: true, panelJson: true, questionsOwnerId: true, format: true, status: true, setupGroupId: true, playgroundIds: true } as const;

function parseIds(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type QuestionsInput = z.input<typeof questionsSchema>;

export async function setInterviewQuestionsAction(slug: string, sessionId: string, raw: QuestionsInput): Promise<Result<{ updated: number }>> {
  try {
    const a = await loadActor(slug);
    const parsed = questionsSchema.safeParse(raw);
    if (!parsed.success) throw new ActionError("Pick at most ten rounds.");
    const d = parsed.data;
    const s = await prisma.interviewSession.findFirst({
      where: { id: sessionId, workspaceId: a.workspace.id, type: "live" },
      select: SESSION_SELECT,
    });
    if (!s) throw new ActionError("Interview not found.");
    if (!(a.canSchedule || s.questionsOwnerId === a.userId || isInterviewerFor(s, a.userId))) {
      throw new ActionError("You do not have permission to change these questions.");
    }
    if (s.status !== "scheduled") throw new ActionError("This interview has already started, so its questions are fixed.");
    const format = formatOf(s.format);
    const coding = format ? format.coding : true;
    const guide = format ? format.guide : false;
    if (d.plan === "open" && coding) throw new ActionError("Coding rounds need at least one question.");
    const rounds = d.plan === "set" && coding ? d.rounds : [];
    const guideId = d.plan === "set" && guide ? d.guideId : null;
    if (d.plan === "set" && coding && rounds.length === 0) throw new ActionError("Add at least one coding round.");
    if (d.plan === "set" && !coding && !guideId) throw new ActionError("Choose a question guide.");
    await assertGuide(a.workspace.id, guideId);

    // Interviews scheduled in the same go that still wait on questions.
    const targets = [s];
    if (d.applyToSiblings && s.setupGroupId) {
      const siblings = await prisma.interviewSession.findMany({
        where: { workspaceId: a.workspace.id, setupGroupId: s.setupGroupId, status: "scheduled", id: { not: s.id } },
        select: SESSION_SELECT,
      });
      targets.push(...siblings);
    }

    for (const t of targets) {
      // Playgrounds are copied per session, so each room gets its own editor.
      const resolved = await resolveRounds({
        ownerId: t.userId,
        actorId: a.userId,
        workspaceId: a.workspace.id,
        ...splitRounds(rounds),
        reuse: new Set(parseIds(t.playgroundIds)),
      });
      const n = resolved.challengeIds.length + resolved.playgroundIds.length + resolved.promptScenarioIds.length;
      if (coding && d.plan === "set" && n === 0) throw new ActionError("None of those rounds can be used. Pick others.");
      await prisma.interviewSession.update({
        where: { id: t.id },
        data: {
          questionPlan: d.plan,
          guideTemplateId: guideId,
          challengeIds: JSON.stringify(resolved.challengeIds),
          playgroundIds: JSON.stringify(resolved.playgroundIds),
          promptScenarioIds: JSON.stringify(resolved.promptScenarioIds),
          sourceType: n === 0 ? "combined" : sourceTypeOf(resolved),
        },
      });
    }

    void writeWorkspaceAuditEntry({
      workspaceId: a.workspace.id,
      actorUserId: a.userId,
      actorEmail: a.email,
      action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_QUESTIONS_SET,
      targetType: "interviewSession",
      targetId: s.id,
      meta: { count: targets.length, rounds: rounds.length, guide: !!guideId, plan: d.plan },
    });
    revalidatePath(`/w/${slug}/interviews`, "layout");
    return { ok: true, updated: targets.length };
  } catch (err) {
    return fail(err);
  }
}
