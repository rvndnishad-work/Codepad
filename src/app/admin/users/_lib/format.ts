/** Deterministic date formatting (same output on server and client). */
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const DAY_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function fmtDay(iso: string | Date | null | undefined): string {
  return iso ? DAY.format(new Date(iso)) : "";
}
export function fmtShort(iso: string | Date | null | undefined): string {
  return iso ? SHORT.format(new Date(iso)) : "";
}
export function fmtDayTime(iso: string | Date | null | undefined): string {
  return iso ? `${DAY_TIME.format(new Date(iso))} UTC` : "";
}

/** "just now", "5 min ago", "3 h ago", "4 d ago", else the date. `now` is passed in so server and client agree. */
export function fmtAgo(iso: string | Date | null | undefined, now: number): string {
  if (!iso) return "";
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return fmtDay(iso);
}
