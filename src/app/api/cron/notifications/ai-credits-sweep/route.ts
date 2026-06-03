import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { notifyAiCreditsLowIfNeeded } from "@/lib/notifications/triggers";

/**
 * Defensive backstop for IP-44's inline AI_CREDITS_LOW trigger.
 *
 * The inline trigger only fires when a credit is actively consumed. A
 * workspace can also reach a low balance because of:
 *   - a refund that decremented their balance
 *   - admin manually subtracting credits
 *   - a billing-cycle reset
 * This sweep catches those paths.
 *
 * The notify helper already dedup's per-workspace per 24h, so re-running
 * hourly is safe.
 *
 * Recommended cadence: every 1 hour.
 */
export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  // Cheap path — enumerate workspaces that allow AI screening, sum their
  // ledger, and let the helper decide whether to fire. This is N+1 (one sum
  // per workspace) but workspace count is bounded; if it ever grows we can
  // switch to a single GROUP BY ledger query.
  const workspaces = await prisma.workspace.findMany({
    where: { planName: { in: ["GROWTH", "ENTERPRISE"] } },
    select: { id: true },
  });

  let fired = 0;
  for (const w of workspaces) {
    const agg = await prisma.aIInterviewCreditLedger.aggregate({
      where: { workspaceId: w.id },
      _sum: { amount: true },
    });
    const balance = agg._sum.amount ?? 0;
    // notifyAiCreditsLowIfNeeded is internally threshold-gated AND 24h-dedup-
    // gated, so we just call it for every workspace and let it decide.
    const before = await prisma.notification.count({
      where: { type: "AI_CREDITS_LOW", createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    await notifyAiCreditsLowIfNeeded({ workspaceId: w.id, balance });
    const after = await prisma.notification.count({
      where: { type: "AI_CREDITS_LOW", createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (after > before) fired++;
  }

  return NextResponse.json({
    ok: true,
    task: "ai-credits-sweep",
    scannedWorkspaces: workspaces.length,
    fired,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
