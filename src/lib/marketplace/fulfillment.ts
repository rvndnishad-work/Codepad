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

/**
 * Recurring membership payment (invoice.paid) → record the renewal earning.
 * The FIRST payment is recorded by fulfillMembershipCheckout, so invoices with
 * billing_reason "subscription_create" are skipped — recording them too would
 * double-count the same money under a different charge id. No-ops for
 * invoices that don't belong to a space membership (workspace plans).
 */
export async function fulfillMembershipRenewal(invoice: Stripe.Invoice) {
  // The subscription id moved between Stripe API versions (top-level string →
  // parent.subscription_details) — read both shapes defensively.
  const inv = invoice as unknown as {
    id: string;
    billing_reason?: string | null;
    amount_paid?: number | null;
    currency?: string | null;
    payment_intent?: string | { id: string } | null;
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
  };
  if (inv.billing_reason === "subscription_create") return;

  const rawSub = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
  const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id;
  if (!subscriptionId || !inv.amount_paid) return;

  const membership = await prisma.spaceMembership.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { subscriberId: true, spaceId: true, tierRank: true },
  });
  if (!membership) return; // not a space membership (e.g. a workspace plan)

  const [space, tier] = await Promise.all([
    prisma.creatorSpace.findUnique({ where: { id: membership.spaceId }, select: { ownerId: true } }),
    prisma.spaceTier.findUnique({
      where: { spaceId_rank: { spaceId: membership.spaceId, rank: membership.tierRank } },
      select: { id: true, platformFeeBps: true },
    }),
  ]);
  if (!space) return;

  const chargeId =
    typeof inv.payment_intent === "string" ? inv.payment_intent : (inv.payment_intent?.id ?? `inv:${inv.id}`);
  const res = await recordCreatorEarning({
    creatorId: space.ownerId,
    stripeChargeId: chargeId,
    grossCents: inv.amount_paid,
    platformFeeBps: tier?.platformFeeBps ?? FALLBACK_FEE_BPS,
    currency: inv.currency ?? "usd",
    sourceKind: "TIER",
    sourceId: tier?.id ?? null,
    buyerId: membership.subscriberId,
  });
  console.log(
    `MEMBERSHIP_RENEWAL ${subscriptionId}: earning ${res.recorded ? "recorded" : "already recorded"} (${inv.amount_paid} ${inv.currency})`,
  );
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
