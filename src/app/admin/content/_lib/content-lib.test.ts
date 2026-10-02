import { describe, expect, it } from "vitest";
import { planStepSync } from "./steps-plan";
import { assignUniqueSlugs } from "./slugs";
import { csvCell, toCsv } from "./csv";
import { parseSchedule } from "./schedule";
import { stepFunnel, pct, formatDuration } from "./challenge-stats";

describe("planStepSync", () => {
  it("updates known steps in place, creates new ones, deletes removed ones without attempts", () => {
    const plan = planStepSync(
      [
        { id: "a", attempts: 3 },
        { id: "b", attempts: 0 },
        { id: "c", attempts: 0 },
      ],
      [{ id: "c" }, { id: "a" }, {}],
    );
    expect(plan.updates).toEqual([
      { id: "c", index: 0 },
      { id: "a", index: 1 },
    ]);
    expect(plan.creates).toEqual([2]);
    expect(plan.deletes).toEqual(["b"]);
    expect(plan.blocked).toEqual([]);
  });

  it("blocks removing a step that has attempts", () => {
    const plan = planStepSync([{ id: "a", attempts: 2 }, { id: "b", attempts: 0 }], [{ id: "b" }]);
    expect(plan.blocked).toEqual([{ id: "a", attempts: 2 }]);
  });

  it("treats unknown and duplicated ids as new steps", () => {
    const plan = planStepSync([{ id: "a", attempts: 0 }], [{ id: "a" }, { id: "a" }, { id: "zzz" }]);
    expect(plan.updates).toEqual([{ id: "a", index: 0 }]);
    expect(plan.creates).toEqual([1, 2]);
  });
});

describe("assignUniqueSlugs", () => {
  it("skips taken slugs and keeps rows in one batch apart", () => {
    expect(assignUniqueSlugs(["two-sum", "two-sum", "lru", ""], ["two-sum", "two-sum-1"])).toEqual([
      "two-sum-2",
      "two-sum-3",
      "lru",
      "item",
    ]);
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines and defuses formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["x", "y"], [[1, "two\nlines"]])).toBe('x,y\r\n1,"two\nlines"\r\n');
  });
});

describe("parseSchedule", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  it("clears on empty and rejects past or far times", () => {
    expect(parseSchedule("", now)).toEqual({ ok: true, at: null });
    expect(parseSchedule(null, now)).toEqual({ ok: true, at: null });
    expect(parseSchedule("2026-10-02T11:00:00Z", now).ok).toBe(false);
    expect(parseSchedule("2028-01-01T00:00:00Z", now).ok).toBe(false);
    expect(parseSchedule("nope", now).ok).toBe(false);
  });
  it("accepts a future time", () => {
    const r = parseSchedule("2026-10-03T09:30:00Z", now);
    expect(r.ok && r.at?.toISOString()).toBe("2026-10-03T09:30:00.000Z");
  });
});

describe("stepFunnel", () => {
  it("computes pass rate and the share that did not reach the next step", () => {
    const rows = stepFunnel(
      [
        { id: "s2", position: 1, title: null },
        { id: "s1", position: 0, title: "Warm up" },
        { id: "s3", position: 2, title: null },
      ],
      [
        { stepId: "s1", started: 100, passed: 80 },
        { stepId: "s2", started: 60, passed: 30 },
      ],
    );
    expect(rows.map((r) => r.label)).toEqual(["Warm up", "Step 2", "Step 3"]);
    expect(rows[0].passRate).toBe(0.8);
    expect(rows[0].dropOff).toBeCloseTo(0.4);
    expect(rows[1].dropOff).toBe(1);
    expect(rows[2].dropOff).toBeNull();
    expect(rows[2].passRate).toBeNull();
    expect(pct(rows[0].dropOff)).toBe("40%");
    expect(formatDuration(125)).toBe("2m 5s");
  });
});
