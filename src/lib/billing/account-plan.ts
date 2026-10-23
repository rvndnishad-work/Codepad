/**
 * New plans on the billing account: Basic, Growth and Teams, paid for a
 * month or a year at a time (see ./catalog for the numbers).
 *
 * The account is the source of truth. Its workspaces mirror the plan in
 * their own columns (planName, prepaidThrough, prepaidSeats,
 * prepaidCadence), the same columns prepaid Growth and pilots use, so every
 * existing gate (effectivePlan, the seat cap, AI screening, the expiry sweep)
 * reads it with no change. planName is the plan's own key, so each gate's
 * list of plans says exactly what Basic and Teams get (see ./trial).
 *
 * Plan credits arrive once a month on the account, also on yearly plans,
 * are used before bought credits, and roll over for one month.
 *
 * Pure: no database, no env. Safe to import from client components.
 */
import { addOneMonth } from "./included-credits";
import { SELF_SERVE_PLANS, type CatalogCadence, type EffectiveCatalogPlan, type SelfServePlanKey } from "./catalog";

export type AccountPlanFields = {
  planKey: string | null;
  planCadence: string | null;
  paidThrough: Date | string | null;
};

export function isSelfServePlan(v: unknown): v is SelfServePlanKey {
  return typeof v === "string" && (SELF_SERVE_PLANS as readonly string[]).includes(v);
}

export function parsePlanCadence(v: unknown): CatalogCadence {
  return v === "monthly" ? "monthly" : "annual";
}

/** Paid up right now. */
export function accountPlanActive(a: AccountPlanFields, now: Date = new Date()): boolean {
  return isSelfServePlan(a.planKey) && Boolean(a.paidThrough) && new Date(a.paidThrough as Date | string).getTime() > now.getTime();
}

/** The new paid-until date: a renewal of the same plan adds to the current end, anything else starts now. */
export function nextPaidThrough(current: Date | null, now: Date, cadence: CatalogCadence, renewing: boolean): Date {
  let d = renewing && current && current.getTime() > now.getTime() ? new Date(current.getTime()) : new Date(now.getTime());
  const months = cadence === "annual" ? 12 : 1;
  for (let i = 0; i < months; i++) d = addOneMonth(d);
  return d;
}

/** The columns each workspace on the account copies. */
export type WorkspaceMirror = {
  planName: string;
  prepaidThrough: Date | null;
  prepaidSeats: number | null;
  prepaidCadence: string | null;
};

/**
 * What the account's workspaces should hold. While paid up they carry the
 * plan; once it lapses they drop to Free and keep the dates for Billing to
 * show, exactly like prepaid Growth.
 */
export function workspaceMirror(a: AccountPlanFields, plan: Pick<EffectiveCatalogPlan, "seatsPerWorkspace"> | undefined, now: Date = new Date()): WorkspaceMirror {
  const paidThrough = a.paidThrough ? new Date(a.paidThrough) : null;
  const seats = plan?.seatsPerWorkspace ?? null;
  const cadence = a.planCadence === "monthly" || a.planCadence === "annual" ? a.planCadence : null;
  if (accountPlanActive(a, now)) return { planName: a.planKey as string, prepaidThrough: paidThrough, prepaidSeats: seats, prepaidCadence: cadence };
  return { planName: "FREE", prepaidThrough: paidThrough, prepaidSeats: seats, prepaidCadence: cadence };
}

// ── Changing plans ───────────────────────────────────────────────────────

export type PlanChange =
  | { kind: "new" }
  | { kind: "renew" }
  /** A bigger plan now, with the unused part of the current one taken off the price. */
  | { kind: "upgrade"; creditCents: number }
  | { kind: "blocked"; reason: string };

const RANK: Record<SelfServePlanKey, number> = { BASIC: 1, GROWTH: 2, TEAMS: 3 };

/**
 * What buying `to` for `cadence` does for an account. Renewing the same plan
 * and period adds time. Moving up starts the new plan now and credits the
 * unused share of what was paid (by time left). Moving down, changing only
 * the period, or moving up from yearly to monthly (the credit could be more
 * than the new price) waits until the current one ends: nothing paid is lost.
 */
