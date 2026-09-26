/**
 * The week grid in the interview wizard's schedule step: which hourly
 * slots are open for every connected interviewer. Browser-local time.
 */
import type { BusyBlock } from "./providers";

/** Slot start hours shown each weekday. */
export const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
export const WEEKDAYS = 5;

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const back = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - back);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Slot start for weekday `day` (0 = Monday) and hour. */
export function slotAt(monday: Date, day: number, hour: number): Date {
  const d = addDays(monday, day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * The people busy during [start, start + minutes). `people` holds each
 * connected interviewer's busy blocks (ISO strings).
 */
export function busyPeople(start: Date, minutes: number, people: { name: string; busy: BusyBlock[] }[]): string[] {
  const s = start.getTime();
  const e = s + minutes * 60_000;
  return people.filter((p) => p.busy.some((b) => Date.parse(b.start) < e && Date.parse(b.end) > s)).map((p) => p.name);
}
