/**
 * What the public pricing page and the /hire teaser show. Built only from the
 * plan config (./plans), the trial rules (./trial) and the AI credit packs, so
 * the public price is the price the workspace billing page shows and Stripe
 * charges. There is no separate, hand-edited pricing copy to drift.
 *
 * Pure: no database, no env. Safe to import from client components.
 */

import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credit-packs";
import { AI_ENGAGEMENT_CREDIT_COST, ENGAGEMENT_LABELS, type EngagementLevel } from "@/lib/ai-interview/engagement";
import { PLAN_ORDER, WORKSPACE_PLANS, formatUsd, type WorkspacePlanKey } from "./plans";
import { TRIAL_DURATION_DAYS, TRIAL_SEAT_LIMIT } from "./trial";

export type Cadence = "monthly" | "annual";

export type PublicPlan = {
  key: WorkspacePlanKey;
  name: string;
  /** Who the plan is for, one line. */
  audience: string;
  /** Big number on the card, per cadence. */
  price: Record<Cadence, string>;
  /** Unit after the big number, per cadence. */
  unit: Record<Cadence, string>;
  /** Small line under the price, per cadence (null = none). */
  note: Record<Cadence, string | null>;
  seats: string;
  /** Every line must match a real gate or setting in the code. */
  includes: string[];
  cta: "free" | "checkout" | "sales";
  recommended: boolean;
};

const growthPrice = WORKSPACE_PLANS.GROWTH.price;
if (growthPrice.kind !== "per_seat") throw new Error("Growth must be priced per seat");

/** Whole-percent saving of annual over monthly billing for Growth. */
export const ANNUAL_SAVING_PERCENT = Math.round(
  (1 - growthPrice.annualMonthlyCents / growthPrice.monthlyCents) * 100,
);

export const PUBLIC_PLANS: PublicPlan[] = PLAN_ORDER.map((key): PublicPlan => {
  const plan = WORKSPACE_PLANS[key];
  if (key === "FREE") {
    return {
      key,
      name: plan.name,
      audience: "For trying Interviewpad and for small teams that run a few screenings",
      price: { monthly: "$0", annual: "$0" },
      unit: { monthly: "free", annual: "free" },
      note: {
        monthly: `New workspaces get ${TRIAL_DURATION_DAYS} days of Growth first`,
        annual: `New workspaces get ${TRIAL_DURATION_DAYS} days of Growth first`,
      },
      seats: `Up to ${plan.seatLimit} seats (${TRIAL_SEAT_LIMIT} during the trial)`,
      includes: [
        "Take-homes scored against tests",
        "Live coding interviews with the room toolbox",
        "Question library and candidate pipeline",
        "Audit log, retention rules and 2FA",
      ],
      cta: "free",
      recommended: false,
    };
  }
  if (key === "GROWTH") {
    return {
      key,
      name: plan.name,
      audience: "For hiring teams that screen every week",
      price: {
        monthly: formatUsd(growthPrice.monthlyCents),
        annual: formatUsd(growthPrice.annualMonthlyCents),
      },
      unit: { monthly: "per seat a month", annual: "per seat a month" },
      note: {
        monthly: "Billed monthly",
        annual: `Billed yearly, ${ANNUAL_SAVING_PERCENT}% less than monthly`,
      },
      seats: "As many seats as you pay for",
      includes: [
        "Everything in Free",
        "AI screening (theory, practical and conversation rounds), paid with credits",
        "Greenhouse sync, signed webhooks, API and MCP",
        "Slack and Teams alerts",
      ],
      cta: "checkout",
      recommended: true,
    };
  }
  return {
    key,
    name: plan.name,
    audience: "For larger teams with procurement and security reviews",
    price: { monthly: "Custom", annual: "Custom" },
    unit: { monthly: "talk to us", annual: "talk to us" },
    note: { monthly: null, annual: null },
    seats: "As many seats as you need",
    includes: ["Everything in Growth", "Volume pricing on AI credits", "Invoice billing", "Help with setup and ATS mapping"],
    cta: "sales",
    recommended: false,
  };
});

