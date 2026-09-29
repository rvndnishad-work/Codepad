"use server";

import { randomUUID } from "node:crypto";
import { loadWorkspaceSettings } from "@/lib/workspace/settings-server";
import { normalizeWorkspaceSettings, screeningStartValues } from "@/lib/workspace/settings";
import { storedPassMark } from "@/lib/interview/scorecard";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectRecordingKeys, deleteRecordingKeys } from "@/lib/recording/objects-server";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { createInterviewSession, resolveRounds, sendCandidateInvites, sourceTypeOf } from "@/lib/interview/create-server";
import { appOrigin } from "@/lib/interview/links";
import { publicItems } from "@/lib/library/library-server";
import { notifyInterviewQuestionsRequested } from "@/lib/notifications/triggers";
import { TOOL_IDS, defaultTools, initialTools } from "@/lib/interview/tools";
import { inviteGuests, type DeliveryStatus } from "@/lib/interview/guests";
import { candidateRoomPath } from "@/lib/interview/room-server";
import { cleanMeetingUrl, MAX_MEETING_URL } from "@/lib/interview/meeting";
import { cancelInterviewEvent, syncInterviewEvent } from "@/lib/calendar/server";
import { videoCallsOn } from "@/lib/video/addon";
import { closeVideoRoomAfter } from "@/lib/video/close-after";
import { recordingConfigured } from "@/lib/recording/live-server";
import { loadCandidateRounds } from "@/lib/interview/rounds-server";
import { normalizeRoleType, roleTypesFor, roundStateLabel, suggestLiveRound } from "@/lib/interview/rounds";
import { setCandidatePlan, workspaceHiringType } from "@/lib/interview/plans-server";
import { CandidateError, resolveCandidateActor } from "@/lib/crm/candidates-server";
import { cancelUpcomingInterview, resendInterviewInvite } from "@/lib/interview/invite-server";
import { canChangeInterview, mayChangeInterview, newTimeProblem } from "@/lib/interview/reschedule";
import {
  offersGuide,
  formatOf,
  isEmail,
  isInterviewerFor,
  MAX_BANK,
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

const questionSet = z.object({
  guideId: z.string().max(40).nullable(),
  bankIds: z.array(z.string().min(1).max(40)).max(MAX_BANK),
});

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
        /** This person's own guide, when questions differ per candidate. */
        questions: questionSet.optional(),
        /** Which of their interview rounds this is (CandidateRound id). */
        roundId: z.string().max(40).nullable().optional(),
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
  /** Public bank questions added to everyone's guide. */
  bankIds: z.array(z.string().min(1).max(40)).max(MAX_BANK).optional(),
  questionsOwnerId: z.string().nullable(),
  questionsNote: z.string().trim().max(500),
  minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
  /** Zoom, Meet, Teams... link for the call. https only. */
  meetingUrl: z.string().trim().max(MAX_MEETING_URL).optional(),
  /** Talk with built-in video (workspaces with the add-on) instead of the link. */
  builtinVideo: z.boolean().optional(),
  /** Record the built-in call (the candidate agrees in the lobby first). */
  recordVideo: z.boolean().optional(),
  brief: z.string().trim().max(2000),
  candidateBrief: z.string().trim().max(2000),
  sendInvites: z.boolean(),
  /** Put each timed interview on the organiser's connected calendar. */
  calendarEvent: z.boolean().optional(),
  tools: z.array(z.enum(TOOL_IDS)).max(TOOL_IDS.length).optional(),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type Scheduled = {
  id: string;
  name: string | null;
  shortCode: string | null;
  shareToken: string;
  scheduledAt: string | null;
  /** The candidate invite: null when there was no email or invites were off. */
  invite: DeliveryStatus | null;
  /** Private candidate link path (signed, expiring). */
  candidateLink: string;
  /** What happened to the calendar event, when one was asked for. */
  calendar?: "created" | "updated" | "cancelled" | "skipped" | "failed";
};

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

export async function scheduleInterviewsAction(slug: string, raw: ScheduleInput): Promise<Result<{ created: Scheduled[]; guests: DeliveryStatus[] }>> {
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
    if (d.plan === "set" && format.coding && rounds.length === 0) throw new ActionError("Add at least one coding round.");

    // No named people means one session with an open link.
    const people = d.candidates.length ? d.candidates : [{ id: null, name: "", email: "", time: null, questions: undefined, roundId: null }];

    // Rounds must be that person's own live rounds in this workspace.
    const askedRounds = people.flatMap((p) => (p.id && p.roundId ? [{ candidateId: p.id, roundId: p.roundId }] : []));
    const okRounds = askedRounds.length
      ? await prisma.candidateRound.findMany({
          where: { id: { in: askedRounds.map((r) => r.roundId) }, kind: "interview", candidate: { workspaceId: a.workspace.id } },
          select: { id: true, candidateId: true, passMark: true },
        })
      : [];
    const roundFor = (p: { id: string | null; roundId?: string | null }) => okRounds.find((r) => r.id === p.roundId && r.candidateId === p.id) ?? null;
    if (askedRounds.some((r) => !roundFor({ id: r.candidateId, roundId: r.roundId }))) throw new ActionError("One of the rounds is no longer on that candidate's plan. Go back to the Round step and pick again.");

    // Each room's guide: its own set when questions differ per candidate,
    // otherwise the shared one. A set is a library questionnaire, public
    // bank questions, or both.
    const useGuide = d.plan === "set" && offersGuide(format);
    const sets = people.map((p) => (useGuide ? (p.questions ?? { guideId: d.guideId, bankIds: d.bankIds ?? [] }) : { guideId: null, bankIds: [] as string[] }));
    if (useGuide && !format.coding && sets.some((q) => !q.guideId && q.bankIds.length === 0)) {
      throw new ActionError(people.length > 1 ? "Every candidate needs a question guide or some questions." : "Choose a question guide.");
    }
    for (const id of new Set(sets.map((q) => q.guideId).filter((x): x is string => !!x))) await assertGuide(a.workspace.id, id);
    const bankJson = new Map<string, string | null>();
    for (const q of sets) {
      const key = q.bankIds.join(",");
      if (!key || bankJson.has(key)) continue;
      const items = await publicItems([...new Set(q.bankIds)]);
      if (items.length < new Set(q.bankIds).size) throw new ActionError("One of the public questions is no longer available. Remove it and try again.");
      bankJson.set(key, JSON.stringify({ v: 1, items }));
    }

    const meeting = cleanMeetingUrl(d.meetingUrl);
    if (!meeting.ok) throw new ActionError(`Video call link: ${meeting.error}`);
    // With the video add-on on, built-in video is the default and the link is
    // dropped; without it, an interview with a link keeps using that link if
    // the add-on is switched on later.
    const ws = await prisma.workspace.findUnique({
      where: { id: a.workspace.id },
      select: { planName: true, trialEndsAt: true, stripeSubscriptionId: true, videoEnabled: true },
    });
    const videoOn = !!ws && videoCallsOn(ws);
    const builtinVideo = videoOn ? d.builtinVideo !== false : !meeting.url;
    const meetingUrl = videoOn && builtinVideo ? null : meeting.url;
    const recordVideo = videoOn && builtinVideo && d.recordVideo === true && recordingConfigured();
    const setupGroupId = people.length > 1 ? randomUUID() : null;
    // New interviews keep the workspace's scorecard defaults (Settings > Screening defaults).
    const start = screeningStartValues((await loadWorkspaceSettings(a.workspace.id)) ?? normalizeWorkspaceSettings({})).interview;
    const scorecard = { passMark: storedPassMark(start.passMark), first: start.scorecardFirst, reminderHours: start.scorecardReminderHours };
    const created: Scheduled[] = [];
    const toInvite: Parameters<typeof sendCandidateInvites>[0]["rooms"] = [];
    for (const [i, p] of people.entries()) {
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
        meetingUrl,
        builtinVideo,
        recordVideo,
        totalSec: d.minutes * 60,
        scheduledAt: p.time ? new Date(p.time) : null,
        workspaceId: a.workspace.id,
        candidateId: p.id,
        candidateName: p.name || null,
        candidateEmail: p.email || null,
        // Sent below in one batch, so the last page can say how it went.
        sendInvite: false,
        wizard: {
          format: d.format,
          panelIds,
          questionPlan: d.plan,
          questionsOwnerId: d.questionsOwnerId,
          questionsNote: d.questionsNote || null,
          guideTemplateId: sets[i].guideId,
          guideJson: bankJson.get(sets[i].bankIds.join(",")) ?? null,
          interviewerBrief: d.brief || null,
          setupGroupId,
          toolsJson: JSON.stringify(initialTools(d.tools ?? defaultTools(d.format))),
          scorecard,
        },
      });
      if (!res.ok) throw new ActionError(res.error);
      const planRound = roundFor(p);
      if (planRound) {
        // The round's own pass mark, when the plan sets one, labels this interview's scorecards.
        await prisma.interviewSession.update({
          where: { id: res.id },
          data: { candidateRoundId: planRound.id, ...(planRound.passMark != null ? { scorecardPassMark: storedPassMark(planRound.passMark) } : {}) },
        });
      }
      created.push({
        id: res.id,
        name: res.candidateName ?? (p.name || null),
        shortCode: res.shortCode,
        shareToken: res.shareToken,
        scheduledAt: p.time,
        invite: null,
        candidateLink: candidateRoomPath({ id: res.id, shareToken: res.shareToken, scheduledAt: p.time ? new Date(p.time) : null, totalSec: d.minutes * 60 }, slug),
      });
      if (d.sendInvites && res.inviteEmail) {
        toInvite.push({ session: { id: res.id, shareToken: res.shareToken, shortCode: res.shortCode }, email: res.inviteEmail, candidateName: res.candidateName, scheduledAt: p.time ? new Date(p.time) : null });
      }
    }

    // The organiser's calendar gets one event per timed interview: the host's
    // calendar when connected, otherwise the scheduler's.
    if (d.calendarEvent) {
      for (const c of created) {
        if (c.scheduledAt) c.calendar = (await syncInterviewEvent(c.id, { organiserIds: [d.hostId, a.userId] })).status;
      }
    }

    const origin = await appOrigin();
    const invites = await sendCandidateInvites({ workspaceId: a.workspace.id, title: d.title, totalSec: d.minutes * 60, actorId: a.userId, origin, meetingUrl, recorded: recordVideo, rooms: toInvite });
    for (const [i, r] of toInvite.entries()) {
      const c = created.find((x) => x.id === r.session.id);
      if (c) c.invite = invites[i];
    }

    // Interviewers outside the workspace get the details and their own link.
    const guests = normalizeGuests(d.guests ?? []);
    let guestDelivery: DeliveryStatus[] = [];
    if (guests.length) {
      const host = await prisma.user.findUnique({ where: { id: d.hostId }, select: { name: true, email: true } });
      guestDelivery = await inviteGuests({
        workspaceId: a.workspace.id,
        emails: guests,
        rooms: created.map((c) => ({ id: c.id, candidateName: c.name, scheduledAt: c.scheduledAt ? new Date(c.scheduledAt) : null })),
        title: d.title,
        format: d.format,
        minutes: d.minutes,
        hostName: host?.name || host?.email || "the host",
        inviterName: a.name,
        brief: d.brief || null,
        origin,
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
      meta: {
        count: created.length,
        format: d.format,
        plan: d.plan,
        hostId: d.hostId,
        panel: panelIds.length,
        guests: guests.length,
        emailed: invites.filter((x) => x.status === "sent").length + guestDelivery.filter((x) => x.status === "sent").length,
      },
    });
    revalidatePath(`/w/${slug}/interviews`, "layout");
    revalidatePath(`/w/${slug}`, "layout");
    return { ok: true, created, guests: guestDelivery };
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
    const guide = format ? offersGuide(format) : false;
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

/**
 * Delete one interview and its report: scorecard, notes, saved code and
 * integrity data. The candidate and their other results stay. Open to the
 * host and to members who manage interviews.
 */
export async function deleteInterviewAction(slug: string, id: string): Promise<Result> {
  try {
    const a = await loadActor(slug);
    const s = await prisma.interviewSession.findFirst({
      where: { id: String(id).slice(0, 40), workspaceId: a.workspace.id, type: { not: "take-home" } },
      select: { id: true, userId: true, title: true, candidateName: true, candidateId: true },
    });
    if (!s) throw new ActionError("This interview no longer exists.");
    const member = a.workspace.members.find((m) => m.userId === a.userId)!;
    if (s.userId !== a.userId && !(await canMember(member, "interview:manage"))) {
      throw new ActionError("Only the host or someone who manages interviews can delete it.");
    }
    // Cancel the calendar event first; the row goes with the session.
    await cancelInterviewEvent(s.id);
    closeVideoRoomAfter(s.id);
    const recordingKeys = await collectRecordingKeys({ interviewSessionIds: [s.id] });
    // Attempts point at the session by id only, so they go first; the rest cascades.
    await prisma.$transaction([
      prisma.challengeAttempt.deleteMany({ where: { sessionId: s.id } }),
      prisma.interviewSession.delete({ where: { id: s.id } }),
    ]);
    await deleteRecordingKeys(recordingKeys);
    void writeWorkspaceAuditEntry({
      workspaceId: a.workspace.id,
      actorUserId: a.userId,
      actorEmail: a.email,
      action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_DELETED,
      targetType: "interviewSession",
      targetId: s.id,
      meta: { title: s.title, candidateName: s.candidateName },
    });
    revalidatePath(`/w/${slug}/interviews`, "layout");
    if (s.candidateId) revalidatePath(`/w/${slug}/candidates/${s.candidateId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Loads an interview that can still be moved or cancelled, and checks the caller may. */
async function changeableInterview(a: Awaited<ReturnType<typeof loadActor>>, id: string) {
  const s = await prisma.interviewSession.findFirst({
    where: { id: String(id).slice(0, 40), workspaceId: a.workspace.id, type: { not: "take-home" } },
    select: {
      id: true,
      userId: true,
      createdById: true,
      title: true,
      format: true,
      totalSec: true,
      interviewerBrief: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      scheduledAt: true,
      candidateName: true,
      candidateId: true,
      user: { select: { name: true, email: true } },
      guests: { select: { email: true } },
    },
  });
  if (!s) throw new ActionError("This interview no longer exists.");
  const member = a.workspace.members.find((m) => m.userId === a.userId)!;
  if (!mayChangeInterview(s, a.userId, await canMember(member, "interview:manage"))) {
    throw new ActionError("Only the host, whoever set it up, or someone who manages interviews can change it.");
  }
  if (!canChangeInterview(s)) throw new ActionError("This interview has started, finished or been cancelled, so it can no longer be changed.");
  return s;
}

/**
 * Moves an interview that has not started to a new time. The calendar event
 * follows; with `notify`, the candidate and any emailed interviewers get the
 * new time and a fresh link (the old link stops working after the old time).
 */
export async function rescheduleInterviewAction(
  slug: string,
  id: string,
  input: { at: string; notify: boolean },
): Promise<Result<{ emailed: boolean; note: string | null }>> {
  try {
    const a = await loadActor(slug);
    const s = await changeableInterview(a, id);
    const at = new Date(String(input?.at ?? ""));
    const problem = newTimeProblem(at);
    if (problem) throw new ActionError(problem);
    const moved = await prisma.interviewSession.updateMany({
      where: { id: s.id, status: "scheduled", startedAt: null },
      data: { scheduledAt: at },
    });
    if (!moved.count) throw new ActionError("This interview has just started or been cancelled.");
    await syncInterviewEvent(s.id);

    let emailed = false;
    let note: string | null = null;
    if (input?.notify) {
      const res = await resendInterviewInvite({ workspaceId: a.workspace.id, sessionId: s.id, actor: { userId: a.userId, email: a.email } });
      if (res.ok && res.sent) emailed = true;
      else note = res.ok ? "The email could not be sent. Copy the new link for the candidate instead." : res.error;
      if (s.guests.length) {
        await inviteGuests({
          workspaceId: a.workspace.id,
          emails: s.guests.map((g) => g.email),
          rooms: [{ id: s.id, candidateName: s.candidateName, scheduledAt: at }],
          title: s.title,
          format: s.format,
          minutes: Math.round(s.totalSec / 60),
          hostName: s.user.name || s.user.email || "the host",
          inviterName: a.name,
          brief: s.interviewerBrief,
          origin: await appOrigin(),
        });
      }
    }
    void writeWorkspaceAuditEntry({
      workspaceId: a.workspace.id,
      actorUserId: a.userId,
      actorEmail: a.email,
      action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_RESCHEDULED,
      targetType: "interviewSession",
      targetId: s.id,
      meta: { candidateName: s.candidateName, from: s.scheduledAt?.toISOString() ?? null, to: at.toISOString(), notified: emailed },
    });
    revalidatePath(`/w/${slug}/interviews`, "layout");
    if (s.candidateId) revalidatePath(`/w/${slug}/candidates/${s.candidateId}`);
    return { ok: true, emailed, note };
  } catch (err) {
    return fail(err);
  }
}

/** Cancels an interview that has not started. The report and notes stay. */
export async function cancelInterviewAction(slug: string, id: string, input: { notify: boolean }): Promise<Result> {
  try {
    const a = await loadActor(slug);
    const s = await changeableInterview(a, id);
    const done = await cancelUpcomingInterview({
      workspaceId: a.workspace.id,
      sessionId: s.id,
      actor: { userId: a.userId, email: a.email },
      reason: "Cancelled from Interviews",
      notifyCandidate: !!input?.notify,
    });
    if (!done) throw new ActionError("This interview has just started or been cancelled.");
    revalidatePath(`/w/${slug}/interviews`, "layout");
    if (s.candidateId) revalidatePath(`/w/${slug}/candidates/${s.candidateId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export type RoundChoice = {
  planName: string | null;
  /** Rounds held out of the total, for "2 of 4 done". */
  done: number;
  total: number;
  options: { id: string; number: number | null; name: string; format: string | null; state: string; stateLabel: string }[];
  suggested: string | null;
};

/** Someone with no plan: whether a plan can be picked for them here, and why not. */
export type NoPlan = { canPick: true } | { canPick: false; reason: string };

/** A plan that can be picked for people with none. */
export type PlanOption = { id: string; name: string; live: number; total: number; isDefault: boolean };

/** Each candidate's live rounds for the wizard's Round step, with the one we suggest. */
export async function candidateRoundChoicesAction(
  slug: string,
  candidateIds: string[],
  format: string | null,
): Promise<Result<{ choices: Record<string, RoundChoice>; noPlan: Record<string, NoPlan>; plans: PlanOption[] }>> {
  try {
    const a = await loadActor(slug);
    const ids = [...new Set(candidateIds.filter((x) => typeof x === "string" && x.length <= 40))].slice(0, MAX_CANDIDATES);
    const plans = await loadCandidateRounds(a.workspace.id, slug, ids);
    const choices: Record<string, RoundChoice> = {};
    // People with no rounds yet can be given a plan here, unless a batch plan or a decision says otherwise.
    const missing = ids.filter((id) => !plans.get(id)?.progress.rounds.some((r) => r.kind === "interview"));
    const noPlan: Record<string, NoPlan> = {};
    let planOptions: PlanOption[] = [];
    if (missing.length) {
      const [people, hiring, all] = await Promise.all([
        prisma.candidate.findMany({
          where: { workspaceId: a.workspace.id, id: { in: missing } },
          select: { id: true, stage: true, status: true, batch: { select: { name: true, planId: true } } },
        }),
        workspaceHiringType(a.workspace.id),
        prisma.interviewPlan.findMany({
          where: { workspaceId: a.workspace.id },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
          select: { id: true, name: true, roleType: true, isDefault: true, rounds: { select: { kind: true } } },
        }),
      ]);
      const allowed = roleTypesFor(hiring);
      planOptions = all
        .filter((p) => allowed.includes(normalizeRoleType(p.roleType)))
        .map((p) => ({ id: p.id, name: p.name, live: p.rounds.filter((r) => r.kind === "interview").length, total: p.rounds.length, isDefault: p.isDefault }));
      for (const c of people) {
        if (c.batch?.planId) noPlan[c.id] = { canPick: false, reason: `Their batch ${c.batch.name} has a plan with no live interview round.` };
        else if (c.status === "archived") noPlan[c.id] = { canPick: false, reason: "Archived, so no plan is added." };
        else if (c.stage !== "NEW" && c.stage !== "SCREENING") noPlan[c.id] = { canPick: false, reason: "Already decided, so no plan is added." };
        else noPlan[c.id] = { canPick: true };
      }
    }
    for (const [id, p] of plans) {
      const live = p.progress.rounds.filter((r) => r.kind === "interview");
      choices[id] = {
        planName: p.planName,
        done: p.progress.done,
        total: p.progress.total,
        options: live.map((r) => ({ id: r.id, number: r.number, name: r.name, format: r.format ?? null, state: r.state, stateLabel: r.skipped ? "Skipped" : roundStateLabel(r.state, r.kind) })),
        suggested: suggestLiveRound(p.progress, format),
      };
    }
    return { ok: true, choices, noPlan, plans: planOptions };
  } catch (err) {
    return fail(err);
  }
}

/** Gives one person with no plan an interview plan, from the Round step. Needs `candidate:write`. */
export async function pickCandidatePlanAction(slug: string, candidateId: string, planId: string): Promise<Result> {
  try {
    const actor = await resolveCandidateActor(slug, "candidate:write");
    await setCandidatePlan(actor, String(candidateId).slice(0, 40), String(planId).slice(0, 40));
    revalidatePath(`/w/${slug}/candidates`, "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof CandidateError) return { ok: false, error: err.message };
    return fail(err);
  }
}
