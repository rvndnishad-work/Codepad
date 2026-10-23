/**
 * Server side of the new plans on the billing account (see ./account-plan for
 * the rules): the launch switch, copying the plan onto the account's
 * workspaces, the monthly plan credits, and spending them before bought ones.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findCatalogPlan, findTopUp } from "./catalog";
import { prepaidActive } from "./trial";
import { getEffectiveCatalog } from "./pricing-copy-store";
import { accountPlanActive, isSelfServePlan, planCreditsDue, planCreditStep, workspaceMirror } from "./account-plan";

type Db = PrismaClient | Prisma.TransactionClient;

// ── Launch switch ────────────────────────────────────────────────────────

/**
 * Whether customers can buy the new plans. A SiteSetting that is off unless
 * an admin turns it on (Admin > Pricing), and off on any read error, unlike
 * the feature switches, which fail open.
 */
export const NEW_PLANS_SETTING = "new_plans_checkout";

export async function newPlansEnabled(): Promise<boolean> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: NEW_PLANS_SETTING } });
    return row?.value === "on";
  } catch {
    return false;
  }
}

export async function setNewPlansEnabled(on: boolean): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: NEW_PLANS_SETTING },
    create: { key: NEW_PLANS_SETTING, value: on ? "on" : "off" },
    update: { value: on ? "on" : "off" },
  });
}

// ── Mirror ───────────────────────────────────────────────────────────────

/**
 * Copies the account's plan onto each of its workspaces (Free once it has
 * lapsed). Workspaces still on a Stripe subscription keep it. Returns how
 * many workspaces were written.
 */
export async function syncAccountWorkspaces(accountId: string, now: Date = new Date(), db: Db = prisma): Promise<number> {
  const account = await db.billingAccount.findUnique({ where: { id: accountId }, select: { planKey: true, planCadence: true, paidThrough: true } });
  if (!account?.planKey) return 0;
  const plan = findCatalogPlan(await getEffectiveCatalog(), account.planKey);
  const mirror = workspaceMirror(account, plan, now);
  const res = await db.workspace.updateMany({
    // A lapsed plan never wakes a workspace the switch-over has paused.
    where: { billingAccountId: accountId, stripeSubscriptionId: null, ...(mirror.planName === "FREE" ? { planName: { not: "PAUSED" } } : {}) },
    data: mirror,
  });
  return res.count;
}

// ── Monthly plan credits ─────────────────────────────────────────────────

/** The workspace ledger rows for the account are written under: its oldest. */
async function anchorWorkspace(accountId: string, db: Db): Promise<string | null> {
  const ws = await db.workspace.findFirst({ where: { billingAccountId: accountId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  return ws?.id ?? null;
}

/**
 * The monthly plan-credit step for one account, if due: credits older than a
 * month expire and this month's arrive. A compare-and-set on the grant time
 * means two callers cannot both grant. Rows use the INCLUDED and
 * INCLUDED_EXPIRED kinds, so every usage report and label already reads them.
 */
export async function runPlanCreditsIfDue(accountId: string, now: Date = new Date()): Promise<{ ran: boolean; expired: number; granted: number }> {
  const none = { ran: false, expired: 0, granted: 0 };
  const catalog = await getEffectiveCatalog();
  return prisma.$transaction(async (tx) => {
    const a = await tx.billingAccount.findUnique({
      where: { id: accountId },
      select: { planKey: true, planCadence: true, paidThrough: true, planCreditsLeft: true, planCreditsLastGrant: true, planCreditsGrantedAt: true },
    });
    if (!a) return none;
    const plan = isSelfServePlan(a.planKey) ? findCatalogPlan(catalog, a.planKey) : undefined;
    const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { billingAccountId: accountId }, _sum: { amount: true } });
    const state = {
      active: accountPlanActive(a, now) && Boolean(plan),
      creditsPerMonth: plan?.creditsPerMonth ?? 0,
      planCreditsLeft: a.planCreditsLeft,
      planCreditsLastGrant: a.planCreditsLastGrant,
      planCreditsGrantedAt: a.planCreditsGrantedAt,
      balance: agg._sum.amount ?? 0,
    };
    if (!planCreditsDue(state, now)) return none;
    const workspaceId = await anchorWorkspace(accountId, tx);
    if (!workspaceId) return none;

    const step = planCreditStep(state);
    const claimed = await tx.billingAccount.updateMany({
      where: { id: accountId, planCreditsGrantedAt: a.planCreditsGrantedAt },
      data: { planCreditsLeft: step.left, planCreditsLastGrant: step.lastGrant, planCreditsGrantedAt: now },
    });
    if (!claimed.count) return none;
    if (step.expire > 0) {
      await tx.aIInterviewCreditLedger.create({ data: { workspaceId, kind: "INCLUDED_EXPIRED", amount: -step.expire, note: "Plan credits older than one month" } });
    }
    if (step.grant > 0) {
      await tx.aIInterviewCreditLedger.create({ data: { workspaceId, kind: "INCLUDED", amount: step.grant, note: `${plan?.name ?? "Plan"} credits for the month` } });
    }
    return { ran: true, expired: step.expire, granted: step.grant };
  });
}

// ── Spending ─────────────────────────────────────────────────────────────

/**
 * After a charge of `cost`, of which `fromIncluded` came out of the
 * workspace's old included credits: takes the rest out of the account's plan
 * credits first, since those can expire and bought ones cannot. Pass the
 * workspace's account as read in the charging transaction.
 */
export async function usePlanCredits(
  tx: Prisma.TransactionClient,
  account: { id: string; planCreditsLeft: number } | null | undefined,
  cost: number,
  fromIncluded: number,
): Promise<number> {
  const rest = cost - Math.max(0, fromIncluded);
  if (rest <= 0 || !account || account.planCreditsLeft <= 0) return 0;
  const take = Math.min(rest, account.planCreditsLeft);
  const res = await tx.billingAccount.updateMany({ where: { id: account.id, planCreditsLeft: { gte: take } }, data: { planCreditsLeft: { decrement: take } } });
  return res.count ? take : 0;
}

/** After an admin lowers a balance: plan credits left can never be more than the pool. */
export async function clampPlanCredits(tx: Prisma.TransactionClient, workspaceId: string, balance: number): Promise<void> {
  const ws = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { billingAccount: { select: { id: true, planCreditsLeft: true } } } });
  const acc = ws?.billingAccount;
  const cap = Math.max(0, balance);
  if (acc && acc.planCreditsLeft > cap) await tx.billingAccount.update({ where: { id: acc.id }, data: { planCreditsLeft: cap } });
}

// ── Top-ups ──────────────────────────────────────────────────────────────

/**
 * A top-up pack (catalogue id "topup-…") for a workspace, if it may buy one:
 * the new plans must be on sale and the workspace on a paid-up plan or a
 * pilot. Throws a plain Error with the reason otherwise; undefined for an
 * id that is not a top-up.
 */
export async function topUpForWorkspace(workspaceId: string, packId: string, now: Date = new Date()) {
  if (!packId.startsWith("topup-")) return undefined;
  if (!(await newPlansEnabled())) throw new Error("Top-ups are not on sale yet.");
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { planName: true, stripeSubscriptionId: true, prepaidThrough: true, prepaidSeats: true, prepaidCadence: true },
  });
  if (!ws || !prepaidActive(ws, now)) throw new Error("Top-ups are for workspaces on a paid plan or a pilot. Choose a plan first.");
  const pack = findTopUp(await getEffectiveCatalog(), packId);
  if (!pack) throw new Error("Unknown credit pack.");
  return pack;
}
