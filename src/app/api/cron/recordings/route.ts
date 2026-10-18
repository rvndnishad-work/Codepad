import { NextRequest, NextResponse } from "next/server";
import { withCronRun } from "@/lib/admin/cron-run";
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

async function run(req: NextRequest) {

  const now = new Date();
  const summary = await runRecordingCleanup(now);
  return NextResponse.json({ ok: true, task: "recordings", ...summary, ranAt: now.toISOString() });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("recordings", run);
export const GET = POST;
