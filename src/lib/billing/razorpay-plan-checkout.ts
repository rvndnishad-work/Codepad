/**
 * The new plans (Basic, Growth, Teams) paid once through Razorpay for a month
 * or a year, on the billing account.
 *
 * 1. quotePlan checks the account can take the plan (workspace count, seats
 *    in each workspace, nothing else paying) and prices it: the catalogue
 *    price for the period, less the unused part of the current plan on an
 *    upgrade (see planChange). createRazorpayPlanOrder makes the order in
 *    rupees at the day's rate with all of that in its notes.
 * 2. fulfillRazorpayPlanPayment verifies the payment, sets the plan and
 *    paid-until date on the account, copies it to every workspace on the
 *    account, and grants plan credits: a full month on a new plan, the
 *    difference between the plans on an upgrade. The payment id is stored,
 *    so a repeated verify never applies twice.
 *
 * Callers check billing:manage first. Orders also need the launch switch on.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { CATALOG_PLANS, findCatalogPlan, formatCents, planChargeCents, type CatalogCadence, type SelfServePlanKey } from "./catalog";
import { getEffectiveCatalog } from "./pricing-copy-store";
import { getUsdInrRate } from "./fx";
import { usdCentsToInrPaise } from "./fx-math";
import { isPilot } from "./pilot";
import { planDisplayName } from "./usage";
import {
  accountPlanActive,
  amountDueCents,
  isSelfServePlan,
  nextPaidThrough,
  parsePlanCadence,
  planChange,
  upgradeCredits,
  type PlanChange,
} from "./account-plan";
import { newPlansEnabled, runPlanCreditsIfDue, syncAccountWorkspaces } from "./account-plan-server";
import {
  RAZORPAY_CREDIT_CURRENCY,
  RAZORPAY_MIN_AMOUNT,
  RazorpayCheckoutError,
  verifyRazorpayOrderPayment,
  type RazorpayCreditOrder,
} from "./razorpay-credit-checkout";

const KIND = "ACCOUNT_PLAN";
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export type PlanQuote = {
  planKey: SelfServePlanKey;
  cadence: CatalogCadence;
  change: PlanChange;
  /** The period price, the credit off it, and what is charged, in US cents. */
  listCents: number;
  creditCents: number;
  usdCents: number;
  accountId: string;
};

/**
 * Everything that must hold before a plan can be bought for the workspace's
 * account. Throws RazorpayCheckoutError with the reason otherwise.
 */
export async function quotePlan(a: { workspaceId: string; planKey: unknown; cadence: unknown; now?: Date }): Promise<PlanQuote> {
  const now = a.now ?? new Date();
  if (!isSelfServePlan(a.planKey)) throw new RazorpayCheckoutError("Choose Basic, Growth or Teams.");
  const planKey = a.planKey;
  const cadence = parsePlanCadence(a.cadence);

  const ws = await prisma.workspace.findUnique({
    where: { id: a.workspaceId },
    select: {
      planName: true,
      stripeSubscriptionId: true,
      prepaidThrough: true,
      prepaidCadence: true,
      billingAccount: {
        select: {
          id: true,
          planKey: true,
          planCadence: true,
          paidThrough: true,
          workspaces: { select: { id: true, name: true, stripeSubscriptionId: true } },
        },
      },
    },
  });
  if (!ws) throw new RazorpayCheckoutError("Workspace not found.", 404);
  const account = ws.billingAccount;
  if (!account) throw new RazorpayCheckoutError("This workspace has no billing account yet. Contact support.", 409);
  if (ws.planName === "ENTERPRISE") throw new RazorpayCheckoutError("Enterprise plans are billed by contract.", 409);
  if (account.workspaces.some((w) => w.stripeSubscriptionId)) {
    throw new RazorpayCheckoutError("A workspace on this account still pays through a Stripe subscription. Cancel it from Billing first, or ask us to move it.", 409);
  }
  // Old prepaid Growth (per seat) runs to its end; the move to the new plans comes with notice.
  if (!account.planKey && ws.prepaidThrough && ws.prepaidThrough > now && !isPilot(ws)) {
    throw new RazorpayCheckoutError(`This workspace has Growth paid until ${fmtDate(ws.prepaidThrough)}. You can choose a new plan when it ends.`, 409);
  }

  const catalog = await getEffectiveCatalog();
  const plan = findCatalogPlan(catalog, planKey);
  if (!plan) throw new RazorpayCheckoutError("That plan is not on sale.", 409);

  if (account.workspaces.length > plan.workspaceLimit) {
    throw new RazorpayCheckoutError(
      `${plan.name} covers ${plan.workspaceLimit} ${plan.workspaceLimit === 1 ? "workspace" : "workspaces"}, and this account has ${account.workspaces.length}. Choose a bigger plan.`,
      409,
    );
  }
  const ids = account.workspaces.map((w) => w.id);
  const [members, invites] = await Promise.all([
    prisma.workspaceMember.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids } }, _count: { _all: true } }),
    prisma.workspaceInvite.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids }, acceptedAt: null, expiresAt: { gt: now } }, _count: { _all: true } }),
  ]);
  const used = new Map<string, number>();
  for (const r of [...members, ...invites]) used.set(r.workspaceId, (used.get(r.workspaceId) ?? 0) + r._count._all);
  const over = account.workspaces.find((w) => (used.get(w.id) ?? 0) > plan.seatsPerWorkspace);
  if (over) {
    throw new RazorpayCheckoutError(
      `${plan.name} allows ${plan.seatsPerWorkspace} people in each workspace, and ${over.name} has ${used.get(over.id)} members and invites. Remove some or choose a bigger plan.`,
      409,
    );
  }

  const current = isSelfServePlan(account.planKey) ? findCatalogPlan(catalog, account.planKey) : undefined;
  const currentPeriodCents = current ? planChargeCents(current, parsePlanCadence(account.planCadence)) : null;
  const change = planChange(account, planKey, cadence, currentPeriodCents, now);
  if (change.kind === "blocked") throw new RazorpayCheckoutError(change.reason, 409);

  const listCents = planChargeCents(plan, cadence);
  const usdCents = amountDueCents(listCents, change);
  return { planKey, cadence, change, listCents, creditCents: listCents - usdCents, usdCents, accountId: account.id };
}

