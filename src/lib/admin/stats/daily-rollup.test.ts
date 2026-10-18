import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { addDays, buildStatRows, dayKey, daysToRoll, utcDay } from "./daily-rollup";

describe("utcDay", () => {
  it("truncates to UTC midnight at both edges of a day", () => {
    expect(utcDay(new Date("2026-10-01T00:00:00.000Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(utcDay(new Date("2026-10-01T23:59:59.999Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(utcDay(new Date("2026-10-02T00:00:00.000Z")).toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });

  it("uses the UTC day, not the local one, for offset timestamps", () => {
    // 01:30 in India on 2 Oct is still 1 Oct in UTC.
    expect(dayKey(new Date("2026-10-02T01:30:00+05:30"))).toBe("2026-10-01");
    // 20:00 in New York on 1 Oct is already 2 Oct in UTC.
    expect(dayKey(new Date("2026-10-01T20:00:00-04:00"))).toBe("2026-10-02");
  });

  it("crosses month and year ends", () => {
    expect(dayKey(addDays(utcDay(new Date("2026-12-31T12:00:00Z")), 1))).toBe("2027-01-01");
    expect(dayKey(addDays(utcDay(new Date("2026-03-01T00:00:00Z")), -1))).toBe("2026-02-28");
  });
});

describe("daysToRoll", () => {
  const now = new Date("2026-10-02T00:20:00Z");

  it("backfills every missing day of the last 14, oldest first, never today", () => {
    const days = daysToRoll(now, []).map(dayKey);
    expect(days).toHaveLength(14);
    expect(days[0]).toBe("2026-09-18");
    expect(days[13]).toBe("2026-10-01");
    expect(days).not.toContain("2026-10-02");
  });

  it("recomputes yesterday even when it already has rows", () => {
    const have = Array.from({ length: 14 }, (_, i) => addDays(utcDay(now), -(i + 1)));
    expect(daysToRoll(now, have).map(dayKey)).toEqual(["2026-10-01"]);
  });

  it("fills only the gaps", () => {
    const have = ["2026-09-18", "2026-09-19", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"].map(
      (d) => new Date(`${d}T00:00:00Z`),
    );
    expect(daysToRoll(now, have).map(dayKey)).toEqual(["2026-09-20", "2026-10-01"]);
  });

  it("treats a run just before midnight as the same day", () => {
    expect(daysToRoll(new Date("2026-10-01T23:59:59Z"), []).at(-1)).toEqual(new Date("2026-09-30T00:00:00Z"));
  });
});

describe("buildStatRows", () => {
  const d1 = new Date("2026-09-30T00:00:00Z");
  const d2 = new Date("2026-10-01T00:00:00Z");

  it("drops rows outside the target days and zero-fills totals", () => {
    const out = buildStatRows(
      [d1, d2],
      [
        { day: d2, metric: "signups", dim: "", value: 3 },
        { day: d2, metric: "signups", dim: "github", value: 2 },
        { day: new Date("2026-09-29T00:00:00Z"), metric: "signups", dim: "", value: 9 },
      ],
      ["signups", "playground_runs"],
    );
    expect(out).toEqual([
      { day: d1, metric: "playground_runs", dim: "", value: 0 },
      { day: d1, metric: "signups", dim: "", value: 0 },
      { day: d2, metric: "playground_runs", dim: "", value: 0 },
      { day: d2, metric: "signups", dim: "", value: 3 },
      { day: d2, metric: "signups", dim: "github", value: 2 },
    ]);
  });

  it("sums duplicate keys (e.g. ok and failed runs of one language)", () => {
    const out = buildStatRows(
      [d2],
      [
        { day: d2, metric: "playground_runs", dim: "python", value: 5 },
        { day: d2, metric: "playground_runs", dim: "python", value: 2 },
        { day: d2, metric: "playground_runs", dim: "", value: 7 },
      ],
      ["playground_runs"],
    );
    expect(out.find((r) => r.dim === "python")?.value).toBe(7);
    expect(out).toHaveLength(2);
  });

  it("buckets by UTC day even when the raw day carries a time", () => {
    const out = buildStatRows([d2], [{ day: new Date("2026-10-01T17:00:00Z"), metric: "signups", dim: "", value: 1 }], ["signups"]);
    expect(out).toEqual([{ day: d2, metric: "signups", dim: "", value: 1 }]);
  });
});
