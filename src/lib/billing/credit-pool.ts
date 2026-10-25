/**
 * The AI credits a workspace can spend: its own ledger balance. Workspaces
 * on one billing account no longer share a pool; owners split and move
 * credits between them instead (./credit-split). Ledger rows keep their
 * `billingAccountId` (set by a database trigger) for reports.
 *
 * Readers that want "how many credits can this workspace spend" use these
 * helpers, so the rule lives in one place.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

/** Ledger rows that make up a workspace's balance. */
export function poolWhere(workspaceId: string): Prisma.AIInterviewCreditLedgerWhereInput {
  return { workspaceId };
}

/** The balance a workspace can spend. */
export async function poolBalance(workspaceId: string, db: Db = prisma): Promise<number> {
  const agg = await db.aIInterviewCreditLedger.aggregate({ where: poolWhere(workspaceId), _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/** Balances for many workspaces at once, keyed by workspace id (0 when none). */
export async function poolBalances(workspaceIds: string[], db: Db = prisma): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!workspaceIds.length) return out;
  const sums = await db.aIInterviewCreditLedger.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: workspaceIds } }, _sum: { amount: true } });
  const byWs = new Map(sums.map((s) => [s.workspaceId, s._sum.amount ?? 0]));
  for (const id of workspaceIds) out.set(id, byWs.get(id) ?? 0);
  return out;
}

/** The other workspaces on the same billing account (empty while accounts are 1:1). */
export async function poolSiblings(workspaceId: string, db: Db = prisma): Promise<{ id: string; name: string; slug: string }[]> {
  return db.workspace.findMany({
    where: { billingAccount: { workspaces: { some: { id: workspaceId } } }, NOT: { id: workspaceId } },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
}
