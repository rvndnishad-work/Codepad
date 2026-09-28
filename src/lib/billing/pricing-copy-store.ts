import { prisma } from "@/lib/prisma";
import { sanitizePricingCopy, type PricingCopy } from "./pricing-copy";
import { DEFAULT_PRICES, resolvePrices, sanitizePriceOverrides, type EffectivePrices, type PriceOverrides } from "./prices";

/**
 * SiteSetting key holding everything /admin/pricing edits, as one JSON
 * object: the wording (PricingCopy fields) plus `prices` (PriceOverrides).
 * One row, so the page and checkout always read the same source.
 */
export const PRICING_SETTINGS_KEY = "pricing_settings";

export type StoredPricingSettings = { copy: PricingCopy; prices: PriceOverrides };

async function readStored(): Promise<StoredPricingSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: PRICING_SETTINGS_KEY } });
  if (!row) return { copy: {}, prices: {} };
  const raw: unknown = JSON.parse(row.value);
  const prices = typeof raw === "object" && raw !== null ? (raw as { prices?: unknown }).prices : undefined;
  return { copy: sanitizePricingCopy(raw), prices: sanitizePriceOverrides(prices).prices };
}

/**
 * The stored wording and price overrides, sanitized. Empty when nothing is
 * stored or the row cannot be read, so everything falls back to code.
 */
export async function getPricingSettings(): Promise<StoredPricingSettings> {
  try {
    return await readStored();
  } catch (error) {
    console.error("Failed to read pricing settings:", error);
    return { copy: {}, prices: {} };
  }
}

/** The admin wording for /pricing and /hire. {} when none is stored. */
export async function getPricingCopy(): Promise<PricingCopy> {
  return (await getPricingSettings()).copy;
}

/**
 * The prices checkout charges and pages show: code defaults with any admin
 * overrides. Falls back to the defaults on any read error.
 */
export async function getEffectivePricing(): Promise<EffectivePrices> {
  try {
    return resolvePrices((await readStored()).prices);
  } catch (error) {
    console.error("Failed to read pricing overrides, using defaults:", error);
    return DEFAULT_PRICES;
  }
}

/** Wording and effective prices from one read, for the public pages. */
export async function getPublicPricingInputs(): Promise<{ copy: PricingCopy; prices: EffectivePrices }> {
  const { copy, prices } = await getPricingSettings();
  return { copy, prices: resolvePrices(prices) };
}
