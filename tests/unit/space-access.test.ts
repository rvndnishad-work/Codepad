import { describe, it, expect } from "vitest";
import { resolveSpaceAccess } from "../../src/lib/marketplace/access";

describe("resolveSpaceAccess — tiered space content gating", () => {
  const base = {
    viewerId: "viewer1",
    ownerId: "creator1",
    viewerCanModerate: false,
    accessTierRank: 2,
    hasPurchase: false,
    membershipRank: null as number | null,
  };

  it("free content (accessTierRank null) is open to everyone, even anonymous", () => {
    expect(resolveSpaceAccess({ ...base, viewerId: null, accessTierRank: null })).toBe(true);
  });

  it("the owner always has access", () => {
    expect(resolveSpaceAccess({ ...base, viewerId: "creator1" })).toBe(true);
  });

  it("a content:moderate holder has access (staff override)", () => {
    expect(resolveSpaceAccess({ ...base, viewerCanModerate: true })).toBe(true);
  });

  it("a one-time purchaser has access", () => {
    expect(resolveSpaceAccess({ ...base, hasPurchase: true })).toBe(true);
  });

  it("a subscriber at a sufficient tier rank has access (all-access)", () => {
    expect(resolveSpaceAccess({ ...base, membershipRank: 2 })).toBe(true);
    expect(resolveSpaceAccess({ ...base, membershipRank: 5 })).toBe(true);
  });

  it("a subscriber below the required rank is denied", () => {
    expect(resolveSpaceAccess({ ...base, membershipRank: 1 })).toBe(false);
  });

  it("a non-subscriber, non-owner, non-purchaser is denied gated content", () => {
    expect(resolveSpaceAccess(base)).toBe(false);
  });

  it("anonymous is denied gated content", () => {
    expect(resolveSpaceAccess({ ...base, viewerId: null })).toBe(false);
  });
});
