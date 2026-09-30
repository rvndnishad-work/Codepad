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

  it("includes the admin console", () => {
    expect(supportsLightTheme("/admin")).toBe(true);
    expect(supportsLightTheme("/admin/users")).toBe(true);
  });

  it("stays dark before the path is known", () => {
    expect(supportsLightTheme(null)).toBe(false);
  });
});
