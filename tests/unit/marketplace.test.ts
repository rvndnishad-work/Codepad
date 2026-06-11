import { describe, it, expect } from "vitest";
import { feeSplit } from "../../src/lib/marketplace/earnings";

// Access-decision tests live in space-access.test.ts (resolveSpaceAccess).

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
