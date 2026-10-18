import { describe, expect, it } from "vitest";
import { csvCell, csvLine, dayParam, dayRange, hrefWith, pageParam, pageWindow, parseDay, pick, utcMonthStart } from "./params";

describe("parseDay / dayRange", () => {
  it("parses a real day at UTC midnight", () => {
    expect(parseDay("2026-09-30")?.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });
  it("rejects days that roll over and junk", () => {
    expect(parseDay("2026-02-31")).toBeNull();
    expect(parseDay("30/09/2026")).toBeNull();
    expect(parseDay("")).toBeNull();
    expect(dayParam("2026-13-01")).toBe("");
  });
  it("makes the to day inclusive", () => {
    const r = dayRange("2026-09-01", "2026-09-30");
    expect(r?.gte?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(r?.lt?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
  it("is undefined with no days", () => {
    expect(dayRange("", "nope")).toBeUndefined();
    expect(dayRange("2026-09-01", "")).toEqual({ gte: new Date("2026-09-01T00:00:00Z") });
  });
});

describe("utcMonthStart", () => {
  it("uses the UTC month, not the server zone", () => {
    expect(utcMonthStart(new Date("2026-10-01T00:30:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(utcMonthStart(new Date("2026-09-30T23:59:59Z")).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("paging", () => {
  it("reads the page param", () => {
    expect(pageParam({ page: "3" })).toBe(3);
    expect(pageParam({ page: "-2" })).toBe(1);
    expect(pageParam({})).toBe(1);
  });
  it("clamps the window", () => {
    expect(pageWindow(9, 51, 25)).toMatchObject({ page: 3, pages: 3, skip: 50, first: 51, last: 51 });
    expect(pageWindow(1, 0, 25)).toMatchObject({ page: 1, pages: 1, skip: 0, first: 0, last: 0 });
  });
});

describe("hrefWith", () => {
  const cur = { q: "ada", status: "completed", page: "3", ws: "" };
  it("keeps the other filters and resets the page on a filter change", () => {
    expect(hrefWith("/admin/interviews", cur, { status: "scheduled" })).toBe("/admin/interviews?q=ada&status=scheduled");
  });
  it("keeps filters when paging", () => {
    expect(hrefWith("/admin/interviews", cur, { page: 4 })).toBe("/admin/interviews?q=ada&status=completed&page=4");
    expect(hrefWith("/admin/interviews", cur, { page: 1 })).toBe("/admin/interviews?q=ada&status=completed");
  });
  it("drops a filter set to empty", () => {
    expect(hrefWith("/x", { a: "1" }, { a: "" })).toBe("/x");
  });
});

describe("pick", () => {
  it("only lets listed values through", () => {
    expect(pick("GRANT", ["GRANT", "REFUND"] as const)).toBe("GRANT");
    expect(pick("DROP TABLE", ["GRANT"] as const)).toBe("");
  });
});

describe("csv", () => {
  it("quotes and guards formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
    expect(csvLine([1, "x", new Date("2026-01-01T00:00:00Z")])).toBe("1,x,2026-01-01T00:00:00.000Z");
  });
});
