/**
 * Sent from Settings > Security ("Email them now") to members who have not
 * turned on two-factor sign-in, when the workspace requires it for everyone.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type TwoFactorReminderProps = {
  workspaceName: string;
  senderName: string;
  /** Readable start date, such as "4 Oct 2026". Null when it is already required. */
  requiredFrom: string | null;
  setupUrl: string;
};

function lead(p: TwoFactorReminderProps): string {
  return p.requiredFrom
    ? `${p.workspaceName} will ask every member for two-factor sign-in from ${p.requiredFrom}.`
    : `${p.workspaceName} now asks every member for two-factor sign-in.`;
}

const DETAIL = "It adds a 6-digit code from an authenticator app when you sign in, and takes about two minutes to set up.";

function gate(p: TwoFactorReminderProps): string {
  return p.requiredFrom
    ? "From that date the workspace asks you to set it up before you can open it."
    : "The workspace asks you to set it up before you can open it.";
}

export function TwoFactorReminder(p: TwoFactorReminderProps) {
  return (
    <BaseLayout
      preview={lead(p)}
      footer={`${p.senderName} at ${p.workspaceName} sent this reminder from the workspace security settings.`}
    >
      <Text style={emailStyles.badge("#818cf8")}>Security</Text>
      <Text style={emailStyles.h1}>Turn on two-factor sign-in</Text>
      <Text style={emailStyles.body}>
        {lead(p)} {DETAIL} {gate(p)}
      </Text>
      <Button href={p.setupUrl} style={emailStyles.cta}>
        Set up two-factor sign-in
      </Button>
      <Text style={emailStyles.linkFallback}>
        If the button does not work, paste this link into your browser:
        <br />
        <a href={p.setupUrl} style={emailStyles.link}>
          {p.setupUrl}
        </a>
      </Text>
    </BaseLayout>
  );
}

export function twoFactorReminderText(p: TwoFactorReminderProps): string {
  return [
    `${lead(p)} ${DETAIL} ${gate(p)}`,
    "",
    "Set it up here:",
    p.setupUrl,
    "",
    `${p.senderName} at ${p.workspaceName} sent this reminder from the workspace security settings.`,
  ].join("\n");
}
