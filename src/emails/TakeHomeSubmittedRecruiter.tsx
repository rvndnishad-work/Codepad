/**
 * Take-home submission notify to workspace recruiters (IP-27).
 * Score is optional — at submit time the auto-grade may not be final, so the
 * email links to the review surface rather than asserting a number.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type TakeHomeSubmittedRecruiterProps = {
  recruiterName: string;
  candidateName: string;
  challengeTitle: string;
  workspaceName: string;
  reviewUrl: string;
  /** Optional auto-grade percentage, when available at submit time. */
  score: number | null;
};

function scoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

export function TakeHomeSubmittedRecruiter({
  recruiterName,
  candidateName,
  challengeTitle,
  workspaceName,
  reviewUrl,
  score,
}: TakeHomeSubmittedRecruiterProps) {
  return (
    <BaseLayout
      preview={`${candidateName} submitted their take-home`}
      footer={`Sent from ${workspaceName} — Interviewpad take-homes.`}
    >
      <Text style={emailStyles.badge("#34d399")}>Take-Home Submitted</Text>
      <Text style={emailStyles.h1}>{candidateName} submitted their take-home.</Text>
      <Text style={emailStyles.body}>
        Hi {recruiterName}, {candidateName} just submitted{" "}
        <span style={emailStyles.emphasis}>{challengeTitle}</span>.
      </Text>
      {score !== null && (
        <div style={emailStyles.scoreCardOuter}>
          <Text style={emailStyles.scoreLabel}>Auto-grade</Text>
          <Text style={emailStyles.scoreValue(scoreColor(score))}>{score}%</Text>
        </div>
      )}
      <Button href={reviewUrl} style={emailStyles.cta}>
        Review submission →
      </Button>
    </BaseLayout>
  );
}

export function takeHomeSubmittedRecruiterText(
  p: TakeHomeSubmittedRecruiterProps,
): string {
  return [
    `${p.candidateName} submitted their take-home for ${p.challengeTitle}.`,
    p.score !== null ? `Auto-grade: ${p.score}%` : "",
    "",
    `Review: ${p.reviewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
