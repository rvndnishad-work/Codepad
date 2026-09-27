/**
 * Helpers for Settings > General and Screening defaults, and for the places
 * that read those defaults (the take-home composer, New AI screening, the
 * interview wizard, the scorecard reminder cron, the logo route).
 *
 * Pure and synchronous, so client components, server code and tests share it.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/* ── Choices ────────────────────────────────────────────────────────────── */

/**
 * A list of offered choices that always contains `value`, sorted. A default
 * picked in Settings shows as a choice in the composer even when that
 * composer offers a different set.
 */
export function choicesWith(choices: readonly number[], value: number | null | undefined): number[] {
  const out = [...choices];
  if (typeof value === "number" && Number.isFinite(value) && value > 0 && !out.includes(value)) out.push(value);
  return out.sort((a, b) => a - b);
}

/** Which preset button is on for a pass mark, or "custom" when none matches. */
export function presetFor(presets: readonly number[], value: number): number | "custom" {
  return presets.find((p) => Math.abs(p - value) < 1e-9) ?? "custom";
}

/* ── Interview length ───────────────────────────────────────────────────── */

/** The length every format was built around (a coding round). */
export const STOCK_INTERVIEW_MINUTES = 60;

/**
 * Starting length for a new interview. Each format has its usual length (an
 * intro chat 30 minutes, a coding round 60); the workspace default moves
 * them all by the same amount, so an untouched workspace (60) keeps the
 * usual lengths and a workspace at 45 starts a coding round at 45 and an
 * intro chat at 15. Clamped to the wizard's limits and whole quarter hours.
 */
export function interviewStartMinutes(
  formatMinutes: number | null | undefined,
  workspaceDefault: number,
  limits: { min: number; max: number } = { min: 15, max: 240 },
): number {
  const base = typeof formatMinutes === "number" && Number.isFinite(formatMinutes) ? formatMinutes : STOCK_INTERVIEW_MINUTES;
  const shift = (Number.isFinite(workspaceDefault) ? workspaceDefault : STOCK_INTERVIEW_MINUTES) - STOCK_INTERVIEW_MINUTES;
  const n = Math.round((base + shift) / 15) * 15;
  return Math.min(limits.max, Math.max(limits.min, n));
}

/* ── Scorecard reminder ─────────────────────────────────────────────────── */

/** An automatic scorecard reminder older than this is dropped, not sent late. */
export const SCORECARD_REMINDER_STALE_DAYS = 7;

export type ScorecardReminderSubject = {
  status: string;
  scheduledAt: Date | null;
  finishedAt: Date | null;
  totalSec: number;
  scorecardReminderHours: number | null;
  scorecardAutoRemindedAt: Date | null;
};

/**
 * When the interview ended: when someone ended the room, or else the
 * planned end (start plus length) of one that started and was never ended.
 * Null for interviews that never happened.
 */
export function interviewEndedAt(s: Pick<ScorecardReminderSubject, "status" | "scheduledAt" | "finishedAt" | "totalSec">): Date | null {
  if (s.status === "completed") {
    if (s.finishedAt) return s.finishedAt;
    return s.scheduledAt ? new Date(s.scheduledAt.getTime() + Math.max(0, s.totalSec) * 1000) : null;
  }
  if (s.status === "in_progress" && s.scheduledAt) return new Date(s.scheduledAt.getTime() + Math.max(0, s.totalSec) * 1000);
  return null;
}

/**
 * Whether the automatic scorecard reminder should go out now:
 * "send" when it is due, "drop" when it is too late to be useful (stamp it
 * so the cron stops looking), "wait" otherwise.
 */
export function scorecardReminderState(s: ScorecardReminderSubject, now: Date = new Date()): "send" | "drop" | "wait" {
  if (s.scorecardReminderHours == null || s.scorecardReminderHours <= 0 || s.scorecardAutoRemindedAt) return "wait";
  const ended = interviewEndedAt(s);
  if (!ended) return "wait";
  const due = ended.getTime() + s.scorecardReminderHours * HOUR_MS;
  if (now.getTime() < due) return "wait";
  if (now.getTime() - due > SCORECARD_REMINDER_STALE_DAYS * DAY_MS) return "drop";
  return "send";
}

