import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronRun } from "@/lib/admin/cron-run";

/**
 * Durable take-home expiry (IP-88 convergence).
 *
 * Before this cron, expiry was lazy: a legacy assignment only flipped to
 * EXPIRED when the candidate personally opened the lobby/start route, and a
 * session take-home was never persisted as expired at all — dashboards showed
 * stale PENDING/"scheduled" rows forever for candidates who never clicked the
 * link. This sweep makes expiry a stored fact:
 *
 *   - Legacy `TakeHomeAssignment`: PENDING past `expiresAt` → EXPIRED.
 *     (ACTIVE rows are mid-attempt — the attempt's own time limit governs.)
 *   - Session (`InterviewSession` type "take-home"): "scheduled" past
 *     `deadlineAt` → "expired". In-progress sessions keep running; the
 *     deadline gates STARTING, matching the runner's own rule.
 *
 * Idempotent by construction (status-guarded updateMany). Recommended
 * cadence: hourly. Auth: `X-Cron-Secret` or `Authorization: Bearer`.
 */
async function run(req: NextRequest) {

  const now = new Date();

  const [legacy, sessions] = await Promise.all([
    prisma.takeHomeAssignment.updateMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    }),
    prisma.interviewSession.updateMany({
      where: { type: "take-home", status: "scheduled", deadlineAt: { lt: now } },
      data: { status: "expired" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    expiredLegacy: legacy.count,
    expiredSessions: sessions.count,
    ranAt: now.toISOString(),
  });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("take-home-expiry", run);
export const GET = POST;
