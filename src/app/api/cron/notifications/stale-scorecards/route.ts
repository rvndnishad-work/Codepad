import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { notifyScorecardRequested } from "@/lib/notifications/triggers";

/**
 * Defensive backstop for IP-44's inline SCORECARD_REQUESTED trigger.
 *
 * Scans for live interview sessions that:
 *   - reached status="completed" more than STALE_AFTER_MS ago
 *   - still have no rubric attached
 * The notify helper already dedup's per-sessionId, so re-running every 2h
 * just no-ops on sessions we've already nudged.
 *
 * Recommended cadence: every 2 hours.
 */
const STALE_AFTER_MS = 60 * 60 * 1000; // 1 hour
const MAX_BATCH = 200;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const candidates = await prisma.interviewSession.findMany({
    where: {
      status: "completed",
      finishedAt: { lt: cutoff, not: null },
      type: "live",
      rubric: null,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      type: true,
    },
    take: MAX_BATCH,
  });

  let fired = 0;
  for (const s of candidates) {
    await notifyScorecardRequested({
      sessionId: s.id,
      ownerId: s.userId,
      title: s.title,
      type: s.type,
    });
    fired++;
  }

  return NextResponse.json({
    ok: true,
    task: "stale-scorecards",
    scanned: candidates.length,
    fired,
    cutoff: cutoff.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
