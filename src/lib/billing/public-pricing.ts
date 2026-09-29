/**
 * What the public pricing page and the /hire teaser show. Built from the
 * effective prices (./prices: the plan config and credit packs, with any admin
 * price overrides), the trial rules (./trial) and the included credits, so the
 * public price is the price the workspace billing page shows and Stripe
 * charges. Admin wording is laid over by ./pricing-copy.
 *
 * Pure: no database, no env. Safe to import from client components.
 */

import { AI_ENGAGEMENT_CREDIT_COST, ENGAGEMENT_LABELS, type EngagementLevel } from "@/lib/ai-interview/engagement";
import { PLAN_ORDER, WORKSPACE_PLANS, formatUsd, type WorkspacePlanKey } from "./plans";
import { TRIAL_DURATION_DAYS, TRIAL_SEAT_LIMIT } from "./trial";
import { DEFAULT_PRICES, type EffectivePrices } from "./prices";
import { INCLUDED_CREDITS_PER_SEAT, TRIAL_CREDITS } from "./included-credits";

export { INCLUDED_CREDITS_PER_SEAT, TRIAL_CREDITS };

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

export type PublicCreditPack = {
  id: string;
  label: string;
  credits: number;
  price: string;
  /** Price of one credit, e.g. "$2.58". */
  perCredit: string;
  badge: string | null;
};

export type PublicPricing = {
  plans: PublicPlan[];
  packs: PublicCreditPack[];
  /** Whole-percent saving of annual over monthly billing for Growth. */
  annualSavingPercent: number;
  /** Cheapest price of one credit across the packs, e.g. "$2.25". */
  lowestCreditPrice: string;
};

/**
 * Plans and packs as the public page shows them, from the effective prices
 * (code defaults with any admin price overrides, see ./prices), so the page
 * shows exactly what checkout charges.
 */
export function buildPublicPricing(prices: EffectivePrices = DEFAULT_PRICES): PublicPricing {
  const growth = prices.growth;
  const annualSavingPercent = Math.max(0, Math.round((1 - growth.annualMonthlyCents / growth.monthlyCents) * 100));
  const yearlyNote = annualSavingPercent > 0 ? `Billed yearly, ${annualSavingPercent}% less` : "Billed yearly";

  const plans = PLAN_ORDER.map((key): PublicPlan => {
    const plan = WORKSPACE_PLANS[key];
    if (key === "FREE") {
      return {
        key,
        name: plan.name,
        audience: "For trying Interviewpad and for small teams that run a few screenings",
        price: { monthly: "$0", annual: "$0" },
        unit: { monthly: "free", annual: "free" },
        note: {
          monthly: `Starts with ${TRIAL_DURATION_DAYS} days of Growth and ${TRIAL_CREDITS} AI credits`,
          annual: `Starts with ${TRIAL_DURATION_DAYS} days of Growth and ${TRIAL_CREDITS} AI credits`,
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
          monthly: formatUsd(growth.monthlyCents),
          annual: formatUsd(growth.annualMonthlyCents),
        },
        unit: { monthly: "per seat a month", annual: "per seat a month" },
        note: {
          monthly: `Billed monthly. Includes ${INCLUDED_CREDITS_PER_SEAT} AI credits per seat each month`,
          annual: `${yearlyNote}. Includes ${INCLUDED_CREDITS_PER_SEAT} AI credits per seat each month`,
        },
        seats: "As many seats as you pay for",
        includes: [
          "Everything in Free",
          `AI screening (theory, practical and conversation rounds) with ${INCLUDED_CREDITS_PER_SEAT} credits per seat each month, pooled`,
          "Unused included credits roll over for one month",
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
      includes: ["Everything in Growth", `${INCLUDED_CREDITS_PER_SEAT} AI credits per seat each month, plus volume pricing`, "Invoice billing", "Help with setup and ATS mapping"],
      cta: "sales",
      recommended: false,
    };
  });

  const packs = prices.packs.map((p): PublicCreditPack => ({
    id: p.id,
    label: p.label,
    credits: p.credits,
    price: formatUsd(p.priceCents),
    perCredit: `$${(p.priceCents / p.credits / 100).toFixed(2)}`,
    badge: p.badge,
  }));

  const lowestCreditPrice = packs.reduce(
    (low, p) => (Number(p.perCredit.slice(1)) < Number(low.slice(1)) ? p.perCredit : low),
    packs[0]?.perCredit ?? "$0",
  );

  return { plans, packs, annualSavingPercent, lowestCreditPrice };
}

const DEFAULT_PUBLIC_PRICING = buildPublicPricing(DEFAULT_PRICES);

/**
 * The page built from the code defaults only, before admin overrides. Pages
 * must use buildPublicPricing / applyPricingCopy with the effective prices;
 * these are for tests and for showing defaults in the admin editor.
 */
export const ANNUAL_SAVING_PERCENT = DEFAULT_PUBLIC_PRICING.annualSavingPercent;
export const PUBLIC_PLANS: PublicPlan[] = DEFAULT_PUBLIC_PRICING.plans;
export const PUBLIC_CREDIT_PACKS: PublicCreditPack[] = DEFAULT_PUBLIC_PRICING.packs;
export const LOWEST_CREDIT_PRICE = DEFAULT_PUBLIC_PRICING.lowestCreditPrice;

/** Credits one AI screening costs at each interviewer presence level. */
export const SCREENING_CREDIT_COSTS: { level: EngagementLevel; label: string; hint: string; credits: number }[] = (
  Object.keys(AI_ENGAGEMENT_CREDIT_COST) as EngagementLevel[]
).map((level) => ({
  level,
  label: ENGAGEMENT_LABELS[level].label,
  hint: ENGAGEMENT_LABELS[level].hint,
  credits: AI_ENGAGEMENT_CREDIT_COST[level],
}));

/** Rows for the compare table. Cells follow PLAN_ORDER. */
export const PUBLIC_COMPARISON: { feature: string; cells: [string, string, string] }[] = [
  { feature: "Seats", cells: [`Up to ${WORKSPACE_PLANS.FREE.seatLimit}`, "Per seat", "Custom"] },
  { feature: "Take-homes", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Live coding interviews", cells: ["Yes", "Yes", "Yes"] },
  { feature: "Question library and candidates", cells: ["Yes", "Yes", "Yes"] },
  { feature: "AI screening", cells: ["No", "Yes", "Yes"] },
  { feature: "AI credits included", cells: [`${TRIAL_CREDITS} with the trial`, `${INCLUDED_CREDITS_PER_SEAT} per seat a month`, `${INCLUDED_CREDITS_PER_SEAT} per seat a month`] },
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
    a: `Each paid seat adds ${INCLUDED_CREDITS_PER_SEAT} credits a month to a pool the whole workspace shares. A screening uses credits once, when the candidate starts: 1, 2 or 3 depending on how present the AI interviewer is. Included credits are used first and roll over for one month. Need more? Packs top up the pool, and bought credits never expire.`,
  },
  {
    q: "Do I get credits during the trial?",
    a: `Yes. A new workspace gets ${TRIAL_CREDITS} free credits, enough to run real AI screenings before you pay. Trial credits never expire, and each person gets them once.`,
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
