import { describe, it, expect } from "vitest";
import {
  gradeAttempt,
  FALSE_POSITIVE_PENALTY,
  type GraderFinding,
} from "../../src/lib/review-challenges/grader";

// Two planted findings worth 10 points each.
const findings: GraderFinding[] = [
  { id: "a", lineStart: 10, lineEnd: 10, category: "security", points: 10 },
  { id: "b", lineStart: 20, lineEnd: 22, category: "logic-bug", points: 10 },
];

describe("gradeAttempt — deterministic review scoring", () => {
  it("gives 100 when both findings are hit on the exact line + category", () => {
    const r = gradeAttempt(findings, [
      { line: 10, category: "security" },
      { line: 20, category: "logic-bug" },
    ]);
    expect(r.score).toBe(100);
    expect(r.foundCount).toBe(2);
    expect(r.falsePositives).toBe(0);
  });

  it("accepts a mark within ±1 line of the anchor", () => {
    const r = gradeAttempt(findings, [
      { line: 11, category: "security" }, // one below the line-10 finding
      { line: 23, category: "logic-bug" }, // one below the 20-22 range
    ]);
    expect(r.foundCount).toBe(2);
    expect(r.score).toBe(100);
  });

  it("gives half credit for the right line but wrong category", () => {
    const r = gradeAttempt(findings, [
      { line: 10, category: "performance" }, // wrong category
      { line: 20, category: "logic-bug" },
    ]);
    expect(r.partialCount).toBe(1);
    expect(r.foundCount).toBe(1);
    // 5 (partial) + 10 (hit) = 15 / 20 = 75
    expect(r.score).toBe(75);
  });

  it("penalizes false positives so blanket-flagging loses", () => {
    const spam: { line: number; category: string }[] = [];
    for (let i = 1; i <= 25; i++) spam.push({ line: i, category: "logic-bug" });
    const r = gradeAttempt(findings, spam);
    // Line 10 marked logic-bug = partial (5); lines 20-22 marked logic-bug = hit (10).
    // Remaining ~22 marks are false positives → penalty crushes the score to 0.
    expect(r.falsePositives).toBeGreaterThan(5);
    expect(r.score).toBe(0);
  });

  it("subtracts exactly the configured penalty per false positive", () => {
    const r = gradeAttempt(findings, [
      { line: 10, category: "security" }, // hit (10)
      { line: 20, category: "logic-bug" }, // hit (10)
      { line: 2, category: "security" }, // false positive
    ]);
    // 100 base - one FP penalty
    expect(r.score).toBe(100 - FALSE_POSITIVE_PENALTY);
    expect(r.falsePositives).toBe(1);
  });

  it("reports every finding as missed for an empty submission", () => {
    const r = gradeAttempt(findings, []);
    expect(r.score).toBe(0);
    expect(r.missedCount).toBe(2);
    expect(r.findingResults.every((f) => f.status === "missed")).toBe(true);
  });

  it("does not let one mark satisfy two findings, or count duplicate lines twice", () => {
    const adjacent: GraderFinding[] = [
      { id: "x", lineStart: 5, lineEnd: 5, category: "security", points: 10 },
      { id: "y", lineStart: 6, lineEnd: 6, category: "security", points: 10 },
    ];
    // A single mark at line 5 is in range of both (±1) but must claim only one.
    const r = gradeAttempt(adjacent, [
      { line: 5, category: "security" },
      { line: 5, category: "security" }, // duplicate line — ignored
    ]);
    expect(r.foundCount).toBe(1);
    expect(r.missedCount).toBe(1);
    expect(r.falsePositives).toBe(0);
  });
});
