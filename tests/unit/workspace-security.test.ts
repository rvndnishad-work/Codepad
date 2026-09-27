import { describe, expect, it } from "vitest";
import {
  allowedKeyExpiryChoices,
  defaultKeyExpiryDays,
  defaultTwoFactorStart,
  domainSuffixes,
  inviteDomainError,
  keysOverLimit,
  listDomains,
  membersOutsideDomains,
  rotatedKeyExpiry,
  signInAgainPath,
  signedOutPath,
  toDateInput,
  twoFactorPolicy,
  twoFactorReminderWait,
} from "@/lib/workspace/security";
import { canJoinWithoutInvite, checkApiKeyExpiry, signInExpired, twoFactorRequired } from "@/lib/workspace/settings";
import { expiryFromDays } from "@/lib/mcp/keys";

const DAY = 86_400_000;
const now = new Date("2026-09-27T12:00:00Z");

describe("domainSuffixes", () => {
  it("lists the domain and each parent with two labels or more", () => {
    expect(domainSuffixes("Priya@EU.Mail.Acme.com")).toEqual(["eu.mail.acme.com", "mail.acme.com", "acme.com"]);
    expect(domainSuffixes("a@acme.com")).toEqual(["acme.com"]);
  });
  it("returns nothing for addresses without a usable domain", () => {
    expect(domainSuffixes("nobody")).toEqual([]);
    expect(domainSuffixes("@acme.com")).toEqual([]);
    expect(domainSuffixes("a@localhost")).toEqual([]);
  });
  it("finds every workspace whose allowed list covers the address", () => {
    const s = { joinWithoutInvite: true, allowedEmailDomains: ["acme.com"] };
    const email = "a@eng.acme.com";
    expect(domainSuffixes(email).some((d) => s.allowedEmailDomains.includes(d))).toBe(true);
    expect(canJoinWithoutInvite(s, email)).toBe(true);
  });
});

describe("invite domains", () => {
  it("allows any address with no domains set", () => {
    expect(inviteDomainError({ allowedEmailDomains: [] }, "x@gmail.com")).toBeNull();
  });
  it("allows the domain and its subdomains", () => {
    const s = { allowedEmailDomains: ["acme.com", "beta.io"] };
    expect(inviteDomainError(s, "a@acme.com")).toBeNull();
    expect(inviteDomainError(s, "a@eu.acme.com")).toBeNull();
    expect(inviteDomainError(s, "a@beta.io")).toBeNull();
  });
  it("refuses other domains and look-alikes with a readable reason", () => {
    const s = { allowedEmailDomains: ["acme.com", "beta.io"] };
    expect(inviteDomainError(s, "a@notacme.com")).toContain("acme.com or beta.io");
    expect(inviteDomainError(s, "a@acme.com.evil.io")).not.toBeNull();
    expect(inviteDomainError(s, "a@gmail.com")).toContain("Settings, Security");
  });
  it("lists domains in plain words", () => {
    expect(listDomains([])).toBe("");
    expect(listDomains(["a.com"])).toBe("a.com");
    expect(listDomains(["a.com", "b.com", "c.com"])).toBe("a.com, b.com or c.com");
  });
  it("flags members outside the list only when a list is set", () => {
    const members = [
      { email: "a@acme.com" },
      { email: "b@gmail.com" },
      { email: null },
    ];
    expect(membersOutsideDomains({ allowedEmailDomains: [] }, members)).toEqual([]);
    expect(membersOutsideDomains({ allowedEmailDomains: ["acme.com"] }, members)).toEqual([{ email: "b@gmail.com" }, { email: null }]);
  });
  it("joining without an invite needs the switch and at least one domain", () => {
    expect(canJoinWithoutInvite({ joinWithoutInvite: true, allowedEmailDomains: [] }, "a@acme.com")).toBe(false);
    expect(canJoinWithoutInvite({ joinWithoutInvite: false, allowedEmailDomains: ["acme.com"] }, "a@acme.com")).toBe(false);
    expect(canJoinWithoutInvite({ joinWithoutInvite: true, allowedEmailDomains: ["acme.com"] }, "a@gmail.com")).toBe(false);
  });
});

describe("two-factor for everyone", () => {
  it("reports off, scheduled and on", () => {
    expect(twoFactorPolicy({ require2faForAll: false, require2faFrom: null }, now)).toEqual({ state: "off" });
    const later = new Date(now.getTime() + 3 * DAY);
    expect(twoFactorPolicy({ require2faForAll: true, require2faFrom: later }, now)).toEqual({ state: "scheduled", from: later });
    expect(twoFactorPolicy({ require2faForAll: true, require2faFrom: null }, now)).toEqual({ state: "on", since: null });
    const earlier = new Date(now.getTime() - DAY);
    expect(twoFactorPolicy({ require2faForAll: true, require2faFrom: earlier }, now)).toEqual({ state: "on", since: earlier });
  });
  it("the gate asks members only once the start date has passed", () => {
    const s = { require2faForAll: true, require2faFrom: new Date(now.getTime() + DAY) };
    expect(twoFactorRequired(s, { role: "INTERVIEWER" }, "FREE", now)).toBe(false);
    expect(twoFactorRequired(s, { role: "INTERVIEWER" }, "FREE", new Date(now.getTime() + 2 * DAY))).toBe(true);
    // Owners and admins of a paid plan always need it.
    expect(twoFactorRequired({ require2faForAll: false, require2faFrom: null }, { role: "ADMIN" }, "GROWTH", now)).toBe(true);
  });
  it("limits the reminder email to once an hour", () => {
    expect(twoFactorReminderWait(null, now)).toBe(0);
    expect(twoFactorReminderWait(new Date(now.getTime() - 10 * 60_000), now)).toBe(50);
    expect(twoFactorReminderWait(new Date(now.getTime() - 59.5 * 60_000), now)).toBe(1);
    expect(twoFactorReminderWait(new Date(now.getTime() - 61 * 60_000), now)).toBe(0);
  });
  it("offers a start date a week ahead", () => {
    expect(defaultTwoFactorStart(now)).toBe("2026-10-04");
    expect(toDateInput(null)).toBe("");
    expect(toDateInput(new Date("2026-10-04T00:00:00Z"))).toBe("2026-10-04");
  });
});

