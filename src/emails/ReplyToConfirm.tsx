/**
 * Sent to a reply-to address set in Settings > Candidate experience. Candidate
 * replies only go to the address once someone who can read that inbox
 * confirms it, so a typo never sends candidate replies to a stranger.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type ReplyToConfirmProps = {
  workspaceName: string;
  requestedBy: string;
  confirmUrl: string;
  days: number;
};

export function ReplyToConfirm({ workspaceName, requestedBy, confirmUrl, days }: ReplyToConfirmProps) {
  return (
    <BaseLayout
      preview={`Confirm this address for replies from ${workspaceName} candidates`}
      footer={`If you did not expect this, ignore it and nothing changes. The link stops working after ${days} days.`}
    >
      <Text style={emailStyles.h1}>Confirm this reply-to address</Text>
      <Text style={emailStyles.body}>
        {requestedBy} wants replies from candidates of <span style={emailStyles.emphasis}>{workspaceName}</span> on
        Interviewpad to come to this inbox. Confirm to turn it on.
      </Text>
      <Button href={confirmUrl} style={emailStyles.cta}>
        Confirm this address
      </Button>
      <Text style={emailStyles.linkFallback}>
        Or paste this link into your browser:
        <br />
        <a href={confirmUrl} style={emailStyles.link}>
          {confirmUrl}
        </a>
      </Text>
    </BaseLayout>
  );
}

export function replyToConfirmText(p: ReplyToConfirmProps): string {
  return [
    `${p.requestedBy} wants replies from candidates of ${p.workspaceName} on Interviewpad to come to this inbox.`,
    "",
    "Confirm this address:",
    p.confirmUrl,
    "",
    `If you did not expect this, ignore it and nothing changes. The link stops working after ${p.days} days.`,
  ].join("\n");
}
