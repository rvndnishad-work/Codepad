/**
 * Webhook fulfillment for creator-space purchases. Called from the Stripe
 * webhook (checkout.session.completed + customer.subscription.*). Every write is
 * idempotent so redelivery is safe.
 */
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { grantEntitlement } from "./entitlements";
import { recordCreatorEarning } from "./earnings";
import type { OwnableContentType } from "@/lib/permissions/permissions";

const FALLBACK_FEE_BPS = 2000;

/** One-time content purchase → grant a permanent entitlement + record earnings. */
export async function fulfillContentPurchase(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const { spaceContentId, buyerId, creatorId, contentType, contentId } = m;
  if (!spaceContentId || !buyerId || !creatorId || !contentType || !contentId) {
    console.warn("CONTENT_PURCHASE checkout missing metadata", session.id);
    return;
  }

  await grantEntitlement({
    userId: buyerId,
    contentType: contentType as OwnableContentType,
    contentId,
    source: "PURCHASE",
    spaceContentId,
  });

  const sc = await prisma.spaceContent.findUnique({
    where: { id: spaceContentId },
    select: { platformFeeBps: true },
  });
  const res = await recordCreatorEarning({
    creatorId,
    stripeChargeId: (session.payment_intent as string) || session.id,
    grossCents: session.amount_total ?? 0,
    platformFeeBps: sc?.platformFeeBps ?? FALLBACK_FEE_BPS,
    currency: session.currency ?? "usd",
    sourceKind: "CONTENT",
    sourceId: spaceContentId,
    buyerId,
  });
  console.log(
    `CONTENT_PURCHASE ${spaceContentId} for ${buyerId}: entitlement granted, earning ${res.recorded ? "recorded" : "already recorded"}`,
  );
}

/** Membership checkout → upsert the SpaceMembership + record the first payment.
 *  Catalogue access is resolved live from the membership (see access.ts). */
export async function fulfillMembershipCheckout(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const { buyerId, creatorId, spaceId, tierId } = m;
  const tierRank = Number(m.tierRank);
  const stripeSubscriptionId = session.subscription as string | null;
  if (!buyerId || !spaceId || !stripeSubscriptionId || !Number.isFinite(tierRank)) {
    console.warn("SPACE_MEMBERSHIP checkout missing metadata", session.id);
    return;
  }

  await prisma.spaceMembership.upsert({
    where: { subscriberId_spaceId: { subscriberId: buyerId, spaceId } },
    update: { tierRank, status: "active", stripeSubscriptionId },
    create: { subscriberId: buyerId, spaceId, tierRank, status: "active", stripeSubscriptionId },
  });

  if (session.amount_total && creatorId) {
    const tier = tierId
      ? await prisma.spaceTier.findUnique({
          where: { id: tierId },
          select: { platformFeeBps: true },
        })
      : null;
    await recordCreatorEarning({
      creatorId,
      stripeChargeId: (session.payment_intent as string) || `sub:${session.id}`,
      grossCents: session.amount_total,
      platformFeeBps: tier?.platformFeeBps ?? FALLBACK_FEE_BPS,
      currency: session.currency ?? "usd",
      sourceKind: "TIER",
      sourceId: tierId ?? null,
      buyerId,
    });
  }
}

/** Mirror a Stripe subscription's status onto SpaceMembership rows. No-ops for
 *  workspace subscriptions (no matching row). */
export async function syncMembershipStatus(
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date | null,
) {
  await prisma.spaceMembership.updateMany({
    where: { stripeSubscriptionId },
    data: { status, ...(currentPeriodEnd ? { currentPeriodEnd } : {}) },
  });
}
