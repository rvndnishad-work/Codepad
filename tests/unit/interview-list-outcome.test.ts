/**
 * The outcome each row of the workspace Interviews list shows: only the
 * candidate's stage (a recruiter's decision) reads as Passed or Not passed.
 */
import { describe, expect, it } from "vitest";
import { groupOf, interviewOutcome, type OutcomeInput } from "@/lib/interview/list-outcome";

const now = new Date("2026-09-28T12:00:00Z");
const base: OutcomeInput = {
  state: "completed",
  questions: "ready",
  scheduledAt: "2026-09-27T10:00:00Z",
  stage: "SCREENING",
  cards: { expected: 2, submitted: 2 },
  rubric: false,
};

describe("interviewOutcome", () => {
  it("reads the recruiter's decision from the candidate stage", () => {
    expect(interviewOutcome({ ...base, stage: "PASSED" }, now)).toBe("passed");
    expect(interviewOutcome({ ...base, stage: "REJECTED" }, now)).toBe("not_passed");
  });

  it("never passes on scores alone: all cards in and no decision waits for one", () => {
    expect(interviewOutcome(base, now)).toBe("decision");
    expect(interviewOutcome({ ...base, stage: null }, now)).toBe("decision");
  });

  it("waits for scorecards while some are missing, unless an older rubric scored it", () => {
    expect(interviewOutcome({ ...base, cards: { expected: 2, submitted: 1 } }, now)).toBe("scorecards");
    expect(interviewOutcome({ ...base, cards: { expected: 2, submitted: 0 }, rubric: true }, now)).toBe("decision");
  });

  it("splits scheduled interviews into questions needed, no time, missed and upcoming", () => {
    const s = { ...base, state: "scheduled" as const };
    expect(interviewOutcome({ ...s, questions: "needed" }, now)).toBe("questions");
    expect(interviewOutcome({ ...s, scheduledAt: null }, now)).toBe("unscheduled");
    expect(interviewOutcome({ ...s, scheduledAt: "2026-09-28T11:00:00Z" }, now)).toBe("missed");
    expect(interviewOutcome({ ...s, scheduledAt: "2026-09-28T11:45:00Z" }, now)).toBe("upcoming");
    expect(interviewOutcome({ ...s, scheduledAt: "2026-09-29T09:00:00Z" }, now)).toBe("upcoming");
  });

  it("keeps live and cancelled as they are", () => {
    expect(interviewOutcome({ ...base, state: "live", stage: "PASSED" }, now)).toBe("live");
    expect(interviewOutcome({ ...base, state: "cancelled", stage: "PASSED" }, now)).toBe("cancelled");
  });

  it("groups outcomes for the filters", () => {
    expect(groupOf("missed")).toBe("upcoming");
    expect(groupOf("scorecards")).toBe("decision");
    expect(groupOf("not_passed")).toBe("not_passed");
  });
});
