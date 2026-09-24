import { describe, expect, it } from "vitest";
import {
  computeNextStep,
  daysSince,
  needsAttention,
  resultStateText,
  screeningChecklist,
  rubricAverage,
  rubricToScore,
  summarizeResults,
  type CandidateResult,
} from "@/lib/crm/results";

const NOW = new Date("2026-09-24T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();

function result(p: Partial<CandidateResult>): CandidateResult {
  return {
    id: Math.random().toString(36).slice(2),
    candidateId: "c1",
    kind: "take_home",
    title: "LRU cache",
    state: "scored",
    score: null,
    rating: null,
    verdict: null,
    passed: null,
    sentAt: daysAgo(10),
    startedAt: null,
    finishedAt: null,
    deadlineAt: null,
    scheduledAt: null,
    minutesTaken: null,
    minutesAllowed: null,
    href: null,
    ...p,
  };
}

describe("rubric helpers", () => {
  it("averages 1 to 5 ratings and ignores junk", () => {
    expect(rubricAverage(JSON.stringify({ a: 4, b: 5, c: "x", d: 9 }))).toBe(4.5);
    expect(rubricAverage("not json")).toBeNull();
    expect(rubricAverage("{}")).toBeNull();
  });
  it("maps a rating onto 0 to 100", () => {
    expect(rubricToScore(1)).toBe(0);
    expect(rubricToScore(3)).toBe(50);
    expect(rubricToScore(5)).toBe(100);
  });
});

describe("summarizeResults", () => {
  it("counts finished work even when it has no score (the old tile counted scores)", () => {
    const s = summarizeResults([result({ state: "submitted", finishedAt: daysAgo(1) })]);
    expect(s.submitted).toBe(1);
    expect(s.combined).toBeNull();
  });

  it("weights screening 30, take-home 40, interview 30 and keeps the best per kind", () => {
    const s = summarizeResults([
      result({ kind: "ai_screening", score: 80, finishedAt: daysAgo(9) }),
      result({ kind: "take_home", score: 70, finishedAt: daysAgo(5) }),
      result({ kind: "take_home", score: 90, finishedAt: daysAgo(4), minutesTaken: 74 }),
      result({ kind: "interview", score: 50, rating: 3, finishedAt: daysAgo(1) }),
    ]);
    expect(s.byKind).toEqual({ ai_screening: 80, take_home: 90, interview: 50 });
    // 0.3*80 + 0.4*90 + 0.3*50 = 24 + 36 + 15 = 75
    expect(s.combined).toBe(75);
    expect(s.takeHomeMinutes).toBe(74);
    expect(s.interviewRating).toBe(3);
    expect(s.latest?.kind).toBe("interview");
  });

  it("re-normalises when only one kind has a score", () => {
    expect(summarizeResults([result({ kind: "ai_screening", score: 64 })]).combined).toBe(64);
  });
});

describe("computeNextStep", () => {
  const base = { stage: "SCREENING", stageChangedAt: daysAgo(3), createdAt: daysAgo(12), batchId: "b1", now: NOW };

  it("asks for a review when a take-home is submitted", () => {
    const n = computeNextStep({ ...base, results: [result({ state: "submitted", finishedAt: daysAgo(2) })] });
    expect(n).toMatchObject({ label: "Review take-home", tone: "warning", detail: "2 days waiting", onUs: true });
  });

  it("asks for feedback on a finished interview", () => {
    const n = computeNextStep({ ...base, results: [result({ kind: "interview", state: "submitted", finishedAt: daysAgo(1) })] });
    expect(n).toMatchObject({ label: "Collect feedback", onUs: true });
  });

  it("warns when an unstarted link expires tomorrow", () => {
    const n = computeNextStep({
      ...base,
      results: [result({ state: "invited", score: null, deadlineAt: new Date(NOW + 30 * 3600000).toISOString() })],
    });
    expect(n).toMatchObject({ label: "Link expires tomorrow", tone: "danger" });
  });

  it("waits on the candidate while an AI screening is out", () => {
    const n = computeNextStep({ ...base, results: [result({ kind: "ai_screening", state: "invited", sentAt: daysAgo(2) })] });
    expect(n).toMatchObject({ label: "Waiting on AI screening", detail: "Sent 2d ago", onUs: false });
  });

  it("suggests adding a new candidate to a batch, then sending an assessment", () => {
    expect(computeNextStep({ ...base, stage: "NEW", batchId: null, results: [] }).label).toBe("Add to a batch");
    expect(computeNextStep({ ...base, stage: "NEW", results: [] }).label).toBe("Send an assessment");
  });

  it("asks for a decision once everything sent is scored, in any order", () => {
    const n = computeNextStep({
      ...base,
      results: [
        result({ kind: "ai_screening", score: 30, passed: false, finishedAt: daysAgo(1) }),
        result({ kind: "take_home", score: 80, passed: true, finishedAt: daysAgo(2) }),
      ],
    });
    // 30 x 0.3 + 80 x 0.4, over 0.7.
    expect(n).toMatchObject({ label: "Make a decision", tone: "warning", detail: "Combined 59, one below the bar" });
  });

  it("stops at a decision", () => {
    const interview = result({ kind: "interview", state: "submitted", finishedAt: daysAgo(12) });
    expect(computeNextStep({ ...base, stage: "PASSED", results: [interview] }).label).toBe("Passed");
    expect(computeNextStep({ ...base, stage: "REJECTED", results: [] }).label).toBe("Not passed");
    // Old stage names map onto the decision.
    expect(computeNextStep({ ...base, stage: "HIRED", results: [] }).label).toBe("Passed");
  });

  it("does not flag decided candidates", () => {
    const n = computeNextStep({ ...base, stage: "PASSED", results: [] });
    expect(needsAttention(n, "PASSED", 30)).toBe(false);
  });
});

describe("screeningChecklist", () => {
  it("shows the three assessments in a fixed order, whatever was sent first", () => {
    const items = screeningChecklist([
      result({ kind: "interview", state: "invited", scheduledAt: "2026-09-26T10:00:00Z" }),
      result({ kind: "take_home", state: "submitted", finishedAt: daysAgo(1) }),
    ]);
    expect(items.map((i) => [i.kind, i.state])).toEqual([
      ["ai_screening", "todo"],
      ["take_home", "review"],
      ["interview", "waiting"],
    ]);
    expect(items[0].status).toBe("Not sent");
    expect(items[1].status).toBe("Not reviewed");
    expect(items[2].status).toMatch(/^Booked for 26 Sept/);
  });

  it("prefers the best score over a newer retake", () => {
    const items = screeningChecklist([
      result({ kind: "take_home", score: 72, verdict: "Pass", passed: true, finishedAt: daysAgo(5) }),
      result({ kind: "take_home", state: "invited", sentAt: daysAgo(1) }),
    ]);
    expect(items[1]).toMatchObject({ state: "done", value: "72", status: "Pass", count: 2 });
  });

  it("shows interview ratings on the 1 to 5 scale", () => {
    const items = screeningChecklist([result({ kind: "interview", score: 75, rating: 4, verdict: "Hire", passed: true })]);
    expect(items[2]).toMatchObject({ state: "done", value: "4.0" });
  });
});

describe("resultStateText", () => {
  it("describes unscored work in plain words", () => {
    expect(resultStateText(result({ kind: "interview", state: "submitted" }))).toBe("No feedback yet");
    expect(resultStateText(result({ state: "submitted" }))).toBe("Not reviewed");
    expect(resultStateText(result({ state: "invited" }))).toBe("Invited");
    expect(resultStateText(result({ kind: "interview", state: "invited" }))).toBe("Booked");
  });
});

describe("needsAttention", () => {
  it("flags warnings and candidates stuck on us for a week", () => {
    const plainOnUs = { label: "Schedule interview", tone: "plain" as const, detail: null, href: null, onUs: true };
    expect(needsAttention(plainOnUs, "ONSITE", 3)).toBe(false);
    expect(needsAttention(plainOnUs, "ONSITE", 7)).toBe(true);
    expect(needsAttention({ ...plainOnUs, tone: "warning" }, "ONSITE", 0)).toBe(true);
    expect(needsAttention({ ...plainOnUs, tone: "warning" }, "HIRED", 0)).toBe(false);
  });
  it("floors days since", () => {
    expect(daysSince(daysAgo(2.9), NOW)).toBe(2);
    expect(daysSince(null, NOW)).toBe(0);
  });
});
