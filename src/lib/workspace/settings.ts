/**
 * Workspace settings (/w/[slug]/settings): the typed shape, defaults, field
 * rules for saving, and small helpers the rest of the app reads them through.
 *
 * Pure and synchronous, so pages, server actions, crons and tests share it.
 * The Prisma select and the loader live in settings-server.ts.
 *
 * Every stored column has a default that matches how the app behaved before
 * settings existed, so an untouched workspace keeps today's behaviour.
 * New take-homes, AI screenings and interviews read their starting values
 * from here; existing ones keep the values they were sent with.
 */
import { TAKE_HOME_PASS_MARK, TAKE_HOME_PASS_PRESETS } from "@/lib/take-home/pass-mark";
import { PASS_MARK_MAX as AI_PASS_MAX, PASS_MARK_MIN as AI_PASS_MIN, SCREENING_PASS_THRESHOLD } from "@/lib/ai-interview/verdict";
import {
  DEFAULT_PASS_MARK as INTERVIEW_PASS_MARK,
  PASS_MARK_MAX as INTERVIEW_PASS_MAX,
  PASS_MARK_MIN as INTERVIEW_PASS_MIN,
  PASS_MARK_STEP as INTERVIEW_PASS_STEP,
} from "@/lib/interview/scorecard";
import { DEFAULT_LAST_CALL_HOURS, DEFAULT_START_REMINDER_HOURS, type ReminderPlan } from "@/lib/take-home/reminders";
import { DEFAULT_EXPIRY_DAYS, DEFAULT_REMINDER_DAYS, EXPIRY_CHOICES } from "@/lib/ai-interview/console";

const DAY_MS = 86_400_000;

/** Same lists as src/lib/totp-gate.ts, which is server-only (it imports Prisma). */
const PAID_PLANS = ["GROWTH", "ENTERPRISE"];
const WORKSPACE_ADMIN_ROLES = ["OWNER", "ADMIN"];

/* ── Tabs ───────────────────────────────────────────────────────────────── */

export const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "candidate-experience", label: "Candidate experience" },
  { id: "screening-defaults", label: "Screening defaults" },
  { id: "security", label: "Security" },
  { id: "data-privacy", label: "Data and privacy" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

/** Groups a field can be saved under. "billing" is saved from Billing and usage. */
export type SettingsGroup = SettingsTab | "billing";

export function isSettingsTab(v: unknown): v is SettingsTab {
  return typeof v === "string" && SETTINGS_TABS.some((t) => t.id === v);
}

/* ── Choices ────────────────────────────────────────────────────────────── */

export const DATE_FORMATS = [
  { id: "DMY", label: "26 Sep 2026" },
  { id: "MDY", label: "Sep 26, 2026" },
  { id: "YMD", label: "2026-09-26" },
] as const;
export type DateFormat = (typeof DATE_FORMATS)[number]["id"];

/** Take-home and AI screening pass mark presets; any whole number in range is also allowed. */
export const PASS_MARK_PRESETS = TAKE_HOME_PASS_PRESETS;
export const SCORE_PASS_MARK_MIN = AI_PASS_MIN;
export const SCORE_PASS_MARK_MAX = AI_PASS_MAX;
/** Interview pass mark presets on the 1 to 4 scorecard scale. */
export const INTERVIEW_PASS_MARK_PRESETS = [2.5, 3, 3.5] as const;

export const INVITE_EXPIRY_CHOICES = EXPIRY_CHOICES;
export const AI_MINUTES_CHOICES = [15, 20, 30, 45, 60] as const;
export const INTERVIEW_MINUTES_CHOICES = [30, 45, 60, 90] as const;
export const SCORECARD_REMINDER_CHOICES = [2, 24, 48] as const;
export const SESSION_MAX_AGE_CHOICES = [1, 7, 14, 30] as const;
export const API_KEY_LIFETIME_CHOICES = [30, 90, 180, 365] as const;
export const LOW_CREDIT_CHOICES = [5, 10, 25, 50] as const;

export const INTERVIEWER_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "pt", label: "Portuguese" },
  { id: "it", label: "Italian" },
  { id: "nl", label: "Dutch" },
  { id: "hi", label: "Hindi" },
  { id: "ja", label: "Japanese" },
] as const;

