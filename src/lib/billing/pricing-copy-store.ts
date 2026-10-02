import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sanitizePricingCopy, type PricingCopy } from "./pricing-copy";
import { DEFAULT_PRICES, PRICE_BOUNDS, resolvePrices, sanitizePriceOverrides, type EffectivePrices, type PriceOverrides } from "./prices";
import { STARTER_SEAT_PRICE, type SeatPrice } from "./plans";

/**
 * SiteSetting key holding everything /admin/pricing edits, as one JSON
 * object: the wording (PricingCopy fields), `prices` (PriceOverrides) and
 * `starter` (the legacy Starter seat price, StarterOverride).
 * One row, so the page and checkout always read the same source.
 */
export const PRICING_SETTINGS_KEY = "pricing_settings";

/** Override for the legacy Starter seat (still sold by the seat checkout). */
export type StarterOverride = { monthlyCents?: number; annualMonthlyCents?: number };

export type StoredPricingSettings = { copy: PricingCopy; prices: PriceOverrides; starter: StarterOverride };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Coerce anything into a valid Starter override, like sanitizePriceOverrides
 * does for the other prices: each field must be whole cents inside the seat
 * bounds, and the yearly rate (per month) cannot be above the monthly one.
 */
export function sanitizeStarterOverride(input: unknown): { starter: StarterOverride; errors: string[] } {
  const errors: string[] = [];
  const starter: StarterOverride = {};
  if (!isRecord(input)) return { starter, errors };
  const b = PRICE_BOUNDS.seatCents;
  const usd = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;
  for (const [key, label] of [["monthlyCents", "Starter monthly seat price"], ["annualMonthlyCents", "Starter yearly seat price"]] as const) {
    const v = input[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== "number" || !Number.isInteger(v) || v < b.min || v > b.max) {
      errors.push(`${label} must be between ${usd(b.min)} and ${usd(b.max)}, in whole cents.`);
      continue;
    }
    starter[key] = v;
  }
  const merged = resolveStarterPrice(starter);
  if (merged.annualMonthlyCents > merged.monthlyCents) {
    errors.push("The Starter yearly seat price (per month) cannot be more than the monthly price.");
    return { starter: {}, errors };
  }
  return { starter, errors };
}

/** Starter seat price: the code default with any override laid over. */
export function resolveStarterPrice(o: StarterOverride | undefined): SeatPrice {
  return {
    monthlyCents: o?.monthlyCents ?? STARTER_SEAT_PRICE.monthlyCents,
    annualMonthlyCents: o?.annualMonthlyCents ?? STARTER_SEAT_PRICE.annualMonthlyCents,
  };
}

/** What Stripe charges per Starter seat for one billing period (annual = 12 discounted months). */
export function starterSeatChargeCents(cadence: "monthly" | "annual", price: SeatPrice): number {
  return cadence === "annual" ? price.annualMonthlyCents * 12 : price.monthlyCents;
}

function parseStored(value: string): StoredPricingSettings {
  const raw: unknown = JSON.parse(value);
  const rec = isRecord(raw) ? raw : {};
  return {
    copy: sanitizePricingCopy(raw),
    prices: sanitizePriceOverrides(rec.prices).prices,
    starter: sanitizeStarterOverride(rec.starter).starter,
  };
}

async function readStoredRow(): Promise<{ value: string | null; settings: StoredPricingSettings }> {
  const row = await prisma.siteSetting.findUnique({ where: { key: PRICING_SETTINGS_KEY } });
  if (!row) return { value: null, settings: { copy: {}, prices: {}, starter: {} } };
  return { value: row.value, settings: parseStored(row.value) };
}

async function readStored(): Promise<StoredPricingSettings> {
  return (await readStoredRow()).settings;
}

/**
 * A short fingerprint of the stored row. The admin page sends it back with a
 * save or a reset, so a change made from another tab in the meantime is not
 * silently overwritten, and a reset only applies to the state the admin saw.
 */
export function pricingVersionOf(value: string | null): string {
  return createHash("sha256").update(value ?? "<defaults>").digest("hex").slice(0, 16);
}

/** The stored settings plus their version fingerprint, for /admin/pricing. */
export async function getPricingSettingsVersioned(): Promise<StoredPricingSettings & { version: string }> {
  const { value, settings } = await readStoredRow();
  return { ...settings, version: pricingVersionOf(value) };
}

/** Serialize settings for the SiteSetting row; null when everything is default. */
export function serializePricingSettings(s: StoredPricingSettings): string | null {
  const stored = {
    ...s.copy,
    ...(Object.keys(s.prices).length ? { prices: s.prices } : {}),
    ...(Object.keys(s.starter).length ? { starter: s.starter } : {}),
  };
  return Object.keys(stored).length ? JSON.stringify(stored) : null;
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
    return { copy: {}, prices: {}, starter: {} };
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

/** The Starter seat price the seat checkout charges. Defaults on any read error. */
export async function getEffectiveStarterPrice(): Promise<SeatPrice> {
  try {
    return resolveStarterPrice((await readStored()).starter);
  } catch (error) {
    console.error("Failed to read the Starter price override, using the default:", error);
    return resolveStarterPrice(undefined);
  }
}

/** Wording and effective prices from one read, for the public pages. */
export async function getPublicPricingInputs(): Promise<{ copy: PricingCopy; prices: EffectivePrices }> {
  const { copy, prices } = await getPricingSettings();
  return { copy, prices: resolvePrices(prices) };
}
