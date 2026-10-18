/**
 * Moving and cancelling a live interview that has not started yet. The pure
 * checks, safe to import anywhere; the actions live in the Interviews tab.
 */

const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

/** Still open to a new time or a cancel: booked, not started, not finished. */
export function canChangeInterview(s: { status: string; startedAt: Date | string | null; finishedAt: Date | string | null }): boolean {
  return s.status === "scheduled" && !s.startedAt && !s.finishedAt;
}

/** Why a new time cannot be used, or null when it can. */
export function newTimeProblem(at: Date | null, now: Date = new Date()): string | null {
  if (!at || Number.isNaN(at.getTime())) return "Pick a date and time.";
  if (at.getTime() < now.getTime() + MIN_LEAD_MS) return "Pick a time at least five minutes from now.";
  if (at.getTime() > now.getTime() + MAX_AHEAD_MS) return "Pick a time within the next year.";
  return null;
}

/** The host, whoever set it up, or anyone who manages interviews. */
export function mayChangeInterview(s: { userId: string; createdById: string | null }, userId: string, managesInterviews: boolean): boolean {
  return managesInterviews || s.userId === userId || s.createdById === userId;
}

/** "2026-10-02T11:00" in the viewer's own time zone, for a datetime-local input. */
export function localInputValue(iso: string | null, fallback: Date): string {
  const d = iso ? new Date(iso) : fallback;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
