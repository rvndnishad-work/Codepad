import { describe, expect, it } from "vitest";
import { effectivePlan, FREE_SEAT_LIMIT, TRIAL_SEAT_LIMIT } from "@/lib/billing/trial";
import { planSummary } from "@/lib/billing/summary";
import { WORKSPACE_PLANS, checkoutSeatPriceCents, priceLabel, planConfig } from "@/lib/billing/plans";
import {
  checkRemoval,
  checkRoleChange,
  isInactive,
  seatUsage,
  shouldTouchActivity,
} from "@/lib/workspace/members";
import { overrideSummary } from "@/lib/workspace/role-explainer";

const now = new Date("2026-09-26T12:00:00Z");
const inNineDays = new Date("2026-10-05T12:00:00Z");
const yesterday = new Date("2026-09-25T12:00:00Z");

describe("seat limits", () => {
  it("uses the trial cap during a trial and the Free cap on Free", () => {
    expect(TRIAL_SEAT_LIMIT).toBe(5);
    expect(FREE_SEAT_LIMIT).toBe(WORKSPACE_PLANS.FREE.seatLimit);
    expect(effectivePlan({ planName: "FREE", trialEndsAt: inNineDays }, now).seatLimit).toBe(TRIAL_SEAT_LIMIT);
    expect(effectivePlan({ planName: "FREE", trialEndsAt: yesterday }, now).seatLimit).toBe(FREE_SEAT_LIMIT);
    expect(effectivePlan({ planName: "FREE" }, now).seatLimit).toBe(FREE_SEAT_LIMIT);
  });

  it("has no hard cap on paid per-seat plans", () => {
    expect(effectivePlan({ planName: "GROWTH" }, now).seatLimit).toBeNull();
    expect(effectivePlan({ planName: "ENTERPRISE", trialEndsAt: inNineDays }, now).seatLimit).toBeNull();
    expect(effectivePlan({ planName: "STARTER", stripeSubscriptionId: "sub_1" }, now).seatLimit).toBeNull();
  });

  it("counts pending invites toward the cap", () => {
    const trial = { planName: "FREE", trialEndsAt: inNineDays };
    expect(seatUsage(trial, { members: 3, pendingInvites: 1 }, now)).toMatchObject({
      used: 4,
      limit: 5,
      remaining: 1,
      full: false,
      onTrial: true,
    });
    expect(seatUsage(trial, { members: 4, pendingInvites: 1 }, now).full).toBe(true);
    // The old meter showed "of 3" during a trial; a trial with 4 people is not over its cap.
    expect(seatUsage({ planName: "FREE" }, { members: 3, pendingInvites: 0 }, now)).toMatchObject({ limit: 3, full: true });
    expect(seatUsage({ planName: "GROWTH" }, { members: 40, pendingInvites: 2 }, now)).toMatchObject({
      limit: null,
      remaining: null,
      full: false,
    });
  });
});

describe("plan heading", () => {
  it("never calls Enterprise a free trial", () => {
    const s = planSummary({ planName: "ENTERPRISE", trialEndsAt: inNineDays }, now);
    expect(s.heading).toBe("Enterprise");
    expect(s.trialDaysLeft).toBeNull();
    expect(s.compareKey).toBe("ENTERPRISE");
  });

  it("shows the trial countdown while a trial is active", () => {
    const s = planSummary({ planName: "FREE", trialEndsAt: inNineDays }, now);
    expect(s.heading).toBe("Trial of Growth");
    expect(s.trialDaysLeft).toBe(9);
    expect(s.body).toContain("5 Oct");
    expect(s.seatHint).toBe("Trials allow 5 seats. Free allows 3.");
    expect(s.trialUsed).toBeCloseTo(5 / 14);
  });

  it("says Free once the trial has ended, and Growth for Growth", () => {
    expect(planSummary({ planName: "FREE", trialEndsAt: yesterday }, now)).toMatchObject({
      heading: "Free",
      trialDaysLeft: null,
      compareKey: "FREE",
    });
    const growth = planSummary({ planName: "GROWTH", stripeSubscriptionId: "sub_1" }, now);
    expect(growth.heading).toBe("Growth");
    expect(growth.seatHint).toBe("Billed per seat at $49 a month.");
  });
});

