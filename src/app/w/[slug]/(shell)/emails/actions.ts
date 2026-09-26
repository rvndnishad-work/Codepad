"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canMember } from "@/lib/permissions";
import { canOfferResend, resendPathFor } from "@/lib/workspace/email-activity";
import { resendInviteAction } from "../ai-interviews/actions";
import { resendTakeHomeAction } from "../take-homes/actions";

export type ResendResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Resend an invite that bounced or was not sent, from Email activity.
 *
 * Only invites have a resend path today: AI screening invites and take-home
 * invites. This finds the invite the email belonged to and hands it to the
 * same resend action the AI screening and take-home pages use, which check
 * permissions, reopen expired invites and write the audit entry.
 */
export async function resendEmailAction(slug: string, emailLogId: string): Promise<ResendResult> {
  try {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return { ok: false, error: "Not signed in." };
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, members: { select: { userId: true, role: true, permissions: true } } },
    });
    if (!workspace) return { ok: false, error: "Workspace not found." };
    const member = workspace.members.find((m) => m.userId === session.user.id);
    if (!member || !(await canMember(member, "email:read"))) {
      return { ok: false, error: "You do not have access to email activity." };
    }

    const log = await prisma.emailLog.findFirst({
      where: { id: emailLogId, workspaceId: workspace.id },
      select: { id: true, template: true, status: true, recipientEmail: true, sessionId: true },
    });
    if (!log) return { ok: false, error: "That email is not in this workspace." };
    if (!canOfferResend(log)) return { ok: false, error: "Only invites that bounced or were not sent can be resent from here." };

    const path = resendPathFor(log.template);
    let to: string | null = null;
    let run: () => Promise<{ ok: true; sent?: boolean; reason?: string } | { ok: false; error: string }>;

    if (path === "ai-screening") {
      // Older rows have no session id: fall back to the newest open invite
      // for the same address.
      const s = await prisma.aIInterviewSession.findFirst({
        where: log.sessionId
          ? { id: log.sessionId, workspaceId: workspace.id }
          : {
              workspaceId: workspace.id,
              practice: false,
              candidateEmail: { equals: log.recipientEmail, mode: "insensitive" },
              status: { in: ["PENDING", "EXPIRED"] },
            },
        orderBy: { createdAt: "desc" },
        select: { id: true, candidateEmail: true },
      });
      if (!s) return { ok: false, error: "The AI screening invite for this email no longer exists." };
      to = s.candidateEmail;
      run = () => resendInviteAction(slug, s.id);
    } else if (path === "take-home" && log.sessionId) {
      const s = await prisma.interviewSession.findFirst({
        where: { id: log.sessionId, workspaceId: workspace.id, type: "take-home" },
        select: { id: true, candidate: { select: { email: true } } },
      });
      if (!s) return { ok: false, error: "The take-home for this email no longer exists." };
      to = s.candidate?.email ?? null;
      run = () => resendTakeHomeAction(slug, s.id);
    } else {
      return { ok: false, error: "This email cannot be resent from here." };
    }

    // An address that bounced before is blocked for every sender; resending
    // to it would only log another blocked attempt.
    if (to) {
      const blocked = await prisma.emailSuppression.findUnique({
        where: { address: to.trim().toLowerCase() },
        select: { reason: true },
      });
      if (blocked) {
        return {
          ok: false,
          error:
            path === "take-home"
              ? `${to} bounced before, so we no longer send to it. Fix the email on the candidate, then resend.`
              : `${to} bounced before, so we no longer send to it. Add the person to the screening again with the right address.`,
        };
      }
    }

    const res = await run();
    if (!res.ok) return { ok: false, error: res.error };
    if (res.sent === false) {
      return { ok: false, error: `The invite is open again, but the email did not go out${res.reason ? `: ${res.reason}` : "."}` };
    }
    revalidatePath(`/w/${slug}/emails`);
    return { ok: true, message: to ? `Invite sent again to ${to}.` : "Invite sent again." };
  } catch (err) {
    console.error("[emails] resend failed:", err);
    return { ok: false, error: "The invite could not be resent. Try again in a moment." };
  }
}
