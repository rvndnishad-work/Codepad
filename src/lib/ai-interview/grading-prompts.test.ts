import { describe, expect, it } from "vitest";
import { followUpPrompt, theoryGraderPrompt } from "./theory";
import { conversationGraderPrompt } from "./conversation";

describe("grading prompts reward understanding, not keywords", () => {
  it("theory grader gives no credit for terms that are named but not explained", () => {
    const p = theoryGraderPrompt({ positionTitle: "Frontend", block: "1. Q", count: 1 });
    expect(p).toContain("Judge understanding, not vocabulary");
    expect(p).toContain("earns credit only when the candidate explains it or uses it correctly");
    expect(p).toContain("even without the exact term");
  });

  it("follow-ups probe terms named without explanation, without hinting", () => {
    const p = followUpPrompt({ positionTitle: "Frontend", question: "Q", answer: "A", earlier: [] });
    expect(p).toContain("names technical terms without explaining them");
    expect(p).toContain("Never hint at or state the correct answer");
  });

  it("conversation grader applies the same rule to reference answers", () => {
    const p = conversationGraderPrompt({ positionTitle: "Sales", brief: "", questionList: "1. Q", transcript: "" });
    expect(p).toContain("judge understanding, not vocabulary");
  });
});
