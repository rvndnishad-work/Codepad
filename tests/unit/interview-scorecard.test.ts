/**
 * Interview scorecards: criteria, the 1 to 4 scale, the lock on submitted
 * cards, blind scoring, and how the panel is summarised against the pass
 * mark (labels only, nobody is passed by it).
 */
import { describe, expect, it } from "vitest";
import {
  bandLabel,
  canSeeOthers,
  checkWrite,
  cleanRatings,
  DEFAULT_PASS_MARK,
  deriveCriteria,
  fmtScore,
  MAX_QUESTION_CRITERIA,
  nudgeWaitMinutes,
  parseCriteria,
  passMarkOf,
  questionId,
  scorecardAverage,
  storedPassMark,
  submitIssues,
  summarisePanel,
  type Reviewer,
  type SummaryCard,
} from "@/lib/interview/scorecard";

const rate = (...rs: (number | null)[]) => Object.fromEntries(rs.map((r, i) => [`c${i}`, { r, n: "" }]));

describe("deriveCriteria", () => {
  it("starts with the format's competencies, then one per question", () => {
    const c = deriveCriteria({ format: "coding", rounds: [{ key: "c:abc", title: "Debounced search" }], questions: ["How do you test a hook?"] });
    expect(c.map((x) => x.label)).toEqual(["Problem solving", "Code quality", "Communication", "Debounced search", "How do you test a hook?"]);
    expect(c.filter((x) => x.kind === "competency")).toHaveLength(3);
    expect(c[3].id).toBe("r:c:abc");
    expect(c[4].id).toBe(questionId("How do you test a hook?"));
  });

  it("falls back to the mixed set for an unknown or missing format", () => {
    expect(deriveCriteria({ format: null, rounds: [], questions: [] }).map((x) => x.id)).toEqual(["problem_solving", "technical_depth", "communication"]);
    expect(deriveCriteria({ format: "weird", rounds: [], questions: [] })).toHaveLength(3);
  });

  it("drops duplicate and blank questions and caps the number of questions", () => {
    const qs = ["Same question", " same QUESTION ", "", ...Array.from({ length: 20 }, (_, i) => `Question ${i}`)];
    const c = deriveCriteria({ format: "behavioural", rounds: [], questions: qs });
    expect(c.filter((x) => x.kind === "question")).toHaveLength(MAX_QUESTION_CRITERIA);
    expect(c.filter((x) => x.label.toLowerCase().includes("same question"))).toHaveLength(1);
  });

  it("gives a question the same id wherever it sits in the guide", () => {
    expect(questionId("Tell me about a conflict")).toBe(questionId("  tell me about a conflict"));
    expect(questionId("A")).not.toBe(questionId("B"));
  });

  it("round-trips through JSON and drops malformed entries", () => {
    const c = deriveCriteria({ format: "intro", rounds: [], questions: ["Why us?"] });
    expect(parseCriteria(JSON.stringify([...c, { nope: 1 }, "x"]))).toEqual(c);
    expect(parseCriteria("not json")).toEqual([]);
  });
});

describe("ratings", () => {
  const criteria = deriveCriteria({ format: "coding", rounds: [], questions: [] });

  it("keeps only known criteria and whole scores from 1 to 4", () => {
    const r = cleanRatings(
      {
        problem_solving: { r: 4, n: "  clean  " },
        code_quality: { r: 5, n: "" },
        communication: { r: 2.5, n: "note only" },
        unknown: { r: 3, n: "" },
      },
      criteria,
    );
    expect(r).toEqual({ problem_solving: { r: 4, n: "clean" }, communication: { r: null, n: "note only" } });
  });

  it("averages rated criteria only, to one decimal", () => {
    expect(scorecardAverage(rate(4, 3, null))).toBe(3.5);
    expect(scorecardAverage(rate(4, 3, 3))).toBe(3.3);
    expect(scorecardAverage(rate(null))).toBeNull();
    expect(scorecardAverage({})).toBeNull();
  });

  it("needs every competency rated and a recommendation to submit; questions are optional", () => {
    const withQ = deriveCriteria({ format: "coding", rounds: [{ key: "c:1", title: "Round" }], questions: [] });
    const all = { problem_solving: { r: 3, n: "" }, code_quality: { r: 3, n: "" }, communication: { r: 4, n: "" } };
    expect(submitIssues({ criteria: withQ, ratings: all, recommendation: "yes" })).toEqual([]);
    expect(submitIssues({ criteria: withQ, ratings: { problem_solving: { r: 3, n: "" } }, recommendation: null })).toEqual([
      "Rate Code quality, Communication.",
      "Pick a recommendation.",
    ]);
    expect(submitIssues({ criteria: withQ, ratings: all, recommendation: "maybe" })).toEqual(["Pick a recommendation."]);
  });
});

