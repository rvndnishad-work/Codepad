/**
 * One plain template for every Settings > Data and privacy email: the 7-day
 * notice before a retention rule erases data, a candidate's copy of their
 * data, the confirmation that their data was erased, an export being ready,
 * and a workspace deletion being scheduled, cancelled or carried out.
 * Callers write the words; this only lays them out.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type DataPrivacyNoticeProps = {
  subject: string;
  /** Short tag above the heading, such as "Data retention". */
  badge: string;
  heading: string;
  paragraphs: string[];
  /** Optional button. */
  cta?: { label: string; url: string } | null;
  footer: string;
};

export function DataPrivacyNotice({ subject, badge, heading, paragraphs, cta, footer }: DataPrivacyNoticeProps) {
  return (
    <BaseLayout preview={subject} footer={footer}>
      <Text style={emailStyles.badge("#818cf8")}>{badge}</Text>
      <Text style={emailStyles.h1}>{heading}</Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={emailStyles.body}>
          {p}
        </Text>
      ))}
      {cta && (
        <>
          <Button href={cta.url} style={emailStyles.cta}>
            {cta.label}
          </Button>
          <Text style={emailStyles.linkFallback}>
            If the button does not work, paste this link into your browser:
            <br />
            <a href={cta.url} style={emailStyles.link}>
              {cta.url}
            </a>
          </Text>
        </>
      )}
    </BaseLayout>
  );
}

export function dataPrivacyNoticeText(p: DataPrivacyNoticeProps): string {
  return [p.heading, "", ...p.paragraphs.flatMap((x) => [x, ""]), ...(p.cta ? [`${p.cta.label}: ${p.cta.url}`, ""] : []), p.footer].join("\n");
}
