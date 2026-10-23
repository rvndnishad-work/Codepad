/**
 * Pilots: a free workspace an admin sets up after a demo, for a fixed time.
 *
 * A pilot rides on the prepaid columns: planName GROWTH, prepaidThrough = the
 * end date, prepaidSeats = the seat cap and prepaidCadence = "pilot". Every
 * gate that already understands prepaid Growth (AI screening, connections,
 * the seat cap, dropping to Free the moment it ends) works for pilots with no
 * change. What differs is the wording, that pilots get no monthly included
 * credits, and that pilot credits expire when the pilot ends.
 *
 * Paying for Growth during a pilot replaces "pilot" with the paid period, so
 * the workspace stops being a pilot.
 *
 * Pure: no database, no env. Safe to import from client components.
 */
import { PILOT_DEFAULTS } from "./catalog";

export const PILOT_CADENCE = "pilot";
/** Owners are reminded this many days before a pilot ends. */
export const PILOT_REMINDER_DAYS = 3;
/** Ledger kinds for pilot credits and for what is left of them at the end. */
export const PILOT_CREDIT_KIND = "PILOT";
export const PILOT_EXPIRED_KIND = "PILOT_EXPIRED";

const DAY_MS = 86_400_000;

export type PilotFields = {
  planName: string;
  stripeSubscriptionId?: string | null;
  prepaidThrough?: Date | string | null;
  prepaidCadence?: string | null;
};

/** The workspace is (or was, until swept) a pilot. */
export function isPilot(ws: PilotFields): boolean {
  return ws.prepaidCadence === PILOT_CADENCE && !ws.stripeSubscriptionId && Boolean(ws.prepaidThrough);
}

export function pilotActive(ws: PilotFields, now: Date = new Date()): boolean {
  return isPilot(ws) && ws.planName === "GROWTH" && new Date(ws.prepaidThrough as Date | string).getTime() > now.getTime();
}

/** Whole days left, at least 1 while active; null when not an active pilot. */
export function pilotDaysLeft(ws: PilotFields, now: Date = new Date()): number | null {
  if (!pilotActive(ws, now)) return null;
  return Math.max(1, Math.ceil((new Date(ws.prepaidThrough as Date | string).getTime() - now.getTime()) / DAY_MS));
}

/** End date for a pilot of `days` starting now, or added to a running one. */
export function pilotEnd(current: Date | null, now: Date, days: number): Date {
  const from = current && current.getTime() > now.getTime() ? current : now;
  return new Date(from.getTime() + days * DAY_MS);
}

export type PilotInput = { days: number; seats: number; credits: number };

/** Check the admin's pilot settings. Returns the problems in plain words. */
export function pilotInputErrors(input: { days: unknown; seats: unknown; credits: unknown }): string[] {
  const errors: string[] = [];
  const int = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN);
  const days = int(input.days);
  const seats = int(input.seats);
  const credits = int(input.credits);
  if (!(PILOT_DEFAULTS.lengthsDays as readonly number[]).includes(days)) {
    errors.push(`Pick a length of ${PILOT_DEFAULTS.lengthsDays.join(", ")} days.`);
  }
  if (!Number.isInteger(seats) || seats < 1 || seats > PILOT_DEFAULTS.maxSeats) errors.push(`Seats must be a whole number from 1 to ${PILOT_DEFAULTS.maxSeats}.`);
  if (!Number.isInteger(credits) || credits < 0 || credits > PILOT_DEFAULTS.maxCredits) {
    errors.push(`Pilot credits must be a whole number from 0 to ${PILOT_DEFAULTS.maxCredits}.`);
  }
  return errors;
}

/**
 * Pilot credits still unused at the end, given what was granted, used and
 * refunded since the pilot started. Pilot credits are counted as used first,
 * so credits bought during the pilot are never the ones that expire. Never
 * more than the balance.
 */
export function pilotCreditsToExpire(a: { granted: number; usedSince: number; refundedSince: number; balance: number }): number {
  const left = a.granted - Math.max(0, a.usedSince - a.refundedSince);
  return Math.max(0, Math.min(left, a.balance));
}
