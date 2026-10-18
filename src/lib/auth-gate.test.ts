import { describe, expect, it } from "vitest";
import { accountState, isBanActive, sessionVerdict, signInVerdict } from "./auth-gate";

const now = new Date("2026-10-02T12:00:00Z");
const past = new Date("2026-10-01T12:00:00Z");
const future = new Date("2026-10-03T12:00:00Z");
const clean = { banned: false, bannedUntil: null, deletedAt: null };

describe("isBanActive", () => {
  it("is off when not banned, even with a stale end date", () => {
    expect(isBanActive({ banned: false, bannedUntil: future }, now)).toBe(false);
  });
  it("is on for a ban with no end date", () => {
    expect(isBanActive({ banned: true, bannedUntil: null }, now)).toBe(true);
  });
  it("is on until the end date and off at or after it", () => {
    expect(isBanActive({ banned: true, bannedUntil: future }, now)).toBe(true);
    expect(isBanActive({ banned: true, bannedUntil: now }, now)).toBe(false);
    expect(isBanActive({ banned: true, bannedUntil: past }, now)).toBe(false);
  });
});

describe("signInVerdict", () => {
  it("allows a clean account", () => {
    expect(signInVerdict(clean, now)).toEqual({ allow: true, clearExpiredBan: false });
  });
  it("refuses an open-ended suspension", () => {
    expect(signInVerdict({ ...clean, banned: true }, now)).toEqual({ allow: false, reason: "suspended", until: null });
  });
  it("refuses a suspension that has not ended and reports the end", () => {
    expect(signInVerdict({ ...clean, banned: true, bannedUntil: future }, now)).toEqual({
      allow: false,
      reason: "suspended",
      until: future,
    });
  });
  it("allows and asks to clear an expired suspension", () => {
    expect(signInVerdict({ ...clean, banned: true, bannedUntil: past }, now)).toEqual({ allow: true, clearExpiredBan: true });
  });
  it("refuses a deleted account, before looking at the ban", () => {
    expect(signInVerdict({ banned: true, bannedUntil: past, deletedAt: past }, now)).toEqual({
      allow: false,
      reason: "deleted",
      until: null,
    });
  });
});

describe("sessionVerdict", () => {
  const status = { ...clean, sessionsRevokedAt: null };
  it("fails open when the lookup failed", () => {
    expect(sessionVerdict(null, undefined, now)).toBe(true);
  });
  it("rejects a user that no longer exists", () => {
    expect(sessionVerdict("missing", now.getTime(), now)).toBe(false);
  });
  it("keeps a clean session", () => {
    expect(sessionVerdict(status, past.getTime(), now)).toBe(true);
  });
  it("rejects deleted and actively suspended users", () => {
    expect(sessionVerdict({ ...status, deletedAt: past }, now.getTime(), now)).toBe(false);
    expect(sessionVerdict({ ...status, banned: true }, now.getTime(), now)).toBe(false);
    expect(sessionVerdict({ ...status, banned: true, bannedUntil: future }, now.getTime(), now)).toBe(false);
  });
  it("keeps a session once the suspension has expired", () => {
    expect(sessionVerdict({ ...status, banned: true, bannedUntil: past }, now.getTime(), now)).toBe(true);
  });
  it("rejects tokens issued before the revocation and keeps newer ones", () => {
    const revoked = { ...status, sessionsRevokedAt: now };
    expect(sessionVerdict(revoked, now.getTime() - 1, now)).toBe(false);
    expect(sessionVerdict(revoked, now.getTime(), now)).toBe(true);
    expect(sessionVerdict(revoked, now.getTime() + 1000, now)).toBe(true);
  });
  it("rejects a token with no known issue time when a revocation exists", () => {
    const revoked = { ...status, sessionsRevokedAt: past };
    expect(sessionVerdict(revoked, undefined, now)).toBe(false);
    expect(sessionVerdict(revoked, Number.NaN, now)).toBe(false);
    expect(sessionVerdict(status, undefined, now)).toBe(true);
  });
});

describe("accountState", () => {
  it("orders deleted > suspended > unverified > active", () => {
    expect(accountState({ ...clean, banned: true, deletedAt: past, emailVerified: null }, now)).toBe("deleted");
    expect(accountState({ ...clean, banned: true, emailVerified: null }, now)).toBe("suspended");
    expect(accountState({ ...clean, banned: true, bannedUntil: past, emailVerified: null }, now)).toBe("unverified");
    expect(accountState({ ...clean, emailVerified: past }, now)).toBe("active");
  });
});
