/**
 * Take-home assignment invite (IP-27). Sent when a recruiter assigns a
 * take-home to a candidate.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type TakeHomeInviteProps = {
  candidateName: string;
  challengeTitle: string;
  workspaceName: string;
  takeHomeUrl: string;
  timeLimitMin: number;
  /** ISO string — formatted for display as UTC with a timezone note. */
  expiresAt: string;
};

/** Human-readable UTC deadline. We show UTC explicitly + a note so the
 *  candidate can convert; their exact locale isn't known at send time. */
export function formatDeadlineUTC(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleString("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " UTC"
  );
}

export function TakeHomeInvite({
  candidateName,
  challengeTitle,
  workspaceName,
  takeHomeUrl,
  timeLimitMin,
  expiresAt,
}: TakeHomeInviteProps) {
  return (
    <BaseLayout
      preview={`Your take-home from ${workspaceName}: ${challengeTitle}`}
      footer={`This take-home was sent on behalf of ${workspaceName}. If you didn't expect it, you can safely ignore this email.`}
    >
      <Text style={emailStyles.badge("#a78bfa")}>Take-Home Assignment</Text>
      <Text style={emailStyles.h1}>
        Hi {candidateName} — you&apos;ve got a take-home to complete.
      </Text>
      <Text style={emailStyles.body}>
        {workspaceName} has assigned you a take-home exercise:{" "}
        <span style={emailStyles.emphasis}>{challengeTitle}</span>. You&apos;ll
        work through it in your browser — no setup required.
      </Text>
      <div style={emailStyles.scoreCardOuter}>
        <Text style={emailStyles.scoreLabel}>Time limit</Text>
        <Text style={{ ...emailStyles.scoreValue("#F3F4F6"), fontSize: 20 }}>
          {timeLimitMin} minutes once you start
        </Text>
        <Text style={{ ...emailStyles.scoreLabel, marginTop: 12 }}>Complete by</Text>
        <Text style={{ ...emailStyles.scoreValue("#fbbf24"), fontSize: 18 }}>
          {formatDeadlineUTC(expiresAt)}
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
        The timer only starts when you open the exercise — the deadline above is
        the last moment you can begin. Times shown in UTC.
      </Text>
    </BaseLayout>
  );
}

export function takeHomeInviteText(p: TakeHomeInviteProps): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `${p.workspaceName} has assigned you a take-home exercise: ${p.challengeTitle}.`,
    "",
    `Time limit: ${p.timeLimitMin} minutes once you start.`,
    `Complete by: ${formatDeadlineUTC(p.expiresAt)}.`,
    "",
    "Start here:",
    p.takeHomeUrl,
    "",
    "The timer only starts when you open the exercise. Times shown in UTC.",
  ].join("\n");
}
