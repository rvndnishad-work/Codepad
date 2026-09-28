import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { runRecordingCleanup } from "@/lib/recording/cleanup-server";

/**
 * Hourly recordings cleanup. Deletes AI interview voice clips and live
 * interview videos 7 days after they were made (bucket objects first, then
 * the clip rows; video rows stay, marked deleted), and marks live recordings
 * stuck in "recording" for 6 hours as failed. Up to 500 of each per run.
 *
 * Recommended cadence: hourly. Auth: `X-Cron-Secret` / `Authorization: Bearer`.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const now = new Date();
  const summary = await runRecordingCleanup(now);
  return NextResponse.json({ ok: true, task: "recordings", ...summary, ranAt: now.toISOString() });
}

// Vercel Cron sends GET: same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}
