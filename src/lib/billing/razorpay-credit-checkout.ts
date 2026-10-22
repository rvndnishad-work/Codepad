/**
 * Razorpay Standard Checkout for a one-time AI screening credit pack, the
 * Razorpay twin of ./credit-checkout (Stripe). Used instead of Stripe for
 * credit packs whenever RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.
 *
 * 1. createRazorpayCreditOrder makes a Razorpay order for the pack's effective
 *    price. The workspace, pack and credit count ride in the order's notes,
 *    so no table of pending orders is needed.
 * 2. The browser opens the Razorpay modal with that order id.
 * 3. fulfillRazorpayCreditPayment checks the signature, re-reads the order
 *    and payment from Razorpay, and credits the workspace through the same
 *    ledger the Stripe webhook uses. The payment id is the idempotency key, so
 *    a repeated verify call never credits twice.
 *
 * Callers check billing:manage (create) or membership (verify) first.
 */
import "server-only";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/razorpay";
import { recordPurchase } from "@/lib/ai-interview/credits";
import { checkLowCredits } from "./credit-alerts";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { getEffectivePricing } from "./pricing-copy-store";
import { findCreditPack } from "./prices";

/** Packs are priced in US cents, so Razorpay charges USD in cents. */
export const RAZORPAY_CREDIT_CURRENCY = "USD";
/** Razorpay rejects orders below 100 of the smallest currency unit. */
export const RAZORPAY_MIN_AMOUNT = 100;
const KIND = "AI_CREDIT_PACK";

/** A problem the caller can show as is, with the HTTP status to answer with. */
export class RazorpayCheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type RazorpayCreditOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  description: string;
};

export async function createRazorpayCreditOrder(a: {
  workspace: { id: string; name: string; slug: string };
  packId: string;
  keyId: string;
}): Promise<RazorpayCreditOrder> {
  const pack = findCreditPack(await getEffectivePricing(), a.packId);
  if (!pack) throw new RazorpayCheckoutError("Unknown credit pack.");
  const amount = pack.priceCents;
  if (!Number.isInteger(amount) || amount < RAZORPAY_MIN_AMOUNT) {
    throw new RazorpayCheckoutError("This pack is priced below the minimum Razorpay can charge.");
  }

  const order = await getRazorpay().orders.create({
    amount,
    currency: RAZORPAY_CREDIT_CURRENCY,
    // Receipts are capped at 40 characters.
    receipt: `cr_${a.workspace.id.slice(-12)}_${Date.now().toString(36)}`,
    notes: {
      kind: KIND,
      workspaceId: a.workspace.id,
      workspaceSlug: a.workspace.slug,
      packId: pack.id,
      credits: String(pack.credits),
    },
  });

  // Prices are in US cents. An order in any other currency would charge the
  // same number in that currency's units (2900 as INR is Rs 29, not $29).
  if (order.currency !== RAZORPAY_CREDIT_CURRENCY || Number(order.amount) !== amount) {
    console.error(`[billing] Razorpay returned order ${order.id} as ${order.amount} ${order.currency}, expected ${amount} ${RAZORPAY_CREDIT_CURRENCY}.`);
    throw new RazorpayCheckoutError(
      "Card payments in US dollars are not switched on for this account yet. Nothing was charged.",
      503,
    );
  }

  return {
    order_id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    key_id: a.keyId,
    description: `${pack.credits} AI screening credits for "${a.workspace.name}"`,
  };
}

export type RazorpayFulfillResult = { credits: number; recorded: boolean };

export async function fulfillRazorpayCreditPayment(a: {
  workspaceId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<RazorpayFulfillResult> {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!verifyRazorpaySignature({ orderId: a.orderId, paymentId: a.paymentId, signature: a.signature, secret })) {
    throw new RazorpayCheckoutError("The payment signature did not match. Nothing was credited.");
  }

  // The signature proves Razorpay issued this pair. The order notes (written
  // by us at create time) say which workspace and how many credits.
  const rzp = getRazorpay();
  const order = await rzp.orders.fetch(a.orderId);
  const notes = (order.notes ?? {}) as Record<string, string | number | undefined>;
  if (notes.kind !== KIND || notes.workspaceId !== a.workspaceId) {
    throw new RazorpayCheckoutError("This payment belongs to a different workspace.", 403);
  }
  if (order.currency !== RAZORPAY_CREDIT_CURRENCY) {
    throw new RazorpayCheckoutError(`This order was in ${order.currency}, not ${RAZORPAY_CREDIT_CURRENCY}, so no credits were added.`);
  }
  const credits = Number(notes.credits);
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new RazorpayCheckoutError("This order has no credit pack on it.");
  }

  let payment = await rzp.payments.fetch(a.paymentId);
  if (payment.order_id !== a.orderId || Number(payment.amount) !== Number(order.amount) || payment.currency !== order.currency) {
    throw new RazorpayCheckoutError("The payment does not match the order. Nothing was credited.");
  }
  // Accounts with automatic capture off leave the payment authorized.
  if (payment.status === "authorized") {
    payment = await rzp.payments.capture(a.paymentId, Number(order.amount), order.currency);
  }
  if (payment.status !== "captured") {
    throw new RazorpayCheckoutError(`The payment is ${payment.status}, so no credits were added.`, 402);
  }

  const res = await recordPurchase({
    workspaceId: a.workspaceId,
    amount: credits,
    // The ledger's charge id column is provider neutral in practice: Razorpay
    // payment ids (pay_...) never collide with Stripe ones (pi_..., cs_...).
    stripeChargeId: a.paymentId,
    note: `Razorpay payment ${a.paymentId}, order ${a.orderId}, pack ${notes.packId ?? "?"}`,
  });
  if (res.recorded) {
    await writeWorkspaceAuditEntry({
      workspaceId: a.workspaceId,
      action: WORKSPACE_AUDIT_ACTIONS.CREDITS_PURCHASED,
      targetType: "workspace",
      targetId: a.workspaceId,
      meta: {
        credits,
        amount: Number(order.amount),
        currency: order.currency.toLowerCase(),
        packId: notes.packId ?? null,
        source: "razorpay",
      },
    });
    // Buying back above the threshold re-arms the low-credit email.
    await checkLowCredits(a.workspaceId);
  }
  return { credits, recorded: res.recorded };
}
