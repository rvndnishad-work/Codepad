/**
 * Live interview invite (IP-90). Sent when a recruiter creates a workspace
 * live-interview session with a candidate email — previously the candidate
 * was never contacted at all and the recruiter had to paste the link manually.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";
import { formatDeadlineUTC } from "./TakeHomeInvite";

export type InterviewInviteProps = {
  candidateName: string;
  workspaceName: string;
  title: string;
  joinUrl: string;
  /** Friendly 4-digit access code, if one was minted. */
  shortCode: string | null;
  /** ISO planned meeting time; null = "your recruiter will confirm the time". */
  scheduledAt: string | null;
  durationMin: number;
};

export function InterviewInvite({
  candidateName,
  workspaceName,
  title,
  joinUrl,
  shortCode,
  scheduledAt,
  durationMin,
}: InterviewInviteProps) {
  return (
    <BaseLayout
      preview={`Live interview with ${workspaceName}: ${title}`}
      footer={`This interview invitation was sent on behalf of ${workspaceName}. If you didn't expect it, you can safely ignore this email.`}
    >
      <Text style={emailStyles.badge("#60a5fa")}>Live Interview</Text>
      <Text style={emailStyles.h1}>
        Hi {candidateName} — you&apos;re invited to a live interview.
      </Text>
      <Text style={emailStyles.body}>
        {workspaceName} has scheduled{" "}
        <span style={emailStyles.emphasis}>{title}</span> — a live
        pair-programming session held right in your browser. No setup required.
      </Text>
      <div style={emailStyles.scoreCardOuter}>
        <Text style={emailStyles.scoreLabel}>When</Text>
        <Text style={{ ...emailStyles.scoreValue("#F3F4F6"), fontSize: 18 }}>
          {scheduledAt
            ? formatDeadlineUTC(scheduledAt)
            : "Your recruiter will confirm the time"}
        </Text>
        <Text style={{ ...emailStyles.scoreLabel, marginTop: 12 }}>Duration</Text>
        <Text style={{ ...emailStyles.scoreValue("#F3F4F6"), fontSize: 18 }}>
          ~{durationMin} minutes
        </Text>
        {shortCode && (
          <>
            <Text style={{ ...emailStyles.scoreLabel, marginTop: 12 }}>
              Access code
            </Text>
            <Text style={{ ...emailStyles.scoreValue("#fbbf24"), fontSize: 22 }}>
              {shortCode}
            </Text>
          </>
        )}
      </div>
      <Button href={joinUrl} style={emailStyles.cta}>
        Join your interview →
      </Button>
      <Text style={emailStyles.linkFallback}>
        Or paste this link into your browser:
        <br />
        <a href={joinUrl} style={emailStyles.link}>
          {joinUrl}
        </a>
        <br />
        <br />
        Keep this email — you&apos;ll use the same link (or the access code on
        the join page) when the session starts. Times shown in UTC.
      </Text>
    </BaseLayout>
  );
}

export function interviewInviteText(p: InterviewInviteProps): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `${p.workspaceName} has scheduled a live interview with you: ${p.title} (~${p.durationMin} minutes).`,
    "",
    p.scheduledAt
      ? `When: ${formatDeadlineUTC(p.scheduledAt)} (UTC).`
      : "Your recruiter will confirm the time.",
    ...(p.shortCode ? ["", `Access code: ${p.shortCode}`] : []),
    "",
    "Join here:",
    p.joinUrl,
  ].join("\n");
}
