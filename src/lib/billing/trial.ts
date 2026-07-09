/**
 * Trial + effective-plan resolution (IP-91).
 *
 * A workspace on the FREE plan with an unexpired `trialEndsAt` behaves like
 * GROWTH: AI screening unlocked and a higher seat cap. This is the single
 * place that decides "what can this workspace actually do right now", so every
 * gate (AI screening, seats, TOTP) can ask the same question instead of
 * reading `planName` directly and disagreeing about trials.
 *
 * Pure + synchronous — callers pass the two fields they already have.
 */

export const TRIAL_DURATION_DAYS = 14;
/** Seats allowed during an active trial (matches the /w/create promise). */
export const TRIAL_SEAT_LIMIT = 5;
/** Base free-plan seat cap once the trial lapses. Kept in sync with settings. */
export const FREE_SEAT_LIMIT = 3;

const GROWTH_LEVEL = new Set(["GROWTH", "ENTERPRISE"]);

export type PlanFields = {
  planName: string;
  trialEndsAt?: Date | string | null;
  /** A real paid subscription overrides trial logic — they're a customer. */
  stripeSubscriptionId?: string | null;
};

export type EffectivePlan = {
  /** The plan to gate on: the paid plan, or "GROWTH" while trialing. */
  plan: string;
  /** True while an unexpired trial is the reason for elevated access. */
  onTrial: boolean;
  trialEndsAt: Date | null;
  /** Seat cap; null = unlimited (paid tiers scale via Stripe). */
  seatLimit: number | null;
};

export function trialActive(ws: PlanFields, now: Date = new Date()): boolean {
  if (!ws.trialEndsAt) return false;
  if (ws.stripeSubscriptionId) return false; // paid — no need for a trial
  if (GROWTH_LEVEL.has(ws.planName)) return false; // already elevated
  return new Date(ws.trialEndsAt).getTime() > now.getTime();
}

export function effectivePlan(ws: PlanFields, now: Date = new Date()): EffectivePlan {
  const onTrial = trialActive(ws, now);
  const plan = onTrial ? "GROWTH" : ws.planName;
  // Paid GROWTH/ENTERPRISE scale seats via Stripe (no hard cap here); FREE is
  // capped, and a trial gets the promised higher cap.
  const seatLimit = GROWTH_LEVEL.has(ws.planName)
    ? null
    : onTrial
      ? TRIAL_SEAT_LIMIT
      : FREE_SEAT_LIMIT;
  return {
    plan,
    onTrial,
    trialEndsAt: ws.trialEndsAt ? new Date(ws.trialEndsAt) : null,
    seatLimit,
  };
}

/** Convenience for the many gates that only care about AI-screening access. */
export function effectivePlanAllowsAiScreening(ws: PlanFields, now: Date = new Date()): boolean {
  return GROWTH_LEVEL.has(effectivePlan(ws, now).plan);
}
