import { describe, expect, it } from "vitest";
import {
  approxP95FromDaily,
  comparePeriods,
  comparisonText,
  csvCell,
  fillBuckets,
  isNewTracking,
  p95,
  parseRange,
  peakOf,
  percentile,
  providerLabel,
  providerShares,
  rangeWindow,
  shouldUseRollup,
  shortDay,
  utcWeek,
} from "./developer-helpers";

const d = (s: string) => new Date(s);

describe("percentile / p95", () => {
  it("returns null for no values", () => {
    expect(p95([])).toBeNull();
  });
  it("matches Postgres percentile_cont (linear interpolation)", () => {
    // percentile_cont(0.95) over 1..20 = 19.05
    expect(p95(Array.from({ length: 20 }, (_, i) => i + 1))).toBeCloseTo(19.05, 10);
    // percentile_cont(0.5) over {1,2,3,4} = 2.5
    expect(percentile([4, 1, 3, 2], 0.5)).toBe(2.5);
    expect(p95([700])).toBe(700);
  });
  it("ignores non-finite values and sorts input", () => {
    expect(percentile([10, NaN, 0], 1)).toBe(10);
  });
  it("weights daily p95s by run count", () => {
    expect(approxP95FromDaily([{ p95: 1000, count: 1 }, { p95: 2000, count: 3 }, { p95: null, count: 5 }])).toBe(1750);
    expect(approxP95FromDaily([])).toBeNull();
  });
});

describe("comparePeriods", () => {
  it("gives whole-percent change and direction", () => {
    expect(comparePeriods(109, 100)).toMatchObject({ pct: 9, direction: "up" });
    expect(comparePeriods(50, 100)).toMatchObject({ pct: -50, direction: "down" });
    expect(comparePeriods(100, 100)).toMatchObject({ pct: 0, direction: "flat" });
  });
  it("has no percentage when the previous period was empty", () => {
    expect(comparePeriods(5, 0)).toMatchObject({ pct: null, direction: "up" });
    expect(comparePeriods(0, 0)).toMatchObject({ pct: null, direction: "flat" });
  });
  it("reads as text", () => {
    expect(comparisonText(comparePeriods(109, 100))).toBe("+9% on the period before");
    expect(comparisonText(comparePeriods(90, 100), "the month before")).toBe("-10% on the month before");
    expect(comparisonText(comparePeriods(3, 0))).toBe("none in the period before");
  });
});

describe("provider mapping", () => {
  it("maps Account.provider to labels; no account is email", () => {
    expect(providerLabel("google")).toBe("Google");
    expect(providerLabel("github")).toBe("GitHub");
    expect(providerLabel("facebook")).toBe("Facebook");
    expect(providerLabel(null)).toBe("Email");
    expect(providerLabel("credentials")).toBe("Email");
    expect(providerLabel("gitlab")).toBe("Gitlab");
  });
  it("merges rows by label and gives shares largest first", () => {
    const s = providerShares([
      { provider: "google", count: 61 },
      { provider: null, count: 7 },
      { provider: "credentials", count: 5 },
      { provider: "github", count: 27 },
    ]);
    expect(s).toEqual([
      { label: "Google", count: 61, pct: 61 },
      { label: "GitHub", count: 27, pct: 27 },
      { label: "Email", count: 12, pct: 12 },
    ]);
    expect(providerShares([])).toEqual([]);
  });
});

describe("ranges and buckets", () => {
  it("parses only allowed ranges", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange(["365"])).toBe(365);
    expect(parseRange("12")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });
  it("builds the window and the previous window", () => {
    const w = rangeWindow(7, d("2026-10-02T15:00:00Z"));
    expect(w.start.toISOString()).toBe("2026-09-26T00:00:00.000Z");
    expect(w.prevStart.toISOString()).toBe("2026-09-19T00:00:00.000Z");
    expect(w.prevEnd).toEqual(w.start);
    expect(w.bucket).toBe("day");
    expect(rangeWindow(365, d("2026-10-02T15:00:00Z")).bucket).toBe("week");
  });
  it("weeks start on Monday like date_trunc('week')", () => {
    expect(utcWeek(d("2026-10-02T15:00:00Z")).toISOString()).toBe("2026-09-28T00:00:00.000Z"); // Fri -> Mon
    expect(utcWeek(d("2026-09-27T23:00:00Z")).toISOString()).toBe("2026-09-21T00:00:00.000Z"); // Sun -> Mon before
  });
  it("fills empty days with zero", () => {
    const w = rangeWindow(7, d("2026-10-02T15:00:00Z"));
    const s = fillBuckets([{ at: d("2026-09-28T00:00:00Z"), value: 4 }, { at: d("2026-10-02T00:00:00Z"), value: 2 }], w.start, w.end, "day");
    expect(s).toHaveLength(7);
    expect(s.map((p) => p.value)).toEqual([0, 0, 4, 0, 0, 0, 2]);
    expect(peakOf(s)?.at.toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(peakOf(fillBuckets([], w.start, w.end, "day"))).toBeNull();
  });
  it("fills weeks", () => {
    const w = rangeWindow(365, d("2026-10-02T15:00:00Z"));
    const s = fillBuckets([], w.start, w.end, "week");
    expect(s.length).toBeGreaterThanOrEqual(52);
    expect(s.length).toBeLessThanOrEqual(54);
  });
});

describe("new tracking and roll-ups", () => {
  const now = d("2026-10-02T12:00:00Z");
  it("flags metrics with under 7 days of data", () => {
    expect(isNewTracking(null, now)).toBe(true);
    expect(isNewTracking(d("2026-09-27T12:00:00Z"), now)).toBe(true);
    expect(isNewTracking(d("2026-09-25T12:00:00Z"), now)).toBe(false);
  });
  it("uses roll-ups only for long ranges that they cover", () => {
    const w = rangeWindow(90, now);
    expect(shouldUseRollup(30, d("2020-01-01"), rangeWindow(30, now).start)).toBe(false);
    expect(shouldUseRollup(90, null, w.start)).toBe(false);
    expect(shouldUseRollup(90, d("2026-09-01"), w.start)).toBe(false);
    expect(shouldUseRollup(90, w.start, w.start)).toBe(true);
  });
});

describe("shortDay", () => {
  it("formats in UTC", () => {
    expect(shortDay(d("2026-09-19T23:30:00Z"))).toBe("19 Sep");
  });
});

describe("csvCell", () => {
  it("quotes when needed", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });
});
