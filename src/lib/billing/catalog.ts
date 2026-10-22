/**
 * The plan catalogue: flat-priced plans that each come with AI credits every
 * month, a workspace cap and a seat cap, plus the top-up packs sold on top.
 *
 *   Basic       $20 a month, 50 credits, 1 workspace, 3 seats each
 *   Growth      $50 a month, 150 credits, 3 workspaces, 10 seats each
 *   Teams       $100 a month, 400 credits, 10 workspaces, 25 seats each
 *   Enterprise  custom, by contract
 *   Pilot       set up by an admin after a demo, free for a fixed time
 *
 * Yearly costs ten months (two months free). Plan credits arrive monthly, also
 * on yearly plans, and roll over for one month. Top-up credits never expire.
 *
 * Each step up the ladder makes a credit cheaper, and every top-up costs more
 * per credit than any plan, so moving up a plan is always the better deal
 * than topping up. ladderIssues() checks that for any admin override.
 *
 * Nothing charges from here yet: the checkout, gates and public page move to
 * this catalogue when the billing account lands. Until then ./plans and
 * ./prices stay the source for what is sold.
 *
 * Pure: no database, no env. Safe to import from client components.
 */

export type CatalogPlanKey = "BASIC" | "GROWTH" | "TEAMS" | "ENTERPRISE" | "PILOT";
export type SelfServePlanKey = "BASIC" | "GROWTH" | "TEAMS";
export type CatalogCadence = "monthly" | "annual";

/** Plans a customer can buy without talking to us, cheapest first. */
export const SELF_SERVE_PLANS: SelfServePlanKey[] = ["BASIC", "GROWTH", "TEAMS"];
/** Plans the public pricing page shows, in card order. Pilot is admin-only. */
export const PUBLIC_PLAN_ORDER: CatalogPlanKey[] = ["BASIC", "GROWTH", "TEAMS", "ENTERPRISE"];

export type CatalogPlan = {
  key: CatalogPlanKey;
  name: string;
  /** Whole US cents a month, and for a whole year. Null = custom or free. */
  monthlyCents: number | null;
  annualCents: number | null;
  /** AI credits granted every month. Null = agreed per contract or set per pilot. */
  creditsPerMonth: number | null;
  /** Workspaces one billing account may hold. Null = no cap. */
  workspaceLimit: number | null;
  /** Members plus pending invites in each workspace. Null = no cap. */
  seatsPerWorkspace: number | null;
  /** Greenhouse sync, webhooks, API keys, MCP, Slack and Teams alerts. */
  growthTools: boolean;
};

/** Yearly = this many months of the monthly price. */
export const ANNUAL_MONTHS_CHARGED = 10;

export const CATALOG_PLANS: Record<CatalogPlanKey, CatalogPlan> = {
  BASIC: { key: "BASIC", name: "Basic", monthlyCents: 2000, annualCents: 20000, creditsPerMonth: 50, workspaceLimit: 1, seatsPerWorkspace: 3, growthTools: false },
  GROWTH: { key: "GROWTH", name: "Growth", monthlyCents: 5000, annualCents: 50000, creditsPerMonth: 150, workspaceLimit: 3, seatsPerWorkspace: 10, growthTools: true },
  TEAMS: { key: "TEAMS", name: "Teams", monthlyCents: 10000, annualCents: 100000, creditsPerMonth: 400, workspaceLimit: 10, seatsPerWorkspace: 25, growthTools: true },
  ENTERPRISE: { key: "ENTERPRISE", name: "Enterprise", monthlyCents: null, annualCents: null, creditsPerMonth: null, workspaceLimit: null, seatsPerWorkspace: null, growthTools: true },
  PILOT: { key: "PILOT", name: "Pilot", monthlyCents: null, annualCents: null, creditsPerMonth: null, workspaceLimit: 1, seatsPerWorkspace: null, growthTools: true },
};

/** What an admin picks from when creating a pilot workspace. */
export const PILOT_DEFAULTS = {
  lengthsDays: [7, 14, 30] as const,
  lengthDays: 14,
  credits: 30,
  seats: 5,
  /** Plan whose features the pilot gets unless the admin picks another. */
  features: "GROWTH" as SelfServePlanKey,
  maxCredits: 500,
  maxSeats: 50,
};

export type TopUpPack = { id: string; label: string; credits: number; priceCents: number };

/** One-time credit packs, on any active plan or pilot. Never expire. */
export const TOP_UP_PACKS: TopUpPack[] = [
  { id: "topup-25", label: "Top-up 25", credits: 25, priceCents: 1500 },
  { id: "topup-100", label: "Top-up 100", credits: 100, priceCents: 5000 },
  { id: "topup-300", label: "Top-up 300", credits: 300, priceCents: 13500 },
];

// ── Admin overrides ───────────────────────────────────────────────────────

