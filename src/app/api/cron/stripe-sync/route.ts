import { NextResponse } from "next/server";
import { withCronRun } from "@/lib/admin/cron-run";
import { syncAllWorkspaces } from "@/lib/admin/stripe-sync";

/**
 * Nightly Stripe snapshot (04:00 UTC). Reads every workspace subscription and
 * writes status, billed seats, MRR, interval, period end and past-due start
 * onto the workspace. The webhook keeps these fresh between runs.
 * Auth and CronRun recording come from withCronRun.
 */
export const maxDuration = 300;

const run = withCronRun("stripe-sync", async () => {
  const result = await syncAllWorkspaces();
  return NextResponse.json(result);
});

export const GET = run;
export const POST = run;
