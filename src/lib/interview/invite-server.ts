/**
 * Resending and cancelling a live interview's candidate invite. Used by
 * Email activity (resend a bounced or unsent invite) and by the member
 * handover (cancel an upcoming interview and tell the candidate).
 * Callers check permissions; these only check the interview itself.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { appOrigin, candidateJoinUrl } from "./links";
import { cancelInterviewEvent } from "@/lib/calendar/server";
import { closeVideoRoomAfter } from "@/lib/video/close-after";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

type Actor = { userId: string | null; email: string | null };

export type InviteResend = { ok: true; to: string; sent: boolean; reason?: string } | { ok: false; error: string };

/** Statuses a live interview can still be joined in. */
const OPEN_STATUSES = new Set(["scheduled", "active", "in_progress"]);

/**
 * Sends the candidate a fresh copy of their interview invite, to the
 * candidate's current address (so a fixed typo is picked up), falling back
 * to `fallbackEmail` when the interview has no linked candidate email.
 */
export async function resendInterviewInvite(a: {
  workspaceId: string;
  sessionId: string;
  actor: Actor;
  fallbackEmail?: string | null;
}): Promise<InviteResend> {
  const s = await prisma.interviewSession.findFirst({
    where: { id: a.sessionId, workspaceId: a.workspaceId, type: { not: "take-home" } },
    select: {
      id: true,
      title: true,
      status: true,
      shareToken: true,
      shortCode: true,
      scheduledAt: true,
      totalSec: true,
      meetingUrl: true,
      candidateName: true,
      candidate: { select: { name: true, email: true } },
      workspace: { select: { name: true, slug: true } },
    },
  });
  if (!s || !s.workspace) return { ok: false, error: "The interview for this email no longer exists." };
  if (!OPEN_STATUSES.has(s.status)) return { ok: false, error: "This interview is over or cancelled, so there is nothing to resend." };
  if (s.scheduledAt && s.scheduledAt.getTime() + s.totalSec * 1000 < Date.now()) {
    return { ok: false, error: "This interview's time has passed. Schedule a new one instead." };
  }
  const to = (s.candidate?.email ?? a.fallbackEmail ?? "").trim().toLowerCase();
  if (!to) return { ok: false, error: "This candidate has no email address." };

  const { sendEmail } = await import("@/lib/email");
  const { candidateRoomUrl } = await import("./room-server");
  const origin = await appOrigin();
  const roomUrl = candidateRoomUrl({ id: s.id, shareToken: s.shareToken, scheduledAt: s.scheduledAt, totalSec: s.totalSec }, s.workspace.slug, origin);
  const res = await sendEmail({
    template: "interview-invite",
    to,
    props: {
      candidateName: s.candidate?.name || s.candidateName || "there",
      workspaceName: s.workspace.name,
      title: s.title,
      joinUrl: roomUrl ?? candidateJoinUrl(origin, s),
      shortCode: null,
      scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
      durationMin: Math.round(s.totalSec / 60),
      meetingUrl: s.meetingUrl,
    },
    workspaceId: a.workspaceId,
    sessionId: s.id,
    // A new key: the first invite's key would make the provider drop this one.
    idempotencyKey: `interview-invite:${s.id}:resend:${Date.now()}`,
  });
  await writeWorkspaceAuditEntry({
    workspaceId: a.workspaceId,
    actorUserId: a.actor.userId,
    actorEmail: a.actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_INVITE_RESENT,
    targetType: "interviewSession",
    targetId: s.id,
    meta: { candidateName: s.candidate?.name ?? s.candidateName ?? to, email: to, sent: res.sent },
  });
  return res.sent ? { ok: true, to, sent: true } : { ok: true, to, sent: false, reason: res.reason };
}

/**
 * Cancels an upcoming interview: marks it cancelled, removes the calendar
 * event and emails the candidate. The report and any notes stay.
 * Returns false when it was not open any more.
 */
export async function cancelUpcomingInterview(a: {
  workspaceId: string;
  sessionId: string;
  actor: Actor;
  reason: string;
  notifyCandidate: boolean;
}): Promise<boolean> {
  const s = await prisma.interviewSession.findFirst({
    where: { id: a.sessionId, workspaceId: a.workspaceId, type: { not: "take-home" }, status: "scheduled" },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      candidateName: true,
      candidate: { select: { name: true, email: true } },
      workspace: { select: { name: true } },
    },
  });
  if (!s) return false;
  const claimed = await prisma.interviewSession.updateMany({
    where: { id: s.id, status: "scheduled" },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  if (!claimed.count) return false;
  await cancelInterviewEvent(s.id);
  closeVideoRoomAfter(s.id);

  const email = s.candidate?.email;
  if (a.notifyCandidate && email) {
    try {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        template: "interview-cancelled",
        to: email,
        props: {
          candidateName: s.candidate?.name || s.candidateName || "there",
          workspaceName: s.workspace?.name ?? "The team",
          title: s.title,
          scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
        },
        workspaceId: a.workspaceId,
        sessionId: s.id,
        idempotencyKey: `interview-cancelled:${s.id}`,
      });
    } catch (err) {
      console.error("[interview-cancel] email failed:", err);
    }
  }
  await writeWorkspaceAuditEntry({
    workspaceId: a.workspaceId,
    actorUserId: a.actor.userId,
    actorEmail: a.actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_CANCELLED,
    targetType: "interviewSession",
    targetId: s.id,
    meta: { candidateName: s.candidate?.name ?? s.candidateName ?? null, reason: a.reason, notified: !!(a.notifyCandidate && email) },
  });
  return true;
}
