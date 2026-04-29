/**
 * Simple sliding-window rate limiter backed by an in-memory Map.
 * Fine for a single Node instance; swap the store for Redis in production.
 */

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  if (bucket.hits.length >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetMs: (bucket.hits[0] ?? now) + windowMs - now,
    };
  }
  bucket.hits.push(now);
  return {
    ok: true,
    remaining: limit - bucket.hits.length,
    resetMs: windowMs,
  };
}

/** Best-effort client identifier from request headers. */
export function clientKey(req: Request, fallback?: string): string {
  if (fallback) return `u:${fallback}`;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

/** Periodic cleanup so idle keys don't accumulate forever. */
if (typeof globalThis !== "undefined" && !(globalThis as { __rlCleanup?: boolean }).__rlCleanup) {
  (globalThis as { __rlCleanup?: boolean }).__rlCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      b.hits = b.hits.filter((t) => t > now - 60_000);
      if (b.hits.length === 0) buckets.delete(k);
    }
  }, 60_000).unref?.();
}
