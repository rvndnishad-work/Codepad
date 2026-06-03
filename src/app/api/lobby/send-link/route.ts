import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * POST /api/lobby/send-link — emails a mobile candidate the desktop URL so
 * they can pick it up on a laptop (IP-38).
 *
 * Until the Email epic (IP-24..IP-31) ships Resend wiring, this endpoint
 * lives in a graceful "service unavailable" state — it validates input and
 * rate-limits aggressively, but returns 503 with a clear message instead of
 * pretending to send. The UI shows that message; the QR + Copy fallbacks
 * keep the lobby useful.
 *
 * When Resend lands, swap the stub for the real send + an EmailLog row.
 */

const MAX_URL_LENGTH = 2048;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // Aggressive rate limit — 5 requests / 10 min / IP. This is an unauthenticated
  // endpoint that fans out to email, so we want to make abuse painful.
  const key = clientKey(req, "lobby-send-link");
  const limit = rateLimit(`lobby-send-link:${key}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${Math.ceil(limit.resetMs / 1000)}s.` },
      { status: 429 },
    );
  }

  let url: unknown;
  let email: unknown;
  try {
    const body = await req.json();
    url = body?.url;
    email = body?.email;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof url !== "string" || url.length === 0 || url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "Missing or invalid URL" }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  // Same-origin sanity: only accept URLs that point back at this site so the
  // endpoint can't be turned into a free spam relay.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL doesn't parse" }, { status: 400 });
  }
  const origin = req.nextUrl.origin;
  if (parsed.origin !== origin) {
    return NextResponse.json({ error: "URL must be on this site" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    // IP-24 will wire this up. Until then, be honest with the candidate
    // rather than pretending.
    return NextResponse.json(
      {
        error:
          "Email service isn't enabled yet on this environment. Use the Copy Link button instead.",
      },
      { status: 503 },
    );
  }

  // TODO(IP-24): replace this stub with the real Resend send + EmailLog write.
  // Keeping the shape ready so the swap is a one-file diff.
  return NextResponse.json({ ok: true });
}