/** Roles someone can join at without an invite. Never Owner or Admin. */
export const JOIN_ROLES = ["RECRUITER", "INTERVIEWER", "VIEWER"] as const;

export const MAX_ALLOWED_DOMAINS = 20;

/** Days a scheduled workspace deletion can be undone. */
export const DELETION_GRACE_DAYS = 30;
/** Days a candidate data request has before it is due. */
export const DATA_REQUEST_DUE_DAYS = 30;
/** Days before a retention erase that admins get an email. */
export const RETENTION_NOTICE_DAYS = 7;

export const RETENTION_KINDS = ["INACTIVE_CANDIDATES", "NOT_PASSED", "VOICE_RECORDINGS", "CODE_REPLAYS"] as const;
export type RetentionKind = (typeof RETENTION_KINDS)[number];
export type RetentionUnit = "DAYS" | "MONTHS";

/** Rules start off, with these periods filled in. */
export const RETENTION_DEFAULTS: Record<RetentionKind, { amount: number; unit: RetentionUnit; label: string }> = {
  INACTIVE_CANDIDATES: { amount: 12, unit: "MONTHS", label: "Erase inactive candidates" },
  NOT_PASSED: { amount: 6, unit: "MONTHS", label: "Erase candidates marked not passed" },
  VOICE_RECORDINGS: { amount: 90, unit: "DAYS", label: "Delete voice recordings" },
  CODE_REPLAYS: { amount: 6, unit: "MONTHS", label: "Delete code replays" },
};

/* ── Shape ──────────────────────────────────────────────────────────────── */

export type WorkspaceSettings = {
  // General
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
  dateFormat: DateFormat;
  // Candidate experience
  brandColor: string | null;
  senderName: string | null;
  replyToEmail: string | null;
  replyToConfirmedAt: Date | null;
  privacyNoticeUrl: string | null;
  consentRequired: boolean;
  helpEmail: string | null;
  // Screening defaults
  defaultTakeHomePassMark: number;
  defaultAiPassMark: number;
  defaultInterviewPassMark: number;
  inviteExpiryDays: number;
  remindNotStarted: boolean;
  remindBeforeDeadline: boolean;
  aiDefaultMinutes: number;
  keepVoiceAnswers: boolean;
  interviewerLanguage: string;
  interviewDefaultMinutes: number;
  scorecardFirst: boolean;
  scorecardReminderHours: number | null;
  // Security
  require2faForAll: boolean;
  require2faFrom: Date | null;
  require2faRemindedAt: Date | null;
  sessionMaxAgeDays: number | null;
  sessionsRevokedAt: Date | null;
  allowedEmailDomains: string[];
  joinWithoutInvite: boolean;
  joinRole: (typeof JOIN_ROLES)[number];
  apiKeyMaxLifetimeDays: number | null;
  // Billing and usage
  lowCreditThreshold: number | null;
  lowCreditAlertedAt: Date | null;
  // Data and privacy
  deletionScheduledAt: Date | null;
  deletionRequestedById: string | null;
};

