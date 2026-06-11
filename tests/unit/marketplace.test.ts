import { describe, it, expect } from "vitest";
import { resolveAccess } from "../../src/lib/marketplace/entitlements";
import { feeSplit } from "../../src/lib/marketplace/earnings";

describe("resolveAccess — entitlement decision", () => {
  const base = {
    viewerId: "viewer1",
    ownerId: "creator1",
    viewerCanModerate: false,
    hasEntitlementRow: false,
    hasActiveSubscription: false,
  };

  it("denies anonymous viewers", () => {
    expect(resolveAccess({ ...base, viewerId: null })).toBe(false);
  });

  it("grants the content owner", () => {
    expect(resolveAccess({ ...base, viewerId: "creator1" })).toBe(true);
  });

  it("grants a content moderator", () => {
    expect(resolveAccess({ ...base, viewerCanModerate: true })).toBe(true);
  });

  it("grants a one-time purchaser (entitlement row)", () => {
    expect(resolveAccess({ ...base, hasEntitlementRow: true })).toBe(true);
  });

  it("grants an active subscriber", () => {
    expect(resolveAccess({ ...base, hasActiveSubscription: true })).toBe(true);
  });

  it("denies a viewer with none of the above", () => {
    expect(resolveAccess(base)).toBe(false);
  });
});

describe("feeSplit — platform fee math", () => {
  it("splits 20% (2000 bps) of $10.00", () => {
    expect(feeSplit(1000, 2000)).toEqual({ grossCents: 1000, feeCents: 200, netCents: 800 });
  });

  it("rounds the fee down (creator never under-paid)", () => {
    // 15% of 999 = 149.85 → fee floored to 149, creator gets 850
    expect(feeSplit(999, 1500)).toEqual({ grossCents: 999, feeCents: 149, netCents: 850 });
  });

  it("clamps out-of-range basis points", () => {
    expect(feeSplit(1000, -50)).toEqual({ grossCents: 1000, feeCents: 0, netCents: 1000 });
    expect(feeSplit(1000, 99999)).toEqual({ grossCents: 1000, feeCents: 1000, netCents: 0 });
  });

  it("zero fee leaves the full amount with the creator", () => {
    expect(feeSplit(5000, 0)).toEqual({ grossCents: 5000, feeCents: 0, netCents: 5000 });
  });
});
