/**
 * Multi-question take-home invite (IP-88). Sent when a recruiter dispatches a
 * curated, session-backed take-home (N questions) to a candidate.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";
import { formatDeadlineUTC } from "./TakeHomeInvite";

export type TakeHomeSessionInviteProps = {
  candidateName: string;
  title: string;
  workspaceName: string;
  takeHomeUrl: string;
  questionCount: number;
  /** ISO deadline (last moment to start). */
  deadlineAt: string;
};

export function TakeHomeSessionInvite({
  candidateName,
  title,
  workspaceName,
  takeHomeUrl,
  questionCount,
  deadlineAt,
}: TakeHomeSessionInviteProps) {
  return (
    <BaseLayout
      preview={`Your take-home from ${workspaceName}: ${title}`}
      footer={`This take-home was sent on behalf of ${workspaceName}. If you didn't expect it, you can safely ignore this email.`}
    >
      <Text style={emailStyles.badge("#a78bfa")}>Take-Home Assessment</Text>
      <Text style={emailStyles.h1}>
        Hi {candidateName} — you&apos;ve got a take-home to complete.
      </Text>
      <Text style={emailStyles.body}>
        {workspaceName} has assigned you{" "}
        <span style={emailStyles.emphasis}>{title}</span> —{" "}
        {questionCount} question{questionCount === 1 ? "" : "s"} you&apos;ll work
        through in your browser, each with its own timer. No setup required.
      </Text>
      <div style={emailStyles.scoreCardOuter}>
        <Text style={emailStyles.scoreLabel}>Questions</Text>
        <Text style={{ ...emailStyles.scoreValue("#F3F4F6"), fontSize: 20 }}>
          {questionCount} · each separately timed
        </Text>
        <Text style={{ ...emailStyles.scoreLabel, marginTop: 12 }}>Start by</Text>
        <Text style={{ ...emailStyles.scoreValue("#fbbf24"), fontSize: 18 }}>
          {formatDeadlineUTC(deadlineAt)}
        </Text>
      </div>
      <Button href={takeHomeUrl} style={emailStyles.cta}>
        Start your take-home →
      </Button>
      <Text style={emailStyles.linkFallback}>
        Or paste this link into your browser:
        <br />
        <a href={takeHomeUrl} style={emailStyles.link}>
          {takeHomeUrl}
        </a>
        <br />
        <br />
        Each question&apos;s timer starts only when you open it — the deadline
        above is the last moment you can begin. Times shown in UTC.
      </Text>
    </BaseLayout>
  );
}

export function takeHomeSessionInviteText(p: TakeHomeSessionInviteProps): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `${p.workspaceName} has assigned you a take-home: ${p.title} (${p.questionCount} question${p.questionCount === 1 ? "" : "s"}, each separately timed).`,
    "",
    `Start by: ${formatDeadlineUTC(p.deadlineAt)}.`,
    "",
    "Begin here:",
    p.takeHomeUrl,
    "",
    "Each question's timer starts when you open it. Times shown in UTC.",
  ].join("\n");
}
