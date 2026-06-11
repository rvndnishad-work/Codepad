/**
 * Creator earnings — the platform-fee split and the idempotent ledger writer.
 * Mirrors the recordPurchase idempotency pattern (unique stripeChargeId) so a
 * redelivered webhook can't double-record a sale.
 */
import { prisma } from "@/lib/prisma";

export type FeeSplit = { grossCents: number; feeCents: number; netCents: number };

/**
 * Split a gross amount into the platform fee and the creator's net, given a fee
 * in basis points (2000 = 20%). The fee is rounded down so the creator never
 * receives less than `gross - ceil(fee)` and the platform never over-collects.
 */
export function feeSplit(grossCents: number, platformFeeBps: number): FeeSplit {
  const clampedBps = Math.max(0, Math.min(10000, platformFeeBps));
  const feeCents = Math.floor((grossCents * clampedBps) / 10000);
  return { grossCents, feeCents, netCents: grossCents - feeCents };
}

/**
 * Record a paid sale to the creator earnings ledger. Idempotent on
 * stripeChargeId. Returns whether a new row was written.
 */
export async function recordCreatorEarning(params: {
  creatorId: string;
  stripeChargeId: string;
  grossCents: number;
  platformFeeBps: number;
  currency?: string;
  productId?: string | null;
  buyerId?: string | null;
}): Promise<{ recorded: boolean }> {
  const existing = await prisma.creatorEarning.findUnique({
    where: { stripeChargeId: params.stripeChargeId },
    select: { id: true },
  });
  if (existing) return { recorded: false };

  const { feeCents, netCents } = feeSplit(params.grossCents, params.platformFeeBps);
  await prisma.creatorEarning.create({
    data: {
      creatorId: params.creatorId,
      productId: params.productId ?? null,
      buyerId: params.buyerId ?? null,
      grossCents: params.grossCents,
      feeCents,
      netCents,
      currency: params.currency ?? "usd",
      stripeChargeId: params.stripeChargeId,
      status: "paid",
    },
  });
  return { recorded: true };
}
