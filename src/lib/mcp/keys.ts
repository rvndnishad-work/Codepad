/**
 * Pure helpers for the API and MCP page: key expiry choices, the stale flag
 * and the short labels shown in the keys table. No database access, so the
 * page, the server actions and unit tests share them.
 */

const DAY_MS = 86_400_000;

/** A key nobody has used for this many days is flagged as stale. */
export const STALE_AFTER_DAYS = 30;

/** Expiry choices offered when a key is created. 0 means never. */
export const EXPIRY_CHOICES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "180 days" },
  { days: 365, label: "1 year" },
  { days: 0, label: "Never" },
] as const;

export const DEFAULT_EXPIRY_DAYS = 90;

/**
 * Validate an expiry choice and turn it into a date. Returns null for
 * "never". Throws on anything that is not one of the offered choices, so a
 * hand-crafted request cannot mint a key that lasts for a century.
 */
export function expiryFromDays(days: number | null | undefined, now: Date = new Date()): Date | null {
  if (days === null || days === undefined || days === 0) return null;
  if (!EXPIRY_CHOICES.some((c) => c.days === days)) {
    throw new Error("Pick one of the offered expiry options.");
  }
  return new Date(now.getTime() + days * DAY_MS);
}

export type KeyHealthInput = {
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
};

export type KeyHealth = {
  /** Revoked, expired or active. */
  state: "active" | "expired" | "revoked";
  /** Active, and not used for STALE_AFTER_DAYS days (or never used and created that long ago). */
  stale: boolean;
  /** Whole days since the last use, or since creation when never used. */
  idleDays: number;
  /** Whole days left before expiry (0 on the last day), null when it never expires. */
  expiresInDays: number | null;
};

const toMs = (d: Date | string) => new Date(d).getTime();

export function keyHealth(k: KeyHealthInput, now: Date = new Date()): KeyHealth {
  const nowMs = now.getTime();
  const expired = k.expiresAt !== null && toMs(k.expiresAt) <= nowMs;
  const state = k.revokedAt ? "revoked" : expired ? "expired" : "active";
  const since = toMs(k.lastUsedAt ?? k.createdAt);
  const idleDays = Math.max(0, Math.floor((nowMs - since) / DAY_MS));
  const expiresInDays =
    k.expiresAt === null ? null : Math.max(0, Math.floor((toMs(k.expiresAt) - nowMs) / DAY_MS));
  return {
    state,
    stale: state === "active" && idleDays >= STALE_AFTER_DAYS,
    idleDays,
    expiresInDays,
  };
}

/** "Never", "Today", "Tomorrow", "In 76 days", or "Expired". */
export function expiryLabel(k: KeyHealthInput, now: Date = new Date()): string {
  if (!k.expiresAt) return "Never";
  const h = keyHealth(k, now);
  if (h.state === "expired") return "Expired";
  const d = h.expiresInDays ?? 0;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}

/** "Read only" or "Read and write". */
export function accessLabel(scopes: string[]): string {
  return scopes.includes("write") ? "Read and write" : "Read only";
}

/** Validate a key name for create and rename. Returns the trimmed name. */
export function cleanKeyName(raw: string | null | undefined): string {
  const name = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Give the key a name.");
  if (name.length > 60) throw new Error("Keep the name to 60 characters or fewer.");
  return name;
}