export const SETTINGS_DEFAULTS: Omit<WorkspaceSettings, "name" | "slug"> = {
  logoUrl: null,
  timezone: "UTC",
  dateFormat: "DMY",
  brandColor: null,
  senderName: null,
  replyToEmail: null,
  replyToConfirmedAt: null,
  privacyNoticeUrl: null,
  consentRequired: false,
  helpEmail: null,
  defaultTakeHomePassMark: TAKE_HOME_PASS_MARK,
  defaultAiPassMark: SCREENING_PASS_THRESHOLD,
  defaultInterviewPassMark: INTERVIEW_PASS_MARK,
  inviteExpiryDays: DEFAULT_EXPIRY_DAYS,
  remindNotStarted: true,
  remindBeforeDeadline: true,
  aiDefaultMinutes: 30,
  keepVoiceAnswers: false,
  interviewerLanguage: "en",
  interviewDefaultMinutes: 60,
  scorecardFirst: true,
  scorecardReminderHours: null,
  require2faForAll: false,
  require2faFrom: null,
  require2faRemindedAt: null,
  sessionMaxAgeDays: null,
  sessionsRevokedAt: null,
  allowedEmailDomains: [],
  joinWithoutInvite: false,
  joinRole: "INTERVIEWER",
  apiKeyMaxLifetimeDays: null,
  lowCreditThreshold: null,
  lowCreditAlertedAt: null,
  deletionScheduledAt: null,
  deletionRequestedById: null,
};

/* ── Field rules ────────────────────────────────────────────────────────── */

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const bad = (error: string): Parsed<never> => ({ ok: false, error });

const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const asNumber = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const HEX_RE = /^#[0-9a-f]{6}$/;

export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function parseText(max: number, label: string, required = false) {
  return (v: unknown): Parsed<string | null> => {
    if (blank(v)) return required ? bad(`Enter ${label}.`) : ok(null);
    if (typeof v !== "string") return bad(`Enter ${label}.`);
    const s = v.trim().replace(/\s+/g, " ");
    if (s.length > max) return bad(`Keep it to ${max} characters or fewer.`);
    if (/[<>\r\n]/.test(s)) return bad("Remove the < and > characters.");
    return ok(s);
  };
}

function parseHttpsUrl(v: unknown): Parsed<string | null> {
  if (blank(v)) return ok(null);
  if (typeof v !== "string" || v.length > 500) return bad("Enter a web address starting with https://");
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:") return bad("Enter a web address starting with https://");
    return ok(u.toString());
  } catch {
    return bad("Enter a web address starting with https://");
  }
}

function parseEmail(v: unknown): Parsed<string | null> {
  if (blank(v)) return ok(null);
  if (typeof v !== "string") return bad("Enter an email address.");
  const s = v.trim().toLowerCase();
  if (s.length > 254 || !EMAIL_RE.test(s)) return bad("Enter an email address like name@company.com.");
  return ok(s);
}

function parseBool(v: unknown): Parsed<boolean> {
  if (typeof v === "boolean") return ok(v);
  if (v === "true" || v === "on") return ok(true);
  if (v === "false" || v === "off") return ok(false);
  return bad("Choose on or off.");
}

function parseWhole(min: number, max: number, message: string) {
  return (v: unknown): Parsed<number> => {
    const n = asNumber(v);
    if (n === null || !Number.isInteger(n) || n < min || n > max) return bad(message);
    return ok(n);
  };
}

function parseChoice<T extends number>(choices: readonly T[], nullable: boolean, message: string) {
  return (v: unknown): Parsed<T | null> => {
    if (blank(v) || v === "off") return nullable ? ok(null) : bad(message);
    const n = asNumber(v);
    return n !== null && (choices as readonly number[]).includes(n) ? ok(n as T) : bad(message);
  };
}

/** "Acme.com, @beta.io\nacme.com" -> ["acme.com", "beta.io"]. */
export function normalizeDomains(v: unknown): Parsed<string[]> {
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\s,;]+/) : blank(v) ? [] : null;
  if (!list) return bad("Enter domains like acme.com.");
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") return bad("Enter domains like acme.com.");
    const d = raw.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, "");
    if (!d) continue;
    if (!DOMAIN_RE.test(d)) return bad(`${d} is not a domain. Enter domains like acme.com.`);
    if (!out.includes(d)) out.push(d);
  }
  if (out.length > MAX_ALLOWED_DOMAINS) return bad(`Add up to ${MAX_ALLOWED_DOMAINS} domains.`);
  return ok(out);
}

