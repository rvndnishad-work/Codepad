"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { sanitizePricingCopy, type PricingCopy } from "@/lib/billing/pricing-copy";
import { sanitizePriceOverrides, type PriceOverrides } from "@/lib/billing/prices";
import { PRICING_SETTINGS_KEY } from "@/lib/billing/pricing-copy-store";

export type SavePricingResult =
  | { ok: true; copy: PricingCopy; prices: PriceOverrides }
  | { ok: false; error: string };

async function requirePlatformAdmin() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
}

function revalidatePricing() {
  revalidatePath("/pricing");
  revalidatePath("/hire");
  revalidatePath("/admin/pricing");
  revalidatePath("/docs/mcp");
}

/**
 * Save the pricing page wording and price overrides. Wording is sanitized
 * (unknown fields dropped, lengths capped). Prices are validated: any price
 * outside its bounds rejects the whole save, so nothing half-applies. New
 * prices apply to new checkouts; existing subscription items keep their price.
 */
export async function savePricingCopy(input: unknown): Promise<SavePricingResult> {
  await requirePlatformAdmin();
  const raw = typeof input === "object" && input !== null ? (input as { prices?: unknown }) : {};
  const copy = sanitizePricingCopy(input);
  const { prices, errors } = sanitizePriceOverrides(raw.prices);
  if (errors.length) return { ok: false, error: errors.join(" ") };

  const stored = { ...copy, ...(Object.keys(prices).length ? { prices } : {}) };
  if (Object.keys(stored).length === 0) {
    await prisma.siteSetting.deleteMany({ where: { key: PRICING_SETTINGS_KEY } });
  } else {
    const value = JSON.stringify(stored);
    await prisma.siteSetting.upsert({
      where: { key: PRICING_SETTINGS_KEY },
      update: { value },
      create: { key: PRICING_SETTINGS_KEY, value },
    });
  }
  revalidatePricing();
  return { ok: true, copy, prices };
}

/** Drop every override, wording and prices, so everything comes from code. */
export async function resetPricingCopy(): Promise<void> {
  await requirePlatformAdmin();
  await prisma.siteSetting.deleteMany({ where: { key: PRICING_SETTINGS_KEY } });
  revalidatePricing();
}
