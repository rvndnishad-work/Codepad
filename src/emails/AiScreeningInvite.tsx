/**
 * Candidate invite for an AI screening session (IP-24).
 * Replaces the hand-rolled HTML formerly in src/lib/ai-interview/invite-email.ts.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type AiScreeningInviteProps = {
  candidateName: string;
  positionTitle: string;
  workspaceName: string;
  inviteUrl: string;
};

export function AiScreeningInvite({
  candidateName,
  positionTitle,
  workspaceName,
  inviteUrl,
}: AiScreeningInviteProps) {
  return (
    <BaseLayout
      preview={`Your AI screening invite from ${workspaceName}`}
      footer={`This invitation was sent on behalf of ${workspaceName}. If you didn't expect it, you can safely ignore this email.`}
    >
      <Text style={emailStyles.badge("#a78bfa")}>AI Screening Invitation</Text>
      <Text style={emailStyles.h1}>
        Hi {candidateName} — you&apos;re invited to a technical screening.
      </Text>
      <Text style={emailStyles.body}>
        {workspaceName} has set up an automated screening for the{" "}
        <span style={emailStyles.emphasis}>{positionTitle}</span> role. An AI
        interviewer will guide you through a short coding exercise in your browser.
      </Text>
      <Text style={emailStyles.body}>
        No prior setup required. Plan around 30 minutes of focused time.
      </Text>
      <Button href={inviteUrl} style={emailStyles.cta}>
        Start your screening →
      </Button>
      <Text style={emailStyles.linkFallback}>
        Or paste this link into your browser:
        <br />
        <a href={inviteUrl} style={emailStyles.link}>
          {inviteUrl}
        </a>
      </Text>
    </BaseLayout>
  );
}

/** Plain-text fallback (Resend's text/plain alternative). */
export function aiScreeningInviteText(p: AiScreeningInviteProps): string {
  return [
    `Hi ${p.candidateName},`,
    "",
    `${p.workspaceName} has invited you to an automated AI technical screening for the ${p.positionTitle} role.`,
    "",
    "Start your screening here:",
    p.inviteUrl,
    "",
    "Plan around 30 minutes of focused time. No prior setup required.",
  ].join("\n");
}
