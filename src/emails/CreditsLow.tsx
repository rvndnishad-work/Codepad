/**
 * Tells workspace owners and admins that AI screening credits dropped below
 * the threshold they chose on Billing and usage. Sent once per dip.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type CreditsLowProps = {
  recipientName: string;
  workspaceName: string;
  balance: number;
  threshold: number;
  buyUrl: string;
};

const credits = (n: number) => `${n} ${n === 1 ? "credit" : "credits"}`;

export function CreditsLow({ recipientName, workspaceName, balance, threshold, buyUrl }: CreditsLowProps) {
  return (
    <BaseLayout
      preview={`${workspaceName} has ${credits(balance)} left`}
      footer={`You get this because you are an owner or admin of ${workspaceName}. Change or turn off this email on Billing and usage.`}
    >
      <Text style={emailStyles.badge("#fbbf24")}>AI screening credits</Text>
      <Text style={emailStyles.h1}>
        Hi {recipientName}, {workspaceName} has {credits(balance)} left.
      </Text>
      <Text style={emailStyles.body}>
        That is below the {threshold} you asked us to warn you about. A candidate cannot start an AI screening once the credits run out, so
        buy more before your next invites go out.
      </Text>
      <Button href={buyUrl} style={emailStyles.cta}>
        Buy credits
      </Button>
      <Text style={emailStyles.linkFallback}>
        If the button does not work, paste this link into your browser:
        <br />
        <a href={buyUrl} style={emailStyles.link}>
          {buyUrl}
        </a>
      </Text>
    </BaseLayout>
  );
}

export function creditsLowText(p: CreditsLowProps): string {
  return [
    `Hi ${p.recipientName},`,
    "",
    `${p.workspaceName} has ${credits(p.balance)} left, below the ${p.threshold} you asked us to warn you about.`,
    "A candidate cannot start an AI screening once the credits run out.",
    "",
    `Buy credits: ${p.buyUrl}`,
  ].join("\n");
}