describe("lock rules", () => {
  const me = "u:1";
  const draft = { reviewerKey: me, status: "draft" };
  const submitted = { reviewerKey: me, status: "submitted" };

  it("lets the author save and submit a new or draft card", () => {
    expect(checkWrite(null, me, "draft")).toEqual({ ok: true, audit: false, status: "draft" });
    expect(checkWrite(null, me, "submit")).toEqual({ ok: true, audit: false, status: "submitted" });
    expect(checkWrite(draft, me, "draft")).toMatchObject({ ok: true });
    expect(checkWrite(draft, me, "submit")).toMatchObject({ ok: true, status: "submitted" });
  });

  it("locks a submitted card against drafts and a second submit", () => {
    expect(checkWrite(submitted, me, "draft")).toMatchObject({ ok: false, error: expect.stringContaining("locked") });
    expect(checkWrite(submitted, me, "submit")).toMatchObject({ ok: false, error: expect.stringContaining("already submitted") });
  });

  it("allows an amendment only on a submitted card, with a reason, and audits it", () => {
    expect(checkWrite(draft, me, "amend", "a good reason")).toMatchObject({ ok: false });
    expect(checkWrite(null, me, "amend", "a good reason")).toMatchObject({ ok: false });
    expect(checkWrite(submitted, me, "amend")).toMatchObject({ ok: false, error: expect.stringContaining("why") });
    expect(checkWrite(submitted, me, "amend", "  ok  ")).toMatchObject({ ok: false });
    expect(checkWrite(submitted, me, "amend", "x".repeat(501))).toMatchObject({ ok: false });
    expect(checkWrite(submitted, me, "amend", "Mixed up two candidates")).toEqual({ ok: true, audit: true, status: "submitted" });
  });

  it("never lets anyone write someone else's card", () => {
    for (const intent of ["draft", "submit", "amend"] as const) {
      expect(checkWrite(draft, "u:2", intent, "a good reason")).toMatchObject({ ok: false, error: "You can only change your own scorecard." });
      expect(checkWrite(submitted, "g:9", intent, "a good reason")).toMatchObject({ ok: false });
    }
  });
});

describe("blind scoring", () => {
  it("hides the others from a panel member until they submit", () => {
    expect(canSeeOthers({ isReviewer: true, hasSubmitted: false })).toBe(false);
    expect(canSeeOthers({ isReviewer: true, hasSubmitted: true })).toBe(true);
  });
  it("shows everything to people deciding who are not on the panel", () => {
    expect(canSeeOthers({ isReviewer: false, hasSubmitted: false })).toBe(true);
  });
});

describe("pass mark", () => {
  it("defaults, clamps and snaps to quarter points", () => {
    expect(passMarkOf(null)).toBe(DEFAULT_PASS_MARK);
    expect(passMarkOf(Number.NaN)).toBe(DEFAULT_PASS_MARK);
    expect(passMarkOf(9)).toBe(4);
    expect(passMarkOf(0)).toBe(1.5);
    expect(passMarkOf(3.3)).toBe(3.25);
    expect(passMarkOf(3.4)).toBe(3.5);
  });
  it("stores null for the default so a later default still applies", () => {
    expect(storedPassMark(3)).toBeNull();
    expect(storedPassMark(3.1)).toBeNull();
    expect(storedPassMark(3.5)).toBe(3.5);
    expect(storedPassMark(undefined)).toBeNull();
  });
  it("formats marks for display", () => {
    expect(fmtScore(3)).toBe("3.0");
    expect(fmtScore(3.25)).toBe("3.25");
    expect(fmtScore(3.5)).toBe("3.5");
  });
});

