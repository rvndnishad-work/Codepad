import { describe, expect, it } from "vitest";
import { supportsLightTheme } from "@/lib/theme-routes";

describe("supportsLightTheme", () => {
  it("allows the reviewed home pages", () => {
    expect(supportsLightTheme("/")).toBe(true);
    expect(supportsLightTheme("/hire")).toBe(true);
    expect(supportsLightTheme("/hire/")).toBe(true);
  });

  it("keeps every other route dark", () => {
    expect(supportsLightTheme("/pricing")).toBe(false);
    expect(supportsLightTheme("/hire-me")).toBe(false);
    expect(supportsLightTheme("/w/acme")).toBe(false);
    expect(supportsLightTheme(null)).toBe(false);
  });
});
