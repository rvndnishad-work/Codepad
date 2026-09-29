/**
 * Take-home 24h reminder (IP-27). Sent by the reminder cron when a take-home
 * is ~24h from expiry and the candidate hasn't started (or hasn't submitted).
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";
import { BrandHeader, CandidateFooterLines, CustomIntro, candidateFooterText, ctaStyle, type CandidateEmailExtras } from "./candidate-brand";
import { formatDeadlineUTC, type TakeHomeInviteProps } from "./TakeHomeInvite";

export type TakeHomeReminderProps = Pick<
  TakeHomeInviteProps,
  "candidateName" | "challengeTitle" | "workspaceName" | "takeHomeUrl" | "expiresAt"
> & {
  hoursLeft: number;
} & CandidateEmailExtras;

export function TakeHomeReminder({
  candidateName,
  challengeTitle,
  workspaceName,
  takeHomeUrl,
  expiresAt,
  hoursLeft,
  brand,
  custom,
  unsubscribeUrl,
}: TakeHomeReminderProps) {
  return (
    <BaseLayout
      preview={`Reminder: your ${workspaceName} take-home expires soon`}
      footer={`Sent on behalf of ${workspaceName}.`}
      header={<BrandHeader brand={brand} />}
      footerExtra={<CandidateFooterLines brand={brand} unsubscribeUrl={unsubscribeUrl} />}
    >
      <Text style={emailStyles.badge("#fbbf24")}>Reminder · ~{hoursLeft}h left</Text>
      {custom?.paragraphs ? (
        <>
          <CustomIntro paragraphs={custom.paragraphs} />
          <Text style={emailStyles.body}>
            The link closes on <span style={emailStyles.emphasis}>{formatDeadlineUTC(expiresAt)}</span>.
          </Text>
        </>
      ) : (
        <>
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
        </>
      )}
      <Button href={takeHomeUrl} style={ctaStyle(brand)}>
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
    ...(p.custom?.paragraphs
      ? [...p.custom.paragraphs.flatMap((x) => [x, ""]), `The link closes on ${formatDeadlineUTC(p.expiresAt)} (~${p.hoursLeft}h left).`]
      : [`Hi ${p.candidateName},`, "", `Reminder: your take-home for ${p.challengeTitle} from ${p.workspaceName} closes on ${formatDeadlineUTC(p.expiresAt)} (~${p.hoursLeft}h left).`]),
    "",
    "Start here:",
    p.takeHomeUrl,
    ...candidateFooterText(p),
  ].join("\n");
}
