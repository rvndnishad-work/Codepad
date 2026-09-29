import { describe, expect, it } from "vitest";
import { parseStat } from "@/components/wow/CountUp";

describe("parseStat", () => {
  it("splits plain, comma, decimal and affixed stats", () => {
    expect(parseStat("187")).toEqual({ prefix: "", n: 187, decimals: 0, comma: false, suffix: "" });
    expect(parseStat("1,000")).toEqual({ prefix: "", n: 1000, decimals: 0, comma: true, suffix: "" });
    expect(parseStat("1.2k+")).toEqual({ prefix: "", n: 1.2, decimals: 1, comma: false, suffix: "k+" });
    expect(parseStat("~4%")).toEqual({ prefix: "~", n: 4, decimals: 0, comma: false, suffix: "%" });
    expect(parseStat("75 hrs")).toEqual({ prefix: "", n: 75, decimals: 0, comma: false, suffix: " hrs" });
  });

  it("returns null when there is no number to count", () => {
    expect(parseStat("Custom")).toBeNull();
  });
});
