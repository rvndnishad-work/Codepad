/**
 * Shared auth gate for cron endpoints (IP-46).
 *
 * Every /api/cron/* handler calls assertCronAuth(req) first. The shared
 * CRON_SECRET env var lives in .env and is checked via constant-time
 * compare to defeat timing-attack reconnaissance.
 *
 * Header convention: `X-Cron-Secret: <secret>`. We accept it from either
 * `Authorization: Bearer <secret>` (Vercel Cron's idiom) OR the custom
 * header (GitHub Actions / custom scheduler idiom). Both work.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function assertCronAuth(req: NextRequest): CronAuthResult {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "CRON_SECRET is not configured. Add it to your env before invoking cron endpoints.",
        },
        { status: 503 },
      ),
    };
  }

  const provided =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!provided) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing X-Cron-Secret header (or Authorization: Bearer)." },
        { status: 401 },
      ),
    };
  }

  // Constant-time compare. Both sides must be the same length for
  // timingSafeEqual; pad the shorter one to the longer length first by
  // comparing a hash if needed. Simpler: compare the buffers as utf-8 if
  // they're already the same length, otherwise short-circuit fail.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid cron secret." },
        { status: 401 },
      ),
    };
  }
  const equal = timingSafeEqual(a, b);
  if (!equal) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid cron secret." },
        { status: 401 },
      ),
    };
  }
  return { ok: true };
}