function parseDate(v: unknown): Parsed<Date | null> {
  if (blank(v)) return ok(null);
  const d = v instanceof Date ? v : typeof v === "string" ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return bad("Pick a date.");
  return ok(d);
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const hours = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;
const onOff = (b: unknown) => (b ? "On" : "Off");
const orNone = (s: unknown, none = "Not set") => (typeof s === "string" && s ? s : none);
const isoDay = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : "Not set");

type FieldRule = {
  group: SettingsGroup;
  label: string;
  parse: (raw: unknown) => Parsed<unknown>;
  /** How the value reads in the audit log. */
  show: (value: unknown) => string;
  /** Needs Growth, a paid plan or an active trial (growthToolsEnabled). */
  growth?: boolean;
  /** Only owners (workspace:manage) may change it. */
  ownerOnly?: boolean;
};

/**
 * Fields the generic save action accepts, keyed by Workspace column.
 * Fields with their own flow are not here: replyToEmail (confirmation
 * email), sessionsRevokedAt (sign out everyone), deletion, alert stamps.
 */
export const SETTINGS_FIELDS = {
  name: { group: "general", label: "Workspace name", parse: parseText(100, "a workspace name", true), show: (v) => orNone(v) },
  slug: {
    group: "general",
    label: "Web address",
    ownerOnly: true,
    parse: (v) => {
      if (typeof v !== "string") return bad("Enter a web address.");
      const s = v.trim().toLowerCase();
      if (s.length < 2) return bad("Use at least 2 characters.");
      if (!SLUG_RE.test(s)) return bad("Use lowercase letters, numbers and dashes, not at the start or end.");
      return ok(s);
    },
    show: (v) => `/w/${orNone(v, "")}`,
  },
  logoUrl: { group: "general", label: "Logo", parse: parseHttpsUrl, show: (v) => (v ? "Custom logo" : "No logo") },
  timezone: {
    group: "general",
    label: "Time zone",
    parse: (v) => (typeof v === "string" && isValidTimezone(v.trim()) ? ok(v.trim()) : bad("Pick a time zone from the list.")),
    show: (v) => orNone(v),
  },
  dateFormat: {
    group: "general",
    label: "Date format",
    parse: (v) => (DATE_FORMATS.some((f) => f.id === v) ? ok(v) : bad("Pick a date format.")),
    show: (v) => DATE_FORMATS.find((f) => f.id === v)?.label ?? String(v),
  },

  brandColor: {
    group: "candidate-experience",
    label: "Brand colour",
    parse: (v) => {
      if (blank(v)) return ok(null);
      const s = typeof v === "string" ? v.trim().toLowerCase() : "";
      const full = /^#[0-9a-f]{3}$/.test(s) ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s;
      return HEX_RE.test(full) ? ok(full) : bad("Enter a colour like #4f46e5.");
    },
    show: (v) => orNone(v, "Default"),
  },
  senderName: { group: "candidate-experience", label: "Sender name", growth: true, parse: parseText(60, "a sender name"), show: (v) => orNone(v, "Workspace name") },
  privacyNoticeUrl: { group: "candidate-experience", label: "Privacy notice", parse: parseHttpsUrl, show: (v) => orNone(v) },
  consentRequired: { group: "candidate-experience", label: "Ask for consent", parse: parseBool, show: onOff },
  helpEmail: { group: "candidate-experience", label: "Help contact", parse: parseEmail, show: (v) => orNone(v) },

  defaultTakeHomePassMark: {
    group: "screening-defaults",
    label: "Take-home pass mark",
    parse: parseWhole(SCORE_PASS_MARK_MIN, SCORE_PASS_MARK_MAX, `Enter a whole number from ${SCORE_PASS_MARK_MIN} to ${SCORE_PASS_MARK_MAX}.`),
    show: (v) => String(v),
  },
  defaultAiPassMark: {
    group: "screening-defaults",
    label: "AI screening pass mark",
    parse: parseWhole(SCORE_PASS_MARK_MIN, SCORE_PASS_MARK_MAX, `Enter a whole number from ${SCORE_PASS_MARK_MIN} to ${SCORE_PASS_MARK_MAX}.`),
    show: (v) => String(v),
  },
  defaultInterviewPassMark: {
    group: "screening-defaults",
    label: "Interview pass mark",
    parse: (v) => {
      const n = asNumber(v);
      if (n === null || n < INTERVIEW_PASS_MIN || n > INTERVIEW_PASS_MAX) {
        return bad(`Enter a mark from ${INTERVIEW_PASS_MIN} to ${INTERVIEW_PASS_MAX}.`);
      }
      return ok(Math.round(n / INTERVIEW_PASS_STEP) * INTERVIEW_PASS_STEP);
    },
    show: (v) => (typeof v === "number" ? v.toFixed(Number.isInteger(v * 2) ? 1 : 2) : String(v)),
  },
  inviteExpiryDays: {
    group: "screening-defaults",
    label: "Invite links stay open for",
    parse: parseChoice(INVITE_EXPIRY_CHOICES, false, "Pick how long invites stay open."),
    show: (v) => days(Number(v)),
  },
  remindNotStarted: { group: "screening-defaults", label: "Remind if not started", parse: parseBool, show: onOff },
  remindBeforeDeadline: { group: "screening-defaults", label: "Remind before the link closes", parse: parseBool, show: onOff },
  aiDefaultMinutes: {
    group: "screening-defaults",
    label: "AI screening length",
    parse: parseChoice(AI_MINUTES_CHOICES, false, "Pick a length."),
    show: (v) => `${v} minutes`,
  },
  keepVoiceAnswers: { group: "screening-defaults", label: "Keep voice answers", parse: parseBool, show: onOff },
  interviewerLanguage: {
    group: "screening-defaults",
    label: "Interviewer language",
    parse: (v) => (INTERVIEWER_LANGUAGES.some((l) => l.id === v) ? ok(v) : bad("Pick a language.")),
    show: (v) => INTERVIEWER_LANGUAGES.find((l) => l.id === v)?.label ?? String(v),
  },
  interviewDefaultMinutes: {
    group: "screening-defaults",
    label: "Interview length",
    parse: parseChoice(INTERVIEW_MINUTES_CHOICES, false, "Pick a length."),
    show: (v) => `${v} minutes`,
  },
  scorecardFirst: { group: "screening-defaults", label: "Scorecard before seeing others", parse: parseBool, show: onOff },
  scorecardReminderHours: {
    group: "screening-defaults",
    label: "Scorecard reminder",
    parse: parseChoice(SCORECARD_REMINDER_CHOICES, true, "Pick when to remind."),
    show: (v) => (v == null ? "Off" : `${hours(Number(v))} after`),
  },

  require2faForAll: { group: "security", label: "Two-factor for everyone", ownerOnly: true, parse: parseBool, show: onOff },
  require2faFrom: { group: "security", label: "Two-factor required from", ownerOnly: true, parse: parseDate, show: isoDay },
  sessionMaxAgeDays: {
    group: "security",
    label: "Sign-in lasts",
    parse: parseChoice(SESSION_MAX_AGE_CHOICES, true, "Pick how long a sign-in lasts."),
    show: (v) => (v == null ? "Site default" : days(Number(v))),
  },
  allowedEmailDomains: {
    group: "security",
    label: "Allowed email domains",
    parse: normalizeDomains,
    show: (v) => (Array.isArray(v) && v.length ? v.join(", ") : "Any domain"),
  },
  joinWithoutInvite: { group: "security", label: "Join without an invite", parse: parseBool, show: onOff },
  joinRole: {
    group: "security",
    label: "Role for people who join",
    parse: (v) => ((JOIN_ROLES as readonly unknown[]).includes(v) ? ok(v) : bad("Pick a role.")),
    show: (v) => (typeof v === "string" ? v.charAt(0) + v.slice(1).toLowerCase() : String(v)),
  },
  apiKeyMaxLifetimeDays: {
    group: "security",
    label: "Longest API key lifetime",
    parse: parseChoice(API_KEY_LIFETIME_CHOICES, true, "Pick a lifetime."),
    show: (v) => (v == null ? "No limit" : days(Number(v))),
  },

  lowCreditThreshold: {
    group: "billing",
    label: "Low credit email",
    parse: (v) => {
      if (blank(v) || v === "off") return ok(null);
      const n = asNumber(v);
      return n !== null && Number.isInteger(n) && n >= 1 && n <= 10_000 ? ok(n) : bad("Enter a whole number of credits.");
    },
    show: (v) => (v == null ? "Off" : `Below ${v} credits`),
  },
} satisfies Record<string, FieldRule>;

