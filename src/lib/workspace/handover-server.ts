/**
 * Removing a member and handing over their work, on the server. The rules
 * for what moves live in handover.ts; this file finds the work, applies
 * the choices in one transaction, then does the outside effects (calendar
 * events, candidate emails, Stripe seats) after it commits.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { decryptAtRest } from "@/lib/crypto/at-rest";
import { cancelInterviewEvent, syncInterviewEvent } from "@/lib/calendar/server";
import { cancelUpcomingInterview } from "@/lib/interview/invite-server";
import { decisionOf } from "@/lib/take-home/status";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { planInterviewChange, type HandoverChoices, type HandoverCounts, type InterviewChange } from "./handover";
import { seatItem } from "@/lib/video/addon";

/** Take-home statuses that no longer need anyone to review them. */
const CLOSED_TAKE_HOME = ["cancelled", "expired", "abandoned"];

async function findWork(workspaceId: string, userId: string) {
  const [candidates, batches, interviews, takeHomes, apiKeys, calendar] = await Promise.all([
    prisma.candidate.count({ where: { workspaceId, ownerId: userId } }),
    prisma.candidateBatch.count({ where: { workspaceId, ownerId: userId } }),
    prisma.interviewSession.findMany({
      where: {
        workspaceId,
        type: { not: "take-home" },
        status: "scheduled",
        OR: [{ userId }, { questionsOwnerId: userId }, { panelJson: { contains: `"${userId}"` } }],
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, userId: true, panelJson: true, questionsOwnerId: true, scheduledAt: true, candidateName: true },
    }),
    prisma.interviewSession.findMany({
      where: { workspaceId, type: "take-home", userId, status: { notIn: CLOSED_TAKE_HOME } },
      select: { id: true, candidate: { select: { stage: true } } },
    }),
    prisma.mcpApiKey.count({ where: { workspaceId, createdByUserId: userId, revokedAt: null } }),
    prisma.calendarConnection.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { id: true, provider: true } }),
  ]);
  // The panel filter is a text match, so check each row really lists them.
  const upcoming = interviews.filter((s) => planInterviewChange(s, userId, "reassign", null) !== null);
  const reviews = takeHomes.filter((t) => decisionOf(t.candidate?.stage) === null);
  return { candidates, batches, upcoming, reviews, apiKeys, calendar };
}

export type HandoverPreview = {
  counts: HandoverCounts;
  /** The first few interviews they host, for the dialog. */
  hosted: { id: string; title: string; candidateName: string | null; scheduledAt: string | null }[];
};

export async function loadHandoverPreview(workspaceId: string, userId: string): Promise<HandoverPreview> {
  const w = await findWork(workspaceId, userId);
  const hosted = w.upcoming.filter((s) => s.userId === userId);
  return {
    counts: {
      candidates: w.candidates,
      batches: w.batches,
      hostedInterviews: hosted.length,
      panelInterviews: w.upcoming.length - hosted.length,
      reviews: w.reviews.length,
      apiKeys: w.apiKeys,
      calendar: !!w.calendar,
    },
    hosted: hosted.slice(0, 5).map((s) => ({ id: s.id, title: s.title, candidateName: s.candidateName, scheduledAt: s.scheduledAt?.toISOString() ?? null })),
  };
}

export type HandoverOutcome = {
  candidates: number;
  batches: number;
  interviewsReassigned: number;
  interviewsCancelled: number;
  reviews: number;
  apiKeysRevoked: number;
  calendarDisconnected: boolean;
};

/**
 * Hands over the member's work and removes them. The database changes and
 * the removal happen together; if anything fails, nothing changes.
 */
