import { describe, expect, it } from "vitest";
import { formatInr, usdCentsToInrPaise } from "./fx-math";

describe("usdCentsToInrPaise", () => {
  it("converts and rounds up to a whole rupee", () => {
    expect(usdCentsToInrPaise(2900, 84)).toBe(243600); // $29 x 84 = 2436 exactly
    expect(usdCentsToInrPaise(2900, 84.5)).toBe(245100); // 2450.5 -> 2451
    expect(usdCentsToInrPaise(12900, 83.123456)).toBe(1072300); // 10722.93 -> 10723
  });
  it("is not thrown off by float noise", () => {
    expect(usdCentsToInrPaise(100, 85.1)).toBe(8600); // 85.1 -> 86
    expect(usdCentsToInrPaise(1000, 85.1)).toBe(85100); // exactly 851, stays 851
  });
});

describe("formatInr", () => {
  it("uses Indian digit grouping", () => {
    expect(formatInr(15234500)).toBe("₹1,52,345");
  });
});
