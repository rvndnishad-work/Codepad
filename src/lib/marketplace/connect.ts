/**
 * Stripe Connect (Express) integration for the creator marketplace.
 *
 * Money flow uses *destination charges*: the platform is merchant of record,
 * collects an application fee, and transfers the remainder to the creator's
 * connected account. Onboarding/compliance is handled by Stripe-hosted account
 * links. Selling is gated on `chargesEnabled` so half-onboarded creators can't
 * list (see createCheckoutSession + the product:sell action guard).
 *
 * Server-only: imports getStripe + prisma. Mirrors lib/stripe.ts's lazy-init so
 * importing this never crashes in a keyless dev environment.
 */
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/** Ensure the user has a CreatorAccount with a Stripe Connect account id,
 *  creating the Stripe Express account on first call. */
export async function getOrCreateConnectAccount(
  userId: string,
): Promise<{ stripeAccountId: string }> {
  const existing = await prisma.creatorAccount.findUnique({ where: { userId } });
  if (existing?.stripeAccountId) {
    return { stripeAccountId: existing.stripeAccountId };
  }

  const stripe = getStripe();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const account = await stripe.accounts.create({
    type: "express",
    email: user?.email ?? undefined,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    metadata: { userId },
  });

  await prisma.creatorAccount.upsert({
    where: { userId },
    update: { stripeAccountId: account.id },
    create: { userId, stripeAccountId: account.id },
  });
  return { stripeAccountId: account.id };
}

/** A Stripe-hosted onboarding link the creator completes to enable charges. */
export async function createOnboardingLink(
  stripeAccountId: string,
  origin: string,
): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${origin}/creator?onboarding=refresh`,
    return_url: `${origin}/creator?onboarding=done`,
    type: "account_onboarding",
  });
  return link.url;
}

/** Sync our cached Connect flags from Stripe (called on account.updated and
 *  after onboarding returns). */
export async function syncConnectAccountFromStripe(
  stripeAccountId: string,
): Promise<void> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(stripeAccountId);
  const chargesEnabled = !!account.charges_enabled;
  await prisma.creatorAccount.updateMany({
    where: { stripeAccountId },
    data: {
      chargesEnabled,
      payoutsEnabled: !!account.payouts_enabled,
      ...(chargesEnabled ? { onboardedAt: new Date() } : {}),
    },
  });
}

/** The space owner's Connect account — must have charges enabled to sell. */
async function requireSellableAccount(spaceId: string) {
  const space = await prisma.creatorSpace.findUnique({
    where: { id: spaceId },
    select: { ownerId: true },
  });
  if (!space) throw new Error("Space not found.");
  const account = await prisma.creatorAccount.findUnique({
    where: { userId: space.ownerId },
  });
  if (!account?.stripeAccountId || !account.chargesEnabled) {
    throw new Error("This creator can't accept payments yet.");
  }
  return { creatorId: space.ownerId, stripeAccountId: account.stripeAccountId };
}

/** Lazily create + cache the recurring Stripe price for a membership tier. */
async function ensureTierPrice(tierId: string) {
  const tier = await prisma.spaceTier.findUnique({ where: { id: tierId } });
  if (!tier) throw new Error("Tier not found.");
  if (tier.stripePriceId) return tier;
  const stripe = getStripe();
  const product = await stripe.products.create({
    name: `Membership: ${tier.name}`,
    metadata: { tierId: tier.id, spaceId: tier.spaceId },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: tier.priceCents,
    currency: tier.currency,
    recurring: { interval: "month" },
  });
  return prisma.spaceTier.update({
    where: { id: tier.id },
    data: { stripeProductId: product.id, stripePriceId: price.id },
  });
}

/** Lazily create + cache the one-off Stripe price for a purchasable item. */
async function ensureContentPrice(spaceContentId: string) {
  const sc = await prisma.spaceContent.findUnique({ where: { id: spaceContentId } });
  if (!sc) throw new Error("Item not found.");
  if (sc.purchasePriceCents == null) throw new Error("This item isn't sold individually.");
  if (sc.stripePriceId) return sc;
  const stripe = getStripe();
  const product = await stripe.products.create({
    name: `${sc.contentType.toLowerCase()} ${sc.contentId}`,
    metadata: { spaceContentId: sc.id, spaceId: sc.spaceId },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: sc.purchasePriceCents,
    currency: sc.currency,
  });
  return prisma.spaceContent.update({
    where: { id: sc.id },
    data: { stripeProductId: product.id, stripePriceId: price.id },
  });
}

const RETURN_SUCCESS = (origin: string) => `${origin}/purchase/complete?status=success`;
const RETURN_CANCEL = (origin: string) => `${origin}/purchase/complete?status=cancel`;

/** Subscribe a buyer to a membership tier (recurring). Returns the checkout URL. */
export async function createTierCheckout(params: {
  tierId: string;
  buyerId: string;
  origin: string;
}): Promise<string> {
  const tier = await ensureTierPrice(params.tierId);
  if (!tier.published) throw new Error("This tier isn't available.");
  const { creatorId, stripeAccountId } = await requireSellableAccount(tier.spaceId);

  const metadata = {
    kind: "SPACE_MEMBERSHIP",
    spaceId: tier.spaceId,
    tierId: tier.id,
    tierRank: String(tier.rank),
    buyerId: params.buyerId,
    creatorId,
  };
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: tier.stripePriceId!, quantity: 1 }],
    success_url: RETURN_SUCCESS(params.origin),
    cancel_url: RETURN_CANCEL(params.origin),
    client_reference_id: params.buyerId,
    metadata,
    subscription_data: {
      application_fee_percent: tier.platformFeeBps / 100,
      transfer_data: { destination: stripeAccountId },
      metadata,
    },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/** One-time purchase of an individually-sold item. Returns the checkout URL. */
export async function createContentCheckout(params: {
  spaceContentId: string;
  buyerId: string;
  origin: string;
}): Promise<string> {
  const sc = await ensureContentPrice(params.spaceContentId);
  const { creatorId, stripeAccountId } = await requireSellableAccount(sc.spaceId);

  const metadata = {
    kind: "CONTENT_PURCHASE",
    spaceId: sc.spaceId,
    spaceContentId: sc.id,
    contentType: sc.contentType,
    contentId: sc.contentId,
    buyerId: params.buyerId,
    creatorId,
  };
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: sc.stripePriceId!, quantity: 1 }],
    success_url: RETURN_SUCCESS(params.origin),
    cancel_url: RETURN_CANCEL(params.origin),
    client_reference_id: params.buyerId,
    metadata,
    payment_intent_data: {
      application_fee_amount: Math.floor(
        ((sc.purchasePriceCents ?? 0) * sc.platformFeeBps) / 10000,
      ),
      transfer_data: { destination: stripeAccountId },
      metadata,
    },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}