describe("pricing config", () => {
  it("drives both the page and the checkout amount", () => {
    expect(priceLabel(WORKSPACE_PLANS.GROWTH)).toBe("$49 per seat a month");
    expect(priceLabel(WORKSPACE_PLANS.FREE)).toBe("$0");
    expect(priceLabel(WORKSPACE_PLANS.ENTERPRISE)).toBe("Talk to us");
    expect(checkoutSeatPriceCents("GROWTH", "monthly")).toBe(4900);
    expect(checkoutSeatPriceCents("GROWTH", "annual")).toBe(3900);
    expect(checkoutSeatPriceCents("STARTER", "monthly")).toBe(1900);
  });

  it("falls back to Free for unknown plan names", () => {
    expect(planConfig("SOMETHING_OLD").key).toBe("FREE");
    expect(planConfig(null).key).toBe("FREE");
  });
});

describe("role change guards", () => {
  const owner = { id: "m1", role: "OWNER" };
  const admin = { id: "m2", role: "ADMIN" };
  const recruiter = { id: "m3", role: "RECRUITER" };
  const team = [owner, admin, recruiter];

  it("cannot demote the last owner, even by themselves", () => {
    const r = checkRoleChange({ caller: owner, target: owner, nextRole: "ADMIN", members: team });
    expect(r).toEqual({ ok: false, status: 400, error: expect.stringContaining("only owner") });
  });

  it("can demote an owner when another owner remains", () => {
    const second = { id: "m4", role: "OWNER" };
    expect(checkRoleChange({ caller: owner, target: second, nextRole: "ADMIN", members: [...team, second] }).ok).toBe(true);
    expect(checkRoleChange({ caller: owner, target: owner, nextRole: "ADMIN", members: [...team, second] }).ok).toBe(true);
  });

  it("only an owner can give or take away the Owner role", () => {
    expect(checkRoleChange({ caller: admin, target: recruiter, nextRole: "OWNER", members: team })).toMatchObject({
      ok: false,
      status: 403,
    });
    const second = { id: "m4", role: "OWNER" };
    expect(checkRoleChange({ caller: admin, target: second, nextRole: "VIEWER", members: [...team, second] })).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(checkRoleChange({ caller: owner, target: recruiter, nextRole: "OWNER", members: team }).ok).toBe(true);
  });

  it("lets anyone with the permission move non-owners between other roles", () => {
    expect(checkRoleChange({ caller: admin, target: recruiter, nextRole: "INTERVIEWER", members: team }).ok).toBe(true);
    expect(checkRoleChange({ caller: admin, target: recruiter, nextRole: "RECRUITER", members: team }).ok).toBe(true);
  });

  it("rejects unknown roles", () => {
    expect(checkRoleChange({ caller: owner, target: recruiter, nextRole: "SUPERUSER", members: team })).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});

describe("removal guards", () => {
  const owner = { id: "m1", role: "OWNER" };
  const admin = { id: "m2", role: "ADMIN" };

  it("cannot remove the last owner", () => {
    expect(checkRemoval({ caller: owner, target: owner, members: [owner, admin] })).toMatchObject({ ok: false, status: 400 });
  });

  it("only an owner removes another owner", () => {
    const second = { id: "m3", role: "OWNER" };
    expect(checkRemoval({ caller: admin, target: second, members: [owner, admin, second] })).toMatchObject({ ok: false, status: 403 });
    expect(checkRemoval({ caller: owner, target: second, members: [owner, admin, second] }).ok).toBe(true);
    expect(checkRemoval({ caller: owner, target: admin, members: [owner, admin] }).ok).toBe(true);
  });
});

describe("last active", () => {
  it("writes at most once an hour", () => {
    expect(shouldTouchActivity(null, now)).toBe(true);
    expect(shouldTouchActivity(new Date(now.getTime() - 59 * 60_000), now)).toBe(false);
    expect(shouldTouchActivity(new Date(now.getTime() - 60 * 60_000), now)).toBe(true);
  });

  it("flags members unseen for more than 30 days", () => {
    expect(isInactive(null, now)).toBe(false);
    expect(isInactive(new Date(now.getTime() - 29 * 86_400_000), now)).toBe(false);
    expect(isInactive(new Date(now.getTime() - 41 * 86_400_000), now)).toBe(true);
  });
});

describe("override summary", () => {
  it("counts extra and removed permissions against the role", () => {
    const base = ["takehome:create", "interview:conduct"];
    expect(overrideSummary(base, { "candidate:manage_pipeline": true, "takehome:create": false })).toEqual({ added: 1, removed: 1 });
    // Overrides that match the role default change nothing.
    expect(overrideSummary(base, { "takehome:create": true })).toEqual({ added: 0, removed: 0 });
    expect(overrideSummary(base, null)).toEqual({ added: 0, removed: 0 });
  });
});
