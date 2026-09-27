"use server";

/**
 * Public email link actions. Both run from a button press on their page,
 * never on page load, so mail scanners that open links cannot trigger them.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rateLimitDistributed } from "@/lib/rate-limit";
import { verifyUnsubscribe } from "@/lib/email-unsubscribe";
import { replyToTokenFresh } from "@/lib/workspace/candidate-experience";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

/** Confirm a workspace reply-to address from the link in the confirmation email. */
export async function confirmReplyToAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const back = `/email/reply-to/${encodeURIComponent(token)}`;
  if (!token || token.length > 200) redirect(`${back}?state=invalid`);

  const ws = await prisma.workspace.findUnique({
    where: { replyToToken: token },
    select: { id: true, replyToEmail: true },
  });
  if (!ws?.replyToEmail) redirect(`${back}?state=invalid`);
  if (!replyToTokenFresh(token)) redirect(`${back}?state=expired`);

  const done = await prisma.workspace.updateMany({
    where: { id: ws.id, replyToToken: token },
    data: { replyToConfirmedAt: new Date(), replyToToken: null },
  });
  if (done.count) {
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      actorUserId: null,
      actorEmail: ws.replyToEmail,
      action: WORKSPACE_AUDIT_ACTIONS.REPLY_TO_CONFIRMED,
      targetType: "workspace",
      targetId: ws.id,
      meta: { tab: "candidate-experience", email: ws.replyToEmail },
    });
  }
  redirect(`${back}?state=done`);
}

/** Stop candidate emails to an address, from the link in any candidate email. */
export async function unsubscribeAction(formData: FormData): Promise<void> {
  const email = String(formData.get("e") ?? "").trim().toLowerCase();
  const sig = String(formData.get("s") ?? "");
  const q = new URLSearchParams({ e: email, s: sig });
  if (!email || email.length > 254 || !verifyUnsubscribe(email, sig)) redirect(`/email/unsubscribe?${q}&state=invalid`);

  const limit = await rateLimitDistributed(`email:unsubscribe:${email}`, 10, 60 * 60_000);
  if (!limit.ok) redirect(`/email/unsubscribe?${q}&state=busy`);

  const existing = await prisma.emailSuppression.findUnique({ where: { address: email }, select: { id: true } });
  if (!existing) {
    await prisma.emailSuppression.create({
      data: { address: email, reason: "unsubscribe", note: "Unsubscribed from a candidate email link" },
    });
  }
  redirect(`/email/unsubscribe?${q}&state=done`);
}
