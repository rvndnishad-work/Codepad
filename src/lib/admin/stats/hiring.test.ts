import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import {
  creditPackRevenue,
  dayKeys,
  daysUntil,
  firstUncoveredDay,
  mergeCreditDays,
  parseRange,
  peakDay,
  rangeStart,
  rate,
  shortDate,
} from "./hiring";

const now = new Date("2026-10-02T15:30:00Z");

describe("parseRange", () => {
  it("accepts 7d/30d/90d/12m and bare numbers, defaults to 30", () => {
    expect(parseRange("7d")).toBe(7);
    expect(parseRange("90")).toBe(90);
    expect(parseRange("12m")).toBe(365);
    expect(parseRange(["7d", "30d"])).toBe(7);
    expect(parseRange("14d")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });
});

describe("rangeStart and dayKeys", () => {
  it("counts today as one of the days", () => {
    expect(rangeStart(7, now).toISOString()).toBe("2026-09-26T00:00:00.000Z");
    const keys = dayKeys(rangeStart(7, now), now);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2026-09-26");
    expect(keys[6]).toBe("2026-10-02");
  });
  it("crosses a month end", () => {
    expect(dayKeys(rangeStart(30, now), now)).toHaveLength(30);
  });
});

describe("firstUncoveredDay", () => {
  const keys = ["2026-09-30", "2026-10-01", "2026-10-02"];
  it("starts live at the first gap", () => {
    expect(firstUncoveredDay(keys, new Set(["2026-09-30"]), "2026-10-02")).toBe("2026-10-01");
  });
  it("always reads today live", () => {
    expect(firstUncoveredDay(keys, new Set(keys), "2026-10-02")).toBe("2026-10-02");
  });
  it("returns null when the range ends before today and is covered", () => {
    expect(firstUncoveredDay(keys, new Set(keys), "2026-10-05")).toBeNull();
  });
});

describe("mergeCreditDays", () => {
  const keys = ["2026-09-30", "2026-10-01", "2026-10-02"];
  it("uses roll-ups where present and live rows elsewhere", () => {
    const days = mergeCreditDays(
      keys,
      [
        { day: "2026-09-30", metric: "ai_credits_included", value: 4 },
        { day: "2026-09-30", metric: "ai_credits_bought", value: 6 },
        { day: "2026-09-30", metric: "ai_credits_refunded", value: 1 },
      ],
      [
        { day: "2026-10-02", kind: "CONSUMPTION", amount: -12 },
        { day: "2026-10-02", kind: "REFUND", amount: 2 },
      ],
    );
    expect(days).toEqual([
      { day: "2026-09-30", used: 10, included: 4, bought: 6, refunded: 1 },
      { day: "2026-10-01", used: 0, included: null, bought: null, refunded: 0 },
      { day: "2026-10-02", used: 12, included: null, bought: null, refunded: 2 },
    ]);
  });
});

describe("peakDay", () => {
  it("takes the highest, latest on a tie, and ignores all-zero", () => {
    expect(peakDay([{ day: "a", used: 5 }, { day: "b", used: 9 }, { day: "c", used: 9 }])).toEqual({ day: "c", used: 9 });
    expect(peakDay([{ day: "a", used: 0 }])).toBeNull();
  });
});

describe("creditPackRevenue", () => {
  const defaults = [
    { credits: 10, priceCents: 2900 },
    { credits: 50, priceCents: 12900 },
  ];
  it("prices by effective pack first, then default, and counts the rest unpriced", () => {
    const r = creditPackRevenue(
      [
        { credits: 50, count: 2 },
        { credits: 10, count: 3 },
        { credits: 37, count: 1 },
      ],
      [{ credits: 50, priceCents: 9900 }],
      defaults,
    );
    expect(r).toEqual({ cents: 2 * 9900 + 3 * 2900, packs: 6, credits: 100 + 30 + 37, unpriced: 1 });
  });
});

describe("rate and daysUntil", () => {
  it("formats short dates like the board", () => {
    expect(shortDate(new Date("2026-09-29T23:00:00Z"))).toBe("29 Sep");
  });
  it("returns null with nothing to divide by", () => {
    expect(rate(1, 0)).toBeNull();
    expect(rate(1, 4)).toBe(0.25);
  });
  it("rounds days up", () => {
    expect(daysUntil(new Date("2026-10-04T15:00:00Z"), now)).toBe(2);
    expect(daysUntil(new Date("2026-10-02T16:00:00Z"), now)).toBe(1);
  });
});
