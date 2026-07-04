/**
 * Types for the hand-authored "Review the AI's code" challenge bank
 * (prisma/data/review-challenges-*.ts, seeded by prisma/seed-review-challenges.ts).
 *
 * Each challenge is a plausible AI-generated answer to `prompt` with
 * deliberately planted flaws. Grading is a deterministic checklist of the
 * findings — no LLM involved — so line anchors MUST match the `code` string
 * exactly (1-based, inclusive). If you edit `code`, re-anchor every finding;
 * `npx tsx prisma/seed-review-challenges.ts --lint` prints each finding next
 * to its anchored lines for eyeball verification.
 */

export type ReviewCategory =
  | "hallucinated-api"
  | "logic-bug"
  | "security"
  | "performance"
  | "edge-case";

export type CuratedReviewFinding = {
  /** 1-based inclusive [start, end] line range in the challenge `code`. */
  lines: [number, number];
  category: ReviewCategory;
  /** Short name shown in the reveal list, e.g. "Timers don't have .cancel()". */
  title: string;
  /** Reveal text: why it's wrong + what correct code looks like. */
  explanation: string;
  /** Defaults to 10. */
  points?: number;
};

export type CuratedReviewChallenge = {
  slug: string;
  title: string;
  /** The prompt the fictional AI assistant was answering. */
  prompt: string;
  language: "javascript" | "typescript" | "python" | "sql";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  /** Countdown for Hallucination Hunt mode; defaults to 120s. */
  timeLimitSec?: number;
  /**
   * The AI's answer, verbatim. Written flush-left — the first character after
   * the opening backtick is line 1, column 1. No leading/trailing blank lines.
   */
  code: string;
  findings: CuratedReviewFinding[];
};
