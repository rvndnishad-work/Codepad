/**
 * Take-home submission confirmation to the candidate (IP-27).
 */
import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type TakeHomeSubmittedCandidateProps = {
  candidateName: string;
  challengeTitle: string;
  workspaceName: string;
};

export function TakeHomeSubmittedCandidate({
  candidateName,
  challengeTitle,
  workspaceName,
}: TakeHomeSubmittedCandidateProps) {
  return (
    <BaseLayout
      preview={`We received your take-home: ${challengeTitle}`}
      footer={`Sent on behalf of ${workspaceName}.`}
    >
      <Text style={emailStyles.badge("#34d399")}>Submission Received</Text>
      <Text style={emailStyles.h1}>Thanks, {candidateName} — we&apos;ve got it.</Text>
      <Text style={emailStyles.body}>
        Your take-home for{" "}
        <span style={emailStyles.emphasis}>{challengeTitle}</span> has been
        submitted to {workspaceName}. There&apos;s nothing more you need to do.
      </Text>
      <Text style={emailStyles.body}>
        The team will review your work and follow up with next steps. Thanks for
        taking the time.
      </Text>
    </BaseLayout>
  );
}

export function takeHomeSubmittedCandidateText(
  p: TakeHomeSubmittedCandidateProps,
): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `Your take-home for ${p.challengeTitle} has been submitted to ${p.workspaceName}.`,
    "",
    "There's nothing more you need to do — the team will review and follow up.",
  ].join("\n");
}
