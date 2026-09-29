import { describe, expect, it } from "vitest";
import {
  INCLUDED_CREDITS_PER_SEAT,
  TRIAL_CREDITS,
  addOneMonth,
  grantDue,
  includedPart,
  includedStep,
  type IncludedState,
} from "@/lib/billing/included-credits";
import { PUBLIC_CREDIT_PACKS, PUBLIC_PRICING_FAQ, PUBLIC_PLANS } from "@/lib/billing/public-pricing";

const base: IncludedState = {
  planName: "GROWTH",
  seats: 3,
  includedCreditsLeft: 0,
  includedCreditsLastGrant: 0,
  includedCreditsGrantedAt: null,
  balance: 0,
};

/** Runs one monthly step and applies it, the way the server does. */
function month(s: IncludedState, used = 0): IncludedState {
  const step = includedStep(s);
  const balance = s.balance - step.expire + step.grant;
  const left = step.left;
  const fromIncluded = includedPart(used, left);
  return {
    ...s,
    includedCreditsLeft: left - fromIncluded,
    includedCreditsLastGrant: step.lastGrant,
    balance: balance - used,
  };
}

describe("included credits", () => {
  it("uses the promised numbers", () => {
    expect(INCLUDED_CREDITS_PER_SEAT).toBe(10);
    expect(TRIAL_CREDITS).toBe(10);
  });

  it("grants 10 per seat to a paid workspace that was never granted", () => {
    expect(grantDue(base)).toBe(true);
    expect(includedStep(base)).toEqual({ expire: 0, grant: 30, left: 30, lastGrant: 30 });
  });

  it("does not grant to a free or trial workspace", () => {
    const free = { ...base, planName: "FREE" };
    expect(grantDue(free)).toBe(false);
    expect(includedStep(free).grant).toBe(0);
  });

  it("is due again one calendar month after the last grant, not before", () => {
    const at = new Date("2026-01-31T03:10:00Z");
    const s = { ...base, includedCreditsGrantedAt: at };
    expect(addOneMonth(at).toISOString()).toBe("2026-02-28T03:10:00.000Z");
    expect(grantDue(s, new Date("2026-02-27T23:00:00Z"))).toBe(false);
    expect(grantDue(s, new Date("2026-02-28T03:10:00Z"))).toBe(true);
  });

  it("rolls unused credits over one month, then expires them", () => {
    let s = month(base); // month 1: +30
    expect(s).toMatchObject({ includedCreditsLeft: 30, balance: 30 });
    s = month(s, 0); // month 2: nothing used, 30 roll over, +30
    expect(s).toMatchObject({ includedCreditsLeft: 60, balance: 60 });
    const step = includedStep(s); // month 3: the month-1 credits expire
    expect(step).toEqual({ expire: 30, grant: 30, left: 60, lastGrant: 30 });
  });

  it("uses included credits oldest first so less expires", () => {
    let s = month(base); // +30
    s = month(s, 0); // 60 left, 30 of them from month 1
    s = { ...s, includedCreditsLeft: s.includedCreditsLeft - includedPart(40, s.includedCreditsLeft), balance: s.balance - 40 };
    expect(includedStep(s)).toEqual({ expire: 0, grant: 30, left: 50, lastGrant: 30 });
  });

  it("never expires bought credits", () => {
    const s = { ...base, includedCreditsLeft: 25, includedCreditsLastGrant: 10, balance: 5 };
    // 15 included credits are old, but only 5 credits are in the balance at all.
    expect(includedStep(s).expire).toBe(5);
    const withPack = { ...s, balance: 525 };
    expect(includedStep(withPack).expire).toBe(15);
  });

  it("lets a workspace that stopped paying keep its last month, then expires it", () => {
    const s: IncludedState = { ...base, planName: "FREE", includedCreditsLeft: 30, includedCreditsLastGrant: 30, includedCreditsGrantedAt: new Date("2026-01-01Z"), balance: 30 };
    expect(grantDue(s, new Date("2026-02-01Z"))).toBe(true);
    const first = includedStep(s);
    expect(first).toEqual({ expire: 0, grant: 0, left: 30, lastGrant: 0 });
    const second = includedStep({ ...s, includedCreditsLastGrant: first.lastGrant });
    expect(second).toEqual({ expire: 30, grant: 0, left: 0, lastGrant: 0 });
  });

  it("takes a charge from included credits up to what is left", () => {
    expect(includedPart(3, 10)).toBe(3);
    expect(includedPart(3, 2)).toBe(2);
    expect(includedPart(3, 0)).toBe(0);
  });
});

describe("pricing shows the included credits", () => {
  it("offers the agency pack below the other packs per credit", () => {
    const agency = PUBLIC_CREDIT_PACKS.find((p) => p.id === "agency-1000");
    expect(agency).toMatchObject({ credits: 1000, price: "$1,790", perCredit: "$1.79" });
  });

  it("tells buyers about included and trial credits", () => {
    const growth = PUBLIC_PLANS.find((p) => p.key === "GROWTH")!;
    expect(growth.includes.join(" ")).toContain("10 credits per seat each month");
    expect(PUBLIC_PRICING_FAQ.map((f) => f.a).join(" ")).toContain("roll over for one month");
    expect(PUBLIC_PRICING_FAQ.map((f) => f.a).join(" ")).not.toContain("do not expire at the end of the month");
  });
});
