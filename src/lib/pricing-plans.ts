import { prisma } from "./prisma";

/**
 * Pricing page content store. Plans + comparison matrix live as JSON in the
 * SiteSetting table (key `pricing_plans`) so admins can edit copy, prices,
 * credits and features without a deploy — same pattern as nav_links.
 * The pricing page falls back to DEFAULT_PRICING when nothing is stored.
 */

export type PricingCheckoutPlan = "STARTER" | "GROWTH";

export type PricingCta =
  | { kind: "free" }
  | { kind: "checkout"; plan: PricingCheckoutPlan }
  | { kind: "sales" };

export type PricingPlanDef = {
  /** Stable key (basic/pro/max/team/scale/enterprise). Never edited in UI. */
  id: string;
  name: string;
  tagline: string;
  /** Monthly seat price. null = custom (sales-led). */
  monthly: number | null;
  /** Monthly-equivalent on annual billing. null = same as monthly. */
  annual: number | null;
  badges: string[];
  blurb: string;
  credits: string;
  creditsSub: string;
  creditsAnnual?: string;
  creditsAnnualSub?: string;
  features: string[];
  mcp?: boolean;
  cta: PricingCta;
  spotlight?: "best" | "expert";
  /** Business tiers meter per seat; individual tiers are flat. */
  seatBased: boolean;
};

export type MatrixCell = string | { text: string; hot?: boolean };
export type MatrixRow = { feature: string; cells: MatrixCell[] };

export type PricingConfig = {
  individual: PricingPlanDef[];
  business: PricingPlanDef[];
  matrix: Record<"individual" | "business", MatrixRow[]>;
};

export const DEFAULT_PRICING: PricingConfig = {
  individual: [
    {
      id: "basic",
      name: "BASIC",
      tagline: "For trying things out",
      monthly: 0,
      annual: 0,
      badges: [],
      blurb: "A 7-day taste of evidence-based hiring for a solo recruiter.",
      credits: "10 trial credits",
      creditsSub: "expires in 7 days",
      features: [
        "1 workspace · 1 seat",
        "3 trial assessments",
        "Community challenges",
        "Manual scorecards",
      ],
      cta: { kind: "free" },
      seatBased: false,
    },
    {
      id: "pro",
      name: "PRO",
      tagline: "For solo recruiters getting serious",
      monthly: 50,
      annual: 40,
      badges: ["21% OFF"],
      blurb: "Core screening power with room to grow.",
      credits: "500 AI credits / mo",
      creditsSub: "resets monthly",
      creditsAnnual: "550 AI credits / mo",
      creditsAnnualSub: "carry-forward on yearly",
      features: [
        "50 candidates / month",
        "Take-homes with auto-grading",
        "Full session replay",
        "ATS webhooks",
      ],
      cta: { kind: "checkout", plan: "STARTER" },
      seatBased: false,
    },
    {
      id: "max",
      name: "MAX",
      tagline: "For power users running volume",
      monthly: 100,
      annual: 75,
      badges: ["25% OFF", "BEST VALUE"],
      blurb: "Maximum signal, minimum busywork.",
      credits: "1,200 AI credits / mo",
      creditsSub: "resets monthly",
      creditsAnnual: "1,320 AI credits / mo",
      creditsAnnualSub: "carry-forward on yearly",
      features: [
        "150 candidates / month",
        "Everything in Pro",
        "AI screening included",
        "Priority support",
      ],
      mcp: true,
      cta: { kind: "checkout", plan: "STARTER" },
      spotlight: "best",
      seatBased: false,
    },
  ],
  business: [
    {
      id: "team",
      name: "TEAM",
      tagline: "For agencies and small teams to create faster",
      monthly: 120,
      annual: 100,
      badges: ["17% OFF"],
      blurb: "Shared hiring firepower with pooled credits.",
      credits: "1,500 credits total / mo",
      creditsSub: "pooled across seats · resets monthly",
      creditsAnnual: "1,650 credits total / mo",
      creditsAnnualSub: "pooled · carry-forward on yearly",
      features: [
        "5 seats included",
        "300 candidates / month",
        "Take-homes with auto-grading",
        "Full replay + ATS webhooks",
      ],
      cta: { kind: "checkout", plan: "GROWTH" },
      seatBased: true,
    },
    {
      id: "scale",
      name: "SCALE",
      tagline: "Designed for growing creative teams",
      monthly: 250,
      annual: 200,
      badges: ["20% OFF", "BEST VALUE"],
      blurb: "Volume screening with automation on top.",
      credits: "4,000 credits / mo",
      creditsSub: "shared pool · resets monthly",
      creditsAnnual: "4,400 credits / mo",
      creditsAnnualSub: "shared pool · carry-forward on yearly",
      features: [
        "1,000 candidates / month",
        "Everything in Team",
        "AI screening included",
        "Custom rubrics",
        "Priority (24h) support",
      ],
      mcp: true,
      cta: { kind: "checkout", plan: "GROWTH" },
      spotlight: "best",
      seatBased: true,
    },
    {
      id: "enterprise",
      name: "ENTERPRISE",
      tagline: "For organizations needing personalisation & security",
      monthly: null,
      annual: null,
      badges: ["EXPERTS' CHOICE"],
      blurb: "Security, scale, and a contract that fits procurement.",
      credits: "Custom credits per seat / mo",
      creditsSub: "unlimited seats",
      features: [
        "Unlimited candidates",
        "SSO / SAML + audit logs",
        "Dedicated warm VMs",
        "24/7 dedicated CSM + custom SLA",
      ],
      cta: { kind: "sales" },
      spotlight: "expert",
      seatBased: true,
    },
  ],
  matrix: {
    individual: [
      { feature: "AI credits / month", cells: ["10 (7-day trial)", "500", { text: "1,200", hot: true }] },
      { feature: "Candidates / month", cells: ["3", "50", { text: "150", hot: true }] },
      { feature: "Take-home grading", cells: ["—", "Auto-graded", { text: "Auto-graded", hot: true }] },
      { feature: "Session timeline replay", cells: ["—", "Full replay", { text: "Full replay", hot: true }] },
      { feature: "AI screening", cells: ["—", "—", { text: "Included", hot: true }] },
      { feature: "MCP API", cells: ["—", "—", { text: "Yes", hot: true }] },
      { feature: "ATS sync", cells: ["—", "Webhooks", "Webhooks"] },
      { feature: "Support tier", cells: ["Community", "Email", { text: "Priority", hot: true }] },
    ],
    business: [
      { feature: "Seats included", cells: ["5", "15", "Unlimited"] },
      { feature: "AI credits / month", cells: ["1,500 total", { text: "4,000", hot: true }, "Custom"] },
      { feature: "Candidates / month", cells: ["300", { text: "1,000", hot: true }, "Unlimited"] },
      { feature: "Session timeline replay", cells: ["Full replay", { text: "Full replay", hot: true }, { text: "Full replay", hot: true }] },
      { feature: "AI screening", cells: ["—", { text: "Included", hot: true }, { text: "Included", hot: true }] },
      { feature: "SSO / SAML + audit logs", cells: ["—", "—", { text: "Yes", hot: true }] },
      { feature: "Dedicated warm VMs", cells: ["—", "—", { text: "Yes", hot: true }] },
      { feature: "Support tier", cells: ["Email", { text: "Priority (24h)", hot: true }, { text: "24/7 CSM", hot: true }] },
    ],
  },
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0 || n > 1000000) return null;
  return Math.floor(n);
};

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";

