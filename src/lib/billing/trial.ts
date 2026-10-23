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

import { WORKSPACE_PLANS } from "./plans";

export const TRIAL_DURATION_DAYS = 14;
/** Seats allowed during an active trial (matches the /w/create promise). */
export const TRIAL_SEAT_LIMIT = 5;
/** Base free-plan seat cap once the trial lapses. Comes from the plan config. */
export const FREE_SEAT_LIMIT = WORKSPACE_PLANS.FREE.seatLimit ?? 3;

const GROWTH_LEVEL = new Set(["GROWTH", "ENTERPRISE"]);
/** Plans paid ahead with one payment (prepaid Growth, and the new account plans). */
const PREPAID_PLANS = new Set(["GROWTH", "BASIC", "TEAMS"]);
/** Plans that can run AI screenings. Basic can; Free and Starter cannot. */
const AI_SCREENING_PLANS = new Set(["GROWTH", "ENTERPRISE", "BASIC", "TEAMS"]);
/** Plans with Greenhouse sync, API keys, MCP and chat alerts. Not Basic. */
const GROWTH_TOOL_PLANS = new Set(["GROWTH", "ENTERPRISE", "TEAMS"]);
/** Any plan that is paid (or contracted), so a trial means nothing. */
const PAID_LEVEL = new Set(["GROWTH", "ENTERPRISE", "BASIC", "TEAMS"]);

export function planAllowsAiScreening(plan: string): boolean {
  return AI_SCREENING_PLANS.has(plan);
}
export function planHasGrowthTools(plan: string): boolean {
  return GROWTH_TOOL_PLANS.has(plan);
}

export type PlanFields = {
  planName: string;
  trialEndsAt?: Date | string | null;
  /** A real paid subscription overrides trial logic — they're a customer. */
  stripeSubscriptionId?: string | null;
  /** Prepaid Growth (one Razorpay payment): paid until, and seats paid for. */
  prepaidThrough?: Date | string | null;
  prepaidSeats?: number | null;
  /** "monthly", "annual", or "pilot" for an admin-made pilot (see ./pilot). */
  prepaidCadence?: string | null;
};

/**
 * A prepaid plan (Growth, Basic or Teams) that has run out but not yet been
 * moved back to Free by the expiry sweep. Gates treat it as Free right away.
 */
export function prepaidLapsed(ws: PlanFields, now: Date = new Date()): boolean {
  return Boolean(ws.prepaidThrough && !ws.stripeSubscriptionId && PREPAID_PLANS.has(ws.planName) && new Date(ws.prepaidThrough).getTime() <= now.getTime());
}

/** A prepaid plan that is paid up right now. */
export function prepaidActive(ws: PlanFields, now: Date = new Date()): boolean {
  return Boolean(ws.prepaidThrough && !ws.stripeSubscriptionId && PREPAID_PLANS.has(ws.planName) && new Date(ws.prepaidThrough).getTime() > now.getTime());
}

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
  if (ws.prepaidThrough) return false; // paid once — the trial is over
  if (PAID_LEVEL.has(ws.planName)) return false; // already on a plan
  return new Date(ws.trialEndsAt).getTime() > now.getTime();
}

export function effectivePlan(ws: PlanFields, now: Date = new Date()): EffectivePlan {
  if (prepaidLapsed(ws, now)) {
    return { plan: "FREE", onTrial: false, trialEndsAt: ws.trialEndsAt ? new Date(ws.trialEndsAt) : null, seatLimit: FREE_SEAT_LIMIT };
  }
  if (prepaidActive(ws, now)) {
    // Prepaid seats are a hard cap: more people means paying for more seats.
    const seats = typeof ws.prepaidSeats === "number" && ws.prepaidSeats > 0 ? ws.prepaidSeats : null;
    return { plan: ws.planName, onTrial: false, trialEndsAt: ws.trialEndsAt ? new Date(ws.trialEndsAt) : null, seatLimit: seats };
  }
  const onTrial = trialActive(ws, now);
  const plan = onTrial ? "GROWTH" : ws.planName;
  // Paid GROWTH/ENTERPRISE (and any live per-seat subscription) scale seats
  // via Stripe, so there is no hard cap here; FREE is capped, and a trial gets
  // the promised higher cap.
  const seatLimit = GROWTH_LEVEL.has(ws.planName) || ws.stripeSubscriptionId
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
  return AI_SCREENING_PLANS.has(effectivePlan(ws, now).plan);
}

/**
 * Growth-level workspace tools (ATS sync, API keys, External MCP) are on for
 * Growth, Teams and Enterprise and during an unexpired trial, matching what
 * the sidebar shows unlocked. Basic does not get them.
 */
export function growthToolsEnabled(ws: PlanFields, now: Date = new Date()): boolean {
  return GROWTH_TOOL_PLANS.has(effectivePlan(ws, now).plan);
}
