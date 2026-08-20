import { describe, it, expect } from "vitest";
import {
  calculateNextSrs,
  qualityToGrade,
  isDueForReview,
  DEFAULT_SRS_STATE,
} from "@/lib/prep-journey/srs";

describe("Spaced Repetition (SRS) Engine", () => {
  it("maps human quality ratings to SM-2 numeric grades", () => {
    expect(qualityToGrade("again")).toBe(1);
    expect(qualityToGrade("hard")).toBe(3);
    expect(qualityToGrade("good")).toBe(4);
    expect(qualityToGrade("easy")).toBe(5);
  });

  it("calculates first review interval on successful solve", () => {
    const fixedDate = new Date("2026-08-15T12:00:00Z");
    const nextState = calculateNextSrs(DEFAULT_SRS_STATE, 4, fixedDate);

    expect(nextState.repetitions).toBe(1);
    expect(nextState.intervalDays).toBe(1);
    expect(nextState.dueDate).toBe("2026-08-16");
    expect(nextState.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it("advances interval exponentially on repeated successful reviews", () => {
    const fixedDate = new Date("2026-08-15T12:00:00Z");
    let state = calculateNextSrs(DEFAULT_SRS_STATE, 5, fixedDate);
    expect(state.repetitions).toBe(1);

    // Second review
    state = calculateNextSrs(state, 5, fixedDate);
    expect(state.repetitions).toBe(2);
    expect(state.intervalDays).toBe(3);

    // Third review
    state = calculateNextSrs(state, 5, fixedDate);
    expect(state.repetitions).toBe(3);
    expect(state.intervalDays).toBeGreaterThanOrEqual(7);
  });

  it("resets repetition count to 0 and interval to 1 on failure (lapse)", () => {
    const fixedDate = new Date("2026-08-15T12:00:00Z");
    const matureState = {
      repetitions: 5,
      easeFactor: 2.6,
      intervalDays: 21,
      dueDate: "2026-08-15",
    };

    const lapsedState = calculateNextSrs(matureState, 1, fixedDate);
    expect(lapsedState.repetitions).toBe(0);
    expect(lapsedState.intervalDays).toBe(1);
    expect(lapsedState.dueDate).toBe("2026-08-16");
    expect(lapsedState.easeFactor).toBeLessThan(2.6);
    expect(lapsedState.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("correctly identifies items due for review", () => {
    expect(isDueForReview("2026-08-15", "2026-08-15")).toBe(true);
    expect(isDueForReview("2026-08-14", "2026-08-15")).toBe(true);
    expect(isDueForReview("2026-08-16", "2026-08-15")).toBe(false);
  });
});