export async function createRazorpayPlanOrder(a: {
  workspace: { id: string; slug: string };
  planKey: unknown;
  cadence: unknown;
  keyId: string;
}): Promise<RazorpayCreditOrder & { quote: PlanQuote }> {
  if (!(await newPlansEnabled())) throw new RazorpayCheckoutError("The new plans are not on sale yet.", 403);
  const q = await quotePlan({ workspaceId: a.workspace.id, planKey: a.planKey, cadence: a.cadence });
  const fx = await getUsdInrRate();
  if (!fx) throw new RazorpayCheckoutError("Could not get today's exchange rate, so checkout cannot open. Try again in a few minutes.", 503);
  const paise = usdCentsToInrPaise(q.usdCents, fx.rate);
  if (paise < RAZORPAY_MIN_AMOUNT) throw new RazorpayCheckoutError("This plan is priced below the minimum Razorpay can charge.");

  const order = await getRazorpay().orders.create({
    amount: paise,
    currency: RAZORPAY_CREDIT_CURRENCY,
    receipt: `pl_${a.workspace.id.slice(-12)}_${Date.now().toString(36)}`,
    notes: {
      kind: KIND,
      workspaceId: a.workspace.id,
      workspaceSlug: a.workspace.slug,
      accountId: q.accountId,
      planKey: q.planKey,
      cadence: q.cadence,
      change: q.change.kind,
      listCents: String(q.listCents),
      creditCents: String(q.creditCents),
      usdCents: String(q.usdCents),
      usdInrRate: String(fx.rate),
      rateSource: fx.source,
    },
  });
  if (order.currency !== RAZORPAY_CREDIT_CURRENCY || Number(order.amount) !== paise) {
    console.error(`[billing] Razorpay returned plan order ${order.id} as ${order.amount} ${order.currency}, expected ${paise} ${RAZORPAY_CREDIT_CURRENCY}.`);
    throw new RazorpayCheckoutError("The payment provider returned an unexpected amount. Nothing was charged.", 502);
  }
  const name = CATALOG_PLANS[q.planKey].name;
  const period = q.cadence === "annual" ? "1 year" : "1 month";
  return {
    order_id: order.id,
    amount: paise,
    currency: RAZORPAY_CREDIT_CURRENCY,
    key_id: a.keyId,
    description: `${name} for ${period} (${formatCents(q.usdCents)}${q.creditCents ? `, ${formatCents(q.creditCents)} off for your current plan` : ""})`,
    quote: q,
  };
}

export type PlanFulfillResult = { planKey: SelfServePlanKey; cadence: CatalogCadence; paidThrough: string; applied: boolean; creditsGranted: number };

