import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Server-side helpers for the native proctor agent contract.
 *
 * The agent (see `agent/` Rust workspace) authenticates each report with a
 * one-time bearer token AND an HMAC-SHA256 signature over the raw request body,
 * keyed by a per-session secret. The signature is defense-in-depth on top of
 * TLS + the bearer token: a leaked token alone can't forge believable reports
 * without also holding the secret. Mirrors the scheme in
 * `src/app/api/integrations/webhooks/[provider]/route.ts`.
 */

/** Constant-time string comparison that also guards against length leaks. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // Length is fixed for our tokens/signatures; bail before timingSafeEqual,
  // which throws on unequal-length buffers.
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Recompute the body HMAC and compare against the agent-supplied signature. */
export function verifySignature(
  secret: string,
  rawBody: string,
  signatureHex: string
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return safeEqual(expected, signatureHex);
}

/** Issue fresh per-session agent credentials. */
export function issueAgentCredentials(): { token: string; secret: string } {
  return {
    token: randomBytes(32).toString("hex"),
    secret: randomBytes(32).toString("hex"),
  };
}

/**
 * Whether the session is over from the agent's perspective. When true the
 * ingest endpoint tells the agent to stop and self-uninstall.
 */
export function isSessionEnded(session: {
  status: string | null;
  finishedAt: Date | null;
}): boolean {
  const ended = new Set([
    "completed",
    "abandoned",
    "finished",
    "ended",
    "cancelled",
    "expired",
  ]);
  if (session.status && ended.has(session.status)) return true;
  if (session.finishedAt && session.finishedAt.getTime() <= Date.now()) return true;
  return false;
}
