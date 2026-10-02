/**
 * Pure account-gate decisions used by the NextAuth callbacks (src/lib/auth.ts)
 * and the admin console. No I/O here so the rules can be unit tested.
 *
 *  - A suspension is active while `banned` is true and `bannedUntil` is null
 *    (no end date) or still in the future. An expired suspension does not
 *    block anything; sign-in clears it.
 *  - A soft-deleted account (`deletedAt` set) can never sign in and its
 *    sessions are rejected.
 *  - A session whose sign-in moment is before `sessionsRevokedAt` is rejected
 *    (force sign-out).
 */

export type GateUser = {
  banned: boolean;
  bannedUntil: Date | null;
  deletedAt: Date | null;
};

export type SessionStatus = GateUser & {
  sessionsRevokedAt: Date | null;
};

export type SignInVerdict =
  | { allow: true; clearExpiredBan: boolean }
  | { allow: false; reason: "deleted" | "suspended"; until: Date | null };

export function isBanActive(u: Pick<GateUser, "banned" | "bannedUntil">, now: Date = new Date()): boolean {
  if (!u.banned) return false;
  return u.bannedUntil == null || u.bannedUntil.getTime() > now.getTime();
}

export function signInVerdict(u: GateUser, now: Date = new Date()): SignInVerdict {
  if (u.deletedAt) return { allow: false, reason: "deleted", until: null };
  if (isBanActive(u, now)) return { allow: false, reason: "suspended", until: u.bannedUntil };
  return { allow: true, clearExpiredBan: u.banned };
}

/**
 * Is a session still valid?
 *
 * `status`:
 *   - a row: the user's current gate fields
 *   - "missing": the user no longer exists (hard deleted) → reject
 *   - null: the lookup failed (DB error) → fail open, keep the session
 *
 * `issuedAtMs` is when this sign-in happened (ms since epoch). Unknown with a
 * revocation on file means we cannot prove the token is newer, so reject.
 */
export function sessionVerdict(
  status: SessionStatus | "missing" | null,
  issuedAtMs: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (status === null) return true;
  if (status === "missing") return false;
  if (status.deletedAt) return false;
  if (isBanActive(status, now)) return false;
  if (status.sessionsRevokedAt) {
    if (typeof issuedAtMs !== "number" || !Number.isFinite(issuedAtMs)) return false;
    if (issuedAtMs < status.sessionsRevokedAt.getTime()) return false;
  }
  return true;
}

/** Account status for admin lists and pills. */
export type AccountState = "deleted" | "suspended" | "unverified" | "active";

export function accountState(
  u: GateUser & { emailVerified: Date | null },
  now: Date = new Date(),
): AccountState {
  if (u.deletedAt) return "deleted";
  if (isBanActive(u, now)) return "suspended";
  if (!u.emailVerified) return "unverified";
  return "active";
}
