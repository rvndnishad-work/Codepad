import { describe, expect, it } from "vitest";
import { jsonDiff } from "./diff";
import { auditWhere, parseAuditFilters } from "./query";

describe("jsonDiff", () => {
  it("lists changed, added and removed fields by dotted path", () => {
    const rows = jsonDiff(
      { state: "on", plan: { seats: 3, name: "Growth" }, gone: 1 },
      { state: "off", plan: { seats: 5, name: "Growth" }, note: "x" },
    );
    expect(rows).toEqual([
      { path: "state", before: "on", after: "off", change: "changed" },
      { path: "plan.seats", before: "3", after: "5", change: "changed" },
      { path: "gone", before: "1", after: "", change: "removed" },
      { path: "note", before: "", after: "x", change: "added" },
    ]);
  });

  it("handles a creation (no before) and scalar values", () => {
    expect(jsonDiff(null, { a: 1 })).toEqual([{ path: "a", before: "", after: "1", change: "added" }]);
    expect(jsonDiff(10, 20)).toEqual([{ path: "(value)", before: "10", after: "20", change: "changed" }]);
  });

  it("compares arrays as JSON", () => {
    expect(jsonDiff({ r: ["a"] }, { r: ["a"] })).toEqual([]);
    expect(jsonDiff({ r: ["a"] }, { r: ["a", "b"] })[0]).toMatchObject({ path: "r", after: '["a","b"]' });
  });
});

describe("audit filters", () => {
  it("makes the to date inclusive in UTC and ignores bad input", () => {
    const f = parseAuditFilters({ from: "2026-10-01", to: "2026-10-01", group: "nope", page: "-2" });
    expect(f.group).toBe("");
    expect(f.page).toBe(1);
    expect(auditWhere(f)).toEqual({
      AND: [{ createdAt: { gte: new Date("2026-10-01T00:00:00.000Z"), lt: new Date("2026-10-02T00:00:00.000Z") } }],
    });
  });

  it("maps system and assistant actors to via", () => {
    expect(auditWhere(parseAuditFilters({ actor: "via:system" }))).toEqual({ AND: [{ via: "system" }] });
  });
});
