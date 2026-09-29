import { describe, expect, it } from "vitest";
import {
  countedAttempts,
  decisionOf,
  integritySummary,
  legacyState,
  matchesFilter,
  needsReview,
  parseTemplateItems,
  rowLabel,
  sessionState,
  submissionBlock,
  takeHomeScore,
} from "@/lib/take-home/status";

const now = new Date("2026-09-25T12:00:00Z");
const past = "2026-09-20T12:00:00Z";
const future = "2026-09-30T12:00:00Z";

describe("sessionState", () => {
  it("reads stored statuses", () => {
    expect(sessionState({ status: "completed", deadlineAt: past, answered: 2 }, now)).toBe("submitted");
    expect(sessionState({ status: "cancelled", deadlineAt: future, answered: 0 }, now)).toBe("cancelled");
    expect(sessionState({ status: "expired", deadlineAt: past, answered: 0 }, now)).toBe("expired");
  });
  it("treats any answered question as in progress, even past the deadline", () => {
    expect(sessionState({ status: "scheduled", deadlineAt: past, answered: 1 }, now)).toBe("in_progress");
  });
  it("expires an unstarted invite past its deadline before the sweep runs", () => {
    expect(sessionState({ status: "scheduled", deadlineAt: past, answered: 0 }, now)).toBe("expired");
    expect(sessionState({ status: "scheduled", deadlineAt: future, answered: 0 }, now)).toBe("not_started");
  });
});

describe("legacyState", () => {
  it("maps the old statuses", () => {
    expect(legacyState({ status: "SUBMITTED", expiresAt: past }, now)).toBe("submitted");
    expect(legacyState({ status: "ACTIVE", expiresAt: past }, now)).toBe("in_progress");
    expect(legacyState({ status: "PENDING", expiresAt: past }, now)).toBe("expired");
    expect(legacyState({ status: "PENDING", expiresAt: future }, now)).toBe("not_started");
  });
});

describe("decisions and the review queue", () => {
  it("reads the decision from the candidate stage", () => {
    expect(decisionOf("PASSED")).toBe("passed");
    expect(decisionOf("REJECTED")).toBe("not_passed");
    expect(decisionOf("HIRED")).toBe("passed");
    expect(decisionOf("SCREENING")).toBeNull();
    expect(decisionOf(null)).toBeNull();
  });
  it("keeps submitted work in the queue until the candidate is decided", () => {
    expect(needsReview("submitted", "SCREENING")).toBe(true);
    expect(needsReview("submitted", null)).toBe(true);
    expect(needsReview("submitted", "PASSED")).toBe(false);
    expect(needsReview("in_progress", "SCREENING")).toBe(false);
  });
  it("filters Submitted and Decided apart", () => {
    expect(matchesFilter("submitted", "submitted", null)).toBe(true);
    expect(matchesFilter("submitted", "submitted", "passed")).toBe(false);
    expect(matchesFilter("decided", "submitted", "not_passed")).toBe(true);
    expect(matchesFilter("closed", "cancelled", null)).toBe(true);
    expect(matchesFilter("closed", "expired", null)).toBe(true);
    expect(matchesFilter("all", "not_started", null)).toBe(true);
  });
  it("labels a decided row with the decision", () => {
    expect(rowLabel("submitted", "passed").label).toBe("Passed");
    expect(rowLabel("submitted", null).label).toBe("Submitted");
    expect(rowLabel("expired", null).tone).toBe("danger");
  });
});

describe("scoring", () => {
  const a = (id: string, challengeId: string, score: number, at: string, status = "passed") => ({
    id,
    challengeId,
    status,
    score,
    startedAt: at,
    finishedAt: at,
  });

  it("counts the first finished attempt per question, so a later retry cannot replace it", () => {
    const attempts = [
      a("late", "q1", 100, "2026-09-24T10:00:00Z"),
      a("first", "q1", 40, "2026-09-23T10:00:00Z", "failed"),
      a("q2", "q2", 80, "2026-09-23T11:00:00Z"),
      a("other", "q3", 90, "2026-09-23T11:00:00Z"),
    ];
    const counted = countedAttempts(attempts, ["q1", "q2"]);
    expect(counted.get("q1")?.id).toBe("first");
    expect(counted.has("q3")).toBe(false);
    expect(takeHomeScore(["q1", "q2"].map((q) => counted.get(q)?.score))).toBe(60);
  });

  it("ignores unfinished attempts", () => {
    const counted = countedAttempts([a("x", "q1", 90, past, "in_progress")], ["q1"]);
    expect(counted.size).toBe(0);
  });

  it("has no score when nothing is scored", () => {
    expect(takeHomeScore([null, undefined])).toBeNull();
    expect(takeHomeScore([67, 100])).toBe(84);
  });
});

describe("integritySummary", () => {
  it("summarises reports", () => {
    expect(integritySummary([]).level).toBe("none");
    expect(integritySummary([{ suspicionScore: 5, pasteCount: 0, blurCount: 0, totalBlurSec: 0 }]).label).toBe("Clean");
    const s = integritySummary([
      { suspicionScore: 10, pasteCount: 2, blurCount: 1, totalBlurSec: 30 },
      { suspicionScore: 30, pasteCount: 0, blurCount: 2, totalBlurSec: 70 },
    ]);
    expect(s).toMatchObject({ level: "some", pastes: 2, blurs: 3, blurSec: 100, label: "2 large pastes" });
    expect(integritySummary([{ suspicionScore: 70, pasteCount: 0, blurCount: 0, totalBlurSec: 0 }]).label).toBe("High risk");
  });
});

describe("submissionBlock", () => {
  const base = {
    status: "scheduled",
    deadlineAt: future,
    challengeIds: ["q1", "q2"],
    challengeId: "q1",
    ownsSession: true,
    answered: false,
    started: false,
    now,
  };
  it("allows a first answer to an open take-home", () => {
    expect(submissionBlock(base)).toBeNull();
  });
  it("refuses a resubmission of an answered question", () => {
    expect(submissionBlock({ ...base, answered: true, started: true })).toMatch(/already submitted/);
  });
  it("refuses once the take-home is completed or cancelled", () => {
    expect(submissionBlock({ ...base, status: "completed" })).toMatch(/closed/);
    expect(submissionBlock({ ...base, status: "cancelled" })).toMatch(/cancelled/);
  });
  it("refuses someone else and questions from outside the take-home", () => {
    expect(submissionBlock({ ...base, ownsSession: false })).toMatch(/someone else/);
    expect(submissionBlock({ ...base, challengeId: "q9" })).toMatch(/not part/);
  });
  it("refuses a first start after the deadline but lets a started take-home finish", () => {
    expect(submissionBlock({ ...base, deadlineAt: past })).toMatch(/deadline/);
    expect(submissionBlock({ ...base, deadlineAt: past, started: true, challengeId: "q2" })).toBeNull();
  });
});

describe("parseTemplateItems", () => {
  it("drops malformed and duplicate items", () => {
    const raw = JSON.stringify([{ challengeId: "a", minutes: 45 }, { challengeId: "a", minutes: 10 }, { x: 1 }, { challengeId: "b", minutes: -3 }]);
    expect(parseTemplateItems(raw)).toEqual([
      { challengeId: "a", minutes: 45 },
      { challengeId: "b", minutes: 30 },
    ]);
    expect(parseTemplateItems("nope")).toEqual([]);
  });
});