export type CatalogOverrides = {
  plans?: Partial<Record<SelfServePlanKey, { monthlyCents?: number; annualCents?: number; credits?: number }>>;
  topups?: Record<string, { credits?: number; priceCents?: number }>;
};

/** Inclusive bounds, in cents or credits. */
export const CATALOG_BOUNDS = {
  monthlyCents: { min: 100, max: 1_000_000 },
  annualCents: { min: 100, max: 10_000_000 },
  planCredits: { min: 1, max: 100_000 },
  packCredits: { min: 1, max: 100_000 },
  packPriceCents: { min: 100, max: 10_000_000 },
} as const;

export type EffectiveCatalogPlan = {
  key: SelfServePlanKey;
  name: string;
  monthlyCents: number;
  annualCents: number;
  creditsPerMonth: number;
  workspaceLimit: number;
  seatsPerWorkspace: number;
  growthTools: boolean;
};

export type EffectiveCatalog = { plans: EffectiveCatalogPlan[]; topups: TopUpPack[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

function selfServe(key: SelfServePlanKey): EffectiveCatalogPlan {
  const p = CATALOG_PLANS[key];
  return {
    key,
    name: p.name,
    monthlyCents: p.monthlyCents as number,
    annualCents: p.annualCents as number,
    creditsPerMonth: p.creditsPerMonth as number,
    workspaceLimit: p.workspaceLimit as number,
    seatsPerWorkspace: p.seatsPerWorkspace as number,
    growthTools: p.growthTools,
  };
}

export const DEFAULT_CATALOG: EffectiveCatalog = {
  plans: SELF_SERVE_PLANS.map(selfServe),
  topups: TOP_UP_PACKS.map((p) => ({ ...p })),
};

/**
 * Coerce anything into valid overrides. A field that is not a whole number
 * inside CATALOG_BOUNDS is dropped and reported in `errors`. A plan whose
 * yearly price would be more than twelve months is dropped whole.
 */
export function sanitizeCatalogOverrides(input: unknown): { catalog: CatalogOverrides; errors: string[] } {
  const errors: string[] = [];
  const catalog: CatalogOverrides = {};
  if (!isRecord(input)) return { catalog, errors };

  const int = (v: unknown, b: { min: number; max: number }, label: string, unit: "cents" | "credits"): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v !== "number" || !Number.isInteger(v) || v < b.min || v > b.max) {
      errors.push(
        unit === "cents"
          ? `${label} must be between ${usd(b.min)} and ${usd(b.max)}, in whole cents.`
          : `${label} must be a whole number from ${b.min.toLocaleString("en-US")} to ${b.max.toLocaleString("en-US")}.`,
      );
      return undefined;
    }
    return v;
  };

  if (isRecord(input.plans)) {
    const plans: NonNullable<CatalogOverrides["plans"]> = {};
    for (const key of SELF_SERVE_PLANS) {
      const raw = input.plans[key];
      if (!isRecord(raw)) continue;
      const name = CATALOG_PLANS[key].name;
      const o: { monthlyCents?: number; annualCents?: number; credits?: number } = {};
      const monthly = int(raw.monthlyCents, CATALOG_BOUNDS.monthlyCents, `${name} monthly price`, "cents");
      const annual = int(raw.annualCents, CATALOG_BOUNDS.annualCents, `${name} yearly price`, "cents");
      const credits = int(raw.credits, CATALOG_BOUNDS.planCredits, `${name} credits a month`, "credits");
      if (monthly !== undefined) o.monthlyCents = monthly;
      if (annual !== undefined) o.annualCents = annual;
      if (credits !== undefined) o.credits = credits;
      const mergedMonthly = o.monthlyCents ?? (CATALOG_PLANS[key].monthlyCents as number);
      const mergedAnnual = o.annualCents ?? (CATALOG_PLANS[key].annualCents as number);
      if (mergedAnnual > mergedMonthly * 12) {
        errors.push(`The ${name} yearly price cannot be more than twelve monthly payments.`);
        continue;
      }
      if (Object.keys(o).length) plans[key] = o;
    }
    if (Object.keys(plans).length) catalog.plans = plans;
  }

  if (isRecord(input.topups)) {
    const topups: NonNullable<CatalogOverrides["topups"]> = {};
    for (const def of TOP_UP_PACKS) {
      const raw = input.topups[def.id];
      if (!isRecord(raw)) continue;
      const o: { credits?: number; priceCents?: number } = {};
      const credits = int(raw.credits, CATALOG_BOUNDS.packCredits, `${def.label} credits`, "credits");
      const priceCents = int(raw.priceCents, CATALOG_BOUNDS.packPriceCents, `${def.label} price`, "cents");
      if (credits !== undefined) o.credits = credits;
      if (priceCents !== undefined) o.priceCents = priceCents;
      if (Object.keys(o).length) topups[def.id] = o;
    }
    if (Object.keys(topups).length) catalog.topups = topups;
  }

  return { catalog, errors };
}