describe("sign-in length and sign out everyone", () => {
  const signedIn = new Date(now.getTime() - 2 * DAY);
  it("keeps sign-ins with no policy", () => {
    expect(signInExpired({ sessionsRevokedAt: null, sessionMaxAgeDays: null }, signedIn, now)).toBe(false);
    expect(signInExpired({ sessionsRevokedAt: null, sessionMaxAgeDays: null }, null, now)).toBe(false);
  });
  it("ends sign-ins older than the limit", () => {
    expect(signInExpired({ sessionsRevokedAt: null, sessionMaxAgeDays: 1 }, signedIn, now)).toBe(true);
    expect(signInExpired({ sessionsRevokedAt: null, sessionMaxAgeDays: 7 }, signedIn, now)).toBe(false);
  });
  it("ends sign-ins from before sign out everyone, not after", () => {
    const revoked = new Date(now.getTime() - DAY);
    expect(signInExpired({ sessionsRevokedAt: revoked, sessionMaxAgeDays: null }, signedIn, now)).toBe(true);
    expect(signInExpired({ sessionsRevokedAt: revoked, sessionMaxAgeDays: null }, now, now)).toBe(false);
  });
  it("treats sign-ins without a start time as expired once a policy exists", () => {
    expect(signInExpired({ sessionsRevokedAt: null, sessionMaxAgeDays: 30 }, null, now)).toBe(true);
  });
  it("builds the sign-out and sign-in paths", () => {
    expect(signedOutPath("acme")).toBe("/api/w/acme/session-expired");
    expect(signInAgainPath("acme")).toBe("/login?next=%2Fw%2Facme&reason=signed-out");
  });
});

describe("API key lifetime", () => {
  it("offers every choice with no limit", () => {
    expect(allowedKeyExpiryChoices(null).map((c) => c.days)).toEqual([30, 90, 180, 365, 0]);
    expect(defaultKeyExpiryDays(null)).toBe(90);
  });
  it("drops never and longer choices under a limit", () => {
    expect(allowedKeyExpiryChoices(90).map((c) => c.days)).toEqual([30, 90]);
    expect(defaultKeyExpiryDays(90)).toBe(90);
    expect(allowedKeyExpiryChoices(30).map((c) => c.days)).toEqual([30]);
    expect(defaultKeyExpiryDays(30)).toBe(30);
    expect(allowedKeyExpiryChoices(365).map((c) => c.days)).toEqual([30, 90, 180, 365]);
  });
  it("every offered choice passes the server check", () => {
    for (const max of [30, 90, 180, 365]) {
      for (const c of allowedKeyExpiryChoices(max)) {
        expect(checkApiKeyExpiry({ apiKeyMaxLifetimeDays: max }, expiryFromDays(c.days, now), now)).toEqual({ ok: true });
      }
    }
  });
  it("the server refuses never and longer keys under a limit", () => {
    expect(checkApiKeyExpiry({ apiKeyMaxLifetimeDays: 90 }, null, now).ok).toBe(false);
    expect(checkApiKeyExpiry({ apiKeyMaxLifetimeDays: 90 }, expiryFromDays(180, now), now).ok).toBe(false);
  });
  it("rotating brings a key within the limit", () => {
    const limit = { apiKeyMaxLifetimeDays: 30 };
    const in30 = new Date(now.getTime() + 30 * DAY);
    expect(rotatedKeyExpiry({ apiKeyMaxLifetimeDays: null }, null, now)).toBeNull();
    expect(rotatedKeyExpiry(limit, null, now)).toEqual(in30);
    expect(rotatedKeyExpiry(limit, new Date(now.getTime() + 300 * DAY), now)).toEqual(in30);
    const soon = new Date(now.getTime() + 5 * DAY);
    expect(rotatedKeyExpiry(limit, soon, now)).toEqual(soon);
  });
  it("lists active keys with no expiry, or past the limit", () => {
    const keys = [
      { id: "never", expiresAt: null, revokedAt: null },
      { id: "long", expiresAt: new Date(now.getTime() + 300 * DAY), revokedAt: null },
      { id: "short", expiresAt: new Date(now.getTime() + 10 * DAY), revokedAt: null },
      { id: "expired", expiresAt: new Date(now.getTime() - DAY), revokedAt: null },
      { id: "revoked", expiresAt: null, revokedAt: new Date(now.getTime() - DAY) },
    ];
    expect(keysOverLimit({ apiKeyMaxLifetimeDays: null }, keys, now).map((k) => k.id)).toEqual(["never"]);
    expect(keysOverLimit({ apiKeyMaxLifetimeDays: 90 }, keys, now).map((k) => k.id)).toEqual(["never", "long"]);
    expect(keysOverLimit({ apiKeyMaxLifetimeDays: 365 }, keys, now).map((k) => k.id)).toEqual(["never"]);
  });
});
