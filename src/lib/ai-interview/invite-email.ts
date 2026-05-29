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
    },
  });
}
