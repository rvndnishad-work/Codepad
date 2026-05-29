/**
 * Recruiter notify on AI screening submission (IP-24 migration). Thin wrapper
 * around the typed email service + the React Email template at
 * `src/emails/ScreeningCompleted.tsx`.
 */
import { sendEmail } from "@/lib/email";

export type RecruiterNotifyInput = {
  recruiterEmail: string;
  recruiterName: string;
  candidateName: string;
  positionTitle: string;
  workspaceName: string;
  score: number;
  aiSuspicionScore: number | null;
  consoleUrl: string;
};

/**
 * Notify a single workspace recruiter that a candidate just submitted. Caller
 * fans out one call per member; this keeps templating logic in one place.
 * Returns a normalized status — failures should be logged, never thrown.
 */
export async function sendRecruiterNotifyEmail(input: RecruiterNotifyInput) {
  return sendEmail({
    template: "screening-completed",
    to: input.recruiterEmail,
    props: {
      recruiterName: input.recruiterName,
      candidateName: input.candidateName,
      positionTitle: input.positionTitle,
      workspaceName: input.workspaceName,
      score: input.score,
      aiSuspicionScore: input.aiSuspicionScore,
      consoleUrl: input.consoleUrl,
    },
  });
}
