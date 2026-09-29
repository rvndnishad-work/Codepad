/**
 * Sends (or re-sends) an AI screening invite email and records the outcome on
 * the session, so the recruiter sees "Email failed" with a Resend button
 * instead of a silent failure. Shared by the server actions and the cron
 * reminder sweep. Server-only.
 */
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "./invite-email";

export type InviteDelivery = { sent: boolean; status: "SENT" | "FAILED" | "SKIPPED"; reason?: string };

type SessionForInvite = {
  id: string;
  inviteToken: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  expiresAt: Date | null;
  rounds?: { estimatedMinutes: number }[];
};

export function inviteUrlFor(origin: string, inviteToken: string): string {
  return `${origin.replace(/\/$/, "")}/ai-interview/${inviteToken}`;
}

export async function deliverInvite(
  session: SessionForInvite,
  workspace: { id: string; name: string },
  origin: string,
  opts: { reminder?: boolean } = {},
): Promise<InviteDelivery> {
  const minutes = session.rounds?.reduce((n, r) => n + (r.estimatedMinutes || 0), 0) || null;
  let delivery: InviteDelivery;
  try {
    const res = await sendInviteEmail({
      candidateName: session.candidateName,
      candidateEmail: session.candidateEmail,
      positionTitle: session.positionTitle,
      workspaceName: workspace.name,
      inviteUrl: inviteUrlFor(origin, session.inviteToken),
      workspaceId: workspace.id,
      sessionId: session.id,
      reminder: opts.reminder,
      expiresAt: session.expiresAt,
      minutes,
    });
    delivery = res.sent
      ? { sent: true, status: "SENT" }
      : { sent: false, status: /not configured|no provider/i.test(res.reason) ? "SKIPPED" : "FAILED", reason: res.reason };
  } catch (err) {
    delivery = { sent: false, status: "FAILED", reason: err instanceof Error ? err.message : String(err) };
  }

  const now = new Date();
  await prisma.aIInterviewSession
    .update({
      where: { id: session.id },
      data: opts.reminder
        ? { reminderSentAt: delivery.sent ? now : undefined, inviteEmailStatus: delivery.status, inviteEmailError: delivery.reason ?? null }
        : { inviteSentAt: now, inviteEmailStatus: delivery.status, inviteEmailError: delivery.reason ?? null },
    })
    .catch((err) => console.error(`[ai-invite] could not record delivery for ${session.id}:`, err));

  if (!delivery.sent) console.warn(`[ai-invite] ${opts.reminder ? "reminder" : "invite"} to ${session.candidateEmail} not sent: ${delivery.reason}`);
  return delivery;
}
