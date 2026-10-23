import { describe, expect, it } from "vitest";
import { shouldPause, switchoverDate, switchoverGroup, switchoverNotice } from "./switchover";

const NOW = new Date("2026-11-01T00:00:00Z");
const base = { planName: "FREE", trialEndsAt: null, stripeSubscriptionId: null, prepaidThrough: null, prepaidSeats: null, prepaidCadence: null, accountPlanKey: null };

describe("switchover groups", () => {
  it("sorts workspaces by what they pay today", () => {
    expect(switchoverGroup(base, NOW)).toBe("free");
    expect(switchoverGroup({ ...base, trialEndsAt: new Date("2026-11-10T00:00:00Z") }, NOW)).toBe("free");
    expect(switchoverGroup({ ...base, planName: "GROWTH", stripeSubscriptionId: "sub_1" }, NOW)).toBe("stripe");
    expect(switchoverGroup({ ...base, planName: "GROWTH", prepaidThrough: new Date("2026-12-01T00:00:00Z"), prepaidCadence: "monthly" }, NOW)).toBe("prepaid");
    // Prepaid that already lapsed is treated as Free.
    expect(switchoverGroup({ ...base, planName: "GROWTH", prepaidThrough: new Date("2026-10-01T00:00:00Z") }, NOW)).toBe("free");
  });

  it("leaves new plans, pilots and Enterprise alone", () => {
    expect(switchoverGroup({ ...base, planName: "BASIC", accountPlanKey: "BASIC", prepaidThrough: new Date("2026-12-01T00:00:00Z") }, NOW)).toBe("none");
    expect(switchoverGroup({ ...base, planName: "GROWTH", prepaidCadence: "pilot", prepaidThrough: new Date("2026-11-10T00:00:00Z") }, NOW)).toBe("none");
    expect(switchoverGroup({ ...base, planName: "ENTERPRISE" }, NOW)).toBe("none");
  });

  it("dates the switch-over 30 days after it starts", () => {
    expect(switchoverDate(NOW).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("pausing", () => {
  const at = new Date("2026-12-01T00:00:00Z");
  const after = new Date("2026-12-02T00:00:00Z");
  it("waits for the date", () => {
    expect(shouldPause(base, at, NOW)).toBe(false);
    expect(shouldPause(base, null, after)).toBe(false);
    expect(shouldPause(base, at, after)).toBe(true);
  });
  it("never pauses anything that pays or is on a pilot", () => {
    expect(shouldPause({ ...base, planName: "GROWTH", stripeSubscriptionId: "sub_1" }, at, after)).toBe(false);
    expect(shouldPause({ ...base, planName: "TEAMS", prepaidThrough: new Date("2027-01-01T00:00:00Z") }, at, after)).toBe(false);
    expect(shouldPause({ ...base, planName: "GROWTH", prepaidCadence: "pilot", prepaidThrough: new Date("2026-12-10T00:00:00Z") }, at, after)).toBe(false);
    expect(shouldPause({ ...base, planName: "ENTERPRISE" }, at, after)).toBe(false);
    expect(shouldPause({ ...base, planName: "PAUSED" }, at, after)).toBe(false);
  });
  it("pauses old prepaid and new plans once they lapse", () => {
    expect(shouldPause({ ...base, planName: "GROWTH", prepaidThrough: new Date("2026-12-01T12:00:00Z") }, at, after)).toBe(true);
    expect(shouldPause({ ...base, planName: "FREE", accountPlanKey: "BASIC", prepaidThrough: new Date("2026-11-20T00:00:00Z") }, at, after)).toBe(true);
  });
});

describe("notices", () => {
  it("names the date and what happens", () => {
    const at = new Date("2026-12-01T00:00:00Z");
    expect(switchoverNotice("free", "Acme", at).title).toBe("Acme: the Free plan ends on 1 December 2026");
    expect(switchoverNotice("stripe", "Acme", at).body).toContain("not cut short");
    expect(switchoverNotice("prepaid", "Acme", at, new Date("2027-03-05T00:00:00Z")).body).toContain("runs to 5 March 2027");
  });
});
