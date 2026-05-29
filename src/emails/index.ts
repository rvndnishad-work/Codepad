/**
 * Type-safe email template registry (IP-24 AC #6).
 *
 * Every transactional email goes through `sendEmail({ template, to, props, ... })`
 * (see src/lib/email.ts). The `template` key is the only thing the caller picks
 * from a closed set — and TypeScript infers `props` from that key, so adding a
 * new template forces every call site to know about the required props.
 *
 * To add a template:
 *   1. Drop the .tsx component + plain-text fn in this directory.
 *   2. Register it below — TS will demand a matching props type.
 */
import type { ComponentType } from "react";
import {
  AiScreeningInvite,
  aiScreeningInviteText,
  type AiScreeningInviteProps,
} from "./AiScreeningInvite";
import {
  ScreeningCompleted,
  screeningCompletedText,
  type ScreeningCompletedProps,
} from "./ScreeningCompleted";

/**
 * Registry shape: each entry describes how to subject-line, render, and
 * text-fallback a given template. Keep these pure — no I/O — so the renderer
 * can call them off the request path.
 */
type TemplateDef<Props> = {
  Component: ComponentType<Props>;
  /** Build the email subject from the same props the template consumes. */
  subject: (props: Props) => string;
  /** Plain-text alternative (Resend ships both alongside text/html). */
  text: (props: Props) => string;
};

export const TEMPLATES = {
  "ai-screening-invite": {
    Component: AiScreeningInvite,
    subject: (p) =>
      `Your AI technical screening for ${p.positionTitle} at ${p.workspaceName}`,
    text: aiScreeningInviteText,
  } satisfies TemplateDef<AiScreeningInviteProps>,

  "screening-completed": {
    Component: ScreeningCompleted,
    subject: (p) =>
      `${p.candidateName} completed their AI screening for ${p.positionTitle} — ${p.score}%`,
    text: screeningCompletedText,
  } satisfies TemplateDef<ScreeningCompletedProps>,
} as const;

/** Allowed template names. */
export type TemplateName = keyof typeof TEMPLATES;

/** Maps a template name to the props its component (and subject/text) needs. */
export type TemplateProps = {
  "ai-screening-invite": AiScreeningInviteProps;
  "screening-completed": ScreeningCompletedProps;
};
