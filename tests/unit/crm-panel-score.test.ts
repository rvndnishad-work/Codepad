/**
 * Interviews scored by panel scorecards (1 to 4, own pass mark) count as
 * scored results on the candidate, like the older 1 to 5 rubric.
 */
import { describe, expect, it } from "vitest";
import { describePanelScore, ratingToScore, summarizeResults, type CandidateResult } from "@/lib/crm/results";

describe("panel scorecard results", () => {
  it("maps a 1 to 4 average onto 0 to 100", () => {
    expect(ratingToScore(1, 4)).toBe(0);
    expect(ratingToScore(3, 4)).toBe(67);
    expect(ratingToScore(4, 4)).toBe(100);
  });

  it("passes against the interview's own pass mark, and a failing verdict still fails", () => {
    expect(describePanelScore(4, 3)).toEqual({ verdict: "4.0 of 4", passed: true });
    expect(describePanelScore(2.5, 3)).toEqual({ verdict: "2.5 of 4", passed: false });
    expect(describePanelScore(4, 3, "failed")).toEqual({ verdict: "4.0 of 4, marked failed", passed: false });
  });

  it("carries the 4-point scale into the summary", () => {
    const r: CandidateResult = {
      id: "iv1",
      candidateId: "c1",
      kind: "interview",
      title: "Intro chat",
      state: "scored",
      score: 100,
      rating: 4,
      ratingScale: 4,
      ratingBar: 3,
      verdict: "4.0 of 4",
      passed: true,
      sentAt: "2026-09-29T00:00:00Z",
      startedAt: null,
      finishedAt: "2026-09-29T00:30:00Z",
      deadlineAt: null,
      scheduledAt: null,
      minutesTaken: null,
      minutesAllowed: null,
      href: null,
    };
    const s = summarizeResults([r]);
    expect(s.interviewRating).toBe(4);
    expect(s.interviewScale).toBe(4);
  });
});
