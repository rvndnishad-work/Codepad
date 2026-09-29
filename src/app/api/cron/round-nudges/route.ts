import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { sendRoundNudges } from "@/lib/interview/round-nudges-server";

/**
 * Round nudges: tells the candidate's owner (or the workspace managers), and
 * any Slack or Teams channel that wants "round.waiting", when a round result
 * waits for a next step or a next round is due. Once per round and reason.
 *
 * Cadence: hourly (vercel.json). Auth: `X-Cron-Secret` or
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;
  const res = await sendRoundNudges();
  return NextResponse.json({ ok: true, ...res });
}

// GET for Vercel Cron and curl, same auth.
export async function GET(req: NextRequest) {
  return POST(req);
}
