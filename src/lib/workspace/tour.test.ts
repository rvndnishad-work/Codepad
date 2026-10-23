import { describe, expect, it } from "vitest";
import { tourSeenKey, tourStops } from "./tour";

describe("tourStops", () => {
  it("covers candidates, take homes, AI screening and interviews, in that order", () => {
    const targets = tourStops({ aiScreening: true, hasCredits: true }).map((s) => s.target);
    expect(targets).toEqual([null, "candidates", "ai-screening", "take-homes", "interviews", "library", "credits", "members", "tour-start"]);
  });

  it("skips the credits stop when the card is not shown", () => {
    expect(tourStops({ aiScreening: true, hasCredits: false }).some((s) => s.target === "credits")).toBe(false);
  });

  it("says AI screening opens Billing when the plan does not include it", () => {
    const ai = tourStops({ aiScreening: false, hasCredits: true }).find((s) => s.target === "ai-screening");
    expect(ai?.body).toMatch(/opens Billing/);
  });

  it("remembers the tour per workspace", () => {
    expect(tourSeenKey("acme")).not.toBe(tourSeenKey("other"));
  });
});
