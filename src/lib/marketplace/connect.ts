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

/** Lazily create the Stripe Product + Price for one of our Product rows and
 *  cache the ids. One-time products get a one-off price; subscription products
 *  get a monthly recurring price. */
async function ensureStripePrice(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found.");
  if (product.stripePriceId) return product;

  const stripe = getStripe();
  const stripeProduct = await stripe.products.create({
    name: `${product.contentType.toLowerCase()} ${product.contentId}`,
    metadata: { productId: product.id, creatorId: product.creatorId },
  });
  const price = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: product.priceCents,
    currency: product.currency,
    ...(product.kind === "SUBSCRIPTION"
      ? { recurring: { interval: "month" as const } }
      : {}),
  });
  return prisma.product.update({
    where: { id: product.id },
    data: { stripeProductId: stripeProduct.id, stripePriceId: price.id },
  });
}

/**
 * Create a Checkout Session for a product. One-time → payment mode with an
 * application fee + transfer to the creator; subscription → subscription mode
 * with an application-fee percent. Returns the redirect URL.
 */
export async function createCheckoutSession(params: {
  productId: string;
  buyerId: string;
  origin: string;
}): Promise<string> {
  const product = await ensureStripePrice(params.productId);
  if (!product.published) throw new Error("This product isn't available.");

  const creatorAccount = await prisma.creatorAccount.findUnique({
    where: { userId: product.creatorId },
  });
  if (!creatorAccount?.stripeAccountId || !creatorAccount.chargesEnabled) {
    throw new Error("This creator can't accept payments yet.");
  }

  const stripe = getStripe();
  const isSub = product.kind === "SUBSCRIPTION";
  const metadata = {
    kind: isSub ? "CREATOR_SUBSCRIPTION" : "CONTENT_PURCHASE",
    productId: product.id,
    buyerId: params.buyerId,
    creatorId: product.creatorId,
    contentType: product.contentType,
    contentId: product.contentId,
  };

  const session = await stripe.checkout.sessions.create({
    mode: isSub ? "subscription" : "payment",
    line_items: [{ price: product.stripePriceId!, quantity: 1 }],
    success_url: `${params.origin}/creator/purchased?status=success`,
    cancel_url: `${params.origin}/creator/purchased?status=cancel`,
    client_reference_id: params.buyerId,
    metadata,
    ...(isSub
      ? {
          subscription_data: {
            application_fee_percent: product.platformFeeBps / 100,
            transfer_data: { destination: creatorAccount.stripeAccountId },
            metadata,
          },
        }
      : {
          payment_intent_data: {
            application_fee_amount: Math.floor(
              (product.priceCents * product.platformFeeBps) / 10000,
            ),
            transfer_data: { destination: creatorAccount.stripeAccountId },
            metadata,
          },
        }),
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}
