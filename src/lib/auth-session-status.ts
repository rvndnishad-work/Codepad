/**
 * Cached lookup of the fields that can invalidate a live session (ban,
 * soft delete, force sign-out). Called from the NextAuth `jwt` callback, which
 * runs on every `auth()` — so this must stay cheap:
 *
 *   - `auth()` is already memoised per request (React `cache`), so this runs
 *     at most once per request.
 *   - Results are cached per user in-process for STATUS_TTL_MS, so a busy
 *     user costs one indexed primary-key read every 30 s per server instance.
 *   - Concurrent lookups for the same user share one promise.
 *   - DB errors fail open (null, cached briefly) so an outage never signs
 *     everyone out.
 *
 * Admin actions call `invalidateSessionStatus(userId)` so the change applies
 * immediately on this instance; other instances pick it up within the TTL.
 */
import { prisma } from "@/lib/prisma";
import type { SessionStatus } from "@/lib/auth-gate";

const STATUS_TTL_MS = 30_000;
const ERROR_TTL_MS = 5_000;
const MAX_ENTRIES = 10_000;

type Result = SessionStatus | "missing" | null;
type Entry = { at: number; ttl: number; value: Promise<Result> };

const cache = new Map<string, Entry>();

async function load(userId: string): Promise<Result> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, bannedUntil: true, deletedAt: true, sessionsRevokedAt: true },
  });
  return row ?? "missing";
}

export function getSessionStatus(userId: string, now: number = Date.now()): Promise<Result> {
  const hit = cache.get(userId);
  if (hit && now - hit.at < hit.ttl) return hit.value;

  const entry: Entry = { at: now, ttl: STATUS_TTL_MS, value: Promise.resolve(null) };
  entry.value = load(userId).catch((err) => {
    console.error("[auth] session status lookup failed, allowing:", err);
    entry.ttl = ERROR_TTL_MS;
    return null;
  });
  if (cache.size >= MAX_ENTRIES) {
    // Map keeps insertion order: drop the oldest entry.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.delete(userId);
  cache.set(userId, entry);
  return entry.value;
}

export function invalidateSessionStatus(userId: string): void {
  cache.delete(userId);
}
