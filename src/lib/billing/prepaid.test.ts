// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extendPrepaid, minPrepaidSeats, parseCadence, prepaidChargeCents, validSeatCount, PREPAID_MAX_SEATS } from "./prepaid";
import { effectivePlan, prepaidActive, prepaidLapsed, trialActive } from "./trial";
import { planSummary } from "./summary";

const growth = { monthlyCents: 4900, annualMonthlyCents: 3900 };
const now = new Date("2026-10-22T10:00:00Z");

describe("prepaid rules", () => {
  it("charges seats x twelve discounted months yearly, or the monthly price", () => {
    expect(prepaidChargeCents(3, "annual", growth)).toBe(3 * 3900 * 12);
    expect(prepaidChargeCents(3, "monthly", growth)).toBe(3 * 4900);
  });

  it("defaults an unknown cadence to yearly", () => {
    expect(parseCadence("monthly")).toBe("monthly");
    expect(parseCadence(undefined)).toBe("annual");
    expect(parseCadence("weekly")).toBe("annual");
  });

  it("needs a seat for everyone in or invited, and caps the count", () => {
    expect(minPrepaidSeats(0)).toBe(1);
    expect(validSeatCount(2, 3)).toBeNull();
    expect(validSeatCount(3, 3)).toBe(3);
    expect(validSeatCount("4", 3)).toBe(4);
    expect(validSeatCount(2.5, 1)).toBeNull();
    expect(validSeatCount(PREPAID_MAX_SEATS + 1, 1)).toBeNull();
  });

  it("starts a new period now, and adds to the end when renewing early", () => {
    expect(extendPrepaid(null, now, "annual").toISOString()).toBe("2027-10-22T10:00:00.000Z");
    expect(extendPrepaid(null, now, "monthly").toISOString()).toBe("2026-11-22T10:00:00.000Z");
    const ends = new Date("2026-12-01T00:00:00Z");
    expect(extendPrepaid(ends, now, "monthly").toISOString()).toBe("2027-01-01T00:00:00.000Z");
    // Already lapsed: the new period starts now, not at the old end.
    expect(extendPrepaid(new Date("2026-01-01T00:00:00Z"), now, "monthly").toISOString()).toBe("2026-11-22T10:00:00.000Z");
  });
});

describe("effectivePlan with prepaid Growth", () => {
  const paid = { planName: "GROWTH", trialEndsAt: new Date("2026-10-01T00:00:00Z"), prepaidThrough: new Date("2027-10-22T00:00:00Z"), prepaidSeats: 4 };

  it("is Growth capped at the seats paid for while paid up", () => {
    expect(prepaidActive(paid, now)).toBe(true);
    expect(effectivePlan(paid, now)).toMatchObject({ plan: "GROWTH", onTrial: false, seatLimit: 4 });
  });

  it("is Free the moment the period ends, before the sweep runs", () => {
    const later = new Date("2027-10-22T00:00:01Z");
    expect(prepaidLapsed(paid, later)).toBe(true);
    expect(effectivePlan(paid, later)).toMatchObject({ plan: "FREE", seatLimit: 3 });
  });

  it("a paid workspace never falls back into its trial", () => {
    const ws = { planName: "FREE", trialEndsAt: new Date("2026-11-01T00:00:00Z"), prepaidThrough: new Date("2026-10-01T00:00:00Z"), prepaidSeats: 2 };
    expect(trialActive(ws, now)).toBe(false);
    expect(effectivePlan(ws, now).plan).toBe("FREE");
  });

  it("a Stripe subscription wins over prepaid fields", () => {
    const ws = { ...paid, stripeSubscriptionId: "sub_1", prepaidThrough: new Date("2026-01-01T00:00:00Z") };
    expect(prepaidLapsed(ws, now)).toBe(false);
    expect(effectivePlan(ws, now)).toMatchObject({ plan: "GROWTH", seatLimit: null });
  });
});

describe("planSummary with prepaid Growth", () => {
  it("says when it is paid until and for how many seats", () => {
    const s = planSummary({ planName: "GROWTH", prepaidThrough: new Date("2027-10-22T00:00:00Z"), prepaidSeats: 4 }, now);
    expect(s.heading).toBe("Growth");
    expect(s.body).toContain("Paid until 22 Oct 2027 for 4 seats");
    expect(s.compareKey).toBe("GROWTH");
  });

  it("says the period ended, swept or not", () => {
    for (const planName of ["GROWTH", "FREE"]) {
      const s = planSummary({ planName, prepaidThrough: new Date("2026-10-01T00:00:00Z"), prepaidSeats: 4, trialEndsAt: new Date("2026-09-01T00:00:00Z") }, now);
      expect(s.heading).toBe("Free");
      expect(s.body).toContain("ended on 1 Oct 2026");
    }
  });
});
