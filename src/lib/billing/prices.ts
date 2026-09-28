/**
 * Effective prices: the defaults in code, with any admin overrides from
 * /admin/pricing laid over. Every place that charges (seat checkout, credit
 * pack checkout, the video add-on) and every place that shows one of these
 * prices reads the same EffectivePrices, so the page and Stripe agree.
 *
 * Overridable: the Growth seat (monthly and the discounted monthly rate on
 * annual billing), each credit pack's price and credit count, and the video
 * add-on (monthly and annual). Existing Stripe subscription items keep the
 * price they were created with; new prices apply to new checkouts and newly
 * added line items only.
 *
 * Pure: no database, no env. Safe to import from client components. The
 * server loader is getEffectivePricing() in ./pricing-copy-store.
 */

import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credit-packs";
import { VIDEO_ADDON_PRICE, type VideoAddonPrice } from "@/lib/video/addon";
import { defaultGrowthSeatPrice, type SeatPrice } from "./plans";

export type EffectiveCreditPack = {
  id: string;
  label: string;
  sublabel: string;
  credits: number;
  priceCents: number;
  /** Default badge from code; the admin wording can replace it on /pricing. */
  badge: string | null;
};

export type EffectivePrices = {
  growth: SeatPrice;
  packs: EffectiveCreditPack[];
  videoAddon: VideoAddonPrice;
};

export type PriceOverrides = {
  growth?: { monthlyCents?: number; annualMonthlyCents?: number };
  packs?: Record<string, { credits?: number; priceCents?: number }>;
  videoAddon?: { monthlyCents?: number; annualCents?: number };
};

/** Inclusive bounds, in cents or credits. */
export const PRICE_BOUNDS = {
  seatCents: { min: 100, max: 1_000_000 },
  packPriceCents: { min: 100, max: 10_000_000 },
  packCredits: { min: 1, max: 100_000 },
  videoMonthlyCents: { min: 100, max: 1_000_000 },
  videoAnnualCents: { min: 100, max: 10_000_000 },
} as const;

const screenings = (credits: number) => `${credits.toLocaleString("en-US")} screenings`;

export const DEFAULT_PRICES: EffectivePrices = {
  growth: defaultGrowthSeatPrice(),
  packs: AI_CREDIT_PACKS.map((p) => ({
    id: p.id,
    label: p.label,
    sublabel: p.sublabel,
    credits: p.credits,
    priceCents: p.priceCents,
    badge: "badge" in p ? p.badge : null,
  })),
  videoAddon: { monthlyCents: VIDEO_ADDON_PRICE.monthlyCents, annualCents: VIDEO_ADDON_PRICE.annualCents },
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

/**
 * Coerce anything into valid overrides. A field that is not an integer inside
 * PRICE_BOUNDS is dropped and reported in `errors`. The Growth pair is checked
 * after merging with the defaults: when the yearly rate would exceed the
 * monthly one, both Growth overrides are dropped.
 */
export function sanitizePriceOverrides(input: unknown): { prices: PriceOverrides; errors: string[] } {
  const errors: string[] = [];
  const prices: PriceOverrides = {};
  if (!isRecord(input)) return { prices, errors };

  const int = (v: unknown, b: { min: number; max: number }, label: string, unit: "cents" | "credits"): number | undefined => {
    if (v === undefined || v === null) return undefined;
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

  if (isRecord(input.growth)) {
    const monthly = int(input.growth.monthlyCents, PRICE_BOUNDS.seatCents, "Growth monthly seat price", "cents");
    const annual = int(input.growth.annualMonthlyCents, PRICE_BOUNDS.seatCents, "Growth yearly seat price", "cents");
    const g: NonNullable<PriceOverrides["growth"]> = {};
    if (monthly !== undefined) g.monthlyCents = monthly;
    if (annual !== undefined) g.annualMonthlyCents = annual;
    const mergedMonthly = g.monthlyCents ?? DEFAULT_PRICES.growth.monthlyCents;
    const mergedAnnual = g.annualMonthlyCents ?? DEFAULT_PRICES.growth.annualMonthlyCents;
    if (mergedAnnual > mergedMonthly) {
      errors.push("The Growth yearly seat price (per month) cannot be more than the monthly price.");
    } else if (Object.keys(g).length) {
      prices.growth = g;
    }
  }

  if (isRecord(input.packs)) {
    const packs: NonNullable<PriceOverrides["packs"]> = {};
    for (const def of DEFAULT_PRICES.packs) {
      if (!Object.prototype.hasOwnProperty.call(input.packs, def.id)) continue;
      const raw = input.packs[def.id];
      if (!isRecord(raw)) continue;
      const credits = int(raw.credits, PRICE_BOUNDS.packCredits, `${def.label} pack credits`, "credits");
      const priceCents = int(raw.priceCents, PRICE_BOUNDS.packPriceCents, `${def.label} pack price`, "cents");
      const p: { credits?: number; priceCents?: number } = {};
      if (credits !== undefined) p.credits = credits;
      if (priceCents !== undefined) p.priceCents = priceCents;
      if (Object.keys(p).length) packs[def.id] = p;
    }
    if (Object.keys(packs).length) prices.packs = packs;
  }

  if (isRecord(input.videoAddon)) {
    const monthly = int(input.videoAddon.monthlyCents, PRICE_BOUNDS.videoMonthlyCents, "Video add-on monthly price", "cents");
    const annual = int(input.videoAddon.annualCents, PRICE_BOUNDS.videoAnnualCents, "Video add-on yearly price", "cents");
    const v: NonNullable<PriceOverrides["videoAddon"]> = {};
    if (monthly !== undefined) v.monthlyCents = monthly;
    if (annual !== undefined) v.annualCents = annual;
    if (Object.keys(v).length) prices.videoAddon = v;
  }

  return { prices, errors };
}

/** Lay (sanitized) overrides over the defaults. */
export function resolvePrices(overrides: unknown): EffectivePrices {
  const { prices } = sanitizePriceOverrides(overrides);
  return {
    growth: { ...DEFAULT_PRICES.growth, ...prices.growth },
    packs: DEFAULT_PRICES.packs.map((p) => {
      const o = prices.packs?.[p.id];
      const credits = o?.credits ?? p.credits;
      return { ...p, credits, priceCents: o?.priceCents ?? p.priceCents, sublabel: o?.credits ? screenings(credits) : p.sublabel };
    }),
    videoAddon: { ...DEFAULT_PRICES.videoAddon, ...prices.videoAddon },
  };
}

/** A credit pack by id from the effective packs. */
export function findCreditPack(prices: EffectivePrices, id: string): EffectiveCreditPack | undefined {
  return prices.packs.find((p) => p.id === id);
}