export type SettingsField = keyof typeof SETTINGS_FIELDS;

export function isSettingsField(v: unknown): v is SettingsField {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SETTINGS_FIELDS, v);
}

export function fieldsOf(group: SettingsGroup): SettingsField[] {
  return (Object.keys(SETTINGS_FIELDS) as SettingsField[]).filter((f) => SETTINGS_FIELDS[f].group === group);
}

/* ── Normalising stored rows ────────────────────────────────────────────── */

type Row = Partial<Record<keyof WorkspaceSettings, unknown>> & { name?: unknown; slug?: unknown };

/**
 * Typed settings from a Workspace row (or part of one). Anything missing or
 * unreadable falls back to its default, so callers never branch on null.
 */
export function normalizeWorkspaceSettings(row: Row): WorkspaceSettings {
  const out: WorkspaceSettings = {
    ...SETTINGS_DEFAULTS,
    allowedEmailDomains: [],
    name: typeof row.name === "string" ? row.name : "",
    slug: typeof row.slug === "string" ? row.slug : "",
  };
  const take = <K extends keyof WorkspaceSettings>(key: K) => {
    const v = row[key];
    if (v === undefined) return;
    if (isSettingsField(key)) {
      const p = SETTINGS_FIELDS[key].parse(v);
      if (p.ok) (out[key] as unknown) = p.value;
      return;
    }
    (out[key] as unknown) = v;
  };
  for (const key of Object.keys(SETTINGS_DEFAULTS) as (keyof WorkspaceSettings)[]) take(key);
  // Stamps and ids pass through only when they have the right type.
  for (const k of ["replyToConfirmedAt", "require2faRemindedAt", "sessionsRevokedAt", "lowCreditAlertedAt", "deletionScheduledAt"] as const) {
    const v = row[k];
    out[k] = v instanceof Date && !Number.isNaN(v.getTime()) ? v : typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null;
  }
  for (const k of ["replyToEmail", "deletionRequestedById"] as const) {
    const v = row[k];
    out[k] = typeof v === "string" && v ? v : null;
  }
  return out;
}

