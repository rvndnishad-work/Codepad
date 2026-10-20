import { describe, expect, it } from "vitest";
import { compareTopicOrder, sortTopic } from "@/lib/interview-questions/ordering";

describe("compareTopicOrder", () => {
  it("ranks easy before medium before hard", () => {
    const rows = [
      { slug: "h", difficulty: "hard" },
      { slug: "e", difficulty: "easy" },
      { slug: "m", difficulty: "medium" },
    ];
    expect(sortTopic(rows).map((r) => r.slug)).toEqual(["e", "m", "h"]);
  });

  it("uses the curated order inside a band and puts unordered rows after, by views", () => {
    const rows = [
      { slug: "popular-unordered", difficulty: "easy", sortOrder: null, views: 900 },
      { slug: "second", difficulty: "easy", sortOrder: 2, views: 10 },
      { slug: "quiet-unordered", difficulty: "easy", sortOrder: null, views: 5 },
      { slug: "first", difficulty: "easy", sortOrder: 1, views: 1 },
    ];
    expect(sortTopic(rows).map((r) => r.slug)).toEqual(["first", "second", "popular-unordered", "quiet-unordered"]);
  });

  it("treats a missing difficulty as medium and breaks full ties by title", () => {
    expect(compareTopicOrder({ difficulty: null }, { difficulty: "medium" })).toBe(0);
    expect(compareTopicOrder({ difficulty: "easy", title: "A" }, { difficulty: "easy", title: "B" })).toBeLessThan(0);
  });
});