/* ── Logo ───────────────────────────────────────────────────────────────── */

/** Largest logo upload, in bytes. */
export const LOGO_MAX_BYTES = 512 * 1024;
/** Raster formats only: an SVG served from our own origin could run script. */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

export function checkLogoFile(file: { type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return { ok: false, error: "Use a PNG, JPG or WebP image." };
  if (file.size <= 0) return { ok: false, error: "That file is empty." };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, error: "Use an image under 512 KB." };
  return { ok: true };
}

/** The image type from the file's first bytes, so a renamed file cannot pass as an image. */
export function sniffImageType(bytes: Uint8Array): LogoType | null {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Address of an uploaded logo. The version makes browsers and mail clients fetch a new one after a change. */
export function uploadedLogoUrl(origin: string, workspaceId: string, version: number): string {
  return `${origin.replace(/\/$/, "")}/api/workspace-logo/${encodeURIComponent(workspaceId)}?v=${version.toString(36)}`;
}

/** Whether a logo address points at our own upload route (so removing it also deletes the file). */
export function isUploadedLogoUrl(url: string | null | undefined, workspaceId: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).pathname === `/api/workspace-logo/${encodeURIComponent(workspaceId)}`;
  } catch {
    return false;
  }
}

/* ── Web address ────────────────────────────────────────────────────────── */

/**
 * The same page under a workspace's new address: /w/old/candidates?x=1
 * becomes /w/new/candidates?x=1. Anything that is not under /w/<oldSlug>
 * goes to the new workspace home.
 */
export function movedSlugPath(pathWithQuery: string | null | undefined, oldSlug: string, newSlug: string): string {
  const home = `/w/${newSlug}`;
  if (!pathWithQuery) return home;
  const prefix = `/w/${oldSlug}`;
  if (pathWithQuery === prefix) return home;
  for (const sep of ["/", "?", "#"]) {
    if (pathWithQuery.startsWith(prefix + sep)) return home + pathWithQuery.slice(prefix.length);
  }
  return home;
}

/** Workspace addresses people might type that we keep for our own pages. */
export const RESERVED_SLUGS = ["new", "create", "settings", "admin", "api", "login", "join", "invite", "dashboard", "w"] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug) || slug.startsWith("__");
}

/* ── Time zones ─────────────────────────────────────────────────────────── */

/** Every IANA time zone the runtime knows, with UTC first. */
export function timezoneList(): string[] {
  let zones: string[] = [];
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    zones = intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  if (!zones.length) zones = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
  // Some runtimes list old names (Asia/Calcutta); show the names people know.
  const named = [...new Set(zones.map((z) => MODERN_ZONE_NAMES[z] ?? z))].filter((z) => z !== "UTC").sort();
  return ["UTC", ...named];
}

const MODERN_ZONE_NAMES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "America/Godthab": "America/Nuuk",
  "Pacific/Enderbury": "Pacific/Kanton",
};

/** "GMT+5:30" for a zone at a moment, or "" when the runtime cannot tell. */
export function timezoneOffset(tz: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    return part?.value === "GMT" ? "GMT+0" : (part?.value ?? "");
  } catch {
    return "";
  }
}

/** "Asia/Kolkata" reads as "Asia / Kolkata (GMT+5:30)". */
export function timezoneLabel(tz: string, at: Date = new Date()): string {
  const name = tz.replace(/_/g, " ").replace(/\//g, " / ");
  const off = timezoneOffset(tz, at);
  return off ? `${name} (${off})` : name;
}

/**
 * Request header the proxy sets on /w/... requests with the path and query
 * asked for, so a layout can send an old web address to the same page at
 * the new one (layouts do not otherwise see the full path).
 */
export const REQUEST_PATH_HEADER = "x-interviewpad-path";
