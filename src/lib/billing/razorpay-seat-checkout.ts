/**
 * Growth seats paid once through Razorpay (prepaid), for one month or a year.
 *
 * 1. createRazorpaySeatOrder prices seats x the Growth seat price for the
 *    period (admin overrides apply), converts it to rupees at the day's rate
 *    and makes a Razorpay order with the seats, period and rate in its notes.
 * 2. fulfillRazorpaySeatPayment verifies the payment (shared checks) and sets
 *    the workspace to Growth with prepaidThrough moved forward by the period
 *    and prepaidSeats set. The payment id is stored, so a repeated verify
 *    call never extends twice.
 *
 * A workspace with a live Stripe subscription is refused: it already pays.
 * Callers check billing:manage first.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { runIncludedCreditsIfDue } from "./included-credits-server";
import { oldPricingClosed } from "./switchover-server";
import { getEffectivePricing } from "./pricing-copy-store";
import { getUsdInrRate } from "./fx";
import { usdCentsToInrPaise } from "./fx-math";
import { formatUsd } from "./plans";
import { planDisplayName } from "./usage";
import { extendPrepaid, parseCadence, prepaidChargeCents, validSeatCount, type PrepaidCadence } from "./prepaid";
import {
  RAZORPAY_CREDIT_CURRENCY,
  RAZORPAY_MIN_AMOUNT,
  RazorpayCheckoutError,
  verifyRazorpayOrderPayment,
  type RazorpayCreditOrder,
} from "./razorpay-credit-checkout";

const KIND = "GROWTH_SEATS";

/** Members plus unexpired pending invites: what a seat purchase must cover. */
async function seatsInUse(workspaceId: string, now: Date): Promise<number> {
  const [members, invites] = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.workspaceInvite.count({ where: { workspaceId, acceptedAt: null, expiresAt: { gt: now } } }),
  ]);
  return members + invites;
}

export async function quoteSeats(a: { workspaceId: string; seats: unknown; cadence: unknown; now?: Date }) {
  const now = a.now ?? new Date();
  const cadence: PrepaidCadence = parseCadence(a.cadence);
  const used = await seatsInUse(a.workspaceId, now);
  const seats = validSeatCount(a.seats, used);
  if (seats === null) {
    throw new RazorpayCheckoutError(`Choose at least ${Math.max(1, used)} seats, one for everyone in or invited to the workspace.`);
  }
  const pricing = await getEffectivePricing();
  const usdCents = prepaidChargeCents(seats, cadence, pricing.growth);
  const fx = await getUsdInrRate();
  if (!fx) throw new RazorpayCheckoutError("Could not get today's exchange rate, so checkout cannot open. Try again in a few minutes.", 503);
  const paise = usdCentsToInrPaise(usdCents, fx.rate);
  if (paise < RAZORPAY_MIN_AMOUNT) throw new RazorpayCheckoutError("This plan is priced below the minimum Razorpay can charge.");
  return { seats, cadence, usdCents, paise, fx };
}

export async function createRazorpaySeatOrder(a: {
  workspace: { id: string; name: string; slug: string; stripeSubscriptionId: string | null; planName: string };
  seats: unknown;
  cadence: unknown;
  keyId: string;
}): Promise<RazorpayCreditOrder> {
  if (a.workspace.stripeSubscriptionId) {
    throw new RazorpayCheckoutError("This workspace already pays through a Stripe subscription. Manage it from Billing.", 409);
  }
  if (a.workspace.planName === "ENTERPRISE") throw new RazorpayCheckoutError("Enterprise plans are billed by contract.", 409);
  if (await oldPricingClosed()) throw new RazorpayCheckoutError("Growth by the seat can no longer be bought or renewed. Choose Basic, Growth or Teams on Billing.", 409);
  const q = await quoteSeats({ workspaceId: a.workspace.id, seats: a.seats, cadence: a.cadence });

  const order = await getRazorpay().orders.create({
    amount: q.paise,
    currency: RAZORPAY_CREDIT_CURRENCY,
    receipt: `gr_${a.workspace.id.slice(-12)}_${Date.now().toString(36)}`,
    notes: {
      kind: KIND,
      workspaceId: a.workspace.id,
      workspaceSlug: a.workspace.slug,
      seats: String(q.seats),
      cadence: q.cadence,
      usdCents: String(q.usdCents),
      usdInrRate: String(q.fx.rate),
      rateSource: q.fx.source,
    },
  });
  if (order.currency !== RAZORPAY_CREDIT_CURRENCY || Number(order.amount) !== q.paise) {
    console.error(`[billing] Razorpay returned seat order ${order.id} as ${order.amount} ${order.currency}, expected ${q.paise} ${RAZORPAY_CREDIT_CURRENCY}.`);
    throw new RazorpayCheckoutError("The payment provider returned an unexpected amount. Nothing was charged.", 502);
  }
  const period = q.cadence === "annual" ? "1 year" : "1 month";
  return {
    order_id: order.id,
    amount: q.paise,
    currency: RAZORPAY_CREDIT_CURRENCY,
    key_id: a.keyId,
    description: `Growth, ${q.seats} seat${q.seats === 1 ? "" : "s"} for ${period} (${formatUsd(q.usdCents)})`,
  };
}

