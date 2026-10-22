import { prisma } from "@/lib/prisma";
import { loadCreditSummary } from "@/lib/ai-interview/console-server";
import { RUNWAY_WINDOW_DAYS, type CreditGlance } from "./credit-glance";

/** The balance, held and used credits, plus the recent pace for the runway. */
export async function loadCreditGlance(workspaceId: string, now: Date = new Date()): Promise<CreditGlance> {
  const since = new Date(now.getTime() - RUNWAY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [summary, moved] = await Promise.all([
    loadCreditSummary(workspaceId),
    prisma.aIInterviewCreditLedger.aggregate({
      where: { workspaceId, kind: { in: ["CONSUMPTION", "REFUND"] }, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);
  return { ...summary, usedRecent: Math.max(0, -(moved._sum.amount ?? 0)) };
}