/* ── Diffing a save ─────────────────────────────────────────────────────── */

export type SettingsChange = {
  field: SettingsField;
  label: string;
  /** Value to store. */
  value: unknown;
  /** Readable before and after, for the audit log. */
  from: string;
  to: string;
};

export type SettingsDiff = {
  changes: SettingsChange[];
  /** Per-field messages, ready to show under the control. */
  errors: Partial<Record<string, string>>;
};

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a == b;
  }
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  return a === b;
}

/**
 * Validate a patch for one group against the current settings. Unknown
 * fields, fields from another group, plan-gated and owner-only fields are
 * reported as errors; unchanged fields are dropped.
 */
export function diffSettings(
  current: WorkspaceSettings,
  group: SettingsGroup,
  patch: Record<string, unknown>,
  opts: { growth: boolean; owner: boolean },
): SettingsDiff {
  const changes: SettingsChange[] = [];
  const errors: SettingsDiff["errors"] = {};
  for (const [field, raw] of Object.entries(patch)) {
    if (!isSettingsField(field)) {
      errors[field] = "This setting cannot be changed here.";
      continue;
    }
    const rule: FieldRule = SETTINGS_FIELDS[field];
    if (rule.group !== group) {
      errors[field] = "This setting cannot be changed here.";
      continue;
    }
    const parsed = rule.parse(raw);
    if (!parsed.ok) {
      errors[field] = parsed.error;
      continue;
    }
    const before = current[field];
    if (same(before, parsed.value)) continue;
    if (rule.growth && !opts.growth) {
      errors[field] = "Available on the Growth plan.";
      continue;
    }
    if (rule.ownerOnly && !opts.owner) {
      errors[field] = "Only an owner can change this.";
      continue;
    }
    changes.push({ field, label: rule.label, value: parsed.value, from: rule.show(before), to: rule.show(parsed.value) });
  }
  return { changes, errors };
}