export type SeatFulfillResult = { seats: number; cadence: PrepaidCadence; paidThrough: string; applied: boolean };

export async function fulfillRazorpaySeatPayment(a: {
  workspaceId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  now?: Date;
}): Promise<SeatFulfillResult> {
  const { order, notes } = await verifyRazorpayOrderPayment({ ...a, kind: KIND });
  const seats = Number(notes.seats);
  const cadence = parseCadence(notes.cadence);
  if (!Number.isInteger(seats) || seats <= 0) throw new RazorpayCheckoutError("This order has no seats on it.");
  const now = a.now ?? new Date();

  const ws = await prisma.workspace.findUnique({
    where: { id: a.workspaceId },
    select: { planName: true, prepaidThrough: true, prepaidLastPaymentId: true },
  });
  if (!ws) throw new RazorpayCheckoutError("Workspace not found.", 404);
  if (ws.prepaidLastPaymentId === a.paymentId && ws.prepaidThrough) {
    return { seats, cadence, paidThrough: ws.prepaidThrough.toISOString(), applied: false };
  }

  const paidThrough = extendPrepaid(ws.prepaidThrough, now, cadence);
  // Guarded on the last payment id, so two verify calls racing for the same
  // payment cannot both extend.
  const claimed = await prisma.workspace.updateMany({
    where: { id: a.workspaceId, prepaidLastPaymentId: ws.prepaidLastPaymentId },
    data: {
      planName: "GROWTH",
      prepaidThrough: paidThrough,
      prepaidSeats: seats,
      prepaidCadence: cadence,
      prepaidLastPaymentId: a.paymentId,
      prepaidReminderAt: null,
    },
  });
  if (!claimed.count) {
    const again = await prisma.workspace.findUnique({ where: { id: a.workspaceId }, select: { prepaidThrough: true } });
    return { seats, cadence, paidThrough: (again?.prepaidThrough ?? paidThrough).toISOString(), applied: false };
  }

  const meta = {
    plan: "Growth",
    seats,
    cadence,
    paidThrough: paidThrough.toISOString(),
    amount: Number(order.amount),
    currency: order.currency.toLowerCase(),
    usdCents: Number(notes.usdCents) || null,
    paymentId: a.paymentId,
    source: "razorpay",
  };
  const audit = (action: (typeof WORKSPACE_AUDIT_ACTIONS)[keyof typeof WORKSPACE_AUDIT_ACTIONS], m: Record<string, unknown>) =>
    writeWorkspaceAuditEntry({ workspaceId: a.workspaceId, action, targetType: "workspace", targetId: a.workspaceId, meta: m });
  await audit(WORKSPACE_AUDIT_ACTIONS.SUBSCRIPTION_STARTED, { ...meta, renewal: Boolean(ws.prepaidThrough && ws.prepaidThrough > now) });
  if (ws.planName !== "GROWTH") {
    await audit(WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED, { from: planDisplayName(ws.planName), to: "Growth", source: "razorpay" });
  }
  // The first month of included credits arrives now, not at the next daily run.
  try {
    await runIncludedCreditsIfDue(a.workspaceId, now);
  } catch (err) {
    console.error(`[billing] included credits after prepaid Growth for ${a.workspaceId} failed:`, err);
  }
  return { seats, cadence, paidThrough: paidThrough.toISOString(), applied: true };
}
