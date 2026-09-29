/**
 * AI screening invite (IP-24 migration). Now a thin wrapper that delegates to
 * the typed email service + the React Email template at
 * `src/emails/AiScreeningInvite.tsx`.
 */
import { sendEmail, type EmailResult } from "@/lib/email";

export type InviteEmailInput = {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  workspaceName: string;
  inviteUrl: string;
  /** Attribution for the EmailLog row (workspace Email activity view). */
  workspaceId?: string;
  /** The AIInterviewSession id, so Email activity can resend this invite. */
  sessionId?: string;
  reminder?: boolean;
  expiresAt?: Date | null;
  minutes?: number | null;
};

/**
 * Send the candidate the link to their AI screening workpad. Returns the
 * adapter result; the caller should never throw if this fails — the invite is
 * already saved in the DB and the recruiter can copy the link manually.
 */
export async function sendInviteEmail(input: InviteEmailInput): Promise<EmailResult> {
  return sendEmail({
    template: "ai-screening-invite",
    to: input.candidateEmail,
    props: {
      candidateName: input.candidateName,
      positionTitle: input.positionTitle,
      workspaceName: input.workspaceName,
      inviteUrl: input.inviteUrl,
      reminder: input.reminder,
      expiresAt: input.expiresAt ? input.expiresAt.toISOString() : null,
      minutes: input.minutes ?? null,
    },
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
  });
}
