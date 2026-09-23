/**
 * Result cache for /api/execute. Holds only speculative (background) runs,
 * keyed by user+language+codeHash, so the explicit run that follows can be
 * served instantly. The explicit run takes the entry (read + delete): a
 * warm-up is used at most once, so pressing Run again always executes
 * again — programs that print random numbers or the time never replay.
 *
 * Backed by Redis (shared across serverless instances, with TTL) when
 * configured; otherwise a bounded in-memory LRU that is correct only on a
 * single instance.
 */
import { getRedis } from "@/lib/redis";
import type { PistonResult } from "@/lib/piston";

const TTL_SECONDS = Number(process.env.EXECUTE_CACHE_TTL ?? 300);
const MEM_MAX = 1000;
const KEY_PREFIX = "exec:";

const mem = new Map<string, PistonResult>();

export async function getCachedResult(key: string): Promise<PistonResult | null> {
  const redis = getRedis();
  if (redis) {
    try {
      // Upstash auto-deserializes JSON values.
      return (await redis.get<PistonResult>(KEY_PREFIX + key)) ?? null;
    } catch (err) {
      console.error("execute-cache get failed:", err);
      return null;
    }
  }
  return mem.get(key) ?? null;
}

export async function setCachedResult(key: string, result: PistonResult): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(KEY_PREFIX + key, result, { ex: TTL_SECONDS });
    } catch (err) {
      console.error("execute-cache set failed:", err);
    }
    return;
  }
  // In-memory LRU: refresh recency, then evict oldest past the cap.
  mem.delete(key);
  mem.set(key, result);
  if (mem.size > MEM_MAX) {
    const oldest = mem.keys().next().value;
    if (oldest) mem.delete(oldest);
  }
}

/** Read and remove in one step, so a warmed result is served at most once. */
export async function takeCachedResult(key: string): Promise<PistonResult | null> {
  const redis = getRedis();
  if (redis) {
    try {
      return (await redis.getdel<PistonResult>(KEY_PREFIX + key)) ?? null;
    } catch (err) {
      console.error("execute-cache take failed:", err);
      return null;
    }
  }
  const hit = mem.get(key) ?? null;
  mem.delete(key);
  return hit;
}
