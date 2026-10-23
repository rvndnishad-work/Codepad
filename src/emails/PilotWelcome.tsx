/**
 * Sent to the owner of a pilot workspace our team created after a demo.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type PilotWelcomeProps = {
  name: string;
  workspaceName: string;
  endsOn: string;
  credits: number;
  seats: number;
  url: string;
  /** True when they need to sign up first (the link is an invite). */
  newAccount: boolean;
};

export function PilotWelcome(p: PilotWelcomeProps) {
  return (
    <BaseLayout
      preview={`Your pilot workspace ${p.workspaceName} is ready`}
      footer={`You get this because our team set up a pilot workspace for ${p.workspaceName} after your demo request.`}
    >
      <Text style={emailStyles.badge("#34d399")}>Pilot workspace</Text>
      <Text style={emailStyles.h1}>
        Hi {p.name}, your pilot workspace {p.workspaceName} is ready.
      </Text>
      <Text style={emailStyles.body}>
        It has everything in Growth until <span style={emailStyles.emphasis}>{p.endsOn}</span>, room for{" "}
        <span style={emailStyles.emphasis}>{p.seats}</span> people and <span style={emailStyles.emphasis}>{p.credits}</span> AI
        screening credits. Nothing is charged. Before the pilot ends you can pick a plan from Billing; your candidates and results stay
        as they are.
      </Text>
      <Button href={p.url} style={emailStyles.cta}>
        {p.newAccount ? "Accept and sign in" : "Open the workspace"}
      </Button>
      <Text style={emailStyles.linkFallback}>
        If the button does not work, paste this link into your browser:
        <br />
        <a href={p.url} style={emailStyles.link}>
          {p.url}
        </a>
        {p.newAccount && (
          <>
            <br />
            <br />
            Sign in or create an account with this email address to accept.
          </>
        )}
      </Text>
    </BaseLayout>
  );
}

export function pilotWelcomeText(p: PilotWelcomeProps): string {
  return [
    `Hi ${p.name}, your pilot workspace ${p.workspaceName} is ready.`,
    "",
    `It has everything in Growth until ${p.endsOn}, room for ${p.seats} people and ${p.credits} AI screening credits. Nothing is charged.`,
    "Before the pilot ends you can pick a plan from Billing; your candidates and results stay as they are.",
    "",
    `${p.newAccount ? "Accept and sign in" : "Open the workspace"}: ${p.url}`,
    ...(p.newAccount ? ["Sign in or create an account with this email address to accept."] : []),
  ].join("\n");
}
