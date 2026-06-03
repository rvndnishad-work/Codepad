/**
 * Resend webhook receiver (IP-25 AC #5).
 *
 * Resend POSTs delivery lifecycle events here:
 *   email.delivered | email.bounced | email.complained | email.opened | email.clicked
 *
 * Each event carries the message id (the same one we stored on EmailLog.providerId
 * during sendEmail()), the event type, and a timestamp. We:
 *   1. Verify the request is genuinely from Resend via the shared secret HMAC.
 *   2. Update the matching EmailLog row's status + lastEventAt.
 *   3. For `bounced` / `complained` add the recipient to EmailSuppression so we
 *      never burn another Resend call (and reputation) on a known-bad address.
 *
 * Webhook secret comes from RESEND_WEBHOOK_SECRET — configured in the Resend
 * dashboard when you create the webhook subscription. Without that env set,
 * the route 503s rather than accepting unauthenticated state mutations.
 */
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Resend sends `Svix-Id`, `Svix-Timestamp`, `Svix-Signature` headers in the
// format `v1,<base64>`. We compute HMAC-SHA256 over `id.timestamp.body` and
// compare against the signature.
function verifyResendSignature(req: {
  rawBody: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret: string;
}): boolean {
  const { rawBody, svixId, svixTimestamp, svixSignature, secret } = req;
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Resend's secret format is `whsec_<base64>`; we sign with the decoded bytes.
  const keyBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(keyBase64, "base64");
  } catch {
    return false;
  }
  const payload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(payload).digest("base64");

  // Header may contain multiple comma-separated `v1,<sig>` pairs. Any match wins.
  const candidates = svixSignature.split(" ").flatMap((s) => {
    const [_, sig] = s.split(",");
    return sig ? [sig] : [];
  });
  return candidates.some((sig) => {
    try {
      const a = Buffer.from(sig, "base64");
      const b = Buffer.from(expected, "base64");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

// Map Resend event types to our EmailLog status enum.
const STATUS_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: { message?: string };
    [k: string]: unknown;
  };
};

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Never accept unauthenticated state mutations in production. 503 (not 401)
    // because the misconfiguration is on our side, not the caller's.
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const ok = verifyResendSignature({
    rawBody,
    svixId: req.headers.get("svix-id"),
    svixTimestamp: req.headers.get("svix-timestamp"),
    svixSignature: req.headers.get("svix-signature"),
    secret,
  });
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const mappedStatus = STATUS_MAP[event.type];
  if (!mappedStatus) {
    // Unknown event type — ack so Resend doesn't retry, but don't error.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const providerId = event.data?.email_id;
  if (!providerId) {
    return NextResponse.json({ ok: true, note: "no email_id" });
  }

  const log = await prisma.emailLog.findFirst({
    where: { providerId },
    select: { id: true, recipientEmail: true, status: true },
  });
  if (!log) {
    // Either we haven't recorded this send (older row, pre-IP-25) or it's a
    // duplicate event. Ack and move on.
    return NextResponse.json({ ok: true, note: "no matching EmailLog" });
  }

  // Don't downgrade a terminal status — e.g. delivered followed by opened is
  // fine; bounced followed by delivered is impossible but be defensive.
  // Order: opened/clicked are "richer" than delivered; bounced/complained are
  // terminal failure-side.
  const RANK: Record<string, number> = {
    queued: 0,
    sent: 1,
    delivered: 2,
    opened: 3,
    clicked: 4,
    bounced: 10,
    complained: 11,
    failed: 12,
    suppressed: 13,
  };
  const updateStatus = (RANK[mappedStatus] ?? 0) >= (RANK[log.status] ?? 0)
    ? mappedStatus
    : log.status;

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: updateStatus,
      errorReason: mappedStatus === "bounced"
        ? (event.data?.bounce?.message?.slice(0, 500) ?? "bounced")
        : undefined,
      lastEventAt: new Date(),
    },
  });

  // Auto-suppress hard bounces + complaints. Resend's "bounced" event covers
  // hard bounces; soft bounces are retried by Resend automatically and surface
  // separately. Complaints are spam-button presses — never send to that
  // address again.
  if (mappedStatus === "bounced" || mappedStatus === "complained") {
    const address = log.recipientEmail.trim().toLowerCase();
    const reason = mappedStatus === "complained" ? "complaint" : "hard_bounce";
    await prisma.emailSuppression
      .upsert({
        where: { address },
        update: {}, // already on list — no change
        create: { address, reason, note: `auto-suppressed via ${event.type}` },
      })
      .catch((e) => console.error("[resend webhook] suppression upsert failed:", e));
  }

  return NextResponse.json({ ok: true });
}
