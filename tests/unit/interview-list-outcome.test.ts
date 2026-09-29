/**
 * The outcome each row of the workspace Interviews list shows describes that
 * interview only. The candidate's decision is its own line, so a candidate
 * who passed never makes an unfinished interview read "Passed".
 */
import { describe, expect, it } from "vitest";
import { candidateLine, groupOf, interviewOutcome, type OutcomeInput } from "@/lib/interview/list-outcome";

const now = new Date("2026-09-28T12:00:00Z");
const base: OutcomeInput = {
  state: "completed",
  questions: "ready",
  scheduledAt: "2026-09-27T10:00:00Z",
  cards: { expected: 2, submitted: 2 },
  rubric: false,
  verdict: null,
  score: { value: 3.2, bar: 3 },
};

describe("interviewOutcome", () => {
  it("labels a scored interview against its own bar", () => {
    expect(interviewOutcome(base, now)).toBe("above_bar");
    expect(interviewOutcome({ ...base, score: { value: 3, bar: 3 } }, now)).toBe("above_bar");
    expect(interviewOutcome({ ...base, score: { value: 2.1, bar: 3 } }, now)).toBe("below_bar");
    expect(interviewOutcome({ ...base, score: null }, now)).toBe("held");
  });

  it("reads a candidate who left as did not finish, whatever the cards say", () => {
    expect(interviewOutcome({ ...base, verdict: "left_in_between", cards: { expected: 2, submitted: 0 } }, now)).toBe("did_not_finish");
  });

  it("waits for scorecards while some are missing, unless an older rubric scored it", () => {
    expect(interviewOutcome({ ...base, cards: { expected: 2, submitted: 1 } }, now)).toBe("scorecards");
    expect(interviewOutcome({ ...base, cards: { expected: 2, submitted: 0 }, rubric: true }, now)).toBe("above_bar");
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
    expect(interviewOutcome({ ...base, state: "live" }, now)).toBe("live");
    expect(interviewOutcome({ ...base, state: "cancelled" }, now)).toBe("cancelled");
  });
});

describe("groupOf and candidateLine", () => {
  it("files finished interviews under the candidate's decision", () => {
    expect(groupOf("missed", "PASSED")).toBe("upcoming");
    expect(groupOf("scorecards", "SCREENING")).toBe("decision");
    expect(groupOf("did_not_finish", "PASSED")).toBe("passed");
    expect(groupOf("above_bar", "REJECTED")).toBe("not_passed");
    expect(groupOf("above_bar", null)).toBe("decision");
  });

  it("says a pass over an unfinished or below-bar interview was manual", () => {
    expect(candidateLine("did_not_finish", "PASSED")).toEqual({ text: "Candidate passed manually", tone: "success" });
    expect(candidateLine("above_bar", "PASSED")?.text).toBe("Candidate passed");
    expect(candidateLine("below_bar", "REJECTED")?.text).toBe("Candidate not passed");
    expect(candidateLine("upcoming", "PASSED")).toBeNull();
  });
});
