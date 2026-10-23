/**
 * The AI credit pool. Credits belong to a billing account, and every
 * workspace on the account draws from the same balance. Ledger rows still
 * name the workspace that earned or spent them, so usage reports stay per
 * workspace; only the balance is per account.
 *
 * Writers keep setting just `workspaceId`: a database trigger copies the
 * workspace's account onto each new row (see the billing_accounts migration).
 * Readers that want "how many credits can this workspace spend" use the
 * helpers here instead of summing by workspaceId.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

/** Ledger rows in the pool `workspaceId` draws from, in one query (no lookup first). */
export function poolWhere(workspaceId: string): Prisma.AIInterviewCreditLedgerWhereInput {
  return { billingAccount: { workspaces: { some: { id: workspaceId } } } };
}

/** The balance a workspace can spend: the sum of its account's ledger. */
export async function poolBalance(workspaceId: string, db: Db = prisma): Promise<number> {
  const agg = await db.aIInterviewCreditLedger.aggregate({ where: poolWhere(workspaceId), _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/** Pool balances for many workspaces at once, keyed by workspace id (0 when none). */
export async function poolBalances(workspaceIds: string[], db: Db = prisma): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!workspaceIds.length) return out;
  const ws = await db.workspace.findMany({ where: { id: { in: workspaceIds } }, select: { id: true, billingAccountId: true } });
  const accounts = [...new Set(ws.map((w) => w.billingAccountId).filter((v): v is string => Boolean(v)))];
  const sums = accounts.length
    ? await db.aIInterviewCreditLedger.groupBy({ by: ["billingAccountId"], where: { billingAccountId: { in: accounts } }, _sum: { amount: true } })
    : [];
  const byAccount = new Map(sums.map((s) => [s.billingAccountId, s._sum.amount ?? 0]));
  for (const id of workspaceIds) {
    const acct = ws.find((w) => w.id === id)?.billingAccountId;
    out.set(id, acct ? byAccount.get(acct) ?? 0 : 0);
  }
  return out;
}

/** The other workspaces sharing a workspace's pool (empty while accounts are 1:1). */
export async function poolSiblings(workspaceId: string, db: Db = prisma): Promise<{ id: string; name: string; slug: string }[]> {
  return db.workspace.findMany({
    where: { billingAccount: { workspaces: { some: { id: workspaceId } } }, NOT: { id: workspaceId } },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
}
