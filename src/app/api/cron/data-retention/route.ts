import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { runRetention } from "@/lib/workspace/data-privacy-server";

/**
 * Nightly data retention (Settings > Data and privacy). For every rule a
 * workspace turned on, either emails owners and admins about what will be
 * erased in 7 days, waits, or erases exactly what that email announced.
 * Passed candidates are never erased by a rule, and each erase writes an
 * audit entry. Also marks old export links as expired.
 *
 * Recommended cadence: daily. Auth: `X-Cron-Secret` / `Authorization: Bearer`.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const now = new Date();
  const summary = await runRetention(now);
  const expired = await prisma.workspaceExport.updateMany({
    where: { status: "READY", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  // An export whose background build died never leaves RUNNING on its own.
  const stuck = await prisma.workspaceExport.updateMany({
    where: { status: { in: ["PENDING", "RUNNING"] }, createdAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
    data: { status: "FAILED", error: "The export did not finish." },
  });

  return NextResponse.json({
    ok: true,
    task: "data-retention",
    ...summary,
    exportsExpired: expired.count,
    exportsFailed: stuck.count,
    ranAt: now.toISOString(),
  });
}

// Vercel Cron sends GET: same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}
