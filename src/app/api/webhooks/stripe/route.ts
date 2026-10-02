import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { recordPurchase } from "@/lib/ai-interview/credits";
import {
  fulfillContentPurchase,
  fulfillMembershipCheckout,
  fulfillMembershipRenewal,
  syncMembershipStatus,
} from "@/lib/marketplace/fulfillment";
import { syncConnectAccountFromStripe } from "@/lib/marketplace/connect";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS, type WorkspaceAuditAction } from "@/lib/workspace-audit";
import { planDisplayName, subscriptionUpdateAudits } from "@/lib/billing/usage";
import { checkLowCredits } from "@/lib/billing/credit-alerts";
import { runIncludedCreditsIfDue } from "@/lib/billing/included-credits-server";
import { linkVideoAddonAfterCheckout } from "@/lib/video/addon-server";
import { syncStripeFromWebhook } from "@/lib/admin/stripe-sync";

/** Billing events in the workspace audit log. Stripe is the actor. */
function audit(workspaceId: string, action: WorkspaceAuditAction, meta: Record<string, unknown>) {
  return writeWorkspaceAuditEntry({
    workspaceId,
    action,
    targetType: "workspace",
    targetId: workspaceId,
    meta: { ...meta, source: "stripe" },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      // Signature verification is mandatory whenever a secret is configured —
      // a missing/invalid stripe-signature header fails here and 400s below.
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } else if (process.env.NODE_ENV !== "production") {
      // Local-dev-only fallback for working without a webhook tunnel. NEVER
      // active in production: an unsigned payload could otherwise mint AI
      // credits or upgrade plans for free.
      console.warn("Stripe webhook: STRIPE_WEBHOOK_SECRET not set. Parsing raw body directly (dev only).");
      event = JSON.parse(body);
    } else {
      console.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured in production.");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
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
            if (res.recorded) {
              await audit(workspaceId, WORKSPACE_AUDIT_ACTIONS.CREDITS_PURCHASED, {
                credits,
                amount: session.amount_total ?? null,
                currency: session.currency ?? null,
                packId: session.metadata.packId ?? null,
              });
              // Buying back above the threshold re-arms the low-credit email.
              await checkLowCredits(workspaceId);
            }
          } else {
            console.warn("AI_CREDIT_PACK checkout missing required metadata", session.id);
          }
          break;
        }

        // Marketplace one-time content purchase → entitlement + earnings.
        if (session.metadata?.kind === "CONTENT_PURCHASE") {
          await fulfillContentPurchase(session);
          break;
        }

        // Creator-space membership → SpaceMembership + earnings.
        if (session.metadata?.kind === "SPACE_MEMBERSHIP") {
          await fulfillMembershipCheckout(session);
          break;
        }

        // Subscription upgrade path (pre-existing behavior).
        const stripeSubscriptionId = session.subscription as string;
        const stripeCustomerId = session.customer as string;
        const planName = (session.metadata?.planName || "GROWTH") as "STARTER" | "GROWTH";

        if (workspaceId && stripeSubscriptionId) {
          const before = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { stripeSubscriptionId: true } });
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              stripeSubscriptionId,
              stripeCustomerId,
              planName,
            },
          });
          // Redelivered events find the subscription already stored.
          if (before && before.stripeSubscriptionId !== stripeSubscriptionId) {
            await audit(workspaceId, WORKSPACE_AUDIT_ACTIONS.SUBSCRIPTION_STARTED, { plan: planDisplayName(planName) });
          }
          console.log(`Workspace ${workspaceId} upgraded to ${planName} plan via checkout success.`);
          // The first month of included credits arrives now, not at the next daily run.
          try {
            await runIncludedCreditsIfDue(workspaceId);
          } catch (err) {
            console.error(`Included credits for workspace ${workspaceId} failed:`, err);
          }
          // Video switched on during the trial came through as its own line.
          try {
            await linkVideoAddonAfterCheckout(workspaceId, stripeSubscriptionId);
          } catch (err) {
            console.error(`Video add-on link for workspace ${workspaceId} failed:`, err);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const affected = await prisma.workspace.findMany({ where: { stripeSubscriptionId: sub.id }, select: { id: true, planName: true } });
        for (const ws of affected) {
          await audit(ws.id, WORKSPACE_AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED, { plan: planDisplayName(ws.planName) });
          if (ws.planName !== "FREE") {
            await audit(ws.id, WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED, { from: planDisplayName(ws.planName), to: planDisplayName("FREE") });
          }
        }
        await prisma.workspace.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            stripeSubscriptionId: null,
            planName: "FREE",
            videoAddonItemId: null,
          },
        });
        // Mirror onto space memberships (no-op for workspace subs).
        await syncMembershipStatus(sub.id, "canceled", null);
        await syncStripeFromWebhook({ subscriptionId: sub.id, customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id });
        console.log(`Subscription ${sub.id} canceled.`);
        break;
      }

      // Admin console Stripe snapshot only; checkout.session.completed links the subscription.
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await syncStripeFromWebhook({ subscriptionId: sub.id, customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const planName = sub.status === "active"
          ? ((sub.metadata?.planName || "GROWTH") as "STARTER" | "GROWTH" | "FREE")
          : "FREE";
        const previous = (event.data as { previous_attributes?: { cancel_at_period_end?: boolean } }).previous_attributes;
        const affected = await prisma.workspace.findMany({ where: { stripeSubscriptionId: sub.id }, select: { id: true, planName: true } });
        for (const ws of affected) {
          for (const entry of subscriptionUpdateAudits({
            fromPlan: ws.planName,
            toPlan: planName,
            cancelAtPeriodEnd: sub.cancel_at_period_end === true,
            previousCancelAtPeriodEnd: previous?.cancel_at_period_end,
          })) {
            await audit(ws.id, WORKSPACE_AUDIT_ACTIONS[entry.action], entry.meta);
          }
        }
        await prisma.workspace.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            planName,
          },
        });
        // Mirror status onto creator subscriptions (no-op for workspace subs).
        const cpe = (sub as unknown as { current_period_end?: number }).current_period_end;
        await syncMembershipStatus(
          sub.id,
          sub.status,
          cpe ? new Date(cpe * 1000) : null,
        );
        await syncStripeFromWebhook({ subscriptionId: sub.id, customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id });
        console.log(`Subscription ${sub.id} status → ${sub.status}.`);
        break;
      }

      // Recurring membership payments → renewal earnings (first payment is
      // recorded at checkout; subscription_create invoices are skipped inside).
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await fulfillMembershipRenewal(invoice);
        await syncStripeFromWebhook({ customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id });
        break;
      }

      // A workspace subscription payment failed. Stripe retries on its own;
      // the audit entry tells admins to check the card.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const ws = customer ? await prisma.workspace.findUnique({ where: { stripeCustomerId: customer }, select: { id: true } }) : null;
        if (ws) {
          await audit(ws.id, WORKSPACE_AUDIT_ACTIONS.SUBSCRIPTION_PAYMENT_FAILED, {
            amountDue: invoice.amount_due ?? null,
            currency: invoice.currency ?? null,
          });
        }
        await syncStripeFromWebhook({ customerId: customer });
        break;
      }

      // Connect: keep our cached charges/payouts flags in sync.
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await syncConnectAccountFromStripe(account.id);
        console.log(`Connect account ${account.id} synced.`);
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
