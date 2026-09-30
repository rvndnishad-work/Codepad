import { describe, expect, it } from "vitest";
import { supportsLightTheme } from "@/lib/theme-routes";

describe("supportsLightTheme", () => {
  it("allows the public and product pages", () => {
    expect(supportsLightTheme("/")).toBe(true);
    expect(supportsLightTheme("/hire/")).toBe(true);
    expect(supportsLightTheme("/pricing")).toBe(true);
    expect(supportsLightTheme("/w/acme")).toBe(true);
    expect(supportsLightTheme("/administrator-guide")).toBe(true);
  });

  it("keeps admin dark", () => {
    expect(supportsLightTheme("/admin")).toBe(false);
    expect(supportsLightTheme("/admin/users")).toBe(false);
    expect(supportsLightTheme(null)).toBe(false);
  });
});
