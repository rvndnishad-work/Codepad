import { describe, expect, it } from "vitest";
import {
  accountPlanActive,
  amountDueCents,
  nextPaidThrough,
  planChange,
  planCreditsDue,
  planCreditStep,
  upgradeCredits,
  workspaceMirror,
} from "./account-plan";
import { effectivePlan, effectivePlanAllowsAiScreening, growthToolsEnabled } from "./trial";

const NOW = new Date("2026-11-15T00:00:00Z");
const plan = (planKey: string | null, cadence: string | null, paidThrough: string | null) => ({ planKey, planCadence: cadence, paidThrough });

describe("account plan state", () => {
  it("is active only for a self-serve plan paid past now", () => {
    expect(accountPlanActive(plan("BASIC", "monthly", "2026-12-01T00:00:00Z"), NOW)).toBe(true);
    expect(accountPlanActive(plan("BASIC", "monthly", "2026-11-01T00:00:00Z"), NOW)).toBe(false);
    expect(accountPlanActive(plan("ENTERPRISE", "annual", "2027-12-01T00:00:00Z"), NOW)).toBe(false);
    expect(accountPlanActive(plan(null, null, null), NOW)).toBe(false);
  });

  it("adds a period to the current end on renewal, else starts now", () => {
    const end = new Date("2026-12-10T00:00:00Z");
    expect(nextPaidThrough(end, NOW, "monthly", true).toISOString()).toBe("2027-01-10T00:00:00.000Z");
    expect(nextPaidThrough(end, NOW, "monthly", false).toISOString()).toBe("2026-12-15T00:00:00.000Z");
    expect(nextPaidThrough(null, NOW, "annual", true).toISOString()).toBe("2027-11-15T00:00:00.000Z");
    // A lapsed end date never backdates a renewal.
    expect(nextPaidThrough(new Date("2026-10-01T00:00:00Z"), NOW, "monthly", true).toISOString()).toBe("2026-12-15T00:00:00.000Z");
  });

  it("mirrors the plan onto workspaces while paid, and Free after", () => {
    const m = workspaceMirror(plan("TEAMS", "annual", "2027-01-01T00:00:00Z"), { seatsPerWorkspace: 25 }, NOW);
    expect(m).toEqual({ planName: "TEAMS", prepaidThrough: new Date("2027-01-01T00:00:00Z"), prepaidSeats: 25, prepaidCadence: "annual" });
    expect(workspaceMirror(plan("TEAMS", "annual", "2026-11-01T00:00:00Z"), { seatsPerWorkspace: 25 }, NOW).planName).toBe("FREE");
  });

  it("feeds the existing gates: Basic screens but has no Growth tools, Teams has both", () => {
    const basic = workspaceMirror(plan("BASIC", "monthly", "2026-12-01T00:00:00Z"), { seatsPerWorkspace: 3 }, NOW);
    const teams = workspaceMirror(plan("TEAMS", "monthly", "2026-12-01T00:00:00Z"), { seatsPerWorkspace: 25 }, NOW);
    expect(effectivePlan(basic, NOW)).toMatchObject({ plan: "BASIC", seatLimit: 3, onTrial: false });
    expect(effectivePlanAllowsAiScreening(basic, NOW)).toBe(true);
    expect(growthToolsEnabled(basic, NOW)).toBe(false);
    expect(effectivePlan(teams, NOW)).toMatchObject({ plan: "TEAMS", seatLimit: 25 });
    expect(growthToolsEnabled(teams, NOW)).toBe(true);
    // Lapsed but not yet swept: Free at once.
    expect(effectivePlan({ ...basic, prepaidThrough: new Date("2026-11-01T00:00:00Z") }, NOW).plan).toBe("FREE");
  });
});

