import { NextRequest, NextResponse } from "next/server";
import { withCronRun } from "@/lib/admin/cron-run";
import { runIncludedCreditsIfDue, workspacesForIncludedCredits } from "@/lib/billing/included-credits-server";

/**
 * Daily included AI credits. For each paid workspace a month after its last
 * grant: expires included credits older than one month, then adds 10 credits
 * per seat. Workspaces that left a paid plan get no grant; their last included
 * credits expire a month later. Pack and trial credits are never touched.
 *
 * Recommended cadence: daily. Auth: `X-Cron-Secret` / `Authorization: Bearer`.
 */
export const maxDuration = 300;

async function run(req: NextRequest) {

  const now = new Date();
  const ids = await workspacesForIncludedCredits();
  let ran = 0;
  let granted = 0;
  let expired = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const r = await runIncludedCreditsIfDue(id, now);
      if (r.ran) ran++;
      granted += r.granted;
      expired += r.expired;
    } catch (err) {
      failed++;
      console.error(`[included-credits] workspace ${id} failed:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    task: "included-credits",
    checked: ids.length,
    ran,
    creditsGranted: granted,
    creditsExpired: expired,
    failed,
    ranAt: now.toISOString(),
  });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("included-credits", run);
export const GET = POST;
