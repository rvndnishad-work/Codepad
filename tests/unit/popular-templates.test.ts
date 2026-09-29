import { describe, expect, it } from "vitest";
import {
  FALLBACK_POPULAR_IDS,
  rankTemplateUsage,
} from "@/lib/popular-templates";

describe("rankTemplateUsage", () => {
  it("ranks most-saved templates first", () => {
    const ranked = rankTemplateUsage(
      [
        { template: "vue", snippets: 3, views: 100 },
        { template: "react", snippets: 10, views: 0 },
        { template: "python", snippets: 7, views: 0 },
      ],
      4,
    );
    expect(ranked).toEqual(["react", "python", "vue"]);
  });

  it("breaks save-count ties by total views", () => {
    const ranked = rankTemplateUsage(
      [
        { template: "vue", snippets: 5, views: 10 },
        { template: "svelte", snippets: 5, views: 40 },
      ],
      4,
    );
    expect(ranked).toEqual(["svelte", "vue"]);
  });

  it("drops ids that are not in the template catalog", () => {
    const ranked = rankTemplateUsage(
      [
        { template: "deleted-template", snippets: 99, views: 99 },
        { template: "react", snippets: 1, views: 0 },
      ],
      4,
    );
    expect(ranked).toEqual(["react"]);
  });

  it("respects the limit", () => {
    const ranked = rankTemplateUsage(
      [
        { template: "react", snippets: 3, views: 0 },
        { template: "vue", snippets: 2, views: 0 },
        { template: "python", snippets: 1, views: 0 },
      ],
      2,
    );
    expect(ranked).toEqual(["react", "vue"]);
  });

  it("fallback list covers the current curated row", () => {
    expect([...FALLBACK_POPULAR_IDS]).toEqual([
      "react",
      "python",
      "typescript",
      "empty-js",
    ]);
  });
});
