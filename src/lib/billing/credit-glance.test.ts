import { describe, expect, it } from "vitest";
import { creditHealth, creditRunway, packSavings, screeningsCovered } from "./credit-glance";

describe("creditHealth", () => {
  it("is empty at zero", () => expect(creditHealth(0, 20)).toBe("empty"));
  it("uses the workspace threshold when set", () => {
    expect(creditHealth(15, 20)).toBe("low");
    expect(creditHealth(20, 20)).toBe("ok");
  });
  it("falls back to 10 when no threshold is set", () => {
    expect(creditHealth(9, null)).toBe("low");
    expect(creditHealth(10, null)).toBe("ok");
  });
});

describe("creditRunway", () => {
  it("measures the last 30 days by default", () => {
    // 30 credits over 30 days is 7 a week.
    expect(creditRunway(70, 30).perWeek).toBe(7);
    expect(creditRunway(70, 30).weeks).toBe(10);
  });
  it("has no pace when nothing was used", () => {
    const r = creditRunway(100, 0);
    expect(r.weeks).toBeNull();
    expect(r.perWeek).toBeNull();
  });
  it("counts weeks at the recent pace", () => {
    // 90 credits over 90 days is 7 a week; 42 credits last 6 weeks.
    const r = creditRunway(42, 90, 90);
    expect(r.perWeek).toBe(7);
    expect(r.weeks).toBe(6);
    expect(r.label).toBe("About 6 weeks");
  });
  it("switches to months and years for long runways", () => {
    expect(creditRunway(140, 90, 90).label).toBe("About 4 months");
    expect(creditRunway(1000, 90, 90).label).toBe("More than a year");
  });
  it("says less than a week for a tiny balance", () => {
    expect(creditRunway(3, 90, 90).label).toBe("Less than a week");
  });
  it("says out of credits at zero", () => {
    expect(creditRunway(0, 90, 90).weeks).toBe(0);
  });
});

describe("packSavings", () => {
  it("compares each pack with the dearest one", () => {
    const s = packSavings([
      { id: "starter", credits: 10, priceCents: 2900 },
      { id: "team", credits: 50, priceCents: 12900 },
      { id: "scale", credits: 200, priceCents: 44900 },
      { id: "agency", credits: 1000, priceCents: 179000 },
    ]);
    expect(s).toEqual({ team: 11, scale: 23, agency: 38 });
  });
  it("handles no packs", () => expect(packSavings([])).toEqual({}));
});

describe("screeningsCovered", () => {
  it("is 1 to 3 credits per screening", () => expect(screeningsCovered(50)).toEqual({ min: 16, max: 50 }));
});
