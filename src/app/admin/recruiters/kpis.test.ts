import { describe, expect, it } from "vitest";
import type { HiringStats } from "@/lib/admin/stats/hiring";
import { bucketDays, buildCompletion, buildKpis, kpiCsv, shortDay, usd } from "./kpis";
import { validateSwitchInput } from "@/app/admin/_components/switch-control/validate";

const now = new Date("2026-10-02T12:00:00Z");

const stats: HiringStats = {
  range: 30,
  since: "2026-09-03T00:00:00.000Z",
  generatedAt: now.toISOString(),
  revenue: {
    mrrCents: 431200,
    subscriptions: 23,
    lastSyncedAt: new Date(now.getTime() - 6 * 60_000).toISOString(),
    creditPacks: { cents: 12900, packs: 1, credits: 50, unpriced: 0, priceSource: "pack table" },
  },
  paid: { total: 23, byPlan: [{ plan: "GROWTH", label: "Growth", count: 19 }, { plan: "ENTERPRISE", label: "Enterprise", count: 4 }] },
  seats: { billed: 88, members: 91, unbilled: 3, unbilledWorkspaces: 2 },
  credits: { used: 1240, refunded: 9, included: 318, bought: 922, estimated: false, days: [{ day: "2026-10-02", used: 96, included: 40, bought: 56, refunded: 0 }], peak: null },
  trials: { active: 14, endingIn7Days: 5, ended: 11, converted: 4, conversionRate: 4 / 11 },
  video: { workspaces: 9, recordedSeconds: 38 * 3600, storedBytes: 12.4e9, expiring48hBytes: 0, expiring48hCount: 0 },
  screenings: { total: 486, completed: 345, expired: 20, refunded: 9, completionRate: 345 / 486 },
  takeHomes: { total: 233, submitted: 135, completionRate: 135 / 233 },
  interviews: { total: 212, completed: 190, abandoned: 7, completionRate: 0.9, medianMinutes: 46 },
};

describe("buildKpis", () => {
  it("matches the board wording", () => {
    const k = Object.fromEntries(buildKpis(stats, now).map((x) => [x.id, x]));
    expect(k.revenue.value).toBe("$4,312");
    expect(k.revenue.detail).toBe("Stripe, synced 6 min ago; $129 packs in 30 d");
    expect(k.paid.detail).toBe("19 Growth, 4 Enterprise");
    expect(k.seats.suffix).toBe("of 91 members");
    expect(k.seats.suffixTone).toBe("warn");
    expect(k.seats.detail).toBe("3 unbilled in 2 workspaces");
    expect(k.credits.detail).toBe("318 included, 922 bought; 9 refunded");
    expect(k.trials.detail).toBe("5 end this week, 36% convert");
    expect(k.video.detail).toBe("38 h recorded, 12.4 GB stored");
  });
  it("completion cards", () => {
    const c = buildCompletion(stats);
    expect(c.map((x) => x.detail)).toEqual(["71% completed, 9 refunded", "58% submitted", "7 abandoned, median 46 min"]);
    expect(c[0].label).toBe("AI screenings, 30 d");
    expect(shortDay("2026-10-02")).toBe("2 Oct");
  });
});

describe("usd", () => {
  it("drops cents on large amounts and keeps them on small ones", () => {
    expect(usd(431200)).toBe("$4,312");
    expect(usd(1550)).toBe("$15.5");
    expect(usd(0)).toBe("$0");
  });
});

describe("bucketDays", () => {
  const days = Array.from({ length: 10 }, (_, i) => ({ day: `d${i}`, used: 1, included: null, bought: null, refunded: 0 }));
  it("keeps daily when size is 1", () => {
    expect(bucketDays(days, 1)).toHaveLength(10);
  });
  it("aligns weeks so the last ends today", () => {
    const w = bucketDays(days, 7);
    expect(w.map((b) => [b.start, b.end, b.used])).toEqual([
      ["d0", "d2", 3],
      ["d3", "d9", 7],
    ]);
  });
});

describe("kpiCsv", () => {
  it("has a header, quotes commas and includes daily rows", () => {
    const csv = kpiCsv(stats, now);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("Metric,Value");
    expect(lines).toContain("Revenue a month (USD cents),431200");
    expect(lines).toContain("AI credits used on 2026-10-02,96");
    expect(csv).toContain('"Credit pack revenue in 30 d (USD cents, from pack table)",12900');
  });
});

describe("validateSwitchInput", () => {
  const base = { key: "ai-screening", state: "off" as const, note: "Provider outage" };
  it("requires a note", () => {
    expect(validateSwitchInput({ ...base, note: " " }, now)).toEqual({ ok: false, error: "Write a short note saying why." });
  });
  it("rejects a past resume time and accepts a future one", () => {
    expect(validateSwitchInput({ ...base, resumeAt: "2026-10-01T00:00:00Z" }, now).ok).toBe(false);
    const r = validateSwitchInput({ ...base, resumeAt: "2026-10-03T00:00:00Z", message: "  Back soon  " }, now);
    expect(r.ok && r.value.resumeAt?.toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(r.ok && r.value.message).toBe("Back soon");
  });
  it("drops message and resume time when turning on", () => {
    const r = validateSwitchInput({ ...base, state: "on", message: "x", resumeAt: "2026-10-03T00:00:00Z" }, now);
    expect(r.ok && r.value).toMatchObject({ state: "on", message: null, resumeAt: null });
  });
  it("rejects an unknown state", () => {
    expect(validateSwitchInput({ ...base, state: "paused" as never }, now).ok).toBe(false);
  });
});
