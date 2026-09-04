"use server";

import { prisma } from "./prisma";
import { auth } from "./auth";
import { staffCan } from "./permissions/staff";
import { sanitizePricingConfig, type PricingConfig } from "./pricing-plans";

/** Persist the pricing page config (admin-only). Unknown fields are stripped
 *  and every value is clamped by sanitizePricingConfig. */
export async function updatePricingConfig(config: unknown): Promise<{ ok: boolean }> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }
  const clean = sanitizePricingConfig(config);
  await prisma.siteSetting.upsert({
    where: { key: "pricing_plans" },
    update: { value: JSON.stringify(clean) },
    create: { key: "pricing_plans", value: JSON.stringify(clean) },
  });
  return { ok: true };
}

export type { PricingConfig };
