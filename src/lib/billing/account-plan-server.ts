/**
 * Server side of the new plans on the billing account (see ./account-plan for
 * the rules): the launch switch, copying the plan onto the account's
 * workspaces, and the monthly plan credits (split per workspace, ./credit-split).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findCatalogPlan, findTopUp } from "./catalog";
import { prepaidActive } from "./trial";
import { getEffectiveCatalog } from "./pricing-copy-store";
import { accountPlanActive, isSelfServePlan, planCreditsDue, planCreditStep, workspaceMirror } from "./account-plan";
import { splitPlanCredits } from "./credit-split";
import { unassignedBalance } from "./credit-split-server";

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

type Bucket = { left: number; lastGrant: number; balance: number };

/**
 * The monthly plan-credit step for one account, if due. Each workspace gets
 * its share of the month's credits (./credit-split), the rest stays
 * unassigned, and in each place plan credits older than a month expire. A
 * compare-and-set on the account's grant time means two callers cannot both
 * grant. Workspace rows use the INCLUDED and INCLUDED_EXPIRED kinds, so every
 * usage report and label already reads them.
 */
export async function runPlanCreditsIfDue(accountId: string, now: Date = new Date()): Promise<{ ran: boolean; expired: number; granted: number }> {
  const none = { ran: false, expired: 0, granted: 0 };
  const catalog = await getEffectiveCatalog();
  return prisma.$transaction(async (tx) => {
    const a = await tx.billingAccount.findUnique({
      where: { id: accountId },
      select: {
        planKey: true,
        planCadence: true,
        paidThrough: true,
        planCreditsLeft: true,
        planCreditsLastGrant: true,
        planCreditsGrantedAt: true,
        workspaces: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, planCreditShare: true, includedCreditsLeft: true, includedCreditsLastGrant: true },
        },
      },
    });
    if (!a || !a.workspaces.length) return none;
    const plan = isSelfServePlan(a.planKey) ? findCatalogPlan(catalog, a.planKey) : undefined;
    const active = accountPlanActive(a, now) && Boolean(plan);
    const anyLeft = a.planCreditsLeft > 0 || a.workspaces.some((w) => w.includedCreditsLeft > 0);
    if (!planCreditsDue({ active, creditsPerMonth: 0, planCreditsLeft: anyLeft ? 1 : 0, planCreditsLastGrant: 0, planCreditsGrantedAt: a.planCreditsGrantedAt, balance: 0 }, now)) {
      return none;
    }

    const claimed = await tx.billingAccount.updateMany({ where: { id: accountId, planCreditsGrantedAt: a.planCreditsGrantedAt }, data: { planCreditsGrantedAt: now } });
    if (!claimed.count) return none;

    const split = splitPlanCredits(active ? plan?.creditsPerMonth ?? 0 : 0, a.workspaces.map((w) => ({ id: w.id, share: w.planCreditShare })));
    const stepFor = (b: Bucket, grant: number) =>
      planCreditStep({ active, creditsPerMonth: grant, planCreditsLeft: b.left, planCreditsLastGrant: b.lastGrant, planCreditsGrantedAt: a.planCreditsGrantedAt, balance: b.balance });
    const label = `${plan?.name ?? "Plan"} credits for the month`;
    let expired = 0;
    let granted = 0;

    for (const w of a.workspaces) {
      const grant = split.perWorkspace.get(w.id) ?? 0;
      if (grant <= 0 && w.includedCreditsLeft <= 0) continue;
      const bal = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId: w.id }, _sum: { amount: true } });
      const step = stepFor({ left: w.includedCreditsLeft, lastGrant: w.includedCreditsLastGrant, balance: bal._sum.amount ?? 0 }, grant);
      await tx.workspace.update({ where: { id: w.id }, data: { includedCreditsLeft: step.left, includedCreditsLastGrant: step.lastGrant } });
      if (step.expire > 0) await tx.aIInterviewCreditLedger.create({ data: { workspaceId: w.id, kind: "INCLUDED_EXPIRED", amount: -step.expire, note: "Plan credits older than one month" } });
      if (step.grant > 0) await tx.aIInterviewCreditLedger.create({ data: { workspaceId: w.id, kind: "INCLUDED", amount: step.grant, note: label } });
      expired += step.expire;
      granted += step.grant;
    }

    if (split.unassigned > 0 || a.planCreditsLeft > 0) {
      const step = stepFor({ left: a.planCreditsLeft, lastGrant: a.planCreditsLastGrant, balance: await unassignedBalance(accountId, tx) }, split.unassigned);
      await tx.billingAccount.update({ where: { id: accountId }, data: { planCreditsLeft: step.left, planCreditsLastGrant: step.lastGrant } });
      if (step.expire > 0) await tx.accountCreditEntry.create({ data: { billingAccountId: accountId, kind: "PLAN_EXPIRED", amount: -step.expire, note: "Plan credits older than one month" } });
      if (step.grant > 0) await tx.accountCreditEntry.create({ data: { billingAccountId: accountId, kind: "PLAN", amount: step.grant, note: `${label}, not split to a workspace` } });
      expired += step.expire;
      granted += step.grant;
    }
    return { ran: true, expired, granted };
  });
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
