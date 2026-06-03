/**
 * Simple sliding-window rate limiter backed by an in-memory Map.
 * Fine for a single Node instance; swap the store for Redis in production.
 */

import { getRedis } from "@/lib/redis";

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

/**
 * Distributed sliding-window rate limit. Uses Upstash Ratelimit (atomic,
 * Redis-backed) when Redis is configured so limits hold across serverless
 * instances; otherwise falls back to the in-memory `rateLimit` above (correct
 * only on a single instance — fine for local dev).
 *
 * `windowMs` is rounded up to whole seconds for the Redis backend.
 */
let limiters: Map<string, import("@upstash/ratelimit").Ratelimit> | null = null;

export async function rateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return rateLimit(key, limit, windowMs);

  const { Ratelimit } = await import("@upstash/ratelimit");
  // One Ratelimit instance per (limit, window) config; cheap to reuse.
  const cfgKey = `${limit}:${windowMs}`;
  if (!limiters) limiters = new Map();
  let limiter = limiters.get(cfgKey);
  if (!limiter) {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "rl",
      analytics: false,
    });
    limiters.set(cfgKey, limiter);
  }

  try {
    const res = await limiter.limit(key);
    return {
      ok: res.success,
      remaining: res.remaining,
      resetMs: Math.max(0, res.reset - Date.now()),
    };
  } catch (err) {
    // Never fail-closed on a Redis hiccup — degrade to in-memory.
    console.error("rateLimitDistributed fell back to in-memory:", err);
    return rateLimit(key, limit, windowMs);
  }
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
