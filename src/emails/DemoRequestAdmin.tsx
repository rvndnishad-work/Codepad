/**
 * Tells our team a new demo request came in, with the answers and a link to
 * the request in the admin console.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";

export type DemoRequestAdminProps = {
  name: string;
  email: string;
  company: string;
  jobTitle: string | null;
  teamSize: string;
  monthlyVolume: string;
  hiringType: string;
  message: string | null;
  suggestedPlan: string;
  enterpriseLead: boolean;
  adminUrl: string;
};

export function DemoRequestAdmin(p: DemoRequestAdminProps) {
  const rows: [string, string][] = [
    ["Contact", `${p.name}${p.jobTitle ? `, ${p.jobTitle}` : ""} (${p.email})`],
    ["Team size", p.teamSize],
    ["Screenings a month", p.monthlyVolume],
    ["Hires for", p.hiringType],
    ["Suggested plan", p.suggestedPlan],
  ];
  return (
    <BaseLayout preview={`${p.company} asked for a demo`} footer="Sent to the team that handles demo requests.">
      <Text style={emailStyles.badge(p.enterpriseLead ? "#c084fc" : "#f5d90a")}>{p.enterpriseLead ? "Enterprise lead" : "Demo request"}</Text>
      <Text style={emailStyles.h1}>{p.company} asked for a demo.</Text>
      {rows.map(([k, v]) => (
        <Text key={k} style={emailStyles.body}>
          <span style={emailStyles.emphasis}>{k}:</span> {v}
        </Text>
      ))}
      {p.message && <Text style={emailStyles.body}>&ldquo;{p.message}&rdquo;</Text>}
      <Button href={p.adminUrl} style={emailStyles.cta}>
        Open the request
      </Button>
    </BaseLayout>
  );
}

export function demoRequestAdminText(p: DemoRequestAdminProps): string {
  return [
    `${p.company} asked for a demo${p.enterpriseLead ? " (Enterprise lead)" : ""}.`,
    "",
    `Contact: ${p.name}${p.jobTitle ? `, ${p.jobTitle}` : ""} (${p.email})`,
    `Team size: ${p.teamSize}`,
    `Screenings a month: ${p.monthlyVolume}`,
    `Hires for: ${p.hiringType}`,
    `Suggested plan: ${p.suggestedPlan}`,
    ...(p.message ? ["", p.message] : []),
    "",
    `Open the request: ${p.adminUrl}`,
  ].join("\n");
}
