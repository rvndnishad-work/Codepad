/**
 * Scheduled publishing. The admin picks a local time in the browser, which
 * sends it as an ISO string; the housekeeping cron publishes the row once
 * `scheduledAt` has passed.
 */
const MAX_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;

export type ScheduleParse = { ok: true; at: Date | null } | { ok: false; error: string };

/** `null`/"" clears the schedule. Anything else must be a future time within a year. */
export function parseSchedule(raw: unknown, now: number = Date.now()): ScheduleParse {
  if (raw === null || raw === undefined || raw === "") return { ok: true, at: null };
  if (typeof raw !== "string") return { ok: false, error: "Schedule must be a date." };
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return { ok: false, error: "Schedule is not a valid date." };
  if (at.getTime() <= now + 60_000) return { ok: false, error: "Pick a time at least a minute from now." };
  if (at.getTime() > now + MAX_AHEAD_MS) return { ok: false, error: "Pick a time within the next year." };
  return { ok: true, at };
}

/** Format for <input type="datetime-local"> in the browser's zone. */
export function toLocalInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatWhen(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