export type PublicCreditPack = {
  id: string;
  label: string;
  credits: number;
  price: string;
  /** Price of one credit, e.g. "$2.58". */
  perCredit: string;
  badge: string | null;
};

export const PUBLIC_CREDIT_PACKS: PublicCreditPack[] = AI_CREDIT_PACKS.map((p) => ({
  id: p.id,
  label: p.label,
  credits: p.credits,
  price: formatUsd(p.priceCents),
  perCredit: `$${(p.priceCents / p.credits / 100).toFixed(2)}`,
  badge: "badge" in p ? p.badge : null,
}));

/** Credits one AI screening costs at each interviewer presence level. */
export const SCREENING_CREDIT_COSTS: { level: EngagementLevel; label: string; hint: string; credits: number }[] = (
  Object.keys(AI_ENGAGEMENT_CREDIT_COST) as EngagementLevel[]
).map((level) => ({
  level,
  label: ENGAGEMENT_LABELS[level].label,
  hint: ENGAGEMENT_LABELS[level].hint,
  credits: AI_ENGAGEMENT_CREDIT_COST[level],
}));

/** Cheapest price of one credit across the packs, e.g. "$2.25". */
export const LOWEST_CREDIT_PRICE = PUBLIC_CREDIT_PACKS.reduce(
  (low, p) => (Number(p.perCredit.slice(1)) < Number(low.slice(1)) ? p.perCredit : low),
  PUBLIC_CREDIT_PACKS[0]?.perCredit ?? "$0",
);

/** Rows for the compare table. Cells follow PLAN_ORDER. */
export const PUBLIC_COMPARISON: { feature: string; cells: [string, string, string] }[] = [
  { feature: "Seats", cells: [`Up to ${WORKSPACE_PLANS.FREE.seatLimit}`, "Per seat", "Custom"] },
  { feature: "Take-homes", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Live coding interviews", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Question library and candidates", cells: ["Yes", "Yes", "Yes"] },
  { feature: "AI screening", cells: ["No", "Yes, with credits", "Yes, with credits"] },
  { feature: "Greenhouse sync", cells: ["No", "Yes", "Yes"] },
  { feature: "Webhooks, API and MCP", cells: ["No", "Yes", "Yes"] },
  { feature: "Slack and Teams alerts", cells: ["No", "Yes", "Yes"] },
  { feature: "Calendar (Google, Outlook)", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Audit log, retention, 2FA", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Billing", cells: ["None", "Card, monthly or yearly", "Invoice"] },
];

/** Facts only. Nothing here may claim a certification we do not hold. */
export const PUBLIC_PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "What does a seat cover?",
    a: "A seat is one teammate in the workspace: a recruiter, hiring manager or interviewer. Candidates never take a seat and never need an account.",
  },
  {
    q: "How do AI screening credits work?",
    a: `Credits are bought in packs and shared by the whole workspace. A screening uses credits once, when the candidate starts. It costs 1, 2 or 3 credits depending on how present the AI interviewer is. Credits do not expire at the end of the month.`,
  },
  {
    q: "What happens when the trial ends?",
    a: `New workspaces run on Growth for ${TRIAL_DURATION_DAYS} days with up to ${TRIAL_SEAT_LIMIT} seats. After that the workspace moves to Free unless you subscribe. Nothing is deleted: Growth-only tools lock until you upgrade.`,
  },
  {
    q: "Does the AI decide who passes?",
    a: "No. The AI scores answers and suggests a result. Only a person in your team can pass or reject a candidate, and passing someone whose results were below the bar is recorded as a manual override.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Yes. Open Billing and usage in your workspace to manage the subscription, card and invoices in the Stripe billing portal.",
  },
];