export async function removeMemberWithHandover(a: {
  workspace: { id: string; memberCount: number; stripeSubscriptionId: string | null };
  target: { memberId: string; userId: string; email: string | null; name: string | null; role: string };
  choices: HandoverChoices;
  actor: { userId: string; email: string | null };
  names: Record<string, string>;
}): Promise<HandoverOutcome> {
  const { workspace, target, choices, actor } = a;
  const w = await findWork(workspace.id, target.userId);
  const now = new Date();

  const changes = w.upcoming
    .map((s) => planInterviewChange(s, target.userId, choices.interviewMode, choices.interviewerUserId))
    .filter((c): c is InterviewChange => c !== null);
  const updates = changes.filter((c) => c.kind === "update");
  const cancels = changes.filter((c) => c.kind === "cancel");

  const reviewIds = w.reviews.map((r) => r.id);
  const moved = await prisma.$transaction(async (tx) => {
    let candidates = 0;
    let batches = 0;
    if (choices.ownerUserId) {
      candidates = (await tx.candidate.updateMany({ where: { workspaceId: workspace.id, ownerId: target.userId }, data: { ownerId: choices.ownerUserId } })).count;
      batches = (await tx.candidateBatch.updateMany({ where: { workspaceId: workspace.id, ownerId: target.userId }, data: { ownerId: choices.ownerUserId } })).count;
    }
    let reviews = 0;
    if (choices.reviewerUserId && reviewIds.length) {
      reviews = (await tx.interviewSession.updateMany({ where: { id: { in: reviewIds }, workspaceId: workspace.id }, data: { userId: choices.reviewerUserId } })).count;
    }
    for (const c of updates) {
      await tx.interviewSession.update({
        where: { id: c.id },
        data: {
          ...(c.userId ? { userId: c.userId } : {}),
          ...(c.panelJson !== undefined ? { panelJson: c.panelJson } : {}),
          ...(c.questionsOwnerId !== undefined ? { questionsOwnerId: c.questionsOwnerId } : {}),
        },
      });
    }
    const keys = (await tx.mcpApiKey.updateMany({ where: { workspaceId: workspace.id, createdByUserId: target.userId, revokedAt: null }, data: { revokedAt: now } })).count;
    await tx.workspaceMember.delete({ where: { id: target.memberId } });
    return { candidates, batches, reviews, keys };
  });

  // Calendar events on the leaving member's calendar move to the new host's,
  // before their calendar connection (and the event rows with it) goes.
  for (const c of updates.filter((u) => u.hostChanged && u.userId)) {
    const ev = await prisma.interviewCalendarEvent.findUnique({ where: { sessionId: c.id }, select: { connection: { select: { userId: true } } } });
    if (ev?.connection.userId === target.userId) {
      await cancelInterviewEvent(c.id);
      await syncInterviewEvent(c.id, { organiserIds: [c.userId!, actor.userId] });
    }
  }
  let cancelled = 0;
  for (const c of cancels) {
    const s = w.upcoming.find((u) => u.id === c.id);
    // Only tell candidates about interviews that have not already slipped past.
    const future = !s?.scheduledAt || s.scheduledAt.getTime() > now.getTime();
    const ok = await cancelUpcomingInterview({
      workspaceId: workspace.id,
      sessionId: c.id,
      actor,
      reason: `The host, ${target.name ?? target.email ?? "a member"}, left the workspace.`,
      notifyCandidate: future,
    });
    if (ok) cancelled++;
  }

  const calendarDisconnected = w.calendar ? await disconnectCalendar(workspace.id, target.userId) : false;

  const who = { name: target.name, email: target.email };
  await writeWorkspaceAuditEntry({
    workspaceId: workspace.id,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.MEMBER_REMOVED,
    targetType: "workspaceMember",
    targetId: target.memberId,
    meta: { userId: target.userId, email: target.email, role: target.role },
  });
  const outcome: HandoverOutcome = {
    candidates: moved.candidates,
    batches: moved.batches,
    interviewsReassigned: updates.filter((u) => u.hostChanged).length,
    interviewsCancelled: cancelled,
    reviews: moved.reviews,
    apiKeysRevoked: moved.keys,
    calendarDisconnected,
  };
  const total = outcome.candidates + outcome.batches + outcome.interviewsReassigned + outcome.interviewsCancelled + outcome.reviews + outcome.apiKeysRevoked;
  if (total > 0 || calendarDisconnected || updates.length > 0) {
    await writeWorkspaceAuditEntry({
      workspaceId: workspace.id,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_WORK_HANDED_OVER,
      targetType: "workspaceMember",
      targetId: target.memberId,
      meta: {
        ...who,
        userId: target.userId,
        candidates: outcome.candidates,
        batches: outcome.batches,
        interviewsReassigned: outcome.interviewsReassigned,
        interviewsCancelled: outcome.interviewsCancelled,
        reviews: outcome.reviews,
        apiKeysRevoked: outcome.apiKeysRevoked,
        calendarDisconnected,
        toName: choices.ownerUserId ? (a.names[choices.ownerUserId] ?? null) : null,
      },
    });
  }

  await scaleStripeSeats(workspace.stripeSubscriptionId, workspace.memberCount - 1);
  return outcome;
}

/** Deletes the member's calendar connection in this workspace, revoking the Google grant when we can. */
async function disconnectCalendar(workspaceId: string, userId: string): Promise<boolean> {
  const conn = await prisma.calendarConnection.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true, provider: true, refreshTokenEnc: true, accessTokenEnc: true },
  });
  if (!conn) return false;
  // Revoking a Google grant ends it for every workspace the person connected
  // with it, so only revoke when this is their last calendar connection.
  const others = await prisma.calendarConnection.count({ where: { userId, id: { not: conn.id } } });
  if (conn.provider === "google" && others === 0) {
    try {
      const token = decryptAtRest(conn.refreshTokenEnc ?? conn.accessTokenEnc);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
    } catch {
      // The grant also dies when they remove the app in their Google account.
    }
  }
  await prisma.calendarConnection.delete({ where: { id: conn.id } }).catch(() => null);
  return true;
}

/** Per-seat subscriptions follow the member count. Best effort. */
export async function scaleStripeSeats(subscriptionId: string | null, members: number): Promise<void> {
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return;
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = seatItem(subscription.items.data)?.id;
    if (itemId) await stripe.subscriptionItems.update(itemId, { quantity: Math.max(1, members) });
  } catch (err) {
    console.error("[members] Stripe seat update failed:", err);
  }
}
