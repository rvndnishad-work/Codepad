/**
 * Stripe Checkout for a one-time AI screening credit pack. The webhook
 * credits the workspace on checkout.session.completed (kind AI_CREDIT_PACK).
 * Callers check billing:manage first.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getAiCreditPack } from "@/lib/ai-interview/credits";

export class CreditCheckoutError extends Error {}

export async function createCreditPackCheckout(a: {
  workspace: { id: string; name: string; slug: string; stripeCustomerId: string | null };
  packId: string;
  origin: string;
}): Promise<string> {
  const pack = getAiCreditPack(a.packId);
  if (!pack) throw new CreditCheckoutError("Unknown credit pack.");
  if (!process.env.STRIPE_SECRET_KEY) throw new CreditCheckoutError("Online payments are not set up on this server yet.");

  const stripe = getStripe();
  let customer = a.workspace.stripeCustomerId;
  if (!customer) {
    const created = await stripe.customers.create({ name: a.workspace.name, metadata: { workspaceId: a.workspace.id } });
    customer = created.id;
    await prisma.workspace.update({ where: { id: a.workspace.id }, data: { stripeCustomerId: customer } });
  }

  const returnUrl = `${a.origin}/w/${a.workspace.slug}/billing?tab=usage`;
  const metadata = { kind: "AI_CREDIT_PACK", workspaceId: a.workspace.id, packId: pack.id, credits: String(pack.credits) };
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Interviewpad AI credits, ${pack.label}`,
            description: `${pack.credits} AI screening credits for "${a.workspace.name}".`,
          },
          unit_amount: pack.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}&credits_purchase=success`,
    cancel_url: `${returnUrl}&credits_purchase=cancel`,
    metadata: { ...metadata, workspaceSlug: a.workspace.slug },
    payment_intent_data: { metadata },
  });
  if (!checkout.url) throw new CreditCheckoutError("Stripe did not return a checkout link. Try again.");
  return checkout.url;
}
