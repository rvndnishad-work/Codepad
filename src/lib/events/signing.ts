/**
 * Webhook request signing. Server only (node:crypto).
 *
 * Every delivery carries
 *   X-Codepad-Signature: t=<unix seconds>,v1=<hex>
 * where <hex> is HMAC-SHA256(secret, `${t}.${rawBody}`), keyed with the
 * endpoint secret exactly as shown to the user (the whole `whsec_...` string,
 * UTF-8). Receivers recompute it over the raw request body and reject stale
 * timestamps to stop replays.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SIGNATURE_HEADER = "X-Codepad-Signature";
export const TIMESTAMP_HEADER = "X-Codepad-Timestamp";
export const EVENT_ID_HEADER = "X-Codepad-Event-Id";
export const EVENT_HEADER = "X-Codepad-Event";
export const DELIVERY_ID_HEADER = "X-Codepad-Delivery-Id";

/** Default replay window for verifySignature (5 minutes). */
export const SIGNATURE_TOLERANCE_SEC = 300;

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/** Last four characters, for "whsec_...4f2a" style display. */
export function secretHint(secret: string): string {
  return `whsec_...${secret.slice(-4)}`;
}

export function computeSignature(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function signatureHeader(secret: string, timestamp: number, body: string): string {
  return `t=${timestamp},v1=${computeSignature(secret, timestamp, body)}`;
}

export function parseSignatureHeader(header: string): { t: number; v1: string[] } | null {
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (!k || !v) continue;
    if (k === "t" && /^\d+$/.test(v)) t = Number(v);
    else if (k === "v1") v1.push(v);
  }
  return t === null || v1.length === 0 ? null : { t, v1 };
}

/**
 * Reference verifier (what a receiver should do). Used by tests and shown in
 * the page copy. `nowSec` is injectable for tests.
 */
export function verifySignature(
  secret: string,
  header: string,
  body: string,
  opts: { nowSec?: number; toleranceSec?: number } = {},
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > (opts.toleranceSec ?? SIGNATURE_TOLERANCE_SEC)) return false;
  const expected = Buffer.from(computeSignature(secret, parsed.t, body), "hex");
  return parsed.v1.some((sig) => {
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const got = Buffer.from(sig, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
