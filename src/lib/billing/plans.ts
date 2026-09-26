/**
 * Workspace plan config: the one place that says what each workspace plan
 * costs, how many seats it has and what it unlocks.
 *
 * The billing page, the plan comparison table and the Stripe checkout all read
 * from here, so the price a recruiter sees is the price Stripe charges.
 *
 * Keep the "includes" rows honest: each one must match a real gate in the
 * code. Today the gates are:
 *   - growthToolsEnabled / effectivePlanAllowsAiScreening (src/lib/billing/trial.ts)
 *     for AI screening, ATS sync, API keys and External MCP
 *   - effectivePlan().seatLimit for the invite seat cap
 * Take homes, live interviews, the question library and candidates are not
 * plan-gated.
 *
 * Pure: no database, no env. Safe to import from client components.
 */

export type WorkspacePlanKey = "FREE" | "GROWTH" | "ENTERPRISE";

export type PlanPrice =
  | { kind: "free" }
  /** Per seat per month, in whole US cents. */
  | { kind: "per_seat"; monthlyCents: number; annualMonthlyCents: number }
  | { kind: "sales" };

export type WorkspacePlan = {
  key: WorkspacePlanKey;
  name: string;
  price: PlanPrice;
  /** Hard seat cap; null when seats are billed per seat instead. */
  seatLimit: number | null;
  /** One-line description of how seats work on this plan. */
  seatsLabel: string;
};

export const WORKSPACE_PLANS: Record<WorkspacePlanKey, WorkspacePlan> = {
  FREE: {
    key: "FREE",
    name: "Free",
    price: { kind: "free" },
    seatLimit: 3,
    seatsLabel: "3",
  },
  GROWTH: {
    key: "GROWTH",
    name: "Growth",
    price: { kind: "per_seat", monthlyCents: 4900, annualMonthlyCents: 3900 },
    seatLimit: null,
    seatsLabel: "As many as you pay for",
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: { kind: "sales" },
    seatLimit: null,
    seatsLabel: "As many as you need",
  },
};

/** Legacy self-serve tier still sold by the checkout route. Per seat, monthly/annual. */
export const STARTER_SEAT_PRICE = { monthlyCents: 1900, annualMonthlyCents: 1500 } as const;

export const PLAN_ORDER: WorkspacePlanKey[] = ["FREE", "GROWTH", "ENTERPRISE"];

/**
 * What each plan includes, row by row, in PLAN_ORDER. Every row maps to a
 * gate listed in the header comment.
 */
export const PLAN_COMPARISON: { feature: string; cells: [string, string, string] }[] = [
  { feature: "Take homes and live interviews", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Question library and candidates", cells: ["Yes", "Yes", "Yes"] },
  { feature: "AI screening", cells: ["No", "Yes, with credits", "Yes, with credits"] },
  { feature: "ATS sync, API keys and external tools", cells: ["No", "Yes", "Yes"] },
];

/** Features Growth adds over Free, for the short list on the plan card. */
export const GROWTH_ADDS = ["AI screening (uses credits)", "ATS sync", "API keys", "External tools for AI screening"];

/** "$49" for 4900. Whole dollars when there are no cents. */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** Short price text for the comparison table. */
export function priceLabel(plan: WorkspacePlan): string {
  switch (plan.price.kind) {
    case "free":
      return "$0";
    case "sales":
      return "Talk to us";
    case "per_seat":
      return `${formatUsd(plan.price.monthlyCents)} per seat a month`;
  }
}

/** Resolve a stored planName to its config. Unknown or legacy names fall back to Free. */
export function planConfig(planName: string | null | undefined): WorkspacePlan {
  return WORKSPACE_PLANS[(planName ?? "FREE") as WorkspacePlanKey] ?? WORKSPACE_PLANS.FREE;
}

/** Per-seat price in cents for a checkout, from this config. */
export function checkoutSeatPriceCents(plan: "STARTER" | "GROWTH", cadence: "monthly" | "annual"): number {
  if (plan === "STARTER") {
    return cadence === "monthly" ? STARTER_SEAT_PRICE.monthlyCents : STARTER_SEAT_PRICE.annualMonthlyCents;
  }
  const price = WORKSPACE_PLANS.GROWTH.price;
  if (price.kind !== "per_seat") throw new Error("Growth must be priced per seat");
  return cadence === "monthly" ? price.monthlyCents : price.annualMonthlyCents;
}
