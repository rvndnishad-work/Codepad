import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
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

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

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

// Vercel Cron sends GET: same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}