export async function fulfillRazorpayPlanPayment(a: {
  workspaceId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  now?: Date;
}): Promise<PlanFulfillResult> {
  const { order, notes } = await verifyRazorpayOrderPayment({ ...a, kind: KIND });
  const planKey = notes.planKey;
  if (!isSelfServePlan(planKey)) throw new RazorpayCheckoutError("This order has no plan on it.");
  const cadence = parsePlanCadence(notes.cadence);
  const now = a.now ?? new Date();

  const ws = await prisma.workspace.findUnique({
    where: { id: a.workspaceId },
    select: {
      planName: true,
      billingAccount: { select: { id: true, planKey: true, planCadence: true, paidThrough: true, lastPaymentId: true } },
    },
  });
  const acc = ws?.billingAccount;
  if (!ws || !acc) throw new RazorpayCheckoutError("Workspace not found.", 404);
  // The workspace may have moved account since the order was made; the credit belongs to the account that paid.
  if (notes.accountId !== acc.id) throw new RazorpayCheckoutError("This payment was for a different billing account. Contact support with your Razorpay payment id.", 409);
  if (acc.lastPaymentId === a.paymentId && acc.paidThrough) {
    return { planKey, cadence, paidThrough: acc.paidThrough.toISOString(), applied: false, creditsGranted: 0 };
  }

  const catalog = await getEffectiveCatalog();
  const plan = findCatalogPlan(catalog, planKey);
  if (!plan) throw new RazorpayCheckoutError("That plan is not on sale.", 409);
  const wasActive = accountPlanActive(acc, now);
  const renewing = wasActive && acc.planKey === planKey && parsePlanCadence(acc.planCadence) === cadence;
  const from = wasActive && isSelfServePlan(acc.planKey) ? findCatalogPlan(catalog, acc.planKey) : undefined;
  const upgrade = wasActive && !renewing && Boolean(from);
  const extra = upgrade && from ? upgradeCredits(from.creditsPerMonth, plan.creditsPerMonth) : 0;
  const paidThrough = nextPaidThrough(acc.paidThrough, now, cadence, renewing);

  const applied = await prisma.$transaction(async (tx) => {
    // Guarded on the last payment id, so two verify calls racing for the same payment cannot both apply.
    const claimed = await tx.billingAccount.updateMany({
      where: { id: acc.id, lastPaymentId: acc.lastPaymentId },
      data: {
        planKey,
        planCadence: cadence,
        paidThrough,
        lastPaymentId: a.paymentId,
        reminderAt: null,
        // A new plan gets its first month now (the step below runs at once);
        // an upgrade keeps its grant date and the paying workspace gets the difference.
        ...(wasActive ? {} : { planCreditsGrantedAt: null }),
      },
    });
    if (!claimed.count) return false;
    if (extra) {
      // The extra credits go to the workspace that paid; owners can move them from there.
      await tx.aIInterviewCreditLedger.create({
        data: { workspaceId: a.workspaceId, kind: "INCLUDED", amount: extra, note: `Moved up to ${plan.name}: the rest of this month's credits` },
      });
      await tx.workspace.update({
        where: { id: a.workspaceId },
        data: { includedCreditsLeft: { increment: extra }, includedCreditsLastGrant: { increment: extra } },
      });
    }
    await syncAccountWorkspaces(acc.id, now, tx);
    return true;
  });
  if (!applied) {
    const again = await prisma.billingAccount.findUnique({ where: { id: acc.id }, select: { paidThrough: true } });
    return { planKey, cadence, paidThrough: (again?.paidThrough ?? paidThrough).toISOString(), applied: false, creditsGranted: 0 };
  }

  let granted = extra;
  try {
    granted += (await runPlanCreditsIfDue(acc.id, now)).granted;
  } catch (err) {
    console.error(`[billing] plan credits after a ${planKey} payment for account ${acc.id} failed:`, err);
  }

  const meta = {
    plan: plan.name,
    cadence,
    paidThrough: paidThrough.toISOString(),
    amount: Number(order.amount),
    currency: order.currency.toLowerCase(),
    usdCents: Number(notes.usdCents) || null,
    creditCents: Number(notes.creditCents) || 0,
    paymentId: a.paymentId,
    billingAccountId: acc.id,
    source: "razorpay",
  };
  const audit = (action: (typeof WORKSPACE_AUDIT_ACTIONS)[keyof typeof WORKSPACE_AUDIT_ACTIONS], m: Record<string, unknown>) =>
    writeWorkspaceAuditEntry({ workspaceId: a.workspaceId, action, targetType: "workspace", targetId: a.workspaceId, meta: m });
  await audit(WORKSPACE_AUDIT_ACTIONS.SUBSCRIPTION_STARTED, { ...meta, renewal: renewing, upgrade });
  if (ws.planName !== planKey) {
    await audit(WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED, { from: planDisplayName(ws.planName), to: plan.name, source: "razorpay" });
  }
  return { planKey, cadence, paidThrough: paidThrough.toISOString(), applied: true, creditsGranted: granted };
}
