/**
 * Settings > Data and privacy: the pure rules. No database, no I/O, so the
 * page, the server actions, the crons and the unit tests share one copy.
 *
 * Retention rules run in weekly batches: a nightly cron emails owners and
 * admins about everything a rule will erase within the next 7 days, then
 * erases exactly that on the announced date. Nothing is ever erased without
 * that advance email, and passed candidates are never erased by a rule.
 */
import {
  DATA_REQUEST_DUE_DAYS,
  RETENTION_DEFAULTS,
  RETENTION_KINDS,
  RETENTION_NOTICE_DAYS,
  retentionPeriodMs,
  type RetentionKind,
  type RetentionUnit,
} from "./settings";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ── Subprocessors and agreements ───────────────────────────────────────── */

export type Subprocessor = { name: string; purpose: string; location: string; url: string };

/** Services that process workspace data for Interviewpad. */
export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    name: "Google Gemini",
    purpose: "AI screening questions, follow-ups and grading",
    location: "United States",
    url: "https://ai.google.dev/gemini-api/terms",
  },
  {
    name: "OpenAI",
    purpose: "Spoken answers turned into text, and voice for the AI interviewer",
    location: "United States",
    url: "https://openai.com/policies/privacy-policy",
  },
  { name: "Resend", purpose: "Emails to candidates and members", location: "United States", url: "https://resend.com/legal/privacy-policy" },
  { name: "Stripe", purpose: "Payments and invoices", location: "United States", url: "https://stripe.com/privacy" },
  { name: "Vercel", purpose: "Hosting the app", location: "United States and region of choice", url: "https://vercel.com/legal/privacy-policy" },
  { name: "Neon", purpose: "Database hosting", location: "Region of choice", url: "https://neon.tech/privacy-policy" },
];

/** Where customers ask for the data processing agreement. */
export const DPA_REQUEST_URL = "mailto:privacy@interviewpad.in?subject=Data%20processing%20agreement";

/* ── Retention rules ────────────────────────────────────────────────────── */

export type RetentionRuleState = {
  kind: RetentionKind;
  enabled: boolean;
  amount: number;
  unit: RetentionUnit;
  /** Set once the 7-day advance email went out for the current batch. */
  noticeSentAt: Date | null;
  /** When the announced batch is erased. */
  nextNoticeAt: Date | null;
  lastRunAt: Date | null;
  lastErasedCount: number | null;
};

/** What each rule works on, for the page and the emails. */
export const RETENTION_COPY: Record<RetentionKind, { title: string; help: string; noun: [string, string] }> = {
  INACTIVE_CANDIDATES: {
    title: "Erase inactive candidates",
    help: "Candidates with no screening, note or change for this long. Passed candidates are never erased.",
    noun: ["candidate", "candidates"],
  },
  NOT_PASSED: {
    title: "Erase candidates marked not passed",
    help: "Counted from the day they were marked not passed. Passed candidates are never erased.",
    noun: ["candidate", "candidates"],
  },
  VOICE_RECORDINGS: {
    title: "Delete voice recordings",
    help: "Recorded spoken answers from AI screenings, counted from the day they were recorded. Scores and written answers stay.",
    noun: ["recording", "recordings"],
  },
  CODE_REPLAYS: {
    title: "Delete code replays",
    help: "The keystroke replay of a take home, counted from the day it was submitted. The final code and score stay.",
    noun: ["replay", "replays"],
  },
};

/** Limits for a rule period, per unit. */
export const RETENTION_LIMITS: Record<RetentionUnit, { min: number; max: number }> = {
  DAYS: { min: 7, max: 3650 },
  MONTHS: { min: 1, max: 120 },
};

/** Units each rule may use: recordings count in days, the rest in months. */
export const RETENTION_UNITS: Record<RetentionKind, RetentionUnit> = {
  INACTIVE_CANDIDATES: "MONTHS",
  NOT_PASSED: "MONTHS",
  VOICE_RECORDINGS: "DAYS",
  CODE_REPLAYS: "MONTHS",
};

export function isRetentionKind(v: unknown): v is RetentionKind {
  return typeof v === "string" && (RETENTION_KINDS as readonly string[]).includes(v);
}

/** Rule rows by kind, with the built-in defaults (off) for rules never saved. */
export function withRetentionDefaults(
  rows: ({ kind: string } & Partial<Omit<RetentionRuleState, "kind" | "unit">> & { unit?: string })[],
): RetentionRuleState[] {
  const byKind = new Map(rows.map((r) => [r.kind, r]));
  return RETENTION_KINDS.map((kind) => {
    const r = byKind.get(kind);
    const d = RETENTION_DEFAULTS[kind];
    return {
      kind,
      enabled: r?.enabled ?? false,
      amount: r?.amount ?? d.amount,
      unit: r?.unit === "DAYS" || r?.unit === "MONTHS" ? r.unit : d.unit,
      noticeSentAt: r?.noticeSentAt ?? null,
      nextNoticeAt: r?.nextNoticeAt ?? null,
      lastRunAt: r?.lastRunAt ?? null,
      lastErasedCount: r?.lastErasedCount ?? null,
    };
  });
}

