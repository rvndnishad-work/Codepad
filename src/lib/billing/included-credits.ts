/**
 * Included AI credits (the "credits included" price model).
 *
 * - Each paid seat adds INCLUDED_CREDITS_PER_SEAT credits a month to the
 *   workspace pool.
 * - Unused included credits roll over for one month, then expire.
 * - Pack credits (bought) and trial credits never expire.
 * - New workspaces get TRIAL_CREDITS once, so the trial can run a screening.
 *
 * Pure (no Prisma) so the pricing page, billing page and tests share the
 * numbers and the grant arithmetic. The server side lives in
 * included-credits-server.ts.
 */

export const INCLUDED_CREDITS_PER_SEAT = 10;
export const TRIAL_CREDITS = 10;

/** Plans whose seats come with included credits. Trials do not. */
const PAID_PLANS = new Set(["GROWTH", "ENTERPRISE"]);

export function planIncludesCredits(planName: string): boolean {
  return PAID_PLANS.has(planName);
}

/** One calendar month after `from`, clamped to the month end (31 Jan -> 28/29 Feb). */
export function addOneMonth(from: Date): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export type IncludedState = {
  planName: string;
  seats: number;
  includedCreditsLeft: number;
  includedCreditsLastGrant: number;
  includedCreditsGrantedAt: Date | null;
  /** Ledger balance (sum of all rows). Expiry never takes it below zero. */
  balance: number;
};

/** A grant step runs when a paid workspace was never granted, or a month has passed. */
export function grantDue(state: IncludedState, now: Date = new Date()): boolean {
  const paid = planIncludesCredits(state.planName);
  if (!paid && state.includedCreditsLeft <= 0) return false;
  if (!state.includedCreditsGrantedAt) return paid;
  return addOneMonth(state.includedCreditsGrantedAt).getTime() <= now.getTime();
}

export type IncludedStep = {
  /** Credits that are older than one month and expire now (0 or more). */
  expire: number;
  /** New included credits for this month (0 when not on a paid plan). */
  grant: number;
  /** Counter values to store after the step. */
  left: number;
  lastGrant: number;
};

/**
 * The monthly step. Included credits are used oldest first, so whatever is
 * left above the last grant came from the grant before it and has had its
 * one month of rollover.
 */
export function includedStep(state: IncludedState): IncludedStep {
  const left = Math.max(0, state.includedCreditsLeft);
  const olderThanAMonth = Math.max(0, left - Math.max(0, state.includedCreditsLastGrant));
  const expire = Math.max(0, Math.min(olderThanAMonth, state.balance));
  const grant = planIncludesCredits(state.planName)
    ? Math.max(0, state.seats) * INCLUDED_CREDITS_PER_SEAT
    : 0;
  // A workspace that left the paid plan keeps last month of included credits
  // for one more month; lastGrant 0 makes them expire at the next step.
  const kept = left - olderThanAMonth;
  return { expire, grant, left: kept + grant, lastGrant: grant };
}

/** How many of a charge come out of included credits. */
export function includedPart(cost: number, includedLeft: number): number {
  return Math.max(0, Math.min(cost, includedLeft));
}
