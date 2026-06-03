/**
 * Optional Upstash Redis client.
 *
 * When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set, callers get a
 * shared HTTP-based Redis client suitable for serverless (no socket pooling).
 * When they're absent (typical local dev), getRedis() returns null and callers
 * fall back to in-memory behaviour — mirroring how RESEND_API_KEY is optional.
 */
import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function hasRedis(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis | null {
  if (client) return client;
  if (!hasRedis()) return null;
  client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return client;
}
