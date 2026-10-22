/**
 * Sent to someone who asked for a demo, so they know it arrived and what
 * happens next.
 */
import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type DemoRequestReceivedProps = {
  name: string;
  company: string;
};

export function DemoRequestReceived({ name, company }: DemoRequestReceivedProps) {
  return (
    <BaseLayout
      preview="We have your demo request and will reply within one working day"
      footer="You get this because you asked for a demo of Intervutree. If that was not you, you can ignore this email."
    >
      <Text style={emailStyles.badge("#f5d90a")}>Demo request</Text>
      <Text style={emailStyles.h1}>Thanks, {name}. We have your request.</Text>
      <Text style={emailStyles.body}>
        Someone from our team will reply within one working day to find a time for a short demo for{" "}
        <span style={emailStyles.emphasis}>{company}</span>. If it is a fit, we can then set up a pilot workspace with AI screening
        credits, so your team can try it on real candidates before you choose a plan.
      </Text>
      <Text style={emailStyles.body}>To add anything, reply to this email.</Text>
    </BaseLayout>
  );
}

export function demoRequestReceivedText(p: DemoRequestReceivedProps): string {
  return [
    `Thanks, ${p.name}. We have your demo request.`,
    "",
    `Someone from our team will reply within one working day to find a time for a short demo for ${p.company}.`,
    "If it is a fit, we can then set up a pilot workspace with AI screening credits, so your team can try it on real candidates before you choose a plan.",
    "",
    "To add anything, reply to this email.",
  ].join("\n");
}