describe("plan changes", () => {
  it("is new with no active plan, renew for the same plan and period", () => {
    expect(planChange(plan(null, null, null), "BASIC", "monthly", null, NOW)).toEqual({ kind: "new" });
    expect(planChange(plan("GROWTH", "monthly", "2026-12-01T00:00:00Z"), "GROWTH", "monthly", 5000, NOW)).toEqual({ kind: "renew" });
  });

  it("credits the unused share of the period on an upgrade", () => {
    // Monthly Basic, 1 Nov to 1 Dec (30 days), upgrading on 16 Nov: 15 days left.
    const a = plan("BASIC", "monthly", "2026-12-01T00:00:00Z");
    const c = planChange(a, "TEAMS", "monthly", 2000, new Date("2026-11-16T00:00:00Z"));
    expect(c).toEqual({ kind: "upgrade", creditCents: 1000 });
    expect(amountDueCents(10000, c)).toBe(9000);
    // Yearly Growth with half a year left.
    const y = planChange(plan("GROWTH", "annual", "2027-05-15T00:00:00Z"), "TEAMS", "annual", 50000, NOW);
    expect(y.kind).toBe("upgrade");
    expect(y.kind === "upgrade" && y.creditCents).toBe(Math.floor((50000 * (Date.parse("2027-05-15") - NOW.getTime())) / (Date.parse("2027-05-15") - Date.parse("2026-05-15"))));
  });

  it("blocks a downgrade or a period change until the current one ends", () => {
    const a = plan("TEAMS", "monthly", "2026-12-01T00:00:00Z");
    const down = planChange(a, "BASIC", "monthly", 10000, NOW);
    expect(down.kind).toBe("blocked");
    expect(down.kind === "blocked" && down.reason).toContain("1 Dec 2026");
    expect(planChange(a, "TEAMS", "annual", 10000, NOW).kind).toBe("blocked");
    // Yearly Basic up to monthly Teams: the credit could exceed the price.
    expect(planChange(plan("BASIC", "annual", "2027-06-01T00:00:00Z"), "TEAMS", "monthly", 20000, NOW).kind).toBe("blocked");
    expect(planChange(plan("BASIC", "monthly", "2026-12-01T00:00:00Z"), "TEAMS", "annual", 2000, NOW).kind).toBe("upgrade");
  });

  it("never charges below zero", () => {
    expect(amountDueCents(1000, { kind: "upgrade", creditCents: 5000 })).toBe(0);
  });
});

describe("monthly plan credits", () => {
  const base = { active: true, creditsPerMonth: 50, planCreditsLeft: 0, planCreditsLastGrant: 0, planCreditsGrantedAt: null as Date | null, balance: 0 };

  it("grants on the first run and a month later", () => {
    expect(planCreditsDue(base, NOW)).toBe(true);
    const granted = { ...base, planCreditsGrantedAt: new Date("2026-11-01T00:00:00Z") };
    expect(planCreditsDue(granted, NOW)).toBe(false);
    expect(planCreditsDue(granted, new Date("2026-12-01T00:00:00Z"))).toBe(true);
    expect(planCreditsDue({ ...base, active: false }, NOW)).toBe(false);
  });

  it("rolls unused credits over one month, then expires them", () => {
    // Month 1: 50 granted. Month 2: 20 of them left, all still within rollover.
    const m2 = planCreditStep({ ...base, planCreditsLeft: 20, planCreditsLastGrant: 50, balance: 20 });
    expect(m2).toEqual({ expire: 0, grant: 50, left: 70, lastGrant: 50 });
    // Month 3: 60 left, so 10 are from month 1 and expire.
    const m3 = planCreditStep({ ...base, planCreditsLeft: 60, planCreditsLastGrant: 50, balance: 60 });
    expect(m3).toEqual({ expire: 10, grant: 50, left: 100, lastGrant: 50 });
  });

  it("stops granting once the plan lapses and lets the rest expire", () => {
    const lapsed = planCreditStep({ ...base, active: false, planCreditsLeft: 30, planCreditsLastGrant: 50, balance: 30 });
    expect(lapsed).toEqual({ expire: 0, grant: 0, left: 30, lastGrant: 0 });
    expect(planCreditStep({ ...base, active: false, planCreditsLeft: 30, planCreditsLastGrant: 0, balance: 30 })).toEqual({ expire: 30, grant: 0, left: 0, lastGrant: 0 });
  });

  it("never expires more than the pool holds", () => {
    expect(planCreditStep({ ...base, planCreditsLeft: 60, planCreditsLastGrant: 0, balance: 5 }).expire).toBe(5);
  });

  it("tops up the difference on an upgrade", () => {
    expect(upgradeCredits(50, 400)).toBe(350);
    expect(upgradeCredits(400, 50)).toBe(0);
  });
});
