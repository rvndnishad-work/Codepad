import { NextResponse } from "next/server";
import { withCronRun } from "@/lib/admin/cron-run";
import { runDailyRollup } from "@/lib/admin/stats/daily-rollup";

/**
 * Nightly admin stats roll-up: writes yesterday (and any missing day of the
 * last 14) into AdminDailyStat, then deletes ActivityEvent rows older than 90
 * days. Cadence: daily 00:20 UTC (vercel.json). Auth: CRON_SECRET.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run() {
  const summary = await runDailyRollup(new Date());
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = withCronRun("admin-daily-stats", run);
export const POST = GET;
