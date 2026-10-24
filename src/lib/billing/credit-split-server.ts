/**
 * Server side of per-workspace credits (rules in ./credit-split): the
 * account's unassigned balance, moving credits, the monthly split, and
 * returning a deleted workspace's credits.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadCreditSummary } from "@/lib/ai-interview/console-server";
import { canMember } from "@/lib/permissions";
import { checkMove, checkSplit, movePlanCredits, splitPlanCredits, UNASSIGNED, type PlanBucket } from "./credit-split";

type Db = PrismaClient | Prisma.TransactionClient;

/** The account's unassigned credits (sum of its entries). */
export async function unassignedBalance(accountId: string, db: Db = prisma): Promise<number> {
  const agg = await db.accountCreditEntry.aggregate({ where: { billingAccountId: accountId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

async function workspaceBalance(workspaceId: string, db: Db): Promise<number> {
  const agg = await db.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

export type AccountCreditsRow = {
  id: string;
  name: string;
  slug: string;
  balance: number;
  /** Credits free to move: the balance less what open screening invites hold. */
  available: number;
  share: number | null;
  /** This month's share as the split works it out (null shares included). */
  monthly: number;
};

export type AccountCredits = {
  accountId: string;
  workspaces: AccountCreditsRow[];
  unassigned: number;
  unassignedMonthly: number;
  creditsPerMonth: number;
  splitSet: boolean;
};

/** Every workspace on the account with its balance and share, plus unassigned. Oldest workspace first. */
export async function loadAccountCredits(accountId: string, creditsPerMonth: number): Promise<AccountCredits> {
  const ws = await prisma.workspace.findMany({
    where: { billingAccountId: accountId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, planCreditShare: true },
  });
  const [summaries, unassigned] = await Promise.all([Promise.all(ws.map((w) => loadCreditSummary(w.id))), unassignedBalance(accountId)]);
  const split = splitPlanCredits(creditsPerMonth, ws.map((w) => ({ id: w.id, share: w.planCreditShare })));
  return {
    accountId,
    workspaces: ws.map((w, i) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      balance: summaries[i].balance,
      available: summaries[i].available,
      share: w.planCreditShare,
      monthly: split.perWorkspace.get(w.id) ?? 0,
    })),
    unassigned,
    unassignedMonthly: split.unassigned,
    creditsPerMonth,
    splitSet: ws.some((w) => w.planCreditShare !== null),
  };
}

export class CreditMoveError extends Error {}

/**
 * Moves `amount` credits between two workspaces on one account, or between a
 * workspace and unassigned (UNASSIGNED). Both sides are locked, so two moves
 * (or a move and a deletion) cannot both spend the same credits.
 */
export async function moveCredits(a: { accountId: string; from: string; to: string; amount: unknown; userId: string }): Promise<{ amount: number }> {
  return prisma.$transaction(async (tx) => {
    // Lock the account row, then the workspace rows, in a fixed order.
    await tx.$queryRaw`SELECT "id" FROM "BillingAccount" WHERE "id" = ${a.accountId} FOR UPDATE`;
    const ids = [a.from, a.to].filter((x) => x !== UNASSIGNED).sort();
    const ws = ids.length
      ? await tx.$queryRaw<{ id: string; name: string; billingAccountId: string | null; includedCreditsLeft: number; includedCreditsLastGrant: number }[]>`
          SELECT "id", "name", "billingAccountId", "includedCreditsLeft", "includedCreditsLastGrant"
          FROM "Workspace" WHERE "id" = ANY(${ids}) ORDER BY "id" FOR UPDATE`
      : [];
    if (ws.length !== ids.length || ws.some((w) => w.billingAccountId !== a.accountId)) {
      throw new CreditMoveError("Both workspaces must be on this billing account.");
    }
    const byId = new Map(ws.map((w) => [w.id, w]));
    const account = await tx.billingAccount.findUniqueOrThrow({ where: { id: a.accountId }, select: { planCreditsLeft: true, planCreditsLastGrant: true } });

    let available: number;
    let bucket: PlanBucket;
    if (a.from === UNASSIGNED) {
      available = await unassignedBalance(a.accountId, tx);
      bucket = { left: account.planCreditsLeft, lastGrant: account.planCreditsLastGrant };
    } else {
      const src = byId.get(a.from)!;
      const summary = await loadCreditSummary(src.id);
      // Re-read the balance inside the lock; open invites keep their hold.
      available = Math.max(0, (await workspaceBalance(src.id, tx)) - summary.held);
      bucket = { left: src.includedCreditsLeft, lastGrant: src.includedCreditsLastGrant };
    }
    const check = checkMove(a.from, a.to, a.amount, available);
    if (!check.ok) throw new CreditMoveError(check.error);
    const amount = check.amount;
    const m = movePlanCredits(bucket, amount);
    const fromName = a.from === UNASSIGNED ? "Unassigned" : byId.get(a.from)!.name;
    const toName = a.to === UNASSIGNED ? "Unassigned" : byId.get(a.to)!.name;

    if (a.from === UNASSIGNED) {
      await tx.accountCreditEntry.create({
        data: { billingAccountId: a.accountId, kind: "MOVE_OUT", amount: -amount, workspaceId: a.to, workspaceName: toName, userId: a.userId },
      });
      await tx.billingAccount.update({ where: { id: a.accountId }, data: { planCreditsLeft: m.from.left, planCreditsLastGrant: m.from.lastGrant } });
    } else {
      await tx.aIInterviewCreditLedger.create({
        data: { workspaceId: a.from, kind: "TRANSFER_OUT", amount: -amount, adminUserId: null, note: `Moved to ${toName}` },
      });
      await tx.workspace.update({ where: { id: a.from }, data: { includedCreditsLeft: m.from.left, includedCreditsLastGrant: m.from.lastGrant } });
    }

    if (a.to === UNASSIGNED) {
      await tx.accountCreditEntry.create({
        data: { billingAccountId: a.accountId, kind: "MOVE_IN", amount, workspaceId: a.from, workspaceName: fromName, userId: a.userId },
      });
      await tx.billingAccount.update({
        where: { id: a.accountId },
        data: { planCreditsLeft: { increment: m.add.left }, planCreditsLastGrant: { increment: m.add.lastGrant } },
      });
    } else {
      await tx.aIInterviewCreditLedger.create({ data: { workspaceId: a.to, kind: "TRANSFER_IN", amount, note: `Moved from ${fromName}` } });
      await tx.workspace.update({
        where: { id: a.to },
        data: { includedCreditsLeft: { increment: m.add.left }, includedCreditsLastGrant: { increment: m.add.lastGrant } },
      });
    }
    return { amount };
  });
}

/** Saves the monthly split. An empty split (all zero or blank) goes back to "the oldest workspace gets them all". */
export async function setPlanCreditSplit(accountId: string, entered: Record<string, unknown>, creditsPerMonth: number): Promise<void> {
  const ws = await prisma.workspace.findMany({ where: { billingAccountId: accountId }, select: { id: true } });
  const check = checkSplit(entered, ws.map((w) => w.id), creditsPerMonth);
  if (!check.ok) throw new CreditMoveError(check.error);
  const anySet = [...check.shares.values()].some((n) => n > 0);
  await prisma.$transaction(
    ws.map((w) => prisma.workspace.update({ where: { id: w.id }, data: { planCreditShare: anySet ? check.shares.get(w.id) ?? 0 : null } })),
  );
}

/**
 * Before a workspace is deleted: whatever it has left goes to the account's
 * unassigned credits, with its plan credits' expiry. Its own ledger rows go
 * with the workspace. Credits below zero are not carried over.
 */
export async function returnCreditsOnDelete(workspaceId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const [ws] = await tx.$queryRaw<{ id: string; name: string; billingAccountId: string | null; includedCreditsLeft: number; includedCreditsLastGrant: number }[]>`
      SELECT "id", "name", "billingAccountId", "includedCreditsLeft", "includedCreditsLastGrant"
      FROM "Workspace" WHERE "id" = ${workspaceId} FOR UPDATE`;
    if (!ws?.billingAccountId) return 0;
    const balance = await workspaceBalance(ws.id, tx);
    if (balance <= 0) return 0;
    const m = movePlanCredits({ left: ws.includedCreditsLeft, lastGrant: ws.includedCreditsLastGrant }, balance);
    await tx.accountCreditEntry.create({
      data: { billingAccountId: ws.billingAccountId, kind: "RETURNED", amount: balance, workspaceId: ws.id, workspaceName: ws.name, note: `${ws.name} was deleted` },
    });
    await tx.billingAccount.update({
      where: { id: ws.billingAccountId },
      data: { planCreditsLeft: { increment: m.add.left }, planCreditsLastGrant: { increment: m.add.lastGrant } },
    });
    // The workspace is about to go; zero it so a failed delete cannot count the credits twice.
    await tx.aIInterviewCreditLedger.create({ data: { workspaceId: ws.id, kind: "TRANSFER_OUT", amount: -balance, note: "Returned to unassigned before deletion" } });
    await tx.workspace.update({ where: { id: ws.id }, data: { includedCreditsLeft: 0, includedCreditsLastGrant: 0 } });
    return balance;
  });
}

/** Recent unassigned entries, newest first, for the Billing page. */
export async function recentUnassignedEntries(accountId: string, take = 10) {
  return prisma.accountCreditEntry.findMany({
    where: { billingAccountId: accountId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, kind: true, amount: true, workspaceName: true, note: true, createdAt: true },
  });
}

/**
 * Who may split and move an account's credits: its owner, or someone with
 * billing access in every one of its workspaces. Also lists the workspaces
 * the user can buy credits for.
 */
export async function creditAccess(accountId: string, userId: string): Promise<{ canSplit: boolean; canBuyFor: string[] }> {
  const [account, ws] = await Promise.all([
    prisma.billingAccount.findUnique({ where: { id: accountId }, select: { ownerUserId: true } }),
    prisma.workspace.findMany({
      where: { billingAccountId: accountId },
      select: { id: true, members: { where: { userId }, select: { role: true, permissions: true } } },
    }),
  ]);
  const manage = await Promise.all(ws.map(async (w) => (w.members[0] ? canMember(w.members[0], "billing:manage") : false)));
  const canBuyFor = ws.filter((_, i) => manage[i]).map((w) => w.id);
  const canSplit = ws.length > 0 && (account?.ownerUserId === userId ? canBuyFor.length > 0 : canBuyFor.length === ws.length);
  return { canSplit, canBuyFor };
}
