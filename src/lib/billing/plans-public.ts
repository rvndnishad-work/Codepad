/**
 * The public pricing page for the new plans (Basic, Growth, Teams,
 * Enterprise) and the top-ups, built from the effective catalogue so the page
 * and the checkout always agree. Shown once an admin puts the new plans on
 * sale; until then /pricing shows the old per-seat page (./public-pricing).
 *
 * Pure: no database, no env.
 */
import {
  annualSavingPercent,
  formatCents,
  formatCreditPrice,
  packCentsPerCredit,
  planCentsPerCredit,
  type EffectiveCatalog,
  type SelfServePlanKey,
} from "./catalog";

export type PlansPagePlan = {
  key: SelfServePlanKey | "ENTERPRISE";
  name: string;
  audience: string;
  /** "$20" a month, "$200" a year; Enterprise "Custom". */
  price: { monthly: string; annual: string };
  unit: { monthly: string; annual: string };
  /** Under the price: the yearly saving, or how a credit works out. */
  note: { monthly: string; annual: string };
  includes: string[];
  recommended: boolean;
};

export type PlansPageTopUp = { id: string; label: string; credits: number; price: string; perCredit: string; badge: string | null };

export type PlansPage = {
  plans: PlansPagePlan[];
  topups: PlansPageTopUp[];
  savingPercent: number;
  compare: { feature: string; cells: string[] }[];
  faq: { q: string; a: string }[];
};

const AUDIENCE: Record<SelfServePlanKey, string> = {
  BASIC: "For a founder or a small team hiring now and then.",
  GROWTH: "For teams hiring every month, with their ATS connected.",
  TEAMS: "For several teams or offices hiring in parallel.",
};

const ws = (n: number) => `${n} ${n === 1 ? "workspace" : "workspaces"}`;

export function buildPlansPage(c: EffectiveCatalog): PlansPage {
  const saving = Math.max(0, ...c.plans.map(annualSavingPercent));
  const plans: PlansPagePlan[] = c.plans.map((p) => {
    const perCredit = formatCreditPrice(planCentsPerCredit(p));
    return {
      key: p.key,
      name: p.name,
      audience: AUDIENCE[p.key],
      price: { monthly: formatCents(p.monthlyCents), annual: formatCents(p.annualCents) },
      unit: { monthly: "a month", annual: "a year" },
      note: {
        monthly: `About ${perCredit} a credit`,
        annual: annualSavingPercent(p) > 0 ? `${formatCents(Math.round(p.annualCents / 12))} a month, ${annualSavingPercent(p)}% off` : `About ${perCredit} a credit`,
      },
      includes: [
        `${p.creditsPerMonth.toLocaleString("en-US")} AI credits every month`,
        `${ws(p.workspaceLimit)}, ${p.seatsPerWorkspace} people in each`,
        "AI screening, take homes and live interviews",
        ...(p.growthTools ? ["Greenhouse sync, webhooks, API and MCP", "Slack and Teams alerts"] : []),
      ],
      recommended: p.key === "GROWTH",
    };
  });
  const top = c.plans[c.plans.length - 1];
  plans.push({
    key: "ENTERPRISE",
    name: "Enterprise",
    audience: "For larger hiring teams that need a contract and invoices.",
    price: { monthly: "Custom", annual: "Custom" },
    unit: { monthly: "", annual: "" },
    note: { monthly: "Volume credits by agreement", annual: "Volume credits by agreement" },
    includes: [`More than ${ws(top?.workspaceLimit ?? 10)}`, "Credits and seats agreed per contract", "Everything in Teams", "Invoice billing"],
    recommended: false,
  });

  const topups = c.topups.map((t, i) => ({
    id: t.id,
    label: t.label,
    credits: t.credits,
    price: formatCents(t.priceCents),
    perCredit: formatCreditPrice(packCentsPerCredit(t)),
    badge: i === c.topups.length - 1 ? "Best value" : null,
  }));

  const cells = (f: (p: (typeof c.plans)[number]) => string, enterprise: string) => [...c.plans.map(f), enterprise];
  const compare = [
    { feature: "Price a month", cells: cells((p) => formatCents(p.monthlyCents), "Custom") },
    { feature: "AI credits a month", cells: cells((p) => p.creditsPerMonth.toLocaleString("en-US"), "By contract") },
    { feature: "Workspaces", cells: cells((p) => String(p.workspaceLimit), "By contract") },
    { feature: "People in each workspace", cells: cells((p) => String(p.seatsPerWorkspace), "By contract") },
    { feature: "AI screening", cells: cells(() => "Yes", "Yes") },
    { feature: "Take homes and live interviews", cells: cells(() => "Yes", "Yes") },
    { feature: "Greenhouse sync", cells: cells((p) => (p.growthTools ? "Yes" : "No"), "Yes") },
    { feature: "Webhooks, API and MCP", cells: cells((p) => (p.growthTools ? "Yes" : "No"), "Yes") },
    { feature: "Slack and Teams alerts", cells: cells((p) => (p.growthTools ? "Yes" : "No"), "Yes") },
    { feature: "Billing", cells: cells(() => "Monthly or yearly", "Invoice") },
  ];

  const cheapestTopUp = topups.length ? topups.reduce((lo, t) => (Number(t.perCredit.slice(1)) < Number(lo.perCredit.slice(1)) ? t : lo)) : null;
  const faq = [
    {
      q: "How do AI credits work?",
      a: "Your plan adds its credits every month, also on yearly plans. With several workspaces, you choose how many each one gets, and you can move credits between them at any time. A screening uses credits once, when the candidate starts: 1, 2 or 3 depending on how present the AI interviewer is. Plan credits are used first and roll over for one month.",
    },
    {
      q: "What if we run out of credits?",
      a: `Buy a top-up from Billing and usage${cheapestTopUp ? `, from ${cheapestTopUp.perCredit} a credit` : ""}. Top-up credits never expire. If you top up every month, the next plan up is usually cheaper.`,
    },
    {
      q: "Is there a free plan or trial?",
      a: "No. Book a demo and we will set up a free pilot workspace for your team, with credits to run real screenings.",
    },
    {
      q: "Can I change plans?",
      a: "Yes. Moving up starts the new plan at once, and the unused part of what you paid comes off the price. Moving down takes effect when the current period ends.",
    },
    {
      q: "How do we pay?",
      a: "Pay once for a month or a year from Billing and usage. Nothing renews by itself: billing admins get a reminder a week before the end. Enterprise is invoiced.",
    },
    {
      q: "Does the AI decide who passes?",
      a: "No. The AI scores answers and suggests a result. Only a person in your team can pass or reject a candidate, and passing someone whose results were below the bar is recorded as a manual override.",
    },
  ];

  return { plans, topups, savingPercent: saving, compare, faq };
}
