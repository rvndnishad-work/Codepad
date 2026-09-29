import { describe, expect, it } from "vitest";
import {
  awaitsReview,
  humanize,
  planDisplay,
  relativeTime,
  setupSteps,
  sourceLabel,
  stageFunnel,
} from "@/lib/workspace/display";
import { buildOverview, type OverviewInput } from "@/lib/workspace/overview";

const NOW = new Date("2026-09-24T10:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const ahead = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

describe("planDisplay", () => {
  it("labels an active trial with days left and Growth features on", () => {
    const p = planDisplay({ planName: "FREE", trialEndsAt: ahead(9 * 24 - 1) }, NOW);
    expect(p).toMatchObject({ label: "Trial", onTrial: true, trialDaysLeft: 9, growthFeatures: true });
  });

  it("falls back to the plan once the trial has ended", () => {
    const p = planDisplay({ planName: "FREE", trialEndsAt: ago(1) }, NOW);
    expect(p).toMatchObject({ label: "Free", onTrial: false, growthFeatures: false });
  });

  it("never shows a trial on a paid plan", () => {
    expect(planDisplay({ planName: "GROWTH", trialEndsAt: ahead(48) }, NOW).label).toBe("Growth");
  });
});

describe("text helpers", () => {
  it("humanizes enum values", () => {
    expect(humanize("TAKE_HOME")).toBe("Take home");
    expect(humanize("do_not_hire")).toBe("Do not hire");
    expect(humanize(null)).toBe("");
  });

  it("labels known candidate sources", () => {
    expect(sourceLabel("linkedin")).toBe("LinkedIn");
    expect(sourceLabel("ats")).toBe("ATS");
    expect(sourceLabel("referral")).toBe("Referral");
    expect(sourceLabel(null)).toBe("Not set");
  });

  it("formats relative time", () => {
    expect(relativeTime(ago(0.5), NOW)).toBe("30 min ago");
    expect(relativeTime(ago(3), NOW)).toBe("3 h ago");
    expect(relativeTime(ago(30), NOW)).toBe("Yesterday");
    expect(relativeTime(ago(24 * 4), NOW)).toBe("4 days ago");
  });
});

describe("stageFunnel", () => {
  it("counts stages and the share that reached each next stage", () => {
    const f = stageFunnel(["NEW", "NEW", "SCREENING", "SCREENING", "ONSITE", "PASSED", "REJECTED", "weird"]);
    expect(f.active).toBe(7);
    expect(f.rejected).toBe(1);
    const byStage = Object.fromEntries(f.rows.map((r) => [r.stage, r]));
    // "weird" reads as New; the old ONSITE stage reads as Screening.
    expect(byStage.NEW.count).toBe(3);
    expect(byStage.SCREENING.count).toBe(3);
    // 4 of the 7 active candidates got past New, and 1 of those 4 passed.
    expect(byStage.SCREENING.conversion).toBe(57);
    expect(byStage.PASSED.conversion).toBe(25);
  });
});

describe("setupSteps", () => {
  it("marks steps done from real counts", () => {
    const steps = setupSteps(
      { assessments: 1, candidates: 0, aiScreenings: 0, members: 1, pendingInvites: 1 },
      { seatLimit: 5, aiIncluded: true },
    );
    expect(steps.map((s) => [s.id, s.done])).toEqual([
      ["workspace", true],
      ["assessment", true],
      ["candidate", false],
      ["ai", false],
      ["team", true],
    ]);
    expect(steps[4].body).toContain("5 seats");
  });
});

describe("awaitsReview", () => {
  it("clears once the candidate has a decision", () => {
    expect(awaitsReview("take-home", "SCREENING")).toBe(true);
    expect(awaitsReview("take-home", "PASSED")).toBe(false);
    expect(awaitsReview("screening", "REJECTED")).toBe(false);
    // Old stage names still read correctly.
    expect(awaitsReview("screening", "TAKE_HOME")).toBe(true);
    expect(awaitsReview("screening", null)).toBe(true);
  });
});

describe("buildOverview", () => {
  const input: OverviewInput = {
    slug: "acme",
    candidates: [
      { id: "c1", name: "Ana", stage: "SCREENING", createdAt: ago(2), stageChangedAt: ago(2) },
      { id: "c2", name: "Ben", stage: "PASSED", createdAt: ago(24 * 20), stageChangedAt: ago(5) },
      { id: "c3", name: "Cy", stage: "PASSED", createdAt: ago(24 * 40), stageChangedAt: ago(24 * 3) },
      { id: "c4", name: "Di", stage: "REJECTED", createdAt: ago(24 * 10), stageChangedAt: ago(24) },
    ],
    sessions: [
      {
        id: "s1", title: "Onsite", candidateName: "Ben", candidateId: "c2", shareToken: "tok",
        scheduledAt: ahead(3), startedAt: null, finishedAt: null, createdAt: ago(10), interviewerName: "Priya",
      },
      {
        id: "s2", title: "Pairing", candidateName: "Cy", candidateId: "c3", shareToken: "tok2",
        scheduledAt: null, startedAt: ago(30), finishedAt: ago(29), createdAt: ago(40), interviewerName: null,
      },
    ],
    takeHomes: [
      {
        id: "t1", candidateName: "Ana", challengeTitle: "LRU", status: "SUBMITTED", expiresAt: ahead(10),
        submittedAt: ago(60), attemptId: "a1", candidateId: "c1", candidateStage: "SCREENING",
      },
      {
        id: "t2", candidateName: "Eve", challengeTitle: "Debounce", status: "PENDING", expiresAt: ahead(20),
        submittedAt: null, attemptId: null, candidateId: null, candidateStage: null,
      },
    ],
    takeHomeSessions: [],
    aiInterviewSessions: [
      {
        id: "ai1", candidateName: "Cy", positionTitle: "FE", status: "COMPLETED", score: 81.6,
        candidateId: "c3", candidateStage: "PASSED", finishedAt: ago(24 * 5), createdAt: ago(24 * 6),
      },
    ],
  };

  const o = buildOverview(input, NOW);

  it("lists today's interview first, then reviews, then expiring links", () => {
    expect(o.attention.map((a) => a.id)).toEqual(["iv-s1", "th-t1", "exp-t2"]);
    expect(o.attention[1].href).toBe("/w/acme/take-homes/t1");
  });

  it("skips screenings whose candidate already has a decision", () => {
    expect(o.attention.find((a) => a.id === "ai-ai1")).toBeUndefined();
  });

  it("computes the KPI strip", () => {
    expect(o.kpis).toEqual({
      active: 1,
      addedThisWeek: 1,
      toReview: 1,
      reviewOverdue: 1,
      upcomingInterviews: 1,
      interviewsThisWeek: 2,
      passed: 2,
      passedThisMonth: 2,
    });
  });

  it("buckets completed work into eight weeks ending now", () => {
    expect(o.weekly).toHaveLength(8);
    expect(o.weekly[7].label).toBe("This week");
    expect(o.weekly.reduce((n, w) => n + w.count, 0)).toBe(3);
  });

  it("orders activity newest first", () => {
    expect(o.activity[0]).toMatchObject({ who: "Ana", what: "was added as a candidate" });
  });

  it("builds weekly trends and the screening score summary", () => {
    expect(o.trends.added).toHaveLength(8);
    expect(o.trends.added[7]).toBe(1);
    expect(o.trends.passed.reduce((a, b) => a + b, 0)).toBe(2);
    expect(o.trends.completed).toEqual(o.weekly.map((w) => w.count));
    expect(o.scores).toMatchObject({ count: 1, average: 82 });
    expect(o.scores.buckets.map((b) => b.count)).toEqual([0, 1, 0, 0]);
  });
});
