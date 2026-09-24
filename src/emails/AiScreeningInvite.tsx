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
  /** Sent as a reminder for an invite the candidate has not started. */
  reminder?: boolean;
  /** When the invite closes, as an ISO string. Omitted when it never expires. */
  expiresAt?: string | null;
  /** Total planned minutes across the rounds. */
  minutes?: number | null;
};

function closesOn(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function AiScreeningInvite({
  candidateName,
  positionTitle,
  workspaceName,
  inviteUrl,
  reminder,
  expiresAt,
  minutes,
}: AiScreeningInviteProps) {
  const closes = closesOn(expiresAt);
  const plan = minutes && minutes > 0 ? minutes : 30;
  return (
    <BaseLayout
      preview={reminder ? `Reminder: your screening from ${workspaceName} is waiting` : `Your AI screening invite from ${workspaceName}`}
      footer={`This invitation was sent on behalf of ${workspaceName}. If you didn't expect it, you can safely ignore this email.`}
    >
      <Text style={emailStyles.badge("#a78bfa")}>{reminder ? "Reminder" : "AI Screening Invitation"}</Text>
      <Text style={emailStyles.h1}>
        {reminder
          ? `Hi ${candidateName}, your technical screening is still waiting.`
          : `Hi ${candidateName}, you are invited to a technical screening.`}
      </Text>
      <Text style={emailStyles.body}>
        {workspaceName} has set up an automated screening for the{" "}
        <span style={emailStyles.emphasis}>{positionTitle}</span> role. An AI
        interviewer will guide you through a short coding exercise in your browser.
      </Text>
      <Text style={emailStyles.body}>
        No prior setup required. Plan around {plan} minutes of focused time.
        {closes ? ` The link closes on ${closes}.` : ""}
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
  const closes = closesOn(p.expiresAt);
  const plan = p.minutes && p.minutes > 0 ? p.minutes : 30;
  return [
    `Hi ${p.candidateName},`,
    "",
    p.reminder
      ? `A reminder that ${p.workspaceName} invited you to an automated AI technical screening for the ${p.positionTitle} role, and it has not been started yet.`
      : `${p.workspaceName} has invited you to an automated AI technical screening for the ${p.positionTitle} role.`,
    "",
    "Start your screening here:",
    p.inviteUrl,
    "",
    `Plan around ${plan} minutes of focused time. No prior setup required.`,
    ...(closes ? [`The link closes on ${closes}.`] : []),
  ].join("\n");
}
