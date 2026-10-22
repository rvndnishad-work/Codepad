/**
 * Prepaid Growth: pay once for a number of seats for one month or one year.
 * Pure rules, shared by the checkout, the Billing page and the expiry cron.
 */
import { checkoutSeatChargeCents, type SeatPrice } from "./plans";
import { addOneMonth } from "./included-credits";

export type PrepaidCadence = "monthly" | "annual";
export const PREPAID_MAX_SEATS = 500;
/** The "renew soon" reminder goes out this many days before the end. */
export const PREPAID_REMINDER_DAYS = 7;

export function parseCadence(v: unknown): PrepaidCadence {
  return v === "monthly" ? "monthly" : "annual";
}

/** What a prepaid period costs in US cents: seats x the seat price for the period. */
export function prepaidChargeCents(seats: number, cadence: PrepaidCadence, growth: SeatPrice): number {
  return seats * checkoutSeatChargeCents("GROWTH", cadence, growth);
}

/** Fewest seats a purchase may cover: everyone already in, or invited. */
export function minPrepaidSeats(used: number): number {
  return Math.max(1, used);
}

/**
 * The new paid-until date. Paying while still paid up adds the period to the
 * current end, so nothing already paid for is lost; otherwise it starts now.
 */
export function extendPrepaid(current: Date | null, now: Date, cadence: PrepaidCadence): Date {
  let d = current && current.getTime() > now.getTime() ? new Date(current.getTime()) : new Date(now.getTime());
  const months = cadence === "annual" ? 12 : 1;
  for (let i = 0; i < months; i++) d = addOneMonth(d);
  return d;
}

export function validSeatCount(seats: unknown, used: number): number | null {
  const n = typeof seats === "number" ? seats : typeof seats === "string" ? Number(seats) : NaN;
  if (!Number.isInteger(n) || n < minPrepaidSeats(used) || n > PREPAID_MAX_SEATS) return null;
  return n;
}
