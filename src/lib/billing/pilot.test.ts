import { describe, expect, it } from "vitest";
import { isPilot, pilotActive, pilotCreditsToExpire, pilotDaysLeft, pilotEnd, pilotInputErrors } from "./pilot";

const now = new Date("2026-10-22T12:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);
const pilot = (through: Date, extra: Record<string, unknown> = {}) => ({ planName: "GROWTH", prepaidThrough: through, prepaidCadence: "pilot", stripeSubscriptionId: null, ...extra });

describe("pilot state", () => {
  it("is a pilot only with the pilot cadence, an end date and no Stripe subscription", () => {
    expect(isPilot(pilot(inDays(5)))).toBe(true);
    expect(isPilot(pilot(inDays(5), { prepaidCadence: "yearly" }))).toBe(false);
    expect(isPilot(pilot(inDays(5), { stripeSubscriptionId: "sub_1" }))).toBe(false);
    expect(isPilot(pilot(inDays(5), { prepaidThrough: null }))).toBe(false);
  });

  it("is active until the end date while on Growth", () => {
    expect(pilotActive(pilot(inDays(1)), now)).toBe(true);
    expect(pilotActive(pilot(inDays(-1)), now)).toBe(false);
    expect(pilotActive(pilot(inDays(1), { planName: "FREE" }), now)).toBe(false);
  });

  it("counts whole days left, rounding up, and at least 1", () => {
    expect(pilotDaysLeft(pilot(inDays(14)), now)).toBe(14);
    expect(pilotDaysLeft(pilot(inDays(2.2)), now)).toBe(3);
    expect(pilotDaysLeft(pilot(new Date(now.getTime() + 60_000)), now)).toBe(1);
    expect(pilotDaysLeft(pilot(inDays(-1)), now)).toBeNull();
  });
});

describe("pilotEnd", () => {
  it("starts from now for a new or ended pilot", () => {
    expect(pilotEnd(null, now, 14).toISOString()).toBe(inDays(14).toISOString());
    expect(pilotEnd(inDays(-3), now, 7).toISOString()).toBe(inDays(7).toISOString());
  });
  it("adds to a running pilot", () => {
    expect(pilotEnd(inDays(2), now, 7).toISOString()).toBe(inDays(9).toISOString());
  });
});

describe("pilotInputErrors", () => {
  it("accepts the defaults", () => {
    expect(pilotInputErrors({ days: 14, seats: 5, credits: 30 })).toEqual([]);
    expect(pilotInputErrors({ days: "30", seats: "50", credits: "0" })).toEqual([]);
  });
  it("rejects other lengths, bad seats and too many credits", () => {
    const errs = pilotInputErrors({ days: 10, seats: 0, credits: 501 });
    expect(errs).toHaveLength(3);
    expect(errs[0]).toContain("7, 14, 30");
    expect(pilotInputErrors({ days: 7, seats: 2.5, credits: 1 })).toHaveLength(1);
    expect(pilotInputErrors({ days: 7, seats: "", credits: 1 })).toHaveLength(1);
  });
});

describe("pilotCreditsToExpire", () => {
  it("expires what is left of the pilot credits", () => {
    expect(pilotCreditsToExpire({ granted: 30, usedSince: 14, refundedSince: 0, balance: 16 })).toBe(16);
  });
  it("counts refunds back", () => {
    expect(pilotCreditsToExpire({ granted: 30, usedSince: 14, refundedSince: 2, balance: 18 })).toBe(18);
  });
  it("never expires bought credits: pilot credits are used first", () => {
    // 30 pilot + 25 bought; 10 used. 20 pilot left, 45 balance.
    expect(pilotCreditsToExpire({ granted: 30, usedSince: 10, refundedSince: 0, balance: 45 })).toBe(20);
  });
  it("is zero when the pilot credits are used up, and never more than the balance", () => {
    expect(pilotCreditsToExpire({ granted: 30, usedSince: 40, refundedSince: 0, balance: 5 })).toBe(0);
    expect(pilotCreditsToExpire({ granted: 30, usedSince: 0, refundedSince: 0, balance: 12 })).toBe(12);
  });
});
