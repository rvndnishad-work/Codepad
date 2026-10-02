"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { canOfferResend, resendPathFor } from "@/lib/workspace/email-activity";
import type { ActionResult } from "../interviews/_components/ConfirmAction";

async function actor() {
  const session = await requireAdminAccess();
  if (!session?.user?.id) throw new Error("Not signed in.");
  return { id: session.user.id, email: session.user.email ?? null };
}

const cleanNote = (note: string) => (note ?? "").trim().slice(0, 500) || null;

/**
 * Resend an invite email that failed, bounced or was blocked. Uses the same
 * senders as the workspace's Email activity page (AI screening invite,
 * take-home invite, live interview invite), without the workspace member
 * checks, since this is platform staff. Unlike the workspace page it never
 * reopens an expired AI screening (that would hold the workspace's credits);
 * the workspace has to do that.
 */
export async function resendEmailAction(emailLogId: string, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = cleanNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };

  const log = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
    select: { id: true, template: true, status: true, recipientEmail: true, sessionId: true, workspaceId: true },
  });
  if (!log) return { ok: false, error: "That email log row no longer exists." };
  if (!canOfferResend(log)) return { ok: false, error: "Only invites that failed, bounced or were blocked can be resent." };
  if (!log.workspaceId) return { ok: false, error: "This email has no workspace, so its invite cannot be found." };
  const workspace = await prisma.workspace.findUnique({ where: { id: log.workspaceId }, select: { id: true, name: true } });
  if (!workspace) return { ok: false, error: "The workspace for this email no longer exists." };

  const path = resendPathFor(log.template);
  let to: string | null = null;
  let send: () => Promise<{ sent: boolean; reason?: string }>;

  if (path === "ai-screening") {
    const s = await prisma.aIInterviewSession.findFirst({
      where: log.sessionId
        ? { id: log.sessionId, workspaceId: workspace.id }
        : { workspaceId: workspace.id, practice: false, candidateEmail: { equals: log.recipientEmail, mode: "insensitive" }, status: { in: ["PENDING", "EXPIRED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, inviteToken: true, candidateName: true, candidateEmail: true, positionTitle: true, status: true, expiresAt: true, rounds: { select: { estimatedMinutes: true } } },
    });
    if (!s) return { ok: false, error: "The AI screening invite for this email no longer exists." };
    if (s.status !== "PENDING") return { ok: false, error: s.status === "EXPIRED" ? "The invite expired. The workspace can reopen it from AI screening (it holds credits again)." : "The candidate already started, so there is nothing to resend." };
    if (s.expiresAt && s.expiresAt.getTime() <= Date.now()) return { ok: false, error: "The invite expired. The workspace can reopen it from AI screening." };
    to = s.candidateEmail;
    send = async () => {
      const [{ deliverInvite }, { appOrigin }] = await Promise.all([import("@/lib/ai-interview/invites"), import("@/lib/interview/links")]);
      const res = await deliverInvite(s, workspace, await appOrigin());
      return { sent: res.sent, reason: res.reason };
    };
  } else if (path === "take-home" && log.sessionId) {
    const s = await prisma.interviewSession.findFirst({
      where: { id: log.sessionId, workspaceId: workspace.id, type: "take-home" },
      select: { id: true, title: true, status: true, deadlineAt: true, candidateName: true, candidateAccessToken: true, challengeIds: true, playgroundIds: true, promptScenarioIds: true, candidate: { select: { email: true } } },
    });
    if (!s) return { ok: false, error: "The take-home for this email no longer exists." };
    if (s.status !== "scheduled" && s.status !== "in_progress") return { ok: false, error: "Only open take-homes can be resent." };
    if (!s.deadlineAt || s.deadlineAt.getTime() <= Date.now()) return { ok: false, error: "The deadline has passed. The workspace has to extend it first." };
    if (!s.candidate?.email || !s.candidateAccessToken) return { ok: false, error: "This candidate has no email address." };
    to = s.candidate.email;
    const email = s.candidate.email;
    const token = s.candidateAccessToken;
    const deadlineAt = s.deadlineAt;
    send = async () => {
      const [{ sendBulkTakeHomeSessionInvites }, { parseIds }] = await Promise.all([import("@/lib/take-home/emails"), import("@/lib/take-home/status")]);
      const res = await sendBulkTakeHomeSessionInvites({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        title: s.title,
        questionCount: parseIds(s.challengeIds).length + parseIds(s.playgroundIds).length + parseIds(s.promptScenarioIds).length,
        deadlineAt,
        rows: [{ name: s.candidateName ?? "there", email, token, sessionId: s.id }],
      });
      return res.sent ? { sent: true } : { sent: false, reason: "The email provider did not accept it." };
    };
  } else if (path === "interview" && log.sessionId) {
    const sessionId = log.sessionId;
    send = async () => {
      const { resendInterviewInvite } = await import("@/lib/interview/invite-server");
      const res = await resendInterviewInvite({ workspaceId: workspace.id, sessionId, actor: { userId: who.id, email: who.email }, fallbackEmail: log.recipientEmail });
      if (!res.ok) throw new UserError(res.error);
      to = res.to;
      return { sent: res.sent, reason: res.reason };
    };
    to = log.recipientEmail;
  } else {
    return { ok: false, error: "This email cannot be resent from here." };
  }

  if (to) {
    const blocked = await prisma.emailSuppression.findUnique({ where: { address: to.trim().toLowerCase() }, select: { reason: true } });
    if (blocked) return { ok: false, error: `${to} is on the suppression list (${blocked.reason.replace(/_/g, " ")}). Lift the block first, or fix the address.` };
  }

  let res: { sent: boolean; reason?: string };
  try {
    res = await send();
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error("[admin-emails] resend failed:", e);
    return { ok: false, error: "The invite could not be resent. Try again in a moment." };
  }
  await logAdminAction({
    actor: who,
    action: "email.resend",
    targetType: "email",
    targetId: log.id,
    targetLabel: to ?? log.recipientEmail,
    before: { status: log.status, template: log.template },
    after: { sent: res.sent, reason: res.reason ?? null, workspaceId: workspace.id },
    note: n,
  });
  revalidatePath("/admin/emails");
  if (!res.sent) return { ok: false, error: `The email did not go out${res.reason ? `: ${res.reason}` : "."}` };
  return { ok: true, message: `Sent again to ${to ?? log.recipientEmail}.` };
}

/** Take an address off the suppression list so mail goes to it again. */
export async function liftSuppressionAction(suppressionId: string, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = cleanNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };
  const row = await prisma.emailSuppression.findUnique({ where: { id: suppressionId } });
  if (!row) return { ok: false, error: "That address is no longer blocked." };
  const del = await prisma.emailSuppression.deleteMany({ where: { id: suppressionId } });
  if (del.count === 0) return { ok: false, error: "That address is no longer blocked." };
  await logAdminAction({
    actor: who,
    action: "email.unsuppress",
    targetType: "email_address",
    targetId: row.address,
    targetLabel: row.address,
    before: { reason: row.reason, note: row.note, addedAt: row.addedAt },
    note: n,
  });
  revalidatePath("/admin/emails");
  return { ok: true, message: `${row.address} can get email again.` };
}

class UserError extends Error {}
