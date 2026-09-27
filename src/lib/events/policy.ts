/**
 * Retry and auto-pause rules for webhook deliveries. Pure, so the schedule is
 * unit-tested without a database.
 *
 * A delivery gets one immediate try plus five retries, spaced
 * 1m, 5m, 30m, 2h and 6h after each failure. An endpoint that fails
 * AUTO_PAUSE_AFTER attempts in a row (any events) is paused until someone
 * resumes it. A success anywhere resets the streak.
 */

export const RETRY_DELAYS_MS = [
  60_000, // 1 minute
  5 * 60_000, // 5 minutes
  30 * 60_000, // 30 minutes
  2 * 60 * 60_000, // 2 hours
  6 * 60 * 60_000, // 6 hours
] as const;

/** The first try plus one per retry delay. */
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

export const AUTO_PAUSE_AFTER = 10;

/** How long a claimed ("sending") delivery can sit before the cron retakes it. */
export const STALE_SENDING_MS = 5 * 60_000;

/**
 * Delay before the next try after `attemptsMade` failed tries, or null when
 * the delivery has used all its tries.
 */
export function retryDelayMs(attemptsMade: number): number | null {
  if (attemptsMade < 1) return 0;
  return RETRY_DELAYS_MS[attemptsMade - 1] ?? null;
}

export type AttemptOutcome = {
  /** New delivery status. */
  status: "succeeded" | "pending" | "failed";
  nextAttemptAt: Date | null;
  /** The endpoint's consecutive-failure count after this attempt. */
  failureCount: number;
  /** True when this attempt should pause the endpoint. */
  pauseEndpoint: boolean;
};

/**
 * What to record after one HTTP attempt.
 *
 * @param attemptsMade  tries made on this delivery including this one
 * @param failureCount  the endpoint's consecutive failures before this one
 * @param isTest        test pings are tried once and never count toward a pause
 */
export function planAfterAttempt(params: {
  ok: boolean;
  attemptsMade: number;
  failureCount: number;
  isTest?: boolean;
  now?: Date;
}): AttemptOutcome {
  const now = params.now ?? new Date();
  if (params.ok) {
    return { status: "succeeded", nextAttemptAt: null, failureCount: 0, pauseEndpoint: false };
  }
  if (params.isTest) {
    return { status: "failed", nextAttemptAt: null, failureCount: params.failureCount, pauseEndpoint: false };
  }
  const failureCount = params.failureCount + 1;
  const delay = retryDelayMs(params.attemptsMade);
  return {
    status: delay === null ? "failed" : "pending",
    nextAttemptAt: delay === null ? null : new Date(now.getTime() + delay),
    failureCount,
    pauseEndpoint: shouldAutoPause(failureCount),
  };
}

export function shouldAutoPause(failureCount: number): boolean {
  return failureCount >= AUTO_PAUSE_AFTER;
}

/** 2xx counts as delivered. Redirects are not followed and count as failures. */
export function isSuccessStatus(code: number): boolean {
  return code >= 200 && code < 300;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Endpoint URL rules
 * ────────────────────────────────────────────────────────────────────────── */

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/**
 * Checks an endpoint URL before we save it. HTTPS only in production; plain
 * HTTP to localhost is allowed in development so people can test locally.
 * Rejects obvious internal targets (localhost, private IP literals, .internal).
 */
export function validateEndpointUrl(
  raw: string,
  opts: { allowLocal?: boolean } = {},
): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Enter the URL to send events to." };
  if (value.length > 2000) return { ok: false, error: "That URL is too long." };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, error: "That is not a valid URL." };
  }
  if (u.username || u.password) return { ok: false, error: "Remove the username and password from the URL." };
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const local =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    isPrivateIPv4(host) ||
    host === "::1" ||
    host === "::" ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe80:/.test(host);
  if (local && !opts.allowLocal) return { ok: false, error: "Use a public address. Local and private network addresses are not allowed." };
  if (u.protocol !== "https:" && !(opts.allowLocal && local && u.protocol === "http:")) {
    return { ok: false, error: "Use an https:// URL." };
  }
  u.hash = "";
  return { ok: true, url: u.toString() };
}
