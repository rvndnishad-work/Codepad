/**
 * Pure helpers for the Developers dashboard stats. No database access here,
 * so everything in this file is unit tested (developer-helpers.test.ts).
 */

export const DEV_RANGES = [7, 30, 90, 365] as const;
export type DevRange = (typeof DEV_RANGES)[number];
export type Bucket = "day" | "week";

export function parseRange(v: unknown): DevRange {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return (DEV_RANGES as readonly number[]).includes(n) ? (n as DevRange) : 30;
}

export function rangeLabel(range: DevRange): string {
  return range === 365 ? "12 months" : `${range} days`;
}

const DAY_MS = 86_400_000;

export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Monday 00:00 UTC of the week holding `d` (matches Postgres date_trunc('week')). */
export function utcWeek(d: Date): Date {
  const day = utcDay(d);
  const dow = (day.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(day.getTime() - dow * DAY_MS);
}

export type RangeWindow = {
  range: DevRange;
  /** Inclusive start (UTC midnight). */
  start: Date;
  /** Exclusive end (now). */
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  bucket: Bucket;
};

/**
 * The current window is the last `range` UTC days including today; the
 * previous window is the same length immediately before it.
 */
export function rangeWindow(range: DevRange, now: Date = new Date()): RangeWindow {
  const today = utcDay(now);
  const start = new Date(today.getTime() - (range - 1) * DAY_MS);
  const prevStart = new Date(start.getTime() - range * DAY_MS);
  return { range, start, end: now, prevStart, prevEnd: start, bucket: range >= 365 ? "week" : "day" };
}

export type SeriesPoint = { at: Date; value: number };

/**
 * Turn sparse SQL rows (one per non-empty bucket) into a dense series with a
 * zero for every empty bucket between start and end.
 */
export function fillBuckets(
  rows: { at: Date; value: number }[],
  start: Date,
  end: Date,
  bucket: Bucket,
): SeriesPoint[] {
  const key = (d: Date) => (bucket === "week" ? utcWeek(d) : utcDay(d)).getTime();
  const byKey = new Map<number, number>();
  for (const r of rows) byKey.set(key(r.at), (byKey.get(key(r.at)) ?? 0) + Number(r.value));
  const step = bucket === "week" ? 7 * DAY_MS : DAY_MS;
  const out: SeriesPoint[] = [];
  for (let t = key(start); t < end.getTime(); t += step) {
    out.push({ at: new Date(t), value: byKey.get(t) ?? 0 });
  }
  return out;
}

export function peakOf(series: SeriesPoint[]): SeriesPoint | null {
  let best: SeriesPoint | null = null;
  for (const p of series) if (p.value > 0 && (!best || p.value > best.value)) best = p;
  return best;
}

/**
 * Percentile with linear interpolation between closest ranks, the same
 * definition as Postgres `percentile_cont`. Returns null for no values.
 */
export function percentile(values: number[], p: number): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const pos = Math.min(Math.max(p, 0), 1) * (v.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

export function p95(values: number[]): number | null {
  return percentile(values, 0.95);
}

/**
 * Daily p95 values cannot be merged exactly; for roll-up reads we take the
 * run-weighted mean of the daily p95s, which is a fair approximation for a
 * dashboard and is labelled "approx." where shown.
 */
export function approxP95FromDaily(rows: { p95: number | null; count: number }[]): number | null {
  let w = 0;
  let s = 0;
  for (const r of rows) {
    if (r.p95 == null || r.count <= 0) continue;
    w += r.count;
    s += r.p95 * r.count;
  }
  return w > 0 ? s / w : null;
}

export type Comparison = {
  current: number;
  previous: number;
  /** Whole-percent change, null when the previous period had nothing. */
  pct: number | null;
  direction: "up" | "down" | "flat";
};

export function comparePeriods(current: number, previous: number): Comparison {
  if (previous === 0) {
    return { current, previous, pct: null, direction: current > 0 ? "up" : "flat" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { current, previous, pct, direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

export function comparisonText(c: Comparison, periodLabel = "the period before"): string {
  if (c.pct === null) return c.current > 0 ? `none in ${periodLabel}` : "none yet";
  if (c.pct === 0) return `same as ${periodLabel}`;
  return `${c.pct > 0 ? "+" : ""}${c.pct}% on ${periodLabel}`;
}

/** Account.provider (or null for a user with no OAuth account) to a label. */
export function providerLabel(provider: string | null | undefined): string {
  const p = (provider ?? "").toLowerCase();
  if (!p || p === "credentials" || p === "email" || p === "nodemailer" || p === "resend") return "Email";
  if (p === "google") return "Google";
  if (p === "github") return "GitHub";
  if (p === "facebook") return "Facebook";
  if (p === "linkedin") return "LinkedIn";
  if (p === "microsoft-entra-id" || p === "azure-ad") return "Microsoft";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export type ProviderShare = { label: string; count: number; pct: number };

/** Merge provider rows by label and give whole-percent shares, largest first. */
export function providerShares(rows: { provider: string | null; count: number }[]): ProviderShare[] {
  const byLabel = new Map<string, number>();
  for (const r of rows) {
    const l = providerLabel(r.provider);
    byLabel.set(l, (byLabel.get(l) ?? 0) + Number(r.count));
  }
  const total = [...byLabel.values()].reduce((a, b) => a + b, 0);
  return [...byLabel.entries()]
    .map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function sharesText(shares: { label: string; pct: number }[], max = 3): string {
  return shares
    .slice(0, max)
    .map((s) => `${s.label} ${s.pct}%`)
    .join(", ");
}

/** A metric that depends on tracking added in P0 gets a pill until it has a week of data. */
export const NEW_TRACKING_DAYS = 7;
export function isNewTracking(firstDataAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!firstDataAt) return true;
  return now.getTime() - firstDataAt.getTime() < NEW_TRACKING_DAYS * DAY_MS;
}

/**
 * Whether roll-up rows can stand in for the live series: only for long
 * ranges, and only when they reach back to the start of the window.
 */
export function shouldUseRollup(range: DevRange, firstRollupDay: Date | null | undefined, start: Date): boolean {
  if (range < 90 || !firstRollupDay) return false;
  return utcDay(firstRollupDay).getTime() <= start.getTime();
}

export function ratio(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

export function pctText(r: number | null, digits = 0): string {
  if (r == null) return "—";
  return `${(r * 100).toFixed(digits)}%`;
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return Math.round(n).toLocaleString("en-US");
}

export function msText(ms: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export function secText(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function money(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "19 Sep" in UTC. */
export function shortDay(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Quote a value for CSV. */
export function csvCell(v: unknown): string {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