export type RetentionPatch = { kind: RetentionKind; enabled: boolean; amount: number; unit: RetentionUnit };

/** Check one edited rule. Returns the clean value or an error to show next to it. */
export function parseRetentionPatch(input: unknown): { ok: true; value: RetentionPatch } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Nothing to save." };
  const o = input as Record<string, unknown>;
  if (!isRetentionKind(o.kind)) return { ok: false, error: "Unknown rule." };
  const unit = RETENTION_UNITS[o.kind];
  if (o.unit !== undefined && o.unit !== unit) return { ok: false, error: "Unknown unit." };
  const amount = typeof o.amount === "string" ? Number(o.amount) : o.amount;
  const { min, max } = RETENTION_LIMITS[unit];
  const unitWord = unit === "DAYS" ? "days" : "months";
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < min || amount > max) {
    return { ok: false, error: `Enter a whole number of ${unitWord} from ${min} to ${max}.` };
  }
  if (typeof o.enabled !== "boolean") return { ok: false, error: "Choose on or off." };
  return { ok: true, value: { kind: o.kind, enabled: o.enabled, amount, unit } };
}

/** "12 months", "90 days", "1 month". */
export function periodLabel(amount: number, unit: RetentionUnit): string {
  const word = unit === "DAYS" ? "day" : "month";
  return `${amount} ${word}${amount === 1 ? "" : "s"}`;
}

/** Anything older than this is covered by the rule at `at`. */
export function retentionCutoff(amount: number, unit: RetentionUnit, at: Date): Date {
  return new Date(at.getTime() - retentionPeriodMs(amount, unit));
}

/**
 * True when a saved change means the announced batch no longer matches the
 * rule, so the notice has to go out again before anything is erased.
 */
export function retentionNeedsNewNotice(
  before: Pick<RetentionRuleState, "enabled" | "amount" | "unit">,
  after: Pick<RetentionRuleState, "enabled" | "amount" | "unit">,
): boolean {
  if (!after.enabled) return true;
  if (!before.enabled) return true;
  // A longer period only shrinks the batch, so the notice stays true; a
  // shorter one would erase more than was announced.
  return retentionPeriodMs(after.amount, after.unit) < retentionPeriodMs(before.amount, before.unit);
}

export type RetentionStep =
  | { step: "off" }
  /** Email admins about what `cutoff` will cover, erase on `dueAt`. */
  | { step: "notice"; dueAt: Date; cutoff: Date }
  /** Notice sent, waiting for `dueAt`. */
  | { step: "wait"; dueAt: Date }
  /** Erase everything older than `cutoff` (the date announced in the notice). */
  | { step: "erase"; cutoff: Date };

/**
 * What tonight's run does for one rule. Items covered at `dueAt` are what
 * the notice announces, and the erase on `dueAt` uses the same cutoff, so it
 * never takes more than was announced.
 */
export function planRetentionStep(rule: Pick<RetentionRuleState, "enabled" | "amount" | "unit" | "noticeSentAt" | "nextNoticeAt">, now: Date): RetentionStep {
  if (!rule.enabled) return { step: "off" };
  if (!rule.noticeSentAt || !rule.nextNoticeAt) {
    const dueAt = new Date(now.getTime() + RETENTION_NOTICE_DAYS * DAY_MS);
    return { step: "notice", dueAt, cutoff: retentionCutoff(rule.amount, rule.unit, dueAt) };
  }
  if (now.getTime() < rule.nextNoticeAt.getTime()) return { step: "wait", dueAt: rule.nextNoticeAt };
  return { step: "erase", cutoff: retentionCutoff(rule.amount, rule.unit, rule.nextNoticeAt) };
}

/* ── Candidates ─────────────────────────────────────────────────────────── */

/** Stored stages and statuses that mean Passed, old values included. */
export const PASSED_STAGES = ["PASSED", "OFFER", "HIRED"] as const;
export const PASSED_STATUSES = ["passed", "hired"] as const;

export function isPassedCandidate(c: { stage: string | null; status: string | null }): boolean {
  return (PASSED_STAGES as readonly string[]).includes(c.stage ?? "") || (PASSED_STATUSES as readonly string[]).includes(c.status ?? "");
}

type MaybeDate = Date | null | undefined;

