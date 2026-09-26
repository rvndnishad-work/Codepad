import { describe, expect, it } from "vitest";
import {
  FORMAT_BY_ID,
  STEPS,
  defaultStart,
  defaultTitle,
  isInterviewerFor,
  nextSlot,
  normalizeGuests,
  parsePanel,
  plansFor,
  questionState,
  staggerSlots,
  stepIssues,
  suggestedMinutes,
  timeClashes,
  type WizardState,
} from "@/lib/interview/wizard";

const base: WizardState = {
  format: "coding",
  title: "Coding interview",
  candidates: [{ id: "c1", name: "Priya Sharma", email: "priya@example.com" }],
  noCandidate: false,
  hostId: "u1",
  panelIds: [],
  plan: "set",
  rounds: [{ key: "challenge:x", kind: "challenge", id: "x", title: "Two sum", minutes: 30 }],
  guideId: null,
  questionsOwnerId: null,
  questionsNote: "",
  minutes: 60,
  times: [],
  brief: "",
  candidateBrief: "",
  sendInvites: true,
};

describe("interview wizard steps", () => {
  it("a complete coding setup has no issues on any step", () => {
    for (const s of STEPS) expect(stepIssues(base, s.id)).toEqual([]);
  });

  it("needs a format first", () => {
    expect(stepIssues({ ...base, format: null }, "format")).toHaveLength(1);
  });

  it("needs a candidate unless the link is shared later", () => {
    expect(stepIssues({ ...base, candidates: [] }, "candidates")).toHaveLength(1);
    expect(stepIssues({ ...base, candidates: [], noCandidate: true }, "candidates")).toEqual([]);
    expect(stepIssues({ ...base, candidates: [{ id: null, name: "A", email: "not-an-email" }] }, "candidates")).toHaveLength(1);
  });

  it("coding needs rounds now or a teammate later, never no questions", () => {
    expect(stepIssues({ ...base, rounds: [] }, "questions")).toEqual(["Add at least one coding round."]);
    expect(stepIssues({ ...base, rounds: [], plan: "later" }, "questions")).toHaveLength(1);
    expect(stepIssues({ ...base, rounds: [], plan: "later", questionsOwnerId: "u2" }, "questions")).toEqual([]);
    expect(stepIssues({ ...base, rounds: [], plan: "open" }, "questions")).toHaveLength(1);
    expect(plansFor(FORMAT_BY_ID.coding)).toEqual(["set", "later"]);
  });

  it("guide formats need a questionnaire when picking now, and may skip questions", () => {
    const talk = { ...base, format: "behavioural" as const, rounds: [] };
    expect(stepIssues(talk, "questions")).toEqual(["Choose a question guide."]);
    expect(stepIssues({ ...talk, guideId: "g1" }, "questions")).toEqual([]);
    expect(stepIssues({ ...talk, plan: "open" }, "questions")).toEqual([]);
  });

  it("mixed needs coding rounds but the guide is optional", () => {
    const mixed = { ...base, format: "mixed" as const };
    expect(stepIssues(mixed, "questions")).toEqual([]);
    expect(stepIssues({ ...mixed, rounds: [] }, "questions")).toEqual(["Add at least one coding round."]);
  });

  it("review lists every open issue", () => {
    expect(stepIssues({ ...base, candidates: [], rounds: [], hostId: "" }, "review")).toHaveLength(3);
  });
});

describe("interview wizard helpers", () => {
  it("titles from the format and a single candidate", () => {
    expect(defaultTitle(FORMAT_BY_ID.coding, base.candidates)).toBe("Coding interview with Priya");
    expect(defaultTitle(FORMAT_BY_ID.intro, [])).toBe("Intro chat");
    expect(defaultTitle(FORMAT_BY_ID.behavioural, [...base.candidates, { id: null, name: "Omar", email: "" }])).toBe("Behavioural interview");
  });

  it("suggests a length from the rounds, in 15 minute steps", () => {
    expect(suggestedMinutes(FORMAT_BY_ID.coding, [])).toBe(60);
    const long = [30, 45, 30].map((m, i) => ({ key: String(i), kind: "challenge" as const, id: String(i), title: "", minutes: m }));
    // 105 minutes of rounds plus 10 for intros, rounded up to 120.
    expect(suggestedMinutes(FORMAT_BY_ID.coding, long)).toBe(120);
  });

  it("staggers back-to-back slots with a break", () => {
    expect(staggerSlots("2026-10-01T09:00", 45, 3, 15)).toEqual(["2026-10-01T09:00", "2026-10-01T10:00", "2026-10-01T11:00"]);
    expect(staggerSlots("bad", 45, 2)).toEqual(["", ""]);
  });

  it("gives the host and panel the interviewer side", () => {
    const s = { userId: "host", panelJson: JSON.stringify(["p1", "p2"]) };
    expect(isInterviewerFor(s, "host")).toBe(true);
    expect(isInterviewerFor(s, "p2")).toBe(true);
    expect(isInterviewerFor(s, "other")).toBe(false);
    expect(isInterviewerFor(s, null)).toBe(false);
    expect(parsePanel("{oops")).toEqual([]);
  });

  it("flags interviews still waiting on a teammate", () => {
    expect(questionState({ questionPlan: "later", roundCount: 0 })).toBe("needed");
    expect(questionState({ questionPlan: "later", roundCount: 2 })).toBe("ready");
    expect(questionState({ questionPlan: "later", roundCount: 0, guideTemplateId: "g" })).toBe("ready");
    expect(questionState({ questionPlan: "open", roundCount: 0 })).toBe("open");
    expect(questionState({ questionPlan: "set", roundCount: 1 })).toBe("ready");
  });
});

describe("schedule and emailed interviewers", () => {
  it("suggests tomorrow at 10:00 as the first start", () => {
    expect(defaultStart(new Date(2026, 8, 30, 17, 45))).toBe("2026-10-01T10:00");
  });

  it("gives someone new the slot after the previous person", () => {
    expect(nextSlot("2026-10-01T10:00", 45)).toBe("2026-10-01T11:00");
    expect(nextSlot("2026-10-01T10:00", 45, 0)).toBe("2026-10-01T10:45");
    expect(nextSlot("", 45)).toBe("");
  });

  it("flags interviews that overlap, whatever order they were typed in", () => {
    const t = ["2026-10-01T11:00", "2026-10-01T10:00", "", "2026-10-01T10:30", "2026-10-01T13:00"];
    expect([...timeClashes(t, 60)].sort()).toEqual([0, 1, 3]);
    expect(timeClashes(staggerSlots("2026-10-01T10:00", 60, 4, 0), 60).size).toBe(0);
    expect(timeClashes(["", ""], 60).size).toBe(0);
  });

  it("cleans typed emails", () => {
    expect(normalizeGuests([" Mei@Acme.io ", "mei@acme.io", "", "sam@acme.io"])).toEqual(["mei@acme.io", "sam@acme.io"]);
    expect(normalizeGuests(Array.from({ length: 14 }, (_, i) => `p${i}@x.io`))).toHaveLength(10);
  });

  it("blocks the Interviewers step on a bad email", () => {
    expect(stepIssues({ ...base, guests: ["mei@acme.io"] }, "panel")).toEqual([]);
    expect(stepIssues({ ...base, guests: ["mei@acme"] }, "panel")).toEqual(["One of the emails does not look right."]);
  });
});
