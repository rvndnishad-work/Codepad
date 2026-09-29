import { describe, expect, it } from "vitest";
import {
  graderQuestionList,
  interviewerQuestionList,
  mergeEditedLines,
  parseQuestionnaire,
  serializeQuestionnaire,
  validateQuestionnaire,
} from "@/lib/ai-interview/questionnaire";

describe("questionnaire format", () => {
  it("reads the original one-question-per-line format", () => {
    expect(parseQuestionnaire("First?\n\n  Second?  \n")).toEqual([{ q: "First?" }, { q: "Second?" }]);
  });

  it("stores plain lines when there is nothing but question text", () => {
    expect(serializeQuestionnaire([{ q: "First?" }, { q: " Second? " }])).toBe("First?\nSecond?");
  });

  it("round-trips reference answers and sources as JSON", () => {
    const items = [
      { q: "What is a closure?", a: "A function plus its lexical scope.", src: "what-is-a-closure", tech: "javascript", difficulty: "easy" },
      { q: "Your own question" },
    ];
    const raw = serializeQuestionnaire(items);
    expect(raw.startsWith("{")).toBe(true);
    expect(parseQuestionnaire(raw)).toEqual(items);
  });

  it("treats text that only looks like JSON as lines", () => {
    expect(parseQuestionnaire("{not json}\nNext?")).toEqual([{ q: "{not json}" }, { q: "Next?" }]);
  });

  it("keeps answers for unchanged questions when edited as lines", () => {
    const prev = [
      { q: "Keep me", a: "kept answer", src: "keep" },
      { q: "Drop me", a: "gone" },
    ];
    expect(mergeEditedLines("New one\nKeep me", prev)).toEqual([{ q: "New one" }, { q: "Keep me", a: "kept answer", src: "keep" }]);
  });

  it("validates count and length", () => {
    expect(() => validateQuestionnaire([])).toThrow("Add at least one question.");
    expect(() => validateQuestionnaire(Array.from({ length: 41 }, (_, i) => ({ q: `Q${i}` })))).toThrow("40 questions");
    expect(validateQuestionnaire([{ q: "  spaced   out ", a: "  " }])).toEqual([{ q: "spaced out", a: undefined }]);
  });

  it("keeps reference answers out of the interviewer list but gives them to the grader", () => {
    const raw = serializeQuestionnaire([{ q: "What is a closure?", a: "A function plus its scope." }, { q: "Why?" }]);
    expect(interviewerQuestionList(raw)).toBe("1. What is a closure?\n2. Why?");
    const grader = graderQuestionList(parseQuestionnaire(raw));
    expect(grader).toContain("Reference answer (a guide, not a script): A function plus its scope.");
    expect(grader).toContain("2. Why?");
  });
});