/* ── Helpers the rest of the app reads settings through ─────────────────── */

type S = Pick<WorkspaceSettings, keyof WorkspaceSettings>;

/** Starting pass marks for new take-homes, AI screenings and interviews. */
export function defaultPassMarks(s: Pick<S, "defaultTakeHomePassMark" | "defaultAiPassMark" | "defaultInterviewPassMark">) {
  return { takeHome: s.defaultTakeHomePassMark, ai: s.defaultAiPassMark, interview: s.defaultInterviewPassMark };
}

/**
 * Starting values for new items, shaped like the fields each composer
 * already uses. Existing items keep the values they were sent with.
 */
export function screeningStartValues(s: S) {
  return {
    takeHome: {
      passMark: s.defaultTakeHomePassMark,
      expiresInDays: s.inviteExpiryDays,
      reminders: {
        startAfterHours: s.remindNotStarted ? DEFAULT_START_REMINDER_HOURS : null,
        beforeDeadlineHours: s.remindBeforeDeadline ? DEFAULT_LAST_CALL_HOURS : null,
        off: !s.remindNotStarted && !s.remindBeforeDeadline,
      } satisfies ReminderPlan,
    },
    ai: {
      passMark: s.defaultAiPassMark,
      expiresAfterDays: s.inviteExpiryDays,
      /** 0 means no reminder, as in REMINDER_CHOICES. */
      reminderAfterDays: s.remindNotStarted ? DEFAULT_REMINDER_DAYS : 0,
      estimatedMinutes: s.aiDefaultMinutes,
      recordAudio: s.keepVoiceAnswers,
      language: s.interviewerLanguage,
    },
    interview: {
      passMark: s.defaultInterviewPassMark,
      minutes: s.interviewDefaultMinutes,
      scorecardFirst: s.scorecardFirst,
      scorecardReminderHours: s.scorecardReminderHours,
    },
  };
}

/** Lowercase domain of an email address, or null. */
export function emailDomain(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 1) return null;
  const d = email.trim().toLowerCase().slice(at + 1);
  return d || null;
}

/** An empty list allows any domain. Subdomains of an allowed domain count. */
export function isEmailDomainAllowed(s: Pick<S, "allowedEmailDomains">, email: string): boolean {
  if (!s.allowedEmailDomains.length) return true;
  const d = emailDomain(email);
  if (!d) return false;
  return s.allowedEmailDomains.some((a) => d === a || d.endsWith(`.${a}`));
}

/** Whether someone with this email may join without an invite. */
export function canJoinWithoutInvite(s: Pick<S, "joinWithoutInvite" | "allowedEmailDomains">, email: string): boolean {
  return s.joinWithoutInvite && s.allowedEmailDomains.length > 0 && isEmailDomainAllowed(s, email);
}

/**
 * Whether a member must have two-factor sign-in now. Owners and admins of a
 * paid workspace always must (the existing gate); everyone else must once
 * the workspace turns it on and its start date has passed.
 */