/** Lay (sanitized) overrides over the defaults. */
export function resolveCatalog(overrides: unknown): EffectiveCatalog {
  const { catalog } = sanitizeCatalogOverrides(overrides);
  return {
    plans: DEFAULT_CATALOG.plans.map((p) => {
      const o = catalog.plans?.[p.key];
      return {
        ...p,
        monthlyCents: o?.monthlyCents ?? p.monthlyCents,
        annualCents: o?.annualCents ?? p.annualCents,
        creditsPerMonth: o?.credits ?? p.creditsPerMonth,
      };
    }),
    topups: DEFAULT_CATALOG.topups.map((p) => {
      const o = catalog.topups?.[p.id];
      const credits = o?.credits ?? p.credits;
      return { ...p, credits, priceCents: o?.priceCents ?? p.priceCents, label: `Top-up ${credits.toLocaleString("en-US")}` };
    }),
  };
}

// ── Price arithmetic ──────────────────────────────────────────────────────

export function findCatalogPlan(c: EffectiveCatalog, key: string): EffectiveCatalogPlan | undefined {
  return c.plans.find((p) => p.key === key);
}

export function findTopUp(c: EffectiveCatalog, id: string): TopUpPack | undefined {
  return c.topups.find((p) => p.id === id);
}

/** What one payment for the period costs, in cents. */
export function planChargeCents(plan: Pick<EffectiveCatalogPlan, "monthlyCents" | "annualCents">, cadence: CatalogCadence): number {
  return cadence === "annual" ? plan.annualCents : plan.monthlyCents;
}

/** Plan credits granted over the period paid for (monthly grants, so a year is twelve). */
export function creditsForPeriod(plan: Pick<EffectiveCatalogPlan, "creditsPerMonth">, cadence: CatalogCadence): number {
  return plan.creditsPerMonth * (cadence === "annual" ? 12 : 1);
}

/** Price of one plan credit in cents, from the monthly price. Fractional. */
export function planCentsPerCredit(plan: Pick<EffectiveCatalogPlan, "monthlyCents" | "creditsPerMonth">): number {
  return plan.monthlyCents / plan.creditsPerMonth;
}

export function packCentsPerCredit(pack: Pick<TopUpPack, "priceCents" | "credits">): number {
  return pack.priceCents / pack.credits;
}

/** Yearly as a monthly figure in cents, rounded to the cent. */
export function annualMonthlyCents(plan: Pick<EffectiveCatalogPlan, "annualCents">): number {
  return Math.round(plan.annualCents / 12);
}

/** Whole-percent saving of yearly over twelve monthly payments. */
export function annualSavingPercent(plan: Pick<EffectiveCatalogPlan, "monthlyCents" | "annualCents">): number {
  return Math.max(0, Math.round((1 - plan.annualCents / (plan.monthlyCents * 12)) * 100));
}

/** "$0.33" for 32.67 cents. */
export function formatCreditPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "$20" for 2000, "$40.83" for 4083. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/**
 * Problems with the price ladder, in plain words; empty when it is sound.
 * Not errors: an admin may choose a broken ladder on purpose (a promotion),
 * so the editor shows these as warnings.
 */
export function ladderIssues(c: EffectiveCatalog): string[] {
  const issues: string[] = [];
  for (let i = 1; i < c.plans.length; i++) {
    const lower = c.plans[i - 1];
    const upper = c.plans[i];
    if (upper.monthlyCents <= lower.monthlyCents) {
      issues.push(`${upper.name} costs no more than ${lower.name}.`);
    }
    if (planCentsPerCredit(upper) >= planCentsPerCredit(lower)) {
      issues.push(
        `A credit on ${upper.name} (${formatCreditPrice(planCentsPerCredit(upper))}) is not cheaper than on ${lower.name} (${formatCreditPrice(planCentsPerCredit(lower))}).`,
      );
    }
  }
  const dearestPlan = c.plans.reduce((hi, p) => (planCentsPerCredit(p) > planCentsPerCredit(hi) ? p : hi), c.plans[0]);
  for (const pack of c.topups) {
    if (packCentsPerCredit(pack) <= planCentsPerCredit(dearestPlan)) {
      issues.push(
        `${pack.label} (${formatCreditPrice(packCentsPerCredit(pack))} a credit) costs no more than ${dearestPlan.name} plan credits (${formatCreditPrice(planCentsPerCredit(dearestPlan))}), so topping up beats paying for a plan.`,
      );
    }
  }
  for (let i = 1; i < c.topups.length; i++) {
    if (c.topups[i].credits <= c.topups[i - 1].credits) issues.push(`${c.topups[i].label} has no more credits than ${c.topups[i - 1].label}.`);
    else if (packCentsPerCredit(c.topups[i]) > packCentsPerCredit(c.topups[i - 1])) {
      issues.push(`${c.topups[i].label} costs more per credit than ${c.topups[i - 1].label}.`);
    }
  }
  return issues;
}
