import { describe, expect, it } from "vitest";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";
import {
  TRACKS,
  TOPIC_ORDER,
  trackOf,
  topicName,
  topicBlurb,
  plural,
  difficultyKey,
  groupByDifficulty,
  nextUnsolved,
} from "@/lib/interview-questions/topic-catalog";

describe("interview topic catalogue", () => {
  it("puts every technology in exactly one track", () => {
    const slugs = TECHNOLOGIES.map((t) => t.slug).sort();
    expect([...TOPIC_ORDER].sort()).toEqual(slugs);
    expect(new Set(TOPIC_ORDER).size).toBe(TOPIC_ORDER.length);
    for (const s of slugs) expect(trackOf(s)).not.toBeNull();
  });

  it("has four tracks with the counts the filter chips show", () => {
    expect(TRACKS.map((t) => [t.key, t.topics.length])).toEqual([
      ["frontend", 5],
      ["languages", 4],
      ["coding", 2],
      ["backend", 3],
    ]);
  });

  it("names and describes every topic, with fallbacks", () => {
    for (const t of TECHNOLOGIES) {
      expect(topicName(t.slug)).toBeTruthy();
      expect(topicBlurb(t.slug)).not.toBe("Interview questions with answers");
    }
    expect(topicName("dsa")).toBe("DSA");
    expect(topicName("unknown-topic")).toBe("unknown-topic");
    expect(trackOf("unknown-topic")).toBeNull();
  });

  it("pluralises counts", () => {
    expect(plural(1, "question")).toBe("1 question");
    expect(plural(0, "experience")).toBe("0 experiences");
    expect(plural(1417, "question")).toBe("1,417 questions");
  });

  it("groups by difficulty and keeps the order", () => {
    const qs = [
      { slug: "a", difficulty: "hard" },
      { slug: "b", difficulty: "easy" },
      { slug: "c", difficulty: null },
      { slug: "d", difficulty: "easy" },
      { slug: "e", difficulty: "tricky" },
    ];
    const g = groupByDifficulty(qs);
    expect(g.easy.map((q) => q.slug)).toEqual(["b", "d"]);
    expect(g.medium.map((q) => q.slug)).toEqual(["c", "e"]);
    expect(g.hard.map((q) => q.slug)).toEqual(["a"]);
    expect(difficultyKey(undefined)).toBe("medium");
  });

  it("finds the next unsolved question", () => {
    const qs = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    expect(nextUnsolved(qs, new Set(["a"]))?.slug).toBe("b");
    expect(nextUnsolved(qs, new Set())?.slug).toBe("a");
    expect(nextUnsolved(qs, new Set(["a", "b", "c"]))).toBeNull();
  });
});
