import { describe, it, expect } from "vitest";
import { DEFAULT_NAV_LINKS, navLinkFor } from "@/lib/settings-constants";

const hrefFor = (path: string) => navLinkFor(DEFAULT_NAV_LINKS, path)?.href;

describe("navLinkFor", () => {
  it("prefers the most specific setting", () => {
    expect(hrefFor("/w/ai-screening")).toBe("/w/ai-screening");
    expect(hrefFor("/w")).toBe("/w");
    expect(hrefFor("/interview/new")).toBe("/interview");
  });

  it("matches whole segments only", () => {
    expect(hrefFor("/interview-questions")).toBe("/interview-questions");
    expect(hrefFor("/blogger")).toBeUndefined();
  });

  it("the home page only matches itself", () => {
    expect(hrefFor("/")).toBe("/");
    expect(hrefFor("/terms")).toBeUndefined();
  });

  it("matches non-path keys exactly", () => {
    expect(hrefFor("menu:developers")).toBe("menu:developers");
  });
});

describe("DEFAULT_NAV_LINKS", () => {
  it("has a setting for every header menu item", () => {
    const labels = DEFAULT_NAV_LINKS.map((l) => l.label);
    for (const label of [
      "Playgrounds",
      "Interview Questions",
      "Challenges",
      "Interviews",
      "Prompt Arena",
      "Prep Journeys",
      "Review the AI's Code",
      "Creators",
      "Workspaces",
      "AI Screening",
      "Live Interviews",
      "Platform Overview",
      "Features",
      "Docs",
      "Pricing",
      "About us",
      "Blog",
    ]) {
      expect(labels).toContain(label);
    }
  });

  it("hrefs are unique", () => {
    const hrefs = DEFAULT_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
