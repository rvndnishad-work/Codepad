/**
 * Admin-editable wording for the public pricing page and the /hire teaser.
 *
 * Only text lives here: plan names, the "who it is for" line, the "what is
 * included" list, which plan is marked recommended, and credit pack badges.
 * Prices, units, notes, seat lines, the call to action, credits and
 * per-credit prices are never taken from the copy. They come from
 * ./public-pricing, built from the effective prices (./prices) that Stripe
 * checkout also charges, so the wording can never advertise another price.
 *
 * Pure: no database, no env. Safe to import from client components.
 */

import { PLAN_ORDER, type WorkspacePlanKey } from "./plans";
import { DEFAULT_PRICES, type EffectivePrices } from "./prices";
import { PUBLIC_CREDIT_PACKS, buildPublicPricing, type PublicPricing } from "./public-pricing";

export type PlanCopy = {
  name?: string;
  audience?: string;
  includes?: string[];
  recommended?: boolean;
};

export type PricingCopy = {
  plans?: Partial<Record<WorkspacePlanKey, PlanCopy>>;
  /** Pack id to badge text. null hides the default badge. */
  packBadges?: Record<string, string | null>;
};

export const PRICING_COPY_LIMITS = {
  name: 40,
  audience: 160,
  include: 160,
  includes: 8,
  badge: 24,
} as const;

const PACK_IDS = new Set(PUBLIC_CREDIT_PACKS.map((p) => p.id));

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Trimmed, whitespace-collapsed, capped string; undefined when empty or not a string. */
function cleanText(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim().slice(0, max).trim();
  return s ? s : undefined;
}

/**
 * Coerce anything (a form post, a stored JSON blob) into a valid PricingCopy.
 * Unknown plan keys, unknown pack ids, unknown fields and empty strings are
 * dropped; lengths are capped; at most one plan keeps `recommended: true`.
 */
export function sanitizePricingCopy(input: unknown): PricingCopy {
  const out: PricingCopy = {};
  if (!isRecord(input)) return out;

  if (isRecord(input.plans)) {
    const plans: Partial<Record<WorkspacePlanKey, PlanCopy>> = {};
    let recommendedTaken = false;
    for (const key of PLAN_ORDER) {
      if (!Object.prototype.hasOwnProperty.call(input.plans, key)) continue;
      const raw = input.plans[key];
      if (!isRecord(raw)) continue;
      const plan: PlanCopy = {};
      const name = cleanText(raw.name, PRICING_COPY_LIMITS.name);
      if (name) plan.name = name;
      const audience = cleanText(raw.audience, PRICING_COPY_LIMITS.audience);
      if (audience) plan.audience = audience;
      if (Array.isArray(raw.includes)) {
        const seen = new Set<string>();
        const lines: string[] = [];
        for (const item of raw.includes) {
          const line = cleanText(item, PRICING_COPY_LIMITS.include);
          if (!line || seen.has(line)) continue;
          seen.add(line);
          lines.push(line);
          if (lines.length >= PRICING_COPY_LIMITS.includes) break;
        }
        if (lines.length) plan.includes = lines;
      }
      if (raw.recommended === true && !recommendedTaken) {
        plan.recommended = true;
        recommendedTaken = true;
      }
      if (Object.keys(plan).length) plans[key] = plan;
    }
    if (Object.keys(plans).length) out.plans = plans;
  }

  if (isRecord(input.packBadges)) {
    const badges: Record<string, string | null> = {};
    for (const id of PACK_IDS) {
      if (!Object.prototype.hasOwnProperty.call(input.packBadges, id)) continue;
      const raw = input.packBadges[id];
      if (raw === null) {
        badges[id] = null;
        continue;
      }
      const badge = cleanText(raw, PRICING_COPY_LIMITS.badge);
      if (badge) badges[id] = badge;
    }
    if (Object.keys(badges).length) out.packBadges = badges;
  }

  return out;
}

/**
 * Overlay admin copy onto the plans and packs built from `prices` (the
 * effective prices; defaults when omitted). Only name, audience, includes,
 * recommended and badge can change; every price field comes from
 * buildPublicPricing untouched. The input is sanitized again here, so a stray
 * price field in `copy` is ignored.
 */
export function applyPricingCopy(copy: PricingCopy, prices: EffectivePrices = DEFAULT_PRICES): PublicPricing {
  const base = buildPublicPricing(prices);
  const clean = sanitizePricingCopy(copy);
  const planCopy = clean.plans ?? {};
  const recommendedKey = PLAN_ORDER.find((k) => planCopy[k]?.recommended === true);

  const plans = base.plans.map((plan) => {
    const c = planCopy[plan.key];
    return {
      ...plan,
      name: c?.name ?? plan.name,
      audience: c?.audience ?? plan.audience,
      includes: c?.includes ? [...c.includes] : [...plan.includes],
      recommended: recommendedKey ? plan.key === recommendedKey : plan.recommended,
    };
  });

  const badges = clean.packBadges ?? {};
  const packs = base.packs.map((pack) => {
    const has = Object.prototype.hasOwnProperty.call(badges, pack.id);
    return { ...pack, badge: has ? badges[pack.id] : pack.badge };
  });

  return { ...base, plans, packs };
}