describe("summarisePanel", () => {
  const reviewers: Reviewer[] = [
    { key: "u:host", name: "Priya", kind: "member", email: "p@x.io" },
    { key: "u:dan", name: "Daniel", kind: "member", email: "d@x.io" },
    { key: "g:marco", name: "marco@guest.io", kind: "guest", email: "marco@guest.io" },
  ];
  const card = (reviewerKey: string, status: string, ratings: SummaryCard["ratings"], recommendation: string | null): SummaryCard => ({ reviewerKey, status, ratings, recommendation });

  it("waits with nothing submitted and lists everyone as missing", () => {
    const s = summarisePanel(reviewers, [card("u:dan", "draft", rate(4, 4, 4), "yes")], null);
    expect(s.average).toBeNull();
    expect(s.band).toBeNull();
    expect(s.submitted).toBe(0);
    expect(s.missing.map((m) => [m.key, m.state])).toEqual([
      ["u:host", "not_started"],
      ["u:dan", "draft"],
      ["g:marco", "not_started"],
    ]);
    expect(bandLabel(s)).toBe("Waiting for scorecards");
  });

  it("averages each card's own average so every interviewer counts once, drafts excluded", () => {
    const cards = [
      card("u:host", "submitted", rate(4, 4, 4, 4, 4, 4), "yes"), // 4.0 over six criteria
      card("u:dan", "submitted", rate(2, 3), "unsure"), // 2.5 over two
      card("g:marco", "draft", rate(1, 1, 1), "no"),
    ];
    const s = summarisePanel(reviewers, cards, null);
    expect(s.average).toBe(3.3); // (4 + 2.5) / 2 = 3.25, shown to one decimal
    expect(s.submitted).toBe(2);
    expect(s.recommendations).toEqual({ no: 0, unsure: 1, yes: 1 });
    expect(s.byCriterion.c0).toEqual({ average: 3, count: 2 });
    expect(s.byCriterion.c2).toEqual({ average: 4, count: 1 });
    expect(s.missing.map((m) => m.key)).toEqual(["g:marco"]);
    expect(s.complete).toBe(false);
    expect(s.band).toBe("at_or_above");
  });

  it("only relabels against the pass mark", () => {
    const cards = [card("u:host", "submitted", rate(3, 3, 4), "yes"), card("u:dan", "submitted", rate(3, 3, 3), "yes"), card("g:marco", "submitted", rate(3, 4, 3), "yes")];
    const standard = summarisePanel(reviewers, cards, null);
    const strict = summarisePanel(reviewers, cards, 3.5);
    expect(standard.average).toBe(strict.average);
    expect(standard.complete).toBe(true);
    expect(standard.band).toBe("at_or_above");
    expect(bandLabel(standard)).toBe("At or above the pass mark of 3.0");
    expect(strict.band).toBe("below");
    expect(bandLabel(strict)).toBe("Below the pass mark of 3.5");
  });

  it("counts a card from someone no longer on the panel, but not as expected", () => {
    const s = summarisePanel(reviewers.slice(0, 1), [card("u:host", "submitted", rate(3), "yes"), card("u:gone", "submitted", rate(1), "no")], null);
    expect(s.submitted).toBe(2);
    expect(s.average).toBe(2);
    expect(s.complete).toBe(true);
    expect(s.expected).toBe(1);
  });

  it("is never complete for an empty panel", () => {
    expect(summarisePanel([], [], null).complete).toBe(false);
  });
});

describe("nudge cooldown", () => {
  const now = new Date("2026-09-26T12:00:00Z");
  it("allows a nudge when none was sent or an hour has passed", () => {
    expect(nudgeWaitMinutes(null, now)).toBe(0);
    expect(nudgeWaitMinutes(new Date("2026-09-26T11:00:00Z"), now)).toBe(0);
  });
  it("reports the minutes left otherwise", () => {
    expect(nudgeWaitMinutes("2026-09-26T11:30:00Z", now)).toBe(30);
    expect(nudgeWaitMinutes(new Date("2026-09-26T11:59:30Z"), now)).toBe(60);
  });
});
