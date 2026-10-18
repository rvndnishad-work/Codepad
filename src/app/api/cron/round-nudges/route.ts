import { NextRequest, NextResponse } from "next/server";
import { withCronRun } from "@/lib/admin/cron-run";
import { sendRoundNudges } from "@/lib/interview/round-nudges-server";

/**
 * Round nudges: tells the candidate's owner (or the workspace managers), and
 * any Slack or Teams channel that wants "round.waiting", when a round result
 * waits for a next step or a next round is due. Once per round and reason.
 *
 * Cadence: hourly (vercel.json). Auth: `X-Cron-Secret` or
 * `Authorization: Bearer <CRON_SECRET>`.
 */
async function run(req: NextRequest) {
  const res = await sendRoundNudges();
  return NextResponse.json({ ok: true, ...res });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("round-nudges", run);
export const GET = POST;