/** Latest of the given dates, or null when there are none. */
export function latestDate(...dates: MaybeDate[]): Date | null {
  let best: Date | null = null;
  for (const d of dates) if (d && (!best || d.getTime() > best.getTime())) best = d;
  return best;
}

/**
 * Whether a candidate is covered by a candidate rule at `cutoff`.
 * `lastActivityAt` is the latest of their own changes, notes and screenings.
 */
export function candidateMatchesRule(
  kind: "INACTIVE_CANDIDATES" | "NOT_PASSED",
  c: { stage: string | null; status: string | null; stageChangedAt: MaybeDate; updatedAt: Date; lastActivityAt: MaybeDate },
  cutoff: Date,
): boolean {
  if (isPassedCandidate(c)) return false;
  if (kind === "NOT_PASSED") {
    if (c.stage !== "REJECTED") return false;
    const since = c.stageChangedAt ?? c.updatedAt;
    return since.getTime() < cutoff.getTime();
  }
  const last = latestDate(c.updatedAt, c.stageChangedAt, c.lastActivityAt) ?? c.updatedAt;
  return last.getTime() < cutoff.getTime();
}

/* ── Candidate data requests ────────────────────────────────────────────── */

export const DATA_REQUEST_KINDS = ["COPY", "ERASE"] as const;
export type DataRequestKind = (typeof DATA_REQUEST_KINDS)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercase, trimmed email, or null when it does not look like one. */
export function normalizeRequestEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

export function dataRequestDueAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + DATA_REQUEST_DUE_DAYS * DAY_MS);
}

/** Whole days until the due date (negative when late). */
export function daysUntil(due: Date, now: Date): number {
  return Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
}

/** Counts of what was found for one email, by kind of record. */
export type CandidateDataCounts = {
  candidates: number;
  notes: number;
  takeHomes: number;
  aiScreenings: number;
  recordings: number;
  interviews: number;
  scorecards: number;
  emails: number;
};

export const EMPTY_COUNTS: CandidateDataCounts = {
  candidates: 0,
  notes: 0,
  takeHomes: 0,
  aiScreenings: 0,
  recordings: 0,
  interviews: 0,
  scorecards: 0,
  emails: 0,
};

export const COUNT_LABELS: Record<keyof CandidateDataCounts, [string, string]> = {
  candidates: ["candidate record", "candidate records"],
  notes: ["note", "notes"],
  takeHomes: ["take home", "take homes"],
  aiScreenings: ["AI screening", "AI screenings"],
  recordings: ["voice recording", "voice recordings"],
  interviews: ["interview", "interviews"],
  scorecards: ["scorecard", "scorecards"],
  emails: ["email", "emails"],
};

export function totalCount(c: CandidateDataCounts): number {
  return Object.values(c).reduce((a, b) => a + b, 0);
}

/** "2 take homes, 1 AI screening" for the parts that are not zero. */
export function describeCounts(c: CandidateDataCounts): string {
  const parts = (Object.keys(COUNT_LABELS) as (keyof CandidateDataCounts)[])
    .filter((k) => c[k] > 0)
    .map((k) => `${c[k]} ${COUNT_LABELS[k][c[k] === 1 ? 0 : 1]}`);
  return parts.length ? parts.join(", ") : "Nothing";
}

/**
 * Replace a person's name and email wherever they appear as a whole string
 * value in an audit entry's meta, so the log keeps the event but not who.
 */
export function redactMeta(meta: string | null, needles: string[], replacement = "Erased candidate"): string | null {
  if (!meta) return meta;
  const lower = new Set(needles.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (!lower.size) return meta;
  let parsed: unknown;
  try {
    parsed = JSON.parse(meta);
  } catch {
    return meta;
  }
  let changed = false;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (lower.has(v.trim().toLowerCase())) {
        changed = true;
        return replacement;
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  const next = walk(parsed);
  return changed ? JSON.stringify(next) : meta;
}

/* ── Export everything ──────────────────────────────────────────────────── */

/** Days an export download link keeps working. */
export const EXPORT_LINK_DAYS = 7;
/** One export at a time: a new one can start once this long has passed. */
export const EXPORT_COOLDOWN_MINUTES = 10;

/**
 * CSV text for rows. Cells starting with = + - @ are prefixed with a quote
 * so spreadsheet apps do not run them as formulas.
 */
export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    let s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(cell).join(",")];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}

/** "1.2 MB" style size for the exports list. */
export function formatBytes(n: number | null | undefined): string {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Delete the workspace ───────────────────────────────────────────────── */

/** The owner types the workspace name to confirm; spacing and case do not matter. */
export function deletionConfirmMatches(typed: unknown, workspaceName: string): boolean {
  if (typeof typed !== "string") return false;
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(typed) !== "" && norm(typed) === norm(workspaceName);
}
