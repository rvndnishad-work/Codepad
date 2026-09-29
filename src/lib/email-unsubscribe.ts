/**
 * Unsubscribe links for candidate emails. Every candidate email carries one
 * (see src/emails/candidate-brand.tsx), so a wording edit can never drop it.
 *
 * The link names the address and carries an HMAC of it, so nobody can
 * unsubscribe someone else by editing the URL. Unsubscribing puts the
 * address on the EmailSuppression list with reason "unsubscribe", which
 * sendEmail already checks before every send.
 */
import { siteOrigin } from "@/lib/site-url";
import { createHmac, timingSafeEqual } from "crypto";

function baseSecret(explicit?: string): string | null {
  return explicit ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null;
}

function key(base: string): Buffer {
  return createHmac("sha256", base).update("email-unsubscribe:v1").digest();
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Signature for an address, or null when no secret is configured. */
export function unsubscribeSignature(email: string, secret?: string): string | null {
  const base = baseSecret(secret);
  if (!base) return null;
  return createHmac("sha256", key(base)).update(normalize(email)).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribe(email: string, sig: string, secret?: string): boolean {
  const expected = unsubscribeSignature(email, secret);
  if (!expected || typeof sig !== "string" || sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function appBase(): string {
  return siteOrigin();
}

/** The link for the email footer, or null when links cannot be signed. */
export function unsubscribeUrl(email: string, opts: { base?: string; secret?: string } = {}): string | null {
  const sig = unsubscribeSignature(email, opts.secret);
  if (!sig) return null;
  const q = new URLSearchParams({ e: normalize(email), s: sig });
  return `${(opts.base ?? appBase()).replace(/\/$/, "")}/email/unsubscribe?${q.toString()}`;
}
