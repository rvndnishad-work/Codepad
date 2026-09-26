import { describe, expect, it } from "vitest";
import { clampScore, computeQuestionStats, formatDuration, outcomeFromStage, secondsBetween, separation, type QuestionSample } from "@/lib/library/question-stats";

const s = (score: number | null, outcome: QuestionSample["outcome"] = null, seconds: number | null = null): QuestionSample => ({ score, outcome, seconds });

describe("separation", () => {
  it("is the difference of mean scores, divided by 100", () => {
    // passed mean 80, not passed mean 38 -> 0.42
    expect(separation([70, 90], [30, 46])).toBe(0.42);
  });

  it("needs both groups", () => {
    expect(separation([80], [])).toBeNull();
    expect(separation([], [40])).toBeNull();
  });

  it("reads as 0 when the not-passed group scored higher", () => {
    expect(separation([40], [60])).toBe(0);
  });

  it("stays within 0 to 1 when scores are out of range", () => {
    expect(separation([150], [-20])).toBe(1);
  });

  it("rounds to two decimals", () => {
    expect(separation([66.666], [0])).toBe(0.67);
  });
});

describe("computeQuestionStats", () => {
  it("returns empty stats with no samples", () => {
    expect(computeQuestionStats([])).toEqual({
      timesAsked: 0,
      scored: 0,
      averageScore: null,
      separation: null,
      passedCount: 0,
      notPassedCount: 0,
      averageSeconds: null,
    });
  });

  it("counts every time asked but averages only scored samples", () => {
    const stats = computeQuestionStats([s(80, "passed", 300), s(40, "not_passed", 420), s(null, null, 360), s(60)]);
    expect(stats.timesAsked).toBe(4);
    expect(stats.scored).toBe(3);
    expect(stats.averageScore).toBe(60);
    expect(stats.separation).toBe(0.4);
    expect(stats.passedCount).toBe(1);
    expect(stats.notPassedCount).toBe(1);
    expect(stats.averageSeconds).toBe(360);
  });

  it("leaves unscored passed candidates out of the separation", () => {
    const stats = computeQuestionStats([s(null, "passed"), s(30, "not_passed")]);
    expect(stats.separation).toBeNull();
    expect(stats.passedCount).toBe(1);
  });

  it("ignores missing and zero times", () => {
    expect(computeQuestionStats([s(50, null, 0), s(50, null, null), s(50, null, 90)]).averageSeconds).toBe(90);
  });

  it("clamps scores before averaging", () => {
    expect(computeQuestionStats([s(140), s(-10)]).averageScore).toBe(50);
  });
});

describe("helpers", () => {
  it("maps stages to outcomes", () => {
    expect(outcomeFromStage("PASSED")).toBe("passed");
    expect(outcomeFromStage("REJECTED")).toBe("not_passed");
    expect(outcomeFromStage("SCREENING")).toBeNull();
    expect(outcomeFromStage(null)).toBeNull();
  });

  it("measures seconds between two times", () => {
    expect(secondsBetween(new Date("2026-01-01T10:00:00Z"), new Date("2026-01-01T10:06:00Z"))).toBe(360);
    expect(secondsBetween(new Date("2026-01-01T10:06:00Z"), new Date("2026-01-01T10:00:00Z"))).toBeNull();
    expect(secondsBetween(null, new Date())).toBeNull();
  });

  it("formats durations", () => {
    expect(formatDuration(null)).toBe("No data");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(360)).toBe("6 min");
    expect(formatDuration(3900)).toBe("1 h 5 min");
    expect(formatDuration(7200)).toBe("2 h");
  });

  it("clamps scores", () => {
    expect(clampScore(120)).toBe(100);
    expect(clampScore(-3)).toBe(0);
  });
});
