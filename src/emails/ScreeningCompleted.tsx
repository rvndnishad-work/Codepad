/**
 * Recruiter notify when a candidate submits their AI screening (IP-24).
 * Replaces the hand-rolled HTML formerly in src/lib/ai-interview/submit-notify.ts.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type ScreeningCompletedProps = {
  recruiterName: string;
  candidateName: string;
  positionTitle: string;
  workspaceName: string;
  score: number;
  /** 0–100 cheat suspicion score, or null if not computed. */
  aiSuspicionScore: number | null;
  consoleUrl: string;
};

function scoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

function integrityNote(aiSuspicionScore: number | null): React.ReactNode {
  if (aiSuspicionScore === null) return null;
  if (aiSuspicionScore >= 60) {
    return (
      <span style={{ color: "#fb7185", fontWeight: 700 }}>
        {` (High AI-cheat suspicion: ${aiSuspicionScore}/100)`}
      </span>
    );
  }
  if (aiSuspicionScore >= 30) {
    return (
      <span style={{ color: "#fbbf24" }}>
        {` (Some integrity flags: ${aiSuspicionScore}/100)`}
      </span>
    );
  }
  return null;
}

export function ScreeningCompleted({
  recruiterName,
  candidateName,
  positionTitle,
  workspaceName,
  score,
  aiSuspicionScore,
  consoleUrl,
}: ScreeningCompletedProps) {
  return (
    <BaseLayout
      preview={`${candidateName} finished their screening — ${score}%`}
      footer={`Sent from ${workspaceName} — Interviewpad AI Screening.`}
    >
      <Text style={emailStyles.badge("#34d399")}>Screening Completed</Text>
      <Text style={emailStyles.h1}>
        {candidateName} finished their screening.
      </Text>
      <Text style={emailStyles.body}>
        Hi {recruiterName}, a candidate just submitted their AI screening for the{" "}
        <span style={emailStyles.emphasis}>{positionTitle}</span> role.
      </Text>
      <div style={emailStyles.scoreCardOuter}>
        <Text style={emailStyles.scoreLabel}>Composite score</Text>
        <Text style={emailStyles.scoreValue(scoreColor(score))}>
          {score}%{integrityNote(aiSuspicionScore)}
        </Text>
      </div>
      <Button href={consoleUrl} style={emailStyles.cta}>
        Review scorecard →
      </Button>
    </BaseLayout>
  );
}

export function screeningCompletedText(p: ScreeningCompletedProps): string {
  return [
    `${p.candidateName} finished their AI screening for ${p.positionTitle}.`,
    "",
    `Composite score: ${p.score}%`,
    p.aiSuspicionScore !== null ? `AI-cheat suspicion: ${p.aiSuspicionScore}/100` : "",
    "",
    `Review the scorecard: ${p.consoleUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
