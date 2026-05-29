import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { notifyTakeHomeExpiringForAssignment } from "@/lib/notifications/triggers";

/**
 * Sweep PENDING/ACTIVE take-homes that expire in the next 24h and fire
 * TAKE_HOME_EXPIRING. Idempotent — the helper dedup's per-recipient per
 * takeHomeId so re-running this hour just no-ops on the already-notified set.
 *
 * Recommended cadence: every 15 minutes. Smaller windows mean more cron
 * invocations but each one scans the same small set; cost is in the noise.
 *
 * Auth: `X-Cron-Secret` or `Authorization: Bearer <CRON_SECRET>`.
 */
const WINDOW_HOURS = 24;
const MAX_BATCH = 200;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  const due = await prisma.takeHomeAssignment.findMany({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      expiresAt: { gt: now, lt: horizon },
    },
    select: {
      id: true,
      workspaceId: true,
      candidateName: true,
      candidateEmail: true,
      expiresAt: true,
      workspace: { select: { slug: true } },
      challenge: { select: { title: true } },
    },
    take: MAX_BATCH,
  });

  let notificationsCreated = 0;
  for (const a of due) {
    if (!a.workspaceId || !a.workspace?.slug) continue;
    const msLeft = a.expiresAt.getTime() - now.getTime();
    const hoursLeft = Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)));
    const result = await notifyTakeHomeExpiringForAssignment({
      takeHomeId: a.id,
      workspaceId: a.workspaceId,
      workspaceSlug: a.workspace.slug,
      candidateName: a.candidateName,
      candidateEmail: a.candidateEmail ?? null,
      challengeTitle: a.challenge.title,
      hoursLeft,
    });
    notificationsCreated += result.created;
  }

  return NextResponse.json({
    ok: true,
    task: "take-home-expiring",
    scanned: due.length,
    notificationsCreated,
    horizon: horizon.toISOString(),
  });
}

// GET allowed for easy curl testing in dev — same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}
