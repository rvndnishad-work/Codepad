/**
 * Settings > Candidate experience: the pure rules behind branding, sender
 * name, reply-to, editable email wording and consent.
 *
 * No I/O, so the settings page, the email pipeline, candidate pages and
 * tests all share it. The server side (loading a workspace's branding and
 * templates) lives in src/lib/candidate-email.ts.
 *
 * Email wording: a workspace can replace the subject and the opening text of
 * each candidate email. The parts that make an email work (the button and
 * link, the deadline or time, the help, privacy and unsubscribe lines) are
 * always added by the template, so an edit can never break an invite.
 */

/* ── Brand ──────────────────────────────────────────────────────────────── */

/** What candidate pages and emails need to look like the workspace. */
export type CandidateBrand = {
  /** Workspace name, shown next to or instead of the logo. */
  name: string;
  logoUrl: string | null;
  /** "#rrggbb" or null for the Interviewpad default. */
  color: string | null;
  helpEmail: string | null;
  privacyNoticeUrl: string | null;
};

type BrandSource = {
  name: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  helpEmail?: string | null;
  privacyNoticeUrl?: string | null;
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function candidateBrand(s: BrandSource): CandidateBrand {
  return {
    name: s.name?.trim() || "The hiring team",
    logoUrl: s.logoUrl && /^https:\/\//i.test(s.logoUrl) ? s.logoUrl : null,
    color: s.brandColor && HEX_RE.test(s.brandColor) ? s.brandColor.toLowerCase() : null,
    helpEmail: s.helpEmail || null,
    privacyNoticeUrl: s.privacyNoticeUrl && /^https:\/\//i.test(s.privacyNoticeUrl) ? s.privacyNoticeUrl : null,
  };
}

/** The yellow button colour emails used before branding existed. */
export const DEFAULT_EMAIL_BUTTON = "#ffe600";
const DARK_TEXT = "#0b0f19";
const LIGHT_TEXT = "#ffffff";

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of "#rrggbb" (0 black to 1 white). */
export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two "#rrggbb" colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour that reads best on a button of this colour. */
export function readableTextOn(hex: string): string {
  if (!HEX_RE.test(hex)) return DARK_TEXT;
  return contrastRatio(hex, DARK_TEXT) >= contrastRatio(hex, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
}

/** Button colours for a brand colour, or the default yellow. */
export function brandButton(color: string | null | undefined): { background: string; color: string } {
  const bg = color && HEX_RE.test(color) ? color.toLowerCase() : DEFAULT_EMAIL_BUTTON;
  return { background: bg, color: readableTextOn(bg) };
}

/**
 * Inline CSS variables for candidate pages. Pages paint their main button
 * with var(--brand, ...) so no brand keeps the theme colour.
 */
export function brandStyle(color: string | null | undefined): Record<string, string> {
  if (!color || !HEX_RE.test(color)) return {};
  return { "--brand": color.toLowerCase(), "--brand-fg": readableTextOn(color) };
}

/** A soft warning when a colour will be hard to see on a white or dark page. */
export function brandColorWarning(color: string | null | undefined): string | null {
  if (!color || !HEX_RE.test(color)) return null;
  const onWhite = contrastRatio(color, "#ffffff");
  const onDark = contrastRatio(color, DARK_TEXT);
  if (onWhite < 1.5 || onDark < 1.5) return "This colour is very close to the page background. Buttons will still get readable text, but they may be hard to spot.";
  return null;
}

/* ── Sender ─────────────────────────────────────────────────────────────── */

/**
 * The From header for a display name, keeping the address of the base
 * sender ("Interviewpad <noreply@x>" or "noreply@x").
 */
export function formatFrom(displayName: string, baseFrom: string): string {
  const m = baseFrom.match(/<([^>]+)>/);
  const address = (m ? m[1] : baseFrom).trim();
  const name = displayName.replace(/[\r\n\t]+/g, " ").replace(/["<>\\]/g, "").replace(/\s+/g, " ").trim();
  return name ? `"${name}" <${address}>` : address;
}

/* ── Reply-to confirmation ──────────────────────────────────────────────── */

/** Days a reply-to confirmation link stays good. */
export const REPLY_TO_LINK_DAYS = 7;
const DAY_MS = 86_400_000;

/** Token stored on the workspace and sent in the link: random part, then when it was made. */
export function makeReplyToToken(randomHex: string, now: Date = new Date()): string {
  return `${randomHex}.${now.getTime().toString(36)}`;
}

/** When a reply-to token was made, or null if it is not one of ours. */
export function replyToTokenIssuedAt(token: string): Date | null {
  const m = /^[0-9a-f]{32,128}\.([0-9a-z]{6,12})$/.exec(token);
  if (!m) return null;
  const t = parseInt(m[1], 36);
  return Number.isFinite(t) ? new Date(t) : null;
}

export function replyToTokenFresh(token: string, now: Date = new Date()): boolean {
  const at = replyToTokenIssuedAt(token);
  if (!at) return false;
  const age = now.getTime() - at.getTime();
  return age >= -60_000 && age <= REPLY_TO_LINK_DAYS * DAY_MS;
}

export type ReplyToStatus = "none" | "waiting" | "confirmed";

export function replyToStatus(s: { replyToEmail: string | null; replyToConfirmedAt: Date | null }): ReplyToStatus {
  if (!s.replyToEmail) return "none";
  return s.replyToConfirmedAt ? "confirmed" : "waiting";
}

/* ── Email wording ──────────────────────────────────────────────────────── */

export const PLACEHOLDERS = [
  { token: "{candidate}", label: "Candidate name" },
  { token: "{workspace}", label: "Workspace name" },
  { token: "{title}", label: "Take-home, role or interview title" },
] as const;

export type PlaceholderVars = { candidate: string; workspace: string; title: string };

export const CANDIDATE_EMAIL_KEYS = [
  "take-home-invite",
  "take-home-reminder",
  "take-home-received",
  "ai-screening-invite",
  "ai-screening-reminder",
  "interview-invite",
] as const;

export type CandidateEmailKey = (typeof CANDIDATE_EMAIL_KEYS)[number];

export function isCandidateEmailKey(v: unknown): v is CandidateEmailKey {
  return typeof v === "string" && (CANDIDATE_EMAIL_KEYS as readonly string[]).includes(v);
}

export type CandidateEmailDef = {
  key: CandidateEmailKey;
  label: string;
  /** When it is sent, in the candidate's terms. */
  when: string;
  /** What the template always adds after the wording. */
  alwaysAdded: string;
  subject: string;
  body: string;
};

/**
 * Starting wording for each email, written with placeholders. The built-in
 * templates say the same thing; these are what the editor opens with and
 * what "Reset" goes back to.
 */
export const CANDIDATE_EMAILS: Record<CandidateEmailKey, CandidateEmailDef> = {
  "take-home-invite": {
    key: "take-home-invite",
    label: "Take-home invite",
    when: "Sent when you send a take-home.",
    alwaysAdded: "The start button and link, the time limit or number of questions, and the deadline.",
    subject: "Your take-home from {workspace}: {title}",
    body: "Hi {candidate},\n\n{workspace} has sent you a take-home: {title}. You work through it in your browser, with nothing to install.",
  },
  "take-home-reminder": {
    key: "take-home-reminder",
    label: "Take-home reminder",
    when: "Sent before a take-home link closes, and when a recruiter sends a reminder.",
    alwaysAdded: "The start button and link, and when the link closes.",
    subject: "Reminder: your {workspace} take-home closes soon",
    body: "Hi {candidate},\n\nYour take-home {title} from {workspace} is still waiting for you. The timer only starts when you open it.",
  },
  "take-home-received": {
    key: "take-home-received",
    label: "Take-home received",
    when: "Sent to the candidate after they submit a take-home.",
    alwaysAdded: "No button or link, since the candidate has nothing left to do.",
    subject: "We received your take-home: {title}",
    body: "Thanks, {candidate}. Your take-home {title} has reached {workspace}. There is nothing more you need to do.\n\nThe team will review your work and get back to you.",
  },
  "ai-screening-invite": {
    key: "ai-screening-invite",
    label: "AI screening invite",
    when: "Sent when you send an AI screening.",
    alwaysAdded: "The start button and link, how long to plan for, and when the link closes.",
    subject: "Your AI technical screening for {title} at {workspace}",
    body: "Hi {candidate},\n\n{workspace} has set up a short screening for the {title} role. An AI interviewer guides you through it in your browser.",
  },
  "ai-screening-reminder": {
    key: "ai-screening-reminder",
    label: "AI screening reminder",
    when: "Sent when an AI screening has not been started.",
    alwaysAdded: "The start button and link, how long to plan for, and when the link closes.",
    subject: "Reminder: your AI technical screening for {title} at {workspace}",
    body: "Hi {candidate},\n\nYour screening for the {title} role at {workspace} is still waiting for you.",
  },
  "interview-invite": {
    key: "interview-invite",
    label: "Interview invite",
    when: "Sent when you schedule a live interview.",
    alwaysAdded: "The join button and link, the time, the length and any video call link.",
    subject: "Live interview with {workspace}: {title}",
    body: "Hi {candidate},\n\n{workspace} has invited you to a live interview: {title}. It happens in your browser, with nothing to install.",
  },
};

/** Email templates (src/emails) that go to candidates and carry branding. */
export const CANDIDATE_TEMPLATE_NAMES = [
  "take-home-invite",
  "take-home-session-invite",
  "take-home-reminder",
  "take-home-submitted-candidate",
  "ai-screening-invite",
  "interview-invite",
] as const;

export function isCandidateTemplate(template: string): boolean {
  return (CANDIDATE_TEMPLATE_NAMES as readonly string[]).includes(template);
}

/** Which editable wording a send uses. Null for emails that are not editable. */
export function wordingKeyFor(template: string, props: { reminder?: boolean | null } = {}): CandidateEmailKey | null {
  switch (template) {
    case "take-home-invite":
    case "take-home-session-invite":
      return "take-home-invite";
    case "take-home-reminder":
      return "take-home-reminder";
    case "take-home-submitted-candidate":
      return "take-home-received";
    case "ai-screening-invite":
      return props.reminder ? "ai-screening-reminder" : "ai-screening-invite";
    case "interview-invite":
      return "interview-invite";
    default:
      return null;
  }
}

/** Placeholder values from a template's props. */
export function placeholderVars(props: Record<string, unknown>): PlaceholderVars {
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    candidate: s(props.candidateName) ?? "there",
    workspace: s(props.workspaceName) ?? "the team",
    title: s(props.challengeTitle) ?? s(props.positionTitle) ?? s(props.title) ?? "your assessment",
  };
}

const PLACEHOLDER_RE = /\{([a-z_ ]{1,30})\}/gi;
const KNOWN = new Set(["candidate", "workspace", "title"]);

/** Swap placeholders for values in one pass, so a value never expands again. */
export function fillPlaceholders(text: string, vars: PlaceholderVars): string {
  return text.replace(PLACEHOLDER_RE, (whole, name: string) => {
    const k = name.trim().toLowerCase();
    return KNOWN.has(k) ? vars[k as keyof PlaceholderVars] : whole;
  });
}

function unknownPlaceholders(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const k = m[1].trim().toLowerCase();
    if (!KNOWN.has(k) && !out.includes(m[0])) out.push(m[0]);
  }
  return out;
}

export const SUBJECT_MAX = 150;
export const BODY_MAX = 2000;

export type WordingDraft = { subject?: unknown; body?: unknown };
export type ParsedWording =
  | { ok: true; subject: string | null; body: string | null }
  | { ok: false; errors: { subject?: string; body?: string } };

const placeholderHelp = "Use {candidate}, {workspace} or {title}.";

/**
 * Check wording before it is saved. Blank or unchanged-from-default parts
 * are stored as null, which means "use the built-in wording".
 */
export function parseWording(key: CandidateEmailKey, draft: WordingDraft): ParsedWording {
  const def = CANDIDATE_EMAILS[key];
  const errors: { subject?: string; body?: string } = {};

  let subject: string | null = null;
  if (draft.subject != null && typeof draft.subject !== "string") errors.subject = "Enter a subject.";
  else if (typeof draft.subject === "string") {
    const s = draft.subject.replace(/\s+/g, " ").trim();
    if (s.length > SUBJECT_MAX) errors.subject = `Keep the subject to ${SUBJECT_MAX} characters or fewer.`;
    else if (/[<>]/.test(s)) errors.subject = "Remove the < and > characters.";
    else {
      const bad = unknownPlaceholders(s);
      if (bad.length) errors.subject = `${bad.join(", ")} is not a placeholder. ${placeholderHelp}`;
      else if (s && s !== def.subject) subject = s;
    }
  }

  let body: string | null = null;
  if (draft.body != null && typeof draft.body !== "string") errors.body = "Enter the email text.";
  else if (typeof draft.body === "string") {
    const b = draft.body
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (b.length > BODY_MAX) errors.body = `Keep the text to ${BODY_MAX} characters or fewer.`;
    else {
      const bad = unknownPlaceholders(b);
      if (bad.length) errors.body = `${bad.join(", ")} is not a placeholder. ${placeholderHelp}`;
      else if (b && b !== def.body) body = b;
    }
  }

  if (errors.subject || errors.body) return { ok: false, errors };
  return { ok: true, subject, body };
}

/** Wording ready for a template: filled subject and paragraphs, or nulls for the built-in text. */
export type AppliedWording = { subject: string | null; paragraphs: string[] | null };

export function applyWording(saved: { subject: string | null; body: string | null } | null | undefined, vars: PlaceholderVars): AppliedWording {
  if (!saved) return { subject: null, paragraphs: null };
  const subject = saved.subject ? fillPlaceholders(saved.subject, vars).replace(/[\r\n]+/g, " ").trim() || null : null;
  const paragraphs = saved.body
    ? fillPlaceholders(saved.body, vars)
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : null;
  return { subject, paragraphs: paragraphs && paragraphs.length ? paragraphs : null };
}

/* ── What a candidate email gets from the workspace ────────────────────── */

/** Extra props every candidate template accepts (see src/emails/candidate-brand.tsx). */
export type CandidateEmailExtras = {
  brand?: CandidateBrand | null;
  custom?: AppliedWording | null;
  unsubscribeUrl?: string | null;
};

export type CandidateEmailContext = {
  brand: CandidateBrand;
  /** Growth tools on: sender name, reply-to and wording apply. */
  growth: boolean;
  /** "Acme via Interviewpad" when growth, else null (keep the default sender). */
  fromName: string | null;
  /** Confirmed reply-to when growth, else null. */
  replyTo: string | null;
  wording: Partial<Record<CandidateEmailKey, { subject: string | null; body: string | null }>>;
};

/**
 * Props, sender name and reply-to for one candidate email. Branding (logo,
 * colour, help and privacy) is on every plan; sender name, reply-to and
 * wording only with growth tools.
 */
export function applyCandidateContext<P extends Record<string, unknown>>(
  ctx: CandidateEmailContext | null,
  template: string,
  props: P,
  unsubscribeUrl: string | null,
): { props: P & CandidateEmailExtras; fromName: string | null; replyTo: string | null } {
  if (!isCandidateTemplate(template)) return { props, fromName: null, replyTo: null };
  const extras: CandidateEmailExtras = { unsubscribeUrl };
  if (!ctx) return { props: { ...props, ...extras }, fromName: null, replyTo: null };
  extras.brand = ctx.brand;
  if (ctx.growth) {
    const key = wordingKeyFor(template, props as { reminder?: boolean });
    const saved = key ? ctx.wording[key] : null;
    if (saved) extras.custom = applyWording(saved, placeholderVars(props));
  }
  return {
    props: { ...props, ...extras },
    fromName: ctx.growth ? ctx.fromName : null,
    replyTo: ctx.growth ? ctx.replyTo : null,
  };
}

/* ── Consent ────────────────────────────────────────────────────────────── */

/** Whether a candidate still has to tick the consent box. */
export function consentOutstanding(s: { consentRequired: boolean }, consentAt: Date | string | null | undefined): boolean {
  return s.consentRequired && !consentAt;
}