export function twoFactorRequired(
  s: Pick<S, "require2faForAll" | "require2faFrom">,
  member: { role: string },
  planName: string,
  now: Date = new Date(),
): boolean {
  const adminOnPaid =
    WORKSPACE_ADMIN_ROLES.includes(member.role) && PAID_PLANS.includes(planName);
  if (adminOnPaid) return true;
  if (!s.require2faForAll) return false;
  return !s.require2faFrom || now.getTime() >= s.require2faFrom.getTime();
}

/**
 * Whether a sign-in that started at `signedInAt` is no longer good for this
 * workspace: everyone was signed out after it, or it is older than the
 * workspace's longest sign-in.
 */
export function signInExpired(
  s: Pick<S, "sessionsRevokedAt" | "sessionMaxAgeDays">,
  signedInAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!signedInAt) return Boolean(s.sessionsRevokedAt || s.sessionMaxAgeDays);
  if (s.sessionsRevokedAt && signedInAt.getTime() < s.sessionsRevokedAt.getTime()) return true;
  if (s.sessionMaxAgeDays && now.getTime() - signedInAt.getTime() > s.sessionMaxAgeDays * DAY_MS) return true;
  return false;
}

/**
 * Check a new API key's expiry against the workspace limit. Null expiry
 * means "never"; with a limit set that is refused.
 */
export function checkApiKeyExpiry(
  s: Pick<S, "apiKeyMaxLifetimeDays">,
  expiresAt: Date | null,
  now: Date = new Date(),
): { ok: true } | { ok: false; error: string; latest: Date } {
  if (!s.apiKeyMaxLifetimeDays) return { ok: true };
  const latest = new Date(now.getTime() + s.apiKeyMaxLifetimeDays * DAY_MS);
  if (!expiresAt || expiresAt.getTime() > latest.getTime() + 60_000) {
    return { ok: false, error: `Keys in this workspace must expire within ${days(s.apiKeyMaxLifetimeDays)}.`, latest };
  }
  return { ok: true };
}

/** "Acme via Interviewpad". */
export function senderDisplayName(s: Pick<S, "senderName" | "name">): string {
  return `${(s.senderName || s.name || "Interviewpad").replace(/[<>"]/g, "")} via Interviewpad`;
}

/** Reply-to for candidate emails, only once the address was confirmed. */
export function replyToAddress(s: Pick<S, "replyToEmail" | "replyToConfirmedAt">): string | null {
  return s.replyToEmail && s.replyToConfirmedAt ? s.replyToEmail : null;
}

/** When a scheduled deletion becomes final, or null. */
export function deletionFinalAt(s: Pick<S, "deletionScheduledAt">): Date | null {
  return s.deletionScheduledAt ? new Date(s.deletionScheduledAt.getTime() + DELETION_GRACE_DAYS * DAY_MS) : null;
}

/** Retention period in milliseconds (months count as 30 days). */
export function retentionPeriodMs(amount: number, unit: RetentionUnit): number {
  return amount * (unit === "DAYS" ? 1 : 30) * DAY_MS;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a date in the workspace's time zone and date format. */
export function formatWorkspaceDate(d: Date | string, s: Pick<S, "timezone" | "dateFormat">, withTime = false): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const tz = isValidTimezone(s.timezone) ? s.timezone : "UTC";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const day = String(Number(parts.day));
  // Fixed English month names: ICU data differs between runtimes ("Sep" vs "Sept").
  const mon = MONTHS[Number(parts.month) - 1];
  const base =
    s.dateFormat === "YMD"
      ? `${parts.year}-${parts.month}-${parts.day}`
      : s.dateFormat === "MDY"
        ? `${mon} ${day}, ${parts.year}`
        : `${day} ${mon} ${parts.year}`;
  return withTime ? `${base} ${parts.hour}:${parts.minute}` : base;
}
