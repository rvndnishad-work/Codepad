/**
 * API key expiry, stale flag and the MCP auth check that enforces expiry.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  mcpApiKey: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { authenticateRequest, hashApiKey, keyRefusal } from "@/lib/mcp/auth";
import { accessLabel, cleanKeyName, expiryFromDays, expiryLabel, keyHealth } from "@/lib/mcp/keys";

const NOW = new Date("2026-09-26T12:00:00.000Z");
const DAY = 86_400_000;
const TOKEN = "ip_live_0123456789abcdef0123456789abcdef";

function keyRow(over: Record<string, unknown> = {}) {
  return {
    id: "k1",
    label: "Priya, Claude desktop",
    keyHash: hashApiKey(TOKEN),
    scopes: '["read","write"]',
    revokedAt: null,
    expiresAt: null,
    workspace: {
      id: "ws1",
      slug: "northwind",
      name: "Northwind",
      planName: "GROWTH",
      trialEndsAt: null,
      stripeSubscriptionId: "sub_1",
    },
    ...over,
  };
}

const req = (token = TOKEN) => new Request("https://example.test/api/mcp", { headers: { authorization: `Bearer ${token}` } });

describe("keyRefusal", () => {
  it("accepts a live key with or without an expiry", () => {
    expect(keyRefusal({ revokedAt: null, expiresAt: null }, NOW)).toBeNull();
    expect(keyRefusal({ revokedAt: null, expiresAt: new Date(NOW.getTime() + 1000) }, NOW)).toBeNull();
  });

  it("refuses revoked keys and keys at or past their expiry", () => {
    expect(keyRefusal({ revokedAt: new Date(0), expiresAt: null }, NOW)).toBe("revoked");
    expect(keyRefusal({ revokedAt: null, expiresAt: NOW }, NOW)).toBe("expired");
    expect(keyRefusal({ revokedAt: null, expiresAt: new Date(NOW.getTime() - DAY) }, NOW)).toBe("expired");
  });
});

describe("authenticateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.mcpApiKey.update.mockResolvedValue({});
  });

  it("lets a key with a future expiry through and records the use", async () => {
    db.mcpApiKey.findUnique.mockResolvedValue(keyRow({ expiresAt: new Date(Date.now() + 10 * DAY) }));
    const auth = await authenticateRequest(req());
    expect(auth).toMatchObject({ apiKeyId: "k1", workspaceId: "ws1", scopes: ["read", "write"] });
    expect(db.mcpApiKey.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { keyHash: hashApiKey(TOKEN) } }));
    expect(db.mcpApiKey.update).toHaveBeenCalledTimes(1);
  });

  it("refuses an expired key and does not touch last used", async () => {
    db.mcpApiKey.findUnique.mockResolvedValue(keyRow({ expiresAt: new Date(Date.now() - 1000) }));
    expect(await authenticateRequest(req())).toBeNull();
    expect(db.mcpApiKey.update).not.toHaveBeenCalled();
  });

  it("refuses a revoked key", async () => {
    db.mcpApiKey.findUnique.mockResolvedValue(keyRow({ revokedAt: new Date() }));
    expect(await authenticateRequest(req())).toBeNull();
  });

  it("refuses tokens without the key prefix before looking anything up", async () => {
    expect(await authenticateRequest(req("sk_live_nope"))).toBeNull();
    expect(db.mcpApiKey.findUnique).not.toHaveBeenCalled();
  });
});

describe("expiry choices", () => {
  it("turns an offered choice into a date and 0 into never", () => {
    expect(expiryFromDays(90, NOW)).toEqual(new Date(NOW.getTime() + 90 * DAY));
    expect(expiryFromDays(0, NOW)).toBeNull();
    expect(expiryFromDays(undefined, NOW)).toBeNull();
  });

  it("rejects anything else", () => {
    expect(() => expiryFromDays(36500, NOW)).toThrow("Pick one of the offered expiry options.");
    expect(() => expiryFromDays(-5, NOW)).toThrow();
  });
});

describe("keyHealth", () => {
  const base = { createdAt: new Date(NOW.getTime() - 200 * DAY), revokedAt: null, expiresAt: null };

  it("flags an active key unused for 30 days or more as stale", () => {
    expect(keyHealth({ ...base, lastUsedAt: new Date(NOW.getTime() - 94 * DAY) }, NOW)).toEqual({
      state: "active",
      stale: true,
      idleDays: 94,
      expiresInDays: null,
    });
    expect(keyHealth({ ...base, lastUsedAt: new Date(NOW.getTime() - 29 * DAY) }, NOW).stale).toBe(false);
  });

  it("counts a never-used key from when it was created", () => {
    expect(keyHealth({ ...base, createdAt: new Date(NOW.getTime() - 3 * DAY), lastUsedAt: null }, NOW)).toMatchObject({ stale: false, idleDays: 3 });
    expect(keyHealth({ ...base, lastUsedAt: null }, NOW)).toMatchObject({ stale: true, idleDays: 200 });
  });

  it("does not call revoked or expired keys stale", () => {
    expect(keyHealth({ ...base, lastUsedAt: null, revokedAt: NOW }, NOW)).toMatchObject({ state: "revoked", stale: false });
    expect(keyHealth({ ...base, lastUsedAt: null, expiresAt: new Date(NOW.getTime() - DAY) }, NOW)).toMatchObject({ state: "expired", stale: false });
  });

  it("labels expiry plainly", () => {
    const k = (days: number | null) => ({ ...base, lastUsedAt: null, expiresAt: days === null ? null : new Date(NOW.getTime() + days * DAY) });
    expect(expiryLabel(k(null), NOW)).toBe("Never");
    expect(expiryLabel(k(76.5), NOW)).toBe("In 76 days");
    expect(expiryLabel(k(1.2), NOW)).toBe("Tomorrow");
    expect(expiryLabel(k(0.5), NOW)).toBe("Today");
    expect(expiryLabel(k(-1), NOW)).toBe("Expired");
  });
});

describe("names and access", () => {
  it("cleans and validates key names", () => {
    expect(cleanKeyName("  Weekly   hiring report ")).toBe("Weekly hiring report");
    expect(() => cleanKeyName("   ")).toThrow("Give the key a name.");
    expect(() => cleanKeyName("x".repeat(61))).toThrow();
  });

  it("describes access", () => {
    expect(accessLabel(["read"])).toBe("Read only");
    expect(accessLabel(["read", "write"])).toBe("Read and write");
  });
});
