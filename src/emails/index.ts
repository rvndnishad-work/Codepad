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
import {
  TakeHomeInvite,
  takeHomeInviteText,
  type TakeHomeInviteProps,
} from "./TakeHomeInvite";
import {
  TakeHomeReminder,
  takeHomeReminderText,
  type TakeHomeReminderProps,
} from "./TakeHomeReminder";
import {
  TakeHomeSubmittedCandidate,
  takeHomeSubmittedCandidateText,
  type TakeHomeSubmittedCandidateProps,
} from "./TakeHomeSubmittedCandidate";
import {
  TakeHomeSubmittedRecruiter,
  takeHomeSubmittedRecruiterText,
  type TakeHomeSubmittedRecruiterProps,
} from "./TakeHomeSubmittedRecruiter";
import {
  TakeHomeSessionInvite,
  takeHomeSessionInviteText,
  type TakeHomeSessionInviteProps,
} from "./TakeHomeSessionInvite";
import {
  OtpVerification,
  otpVerificationText,
  type OtpVerificationProps,
} from "./OtpVerification";

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

  "take-home-invite": {
    Component: TakeHomeInvite,
    subject: (p) => `Your take-home from ${p.workspaceName}: ${p.challengeTitle}`,
    text: takeHomeInviteText,
  } satisfies TemplateDef<TakeHomeInviteProps>,

  "take-home-reminder": {
    Component: TakeHomeReminder,
    subject: (p) => `Reminder: your ${p.workspaceName} take-home closes soon`,
    text: takeHomeReminderText,
  } satisfies TemplateDef<TakeHomeReminderProps>,

  "take-home-submitted-candidate": {
    Component: TakeHomeSubmittedCandidate,
    subject: (p) => `We received your take-home: ${p.challengeTitle}`,
    text: takeHomeSubmittedCandidateText,
  } satisfies TemplateDef<TakeHomeSubmittedCandidateProps>,

  "take-home-submitted-recruiter": {
    Component: TakeHomeSubmittedRecruiter,
    subject: (p) => `${p.candidateName} submitted their take-home — ${p.challengeTitle}`,
    text: takeHomeSubmittedRecruiterText,
  } satisfies TemplateDef<TakeHomeSubmittedRecruiterProps>,

  "take-home-session-invite": {
    Component: TakeHomeSessionInvite,
    subject: (p) => `Your take-home from ${p.workspaceName}: ${p.title}`,
    text: takeHomeSessionInviteText,
  } satisfies TemplateDef<TakeHomeSessionInviteProps>,

  "otp-verification": {
    Component: OtpVerification,
    subject: () => "Verify your Interviewpad account",
    text: otpVerificationText,
  } satisfies TemplateDef<OtpVerificationProps>,
} as const;

/** Allowed template names. */
export type TemplateName = keyof typeof TEMPLATES;

/** Maps a template name to the props its component (and subject/text) needs. */
export type TemplateProps = {
  "ai-screening-invite": AiScreeningInviteProps;
  "screening-completed": ScreeningCompletedProps;
  "take-home-invite": TakeHomeInviteProps;
  "take-home-reminder": TakeHomeReminderProps;
  "take-home-submitted-candidate": TakeHomeSubmittedCandidateProps;
  "take-home-submitted-recruiter": TakeHomeSubmittedRecruiterProps;
  "take-home-session-invite": TakeHomeSessionInviteProps;
  "otp-verification": OtpVerificationProps;
};
