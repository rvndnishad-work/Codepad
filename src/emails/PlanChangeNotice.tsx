/**
 * The 30-day notice that a workspace moves to the new plans (see
 * src/lib/billing/switchover.ts). Title and body come from switchoverNotice,
 * so the email and the in-app notice say the same thing.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type PlanChangeNoticeProps = {
  recipientName: string;
  workspaceName: string;
  title: string;
  body: string;
  billingUrl: string;
  demoUrl: string;
};

export function PlanChangeNotice(p: PlanChangeNoticeProps) {
  return (
    <BaseLayout preview={p.title} footer={`You get this because you are an owner or admin of ${p.workspaceName}.`}>
      <Text style={emailStyles.badge("#fbbf24")}>Plan change</Text>
      <Text style={emailStyles.h1}>Hi {p.recipientName}, {p.title}.</Text>
      <Text style={emailStyles.body}>{p.body}</Text>
      <Button href={p.billingUrl} style={emailStyles.cta}>
        See the plans
      </Button>
      <Text style={emailStyles.linkFallback}>
        If the button does not work, paste this link into your browser:
        <br />
        <a href={p.billingUrl} style={emailStyles.link}>
          {p.billingUrl}
        </a>
        <br />
        Questions, or want a pilot first? Book a demo: <a href={p.demoUrl} style={emailStyles.link}>{p.demoUrl}</a>
      </Text>
    </BaseLayout>
  );
}

export function planChangeNoticeText(p: PlanChangeNoticeProps): string {
  return [`Hi ${p.recipientName},`, "", `${p.title}.`, "", p.body, "", `See the plans: ${p.billingUrl}`, `Book a demo: ${p.demoUrl}`].join("\n");
}
