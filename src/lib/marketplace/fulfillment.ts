/**
 * Webhook fulfillment for marketplace purchases. Called from the Stripe webhook
 * (checkout.session.completed + customer.subscription.* ). Every write is
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
  const { productId, buyerId, creatorId, contentType, contentId } = m;
  if (!productId || !buyerId || !creatorId || !contentType || !contentId) {
    console.warn("CONTENT_PURCHASE checkout missing metadata", session.id);
    return;
  }

  await grantEntitlement({
    userId: buyerId,
    contentType: contentType as OwnableContentType,
    contentId,
    source: "PURCHASE",
    productId,
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { platformFeeBps: true },
  });
  const chargeId = (session.payment_intent as string) || session.id;
  const res = await recordCreatorEarning({
    creatorId,
    stripeChargeId: chargeId,
    grossCents: session.amount_total ?? 0,
    platformFeeBps: product?.platformFeeBps ?? FALLBACK_FEE_BPS,
    currency: session.currency ?? "usd",
    productId,
    buyerId,
  });
  console.log(
    `CONTENT_PURCHASE ${productId} for ${buyerId}: entitlement granted, earning ${res.recorded ? "recorded" : "already recorded"}`,
  );
}

/** Subscription checkout → upsert the CreatorSubscription (catalogue access is
 *  resolved live via hasEntitlement) + record the first payment. */
export async function fulfillSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const { buyerId, creatorId, productId } = m;
  const stripeSubscriptionId = session.subscription as string | null;
  if (!buyerId || !creatorId || !stripeSubscriptionId) {
    console.warn("CREATOR_SUBSCRIPTION checkout missing metadata", session.id);
    return;
  }

  await prisma.creatorSubscription.upsert({
    where: { stripeSubscriptionId },
    update: { status: "active" },
    create: { subscriberId: buyerId, creatorId, stripeSubscriptionId, status: "active" },
  });

  if (session.amount_total) {
    const product = productId
      ? await prisma.product.findUnique({
          where: { id: productId },
          select: { platformFeeBps: true },
        })
      : null;
    await recordCreatorEarning({
      creatorId,
      stripeChargeId: (session.payment_intent as string) || `sub:${session.id}`,
      grossCents: session.amount_total,
      platformFeeBps: product?.platformFeeBps ?? FALLBACK_FEE_BPS,
      currency: session.currency ?? "usd",
      productId: productId ?? null,
      buyerId,
    });
  }
}

/** Mirror a Stripe subscription's status onto our CreatorSubscription rows.
 *  No-ops for workspace subscriptions (no matching row). */
export async function syncCreatorSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date | null,
) {
  await prisma.creatorSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: {
      status,
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
    },
  });
}