const strArr = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, maxLen)).slice(0, maxItems)
    : [];

/** Coerce unknown JSON into a renderable config (fills gaps with defaults). */
export function sanitizePricingConfig(raw: unknown): PricingConfig {
  const pick = (arr: unknown, fallback: PricingPlanDef[]): PricingPlanDef[] => {
    if (!Array.isArray(arr)) return fallback;
    return fallback.map((base, i) => {
      const r = (arr[i] ?? {}) as Record<string, unknown>;
      const ctaKind = r.cta && typeof r.cta === "object" ? (r.cta as Record<string, unknown>).kind : base.cta.kind;
      const ctaPlan = r.cta && typeof r.cta === "object" ? (r.cta as Record<string, unknown>).plan : undefined;
      return {
        ...base,
        name: str(r.name, 24) || base.name,
        tagline: str(r.tagline, 80) || base.tagline,
        monthly: numOrNull(r.monthly) ?? (r.monthly === null ? null : base.monthly),
        annual: numOrNull(r.annual) ?? (r.annual === null ? null : base.annual),
        badges: strArr(r.badges, 3, 16),
        blurb: str(r.blurb, 200) || base.blurb,
        credits: str(r.credits, 60) || base.credits,
        creditsSub: str(r.creditsSub, 80) || base.creditsSub,
        creditsAnnual: str(r.creditsAnnual, 60) || undefined,
        creditsAnnualSub: str(r.creditsAnnualSub, 80) || undefined,
        features: strArr(r.features, 8, 120).length > 0 ? strArr(r.features, 8, 120) : base.features,
        mcp: r.mcp === true,
        cta:
          ctaKind === "sales"
            ? { kind: "sales" as const }
            : ctaKind === "free"
              ? { kind: "free" as const }
              : { kind: "checkout" as const, plan: ctaPlan === "GROWTH" ? "GROWTH" as const : "STARTER" as const },
        spotlight: r.spotlight === "best" || r.spotlight === "expert" ? r.spotlight : undefined,
        seatBased: r.seatBased !== false && (base.seatBased || r.seatBased === true),
      };
    });
  };
  const rows = (r: unknown, fallback: MatrixRow[]): MatrixRow[] => {
    if (!Array.isArray(r)) return fallback;
    return fallback.map((base, i) => {
      const row = (r[i] ?? {}) as Record<string, unknown>;
      const cells = Array.isArray(row.cells) ? row.cells : base.cells;
      return {
        feature: str(row.feature, 60) || base.feature,
        cells: [0, 1, 2].map((c) => {
          const cell = cells[c];
          if (cell && typeof cell === "object") {
            return { text: str((cell as Record<string, unknown>).text, 80) || "—", hot: (cell as Record<string, unknown>).hot === true };
          }
          return str(cell, 80) || "—";
        }),
      };
    });
  };
  const root = (raw ?? {}) as Record<string, unknown>;
  const matrix = (root.matrix ?? {}) as Record<string, unknown>;
  return {
    individual: pick(root.individual, DEFAULT_PRICING.individual),
    business: pick(root.business, DEFAULT_PRICING.business),
    matrix: {
      individual: rows(matrix.individual, DEFAULT_PRICING.matrix.individual),
      business: rows(matrix.business, DEFAULT_PRICING.matrix.business),
    },
  };
}

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "pricing_plans" } });
    if (!row?.value) return DEFAULT_PRICING;
    return sanitizePricingConfig(JSON.parse(row.value));
  } catch {
    return DEFAULT_PRICING;
  }
}
