/**
 * Take-home 24h reminder (IP-27). Sent by the reminder cron when a take-home
 * is ~24h from expiry and the candidate hasn't started (or hasn't submitted).
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";
import { formatDeadlineUTC, type TakeHomeInviteProps } from "./TakeHomeInvite";

export type TakeHomeReminderProps = Pick<
  TakeHomeInviteProps,
  "candidateName" | "challengeTitle" | "workspaceName" | "takeHomeUrl" | "expiresAt"
> & {
  hoursLeft: number;
};

export function TakeHomeReminder({
  candidateName,
  challengeTitle,
  workspaceName,
  takeHomeUrl,
  expiresAt,
  hoursLeft,
}: TakeHomeReminderProps) {
  return (
    <BaseLayout
      preview={`Reminder: your ${workspaceName} take-home expires soon`}
      footer={`Sent on behalf of ${workspaceName}.`}
    >
      <Text style={emailStyles.badge("#fbbf24")}>Reminder · ~{hoursLeft}h left</Text>
      <Text style={emailStyles.h1}>
        Hi {candidateName} — your take-home is still waiting.
      </Text>
      <Text style={emailStyles.body}>
        Just a heads-up that your take-home for{" "}
        <span style={emailStyles.emphasis}>{challengeTitle}</span> from{" "}
        {workspaceName} closes on{" "}
        <span style={emailStyles.emphasis}>{formatDeadlineUTC(expiresAt)}</span>.
        It only takes a moment to begin — the timer starts when you open it.
      </Text>
      <Button href={takeHomeUrl} style={emailStyles.cta}>
        Start now →
      </Button>
      <Text style={emailStyles.linkFallback}>
        Or paste this link into your browser:
        <br />
        <a href={takeHomeUrl} style={emailStyles.link}>
          {takeHomeUrl}
        </a>
      </Text>
    </BaseLayout>
  );
}

export function takeHomeReminderText(p: TakeHomeReminderProps): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `Reminder: your take-home for ${p.challengeTitle} from ${p.workspaceName} closes on ${formatDeadlineUTC(p.expiresAt)} (~${p.hoursLeft}h left).`,
    "",
    "Start here:",
    p.takeHomeUrl,
  ].join("\n");
}