export function planChange(
  a: AccountPlanFields,
  to: SelfServePlanKey,
  cadence: CatalogCadence,
  currentPeriodCents: number | null,
  now: Date = new Date(),
): PlanChange {
  if (!accountPlanActive(a, now)) return { kind: "new" };
  const from = a.planKey as SelfServePlanKey;
  const fromCadence = parsePlanCadence(a.planCadence);
  if (from === to && fromCadence === cadence) return { kind: "renew" };
  if (RANK[to] > RANK[from] && !(fromCadence === "annual" && cadence === "monthly")) {
    const end = new Date(a.paidThrough as Date | string).getTime();
    const months = fromCadence === "annual" ? 12 : 1;
    let start = new Date(end);
    // The period that ends at paidThrough began this many months before it.
    for (let i = 0; i < months; i++) start = minusOneMonth(start);
    const total = end - start.getTime();
    const left = Math.max(0, end - now.getTime());
    const creditCents = currentPeriodCents && total > 0 ? Math.floor((currentPeriodCents * Math.min(left, total)) / total) : 0;
    return { kind: "upgrade", creditCents };
  }
  const when = new Date(a.paidThrough as Date | string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return { kind: "blocked", reason: `You can move to this plan when the current one ends on ${when}.` };
}

function minusOneMonth(from: Date): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** What the customer pays: the period price less any upgrade credit, never below zero. */
export function amountDueCents(periodCents: number, change: PlanChange): number {
  return Math.max(0, periodCents - (change.kind === "upgrade" ? change.creditCents : 0));
}

// ── Monthly plan credits ─────────────────────────────────────────────────

export type PlanCreditState = {
  active: boolean;
  creditsPerMonth: number;
  planCreditsLeft: number;
  planCreditsLastGrant: number;
  planCreditsGrantedAt: Date | null;
  /** Pool balance. Expiry never takes it below zero. */
  balance: number;
};

/** A step runs when an active plan was never granted, or a month has passed since the last grant. */
export function planCreditsDue(s: PlanCreditState, now: Date = new Date()): boolean {
  if (!s.active && s.planCreditsLeft <= 0) return false;
  if (!s.planCreditsGrantedAt) return s.active;
  return addOneMonth(s.planCreditsGrantedAt).getTime() <= now.getTime();
}

/**
 * The monthly step, the same rule as the old included credits: whatever is
 * left above the last grant is more than a month old and expires; this
 * month's credits are added while the plan is active.
 */
export function planCreditStep(s: PlanCreditState): { expire: number; grant: number; left: number; lastGrant: number } {
  const left = Math.max(0, s.planCreditsLeft);
  const older = Math.max(0, left - Math.max(0, s.planCreditsLastGrant));
  const expire = Math.max(0, Math.min(older, s.balance));
  const grant = s.active ? Math.max(0, s.creditsPerMonth) : 0;
  return { expire, grant, left: left - older + grant, lastGrant: grant };
}

/** Extra credits for this month when moving up: the difference between the plans. */
export function upgradeCredits(fromCreditsPerMonth: number, toCreditsPerMonth: number): number {
  return Math.max(0, toCreditsPerMonth - fromCreditsPerMonth);
}

// ── Billing page wording ─────────────────────────────────────────────────

const fmtLong = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The plan card on Billing for a workspace whose account holds one of the new
 * plans (active or lapsed). Null when the account never had one, so the old
 * wording (./summary) applies.
 */
export function accountPlanSummary(
  a: AccountPlanFields,
  plan: Pick<EffectiveCatalogPlan, "name" | "creditsPerMonth" | "workspaceLimit" | "seatsPerWorkspace"> | undefined,
  workspaces: number,
  now: Date = new Date(),
): { heading: string; body: string; trialDaysLeft: null; trialUsed: null; compareKey: "GROWTH" | null; seatHint: string } | null {
  if (!isSelfServePlan(a.planKey) || !plan || !a.paidThrough) return null;
  const through = fmtLong(new Date(a.paidThrough));
  const shared = workspaces > 1 ? ` Credits are shared by your ${workspaces} workspaces.` : "";
  if (!accountPlanActive(a, now)) {
    return {
      heading: "Free",
      body: `Your ${plan.name} period ended on ${through}. Renew to turn AI screening back on. Nothing was deleted.`,
      trialDaysLeft: null,
      trialUsed: null,
      compareKey: null,
      seatHint: "Renew to add people again.",
    };
  }
  const period = a.planCadence === "monthly" ? "month" : "year";
  return {
    heading: plan.name,
    body: `Paid until ${through}, by the ${period}. ${plan.creditsPerMonth.toLocaleString("en-US")} AI credits arrive each month and roll over for one month.${shared} Renewing adds to the end date.`,
    trialDaysLeft: null,
    trialUsed: null,
    compareKey: a.planKey === "GROWTH" ? "GROWTH" : null,
    seatHint: `${plan.name} allows ${plan.seatsPerWorkspace} people in each workspace and ${plan.workspaceLimit} ${plan.workspaceLimit === 1 ? "workspace" : "workspaces"}.`,
  };
}
