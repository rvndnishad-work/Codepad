/**
 * Pure helpers for the admin list pages (Interviews, AI credits, Emails):
 * reading search params, UTC date ranges, page windows, links that keep the
 * other filters, and CSV cells. No database, no React, so they are unit
 * tested in params.test.ts.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param, trimmed, "" when missing. */
export function one(v: string | string[] | undefined): string {
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
}

/** A 1-based page number from `?page=`, 1 when missing or junk. */
export function pageParam(sp: SearchParams): number {
  const n = Number.parseInt(one(sp.page), 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** A value from a fixed list, or "" when it is not one of them. */
export function pick<T extends string>(v: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(v) ? (v as T) : "";
}

/** "2026-09-30" to midnight UTC on that day. Null when it is not a real date. */
export function parseDay(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(y, mo - 1, da));
  // Rejects 2026-02-31 and friends, which Date.UTC would roll over.
  return d.getUTCFullYear() === y && d.getUTCMonth() === mo - 1 && d.getUTCDate() === da ? d : null;
}

/** A day param kept only when it parses, so bad input never sticks in links. */
export function dayParam(v: string): string {
  return parseDay(v) ? v : "";
}

/**
 * A Prisma date filter for "from" and "to" days, both inclusive, in UTC.
 * Undefined when neither is set, so it can go straight into a where.
 */
export function dayRange(from: string, to: string): { gte?: Date; lt?: Date } | undefined {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a && !b) return undefined;
  const out: { gte?: Date; lt?: Date } = {};
  if (a) out.gte = a;
  if (b) out.lt = new Date(b.getTime() + 86_400_000);
  return out;
}

/** The first moment of the current month in UTC. */
export function utcMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Skip and take for one page, with the page clamped into range. */
export function pageWindow(page: number, total: number, size: number) {
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const skip = (current - 1) * size;
  return { page: current, pages, total, skip, take: size, first: total === 0 ? 0 : skip + 1, last: Math.min(skip + size, total) };
}

export type PageWindow = ReturnType<typeof pageWindow>;

/**
 * A link to `base` with the current filters plus `patch`. Empty values are
 * dropped. Changing any filter goes back to page 1, unless the patch sets
 * the page itself.
 */
export function hrefWith(
  base: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | number | null | undefined> = {},
): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | number | null | undefined> = { ...current, ...patch };
  if (!("page" in patch)) delete merged.page;
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "" || (k === "page" && Number(v) <= 1)) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** One CSV cell: quoted when needed, and guarded against spreadsheet formulas. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/** "Sep 30, 2026, 14:05 UTC" style, always UTC so every admin reads the same time. */
export function utcStamp(d: Date | string | null | undefined): string {
  if (!d) return "";
  const t = typeof d === "string" ? new Date(d) : d;
  return `${t.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** "30 Sep 2026" in UTC. */
export function utcDay(d: Date | string | null | undefined): string {
  if (!d) return "";
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
