import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { recordPurchase } from "@/lib/ai-interview/credits";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Graceful fallback for local development without active webhook tunnels
      console.warn("Stripe webhook: No STRIPE_WEBHOOK_SECRET or stripe-signature header found. Parsing raw body directly for development.");
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Stripe webhook signature validation failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = event.type;
  console.log(`Stripe Webhook event triggered: ${eventType}`);

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;

        // Branch on the metadata.kind so one webhook can route both
        // subscription upgrades and one-time AI credit purchases.
        if (session.metadata?.kind === "AI_CREDIT_PACK") {
          const credits = Number(session.metadata.credits);
          // payment_intent is the most stable idempotency anchor for one-time
          // payments — survives webhook redelivery and refund cycles.
          const chargeId = (session.payment_intent as string) || session.id;
          if (workspaceId && Number.isFinite(credits) && credits > 0 && chargeId) {
            const res = await recordPurchase({
              workspaceId,
              amount: credits,
              stripeChargeId: chargeId,
              note: `Stripe checkout ${session.id} — pack ${session.metadata.packId}`,
            });
            console.log(
              `AI credit pack ${session.metadata.packId} (${credits}) for workspace ${workspaceId}: ${res.recorded ? "credited" : "already recorded"}`
            );
          } else {
            console.warn("AI_CREDIT_PACK checkout missing required metadata", session.id);
          }
          break;
        }

        // Subscription upgrade path (pre-existing behavior).
        const stripeSubscriptionId = session.subscription as string;
        const stripeCustomerId = session.customer as string;
        const planName = (session.metadata?.planName || "GROWTH") as "STARTER" | "GROWTH";

        if (workspaceId && stripeSubscriptionId) {
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              stripeSubscriptionId,
              stripeCustomerId,
              planName,
            },
          });
          console.log(`Workspace ${workspaceId} upgraded to ${planName} plan via checkout success.`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.workspace.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            stripeSubscriptionId: null,
            planName: "FREE",
          },
        });
        console.log(`Workspace subscription ${sub.id} canceled. Resetting to FREE plan.`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const planName = sub.status === "active"
          ? ((sub.metadata?.planName || "GROWTH") as "STARTER" | "GROWTH" | "FREE")
          : "FREE";
        await prisma.workspace.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            planName,
          },
        });
        console.log(`Workspace subscription ${sub.id} status modified. Plan synchronization completed: ${planName}`);
        break;
      }

      default:
        console.log(`Stripe webhook: Unhandled event stream: ${eventType}`);
    }
  } catch (err) {
    console.error(`Error processing Stripe Webhook event ${eventType}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
