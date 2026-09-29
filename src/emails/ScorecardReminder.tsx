/**
 * Reminder to an interviewer who has not submitted their scorecard yet. Sent
 * when someone presses "Nudge" on the interview report.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type ScorecardReminderProps = {
  workspaceName: string;
  senderName: string;
  candidateName: string;
  title: string;
  /** True when they saved a draft but did not submit it. */
  hasDraft: boolean;
  scorecardUrl: string;
};

export function ScorecardReminder({ workspaceName, senderName, candidateName, title, hasDraft, scorecardUrl }: ScorecardReminderProps) {
  return (
    <BaseLayout
      preview={`Your scorecard for ${candidateName} is still open`}
      footer={`${senderName} at ${workspaceName} sent this reminder. The link is personal to you, so please do not forward it.`}
    >
      <Text style={emailStyles.badge("#818cf8")}>Scorecard</Text>
      <Text style={emailStyles.h1}>Your scorecard for {candidateName} is still open.</Text>
      <Text style={emailStyles.body}>
        {senderName} is waiting on the scorecards for <span style={emailStyles.emphasis}>{title}</span> before deciding.{" "}
        {hasDraft ? "You saved a draft but have not submitted it yet." : "It takes a few minutes: rate each area from 1 to 4, add your evidence and pick a recommendation."}
      </Text>
      <Button href={scorecardUrl} style={emailStyles.cta}>
        {hasDraft ? "Finish your scorecard" : "Fill in your scorecard"}
      </Button>
      <Text style={emailStyles.linkFallback}>
        If the button does not work, paste this link into your browser:
        <br />
        <a href={scorecardUrl} style={emailStyles.link}>
          {scorecardUrl}
        </a>
      </Text>
    </BaseLayout>
  );
}

export function scorecardReminderText(p: ScorecardReminderProps): string {
  return [
    `Your scorecard for ${p.candidateName} (${p.title}) is still open.`,
    p.hasDraft ? "You saved a draft but have not submitted it yet." : "Rate each area from 1 to 4, add your evidence and pick a recommendation.",
    "",
    p.scorecardUrl,
    "",
    `${p.senderName} at ${p.workspaceName} sent this reminder. The link is personal to you, so please do not forward it.`,
  ].join("\n");
}
