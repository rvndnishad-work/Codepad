import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { drainDueDeliveries } from "@/lib/events/deliver";

/**
 * Sends webhook deliveries that are due: new events whose immediate send did
 * not go out, and retries on the 1m, 5m, 30m, 2h, 6h schedule. Endpoints that
 * fail 10 times in a row are paused by the sender and skipped here.
 *
 * Recommended cadence: every minute. Auth: `X-Cron-Secret` or
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends GET).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;
  const result = await drainDueDeliveries(100);
  return NextResponse.json({ success: true, ...result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
