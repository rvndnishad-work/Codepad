import { describe, expect, it } from "vitest";
import {
  canFollowUp,
  cleanAnswerInput,
  cleanGrade,
  drawQuestions,
  emptyAnswers,
  parseTheorySettings,
  recordAnswer,
  sanitizeTheory,
  theoryGraderBlock,
  theoryMinutes,
  theoryRoundScore,
  theoryView,
  type TheoryRoundData,
} from "@/lib/ai-interview/theory";
import type { QuestionItem } from "@/lib/ai-interview/questionnaire";

const items: QuestionItem[] = [
  { q: "What is a closure?", a: "A function plus its lexical scope.", tech: "javascript", difficulty: "easy" },
  { q: "What does a key do in a React list?", a: "Gives each item a stable identity." },
  { q: "Explain the event loop." },
];
const round = (followUps: 0 | 1 | 2 = 1): TheoryRoundData => ({ v: 1, settings: { count: null, secondsPerQuestion: 180, followUps, answerMode: "voice" }, items });
const say = (text: string) => cleanAnswerInput({ text, mode: "voice", seconds: 40, firstWordSec: 3, blurs: 0 });

describe("theory settings", () => {
  it("falls back to defaults for anything unexpected", () => {
    expect(sanitizeTheory({ count: -2, secondsPerQuestion: 7, followUps: 9, answerMode: "shout" })).toEqual({ count: null, secondsPerQuestion: 180, followUps: 1, answerMode: "voice" });
    expect(sanitizeTheory({ count: "8", secondsPerQuestion: 120, followUps: 0, answerMode: "typing" })).toEqual({ count: 8, secondsPerQuestion: 120, followUps: 0, answerMode: "typing" });
    expect(parseTheorySettings("not json").secondsPerQuestion).toBe(180);
  });

  it("sizes the round from the questions asked and the follow-ups allowed", () => {
    expect(theoryMinutes({ count: 8, secondsPerQuestion: 180, followUps: 0, answerMode: "voice" }, 12)).toBe(24);
    expect(theoryMinutes({ count: 8, secondsPerQuestion: 180, followUps: 1, answerMode: "voice" }, 12)).toBe(30);
    expect(theoryMinutes({ count: null, secondsPerQuestion: 60, followUps: 0, answerMode: "voice" }, 2)).toBe(5);
  });

  it("keeps the order when asking all, and draws a subset in questionnaire order", () => {
    expect(drawQuestions(items, round().settings).map((i) => i.q)).toEqual(items.map((i) => i.q));
    const seq = [0.9, 0.1];
    const drawn = drawQuestions(items, { ...round().settings, count: 2 }, () => seq.shift() ?? 0);
    expect(drawn).toHaveLength(2);
    expect(items.indexOf(drawn[0])).toBeLessThan(items.indexOf(drawn[1]));
  });
});

describe("theory answers", () => {
  it("shows one question at a time and never a reference answer", () => {
    const v = theoryView(round(), emptyAnswers());
    expect(v.question?.text).toBe("What is a closure?");
    expect(JSON.stringify(v)).not.toContain("lexical scope");
    expect(v.total).toBe(3);
  });

  it("records answers, then a follow-up, then moves on", () => {
    let s = recordAnswer(emptyAnswers(), round(), say("It captures variables"));
    expect(canFollowUp(s, round().settings)).toBe(true);
    s = { ...s, pendingFollowUp: "Can you give an example?" };
    expect(theoryView(round(), s).followUp).toBe("Can you give an example?");
    expect(theoryView(round(), s).position).toBe(0);
    s = recordAnswer(s, round(), say("A counter function"));
    expect(s.items[0].followUps).toEqual([{ q: "Can you give an example?", a: "A counter function", mode: "voice" }]);
    expect(s.items[0].seconds).toBe(80);
    expect(canFollowUp(s, round().settings)).toBe(false);
    expect(theoryView(round(), s).question?.text).toBe("What does a key do in a React list?");
  });

  it("treats an empty answer as skipped and never follows it up", () => {
    const s = recordAnswer(emptyAnswers(), round(2), cleanAnswerInput({ text: "  ", skipped: false }));
    expect(s.items[0].skipped).toBe(true);
    expect(canFollowUp(s, round(2).settings)).toBe(false);
  });

  it("is done after the last question", () => {
    let s = emptyAnswers();
    for (const t of ["a b", "c d", "e f"]) s = recordAnswer(s, round(0), say(t));
    const v = theoryView(round(0), s);
    expect(v.done).toBe(true);
    expect(v.statuses).toEqual(["answered", "answered", "answered"]);
    expect(recordAnswer(s, round(0), say("extra")).items).toHaveLength(3);
  });
});

describe("theory grading", () => {
  it("clamps model output and forces skipped answers to zero", () => {
    const answered = recordAnswer(emptyAnswers(), round(), say("words")).items[0];
    expect(cleanGrade({ score: 9, verdict: "STRONG", covered: "x" }, answered)).toMatchObject({ score: 5, verdict: "strong", covered: "x" });
    expect(cleanGrade({ score: 2 }, answered).verdict).toBe("partial");
    expect(cleanGrade({ score: 5, verdict: "strong" }, { ...answered, skipped: true })).toMatchObject({ score: 0, verdict: "skipped" });
  });

  it("scores the round over every question, unanswered ones counting zero", () => {
    const a = recordAnswer(emptyAnswers(), round(), say("x")).items[0];
    expect(theoryRoundScore([{ ...a, grade: { score: 5, verdict: "strong", covered: "", missed: "", reason: "" } }], 3)).toBe(33);
  });

  it("gives the grader the reference answers and what was said", () => {
    const s = recordAnswer(emptyAnswers(), round(), say("It keeps scope"));
    const block = theoryGraderBlock(round(), s.items);
    expect(block).toContain("Reference answer (a guide, not a script): A function plus its lexical scope.");
    expect(block).toContain("Candidate answer: It keeps scope");
    expect(block).toContain("3. Explain the event loop.\n   Reference answer: none given");
    expect(block).toContain("(not reached)");
  });
});
