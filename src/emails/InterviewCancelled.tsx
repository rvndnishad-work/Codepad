/**
 * Tells a candidate their upcoming live interview is cancelled. Sent when a
 * member who hosted it leaves the workspace and the admin chose to cancel
 * rather than hand the interview to someone else.
 */
import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";
import { formatDeadlineUTC } from "./TakeHomeInvite";
import { BrandHeader, CandidateFooterLines, candidateFooterText, type CandidateEmailExtras } from "./candidate-brand";

export type InterviewCancelledProps = {
  candidateName: string;
  workspaceName: string;
  title: string;
  /** ISO time the interview was planned for, if it had one. */
  scheduledAt: string | null;
} & CandidateEmailExtras;

export function InterviewCancelled({ candidateName, workspaceName, title, scheduledAt, brand, unsubscribeUrl }: InterviewCancelledProps) {
  return (
    <BaseLayout
      preview={`Your interview with ${workspaceName} is cancelled`}
      footer={`${workspaceName} sent this through Interviewpad. Reply to your recruiter if you have questions.`}
      header={<BrandHeader brand={brand} />}
      footerExtra={<CandidateFooterLines brand={brand} unsubscribeUrl={unsubscribeUrl} />}
    >
      <Text style={emailStyles.badge("#f87171")}>Interview cancelled</Text>
      <Text style={emailStyles.h1}>Hi {candidateName}, your interview is cancelled.</Text>
      <Text style={emailStyles.body}>
        {workspaceName} has cancelled <span style={emailStyles.emphasis}>{title}</span>
        {scheduledAt ? `, planned for ${formatDeadlineUTC(scheduledAt)} (UTC)` : ""}. The link you were sent no longer works.
      </Text>
      <Text style={emailStyles.body}>
        This is not a decision about your application. Your recruiter will be in touch if they would like to arrange a new time.
      </Text>
    </BaseLayout>
  );
}

export function interviewCancelledText(p: InterviewCancelledProps): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `${p.workspaceName} has cancelled ${p.title}${p.scheduledAt ? `, planned for ${formatDeadlineUTC(p.scheduledAt)} (UTC)` : ""}. The link you were sent no longer works.`,
    "",
    "This is not a decision about your application. Your recruiter will be in touch if they would like to arrange a new time.",
    ...candidateFooterText(p),
  ].join("\n");
}
