/**
 * Workspace teammate invite (IP-73). Sent when an owner/admin invites someone
 * to their workspace. Replaces the old flow that silently created a placeholder
 * account with no email — the invitee now gets a real accept link.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type WorkspaceInviteEmailProps = {
  workspaceName: string;
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
};

export function WorkspaceInviteEmail({
  workspaceName,
  inviterName,
  roleLabel,
  acceptUrl,
}: WorkspaceInviteEmailProps) {
  return (
    <BaseLayout
      preview={`${inviterName} invited you to ${workspaceName} on Interviewpad`}
      footer={`You're receiving this because ${inviterName} invited you to a workspace on Interviewpad. If you weren't expecting it, you can ignore this email.`}
    >
      <Text style={emailStyles.badge("#818cf8")}>Team Invitation</Text>
      <Text style={emailStyles.h1}>
        {inviterName} invited you to {workspaceName}.
      </Text>
      <Text style={emailStyles.body}>
        You&apos;ve been invited to join{" "}
        <span style={emailStyles.emphasis}>{workspaceName}</span> as a{" "}
        <span style={emailStyles.emphasis}>{roleLabel}</span>. Accept the invite
        to start collaborating on candidates, interviews, and take-homes.
      </Text>
      <Button href={acceptUrl} style={emailStyles.cta}>
        Accept invitation →
      </Button>
      <Text style={emailStyles.linkFallback}>
        Or paste this link into your browser:
        <br />
        <a href={acceptUrl} style={emailStyles.link}>
          {acceptUrl}
        </a>
        <br />
        <br />
        You&apos;ll be asked to sign in (or create a free account with this
        email) before joining.
      </Text>
    </BaseLayout>
  );
}

export function workspaceInviteEmailText(p: WorkspaceInviteEmailProps): string {
  return [
    `${p.inviterName} invited you to join ${p.workspaceName} on Interviewpad as a ${p.roleLabel}.`,
    "",
    "Accept the invitation here:",
    p.acceptUrl,
    "",
    "You'll be asked to sign in (or create a free account with this email) before joining.",
  ].join("\n");
}
