import { NextResponse } from "next/server";
import { withCronRun } from "@/lib/admin/cron-run";
import { runSwitchover } from "@/lib/billing/switchover-server";

/**
 * The move to the new plans, hourly (see src/lib/billing/switchover.ts).
 * Does nothing until an admin starts it in Admin > Pricing. Then: 30 days'
 * notice to every workspace on the old pricing; from the date, Stripe
 * subscriptions end at their period end and unpaid workspaces pause.
 */
async function run() {
  const res = await runSwitchover();
  return NextResponse.json({ ok: true, ...res, ranAt: new Date().toISOString() });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("plans-switchover", run);
export const GET = POST;
