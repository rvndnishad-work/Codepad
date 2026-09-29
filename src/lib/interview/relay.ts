/**
 * Shared bits of the live room relay (server route and browser provider).
 */

/** A tab that has not polled for this long counts as gone. Clients poll at
 * least every ~9 seconds (8 s long poll plus the round trip). */
export const PRESENCE_TTL_MS = 15_000;

/** "tools" or "code:<challengeId>"; anything else is refused. */
export function parseChannel(raw: string | null | undefined): string | null {
  if (!raw) return "tools";
  if (raw === "tools") return raw;
  return /^code:[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : null;
}

export type RelayPeer = {
  clientId: number;
  role: "interviewer" | "candidate";
  name: string;
  place: "lobby" | "room";
  joinedAt: string;
};

export type RelayRoom = {
  status: "scheduled" | "in_progress" | "completed" | "abandoned" | string;
  startedAt: string | null;
  round: string | null;
  totalSec: number;
};

/** Connection as the people in the room should read it. */
export type RelayConnection = "connecting" | "live" | "reconnecting" | "offline" | "denied";

/** How long to wait before retry n (1-based): 0.5 s, 1 s, 2 s ... capped at 8 s, with jitter. */
export function backoffMs(attempt: number, rand = Math.random()): number {
  const base = Math.min(8000, 500 * 2 ** Math.max(0, attempt - 1));
  return Math.round(base * (0.75 + rand * 0.5));
}
