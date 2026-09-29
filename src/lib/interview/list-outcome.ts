/**
 * Where each interview on the workspace Interviews list stands, in the words
 * a recruiter uses: coming up, live, waiting for scorecards, waiting for a
 * decision, passed or not passed. Pure, so the list and its tests share it.
 *
 * Passed and Not passed come from the candidate's stage, which only a
 * recruiter sets. Scores and the interviewer's take never decide on their own.
 */

export type OutcomeKey = "live" | "questions" | "unscheduled" | "missed" | "upcoming" | "scorecards" | "decision" | "passed" | "not_passed" | "cancelled";

export type OutcomeInput = {
  state: "scheduled" | "live" | "completed" | "cancelled";
  /** "needed" while a teammate still has to pick the questions. */
  questions: "ready" | "needed" | "open";
  scheduledAt: string | null;
  /** The candidate's pipeline stage, when the interview is linked to one. */
  stage: string | null;
  /** Panel scorecards expected and submitted. */
  cards: { expected: number; submitted: number };
  /** A score exists outside the panel cards (the older end-of-room rubric). */
  rubric: boolean;
};

/** A scheduled interview this long past its start with nobody in the room reads as missed. */
export const MISSED_AFTER_MIN = 30;

export function interviewOutcome(i: OutcomeInput, now: Date = new Date()): OutcomeKey {
  if (i.state === "cancelled") return "cancelled";
  if (i.state === "live") return "live";
  if (i.state === "scheduled") {
    if (i.questions === "needed") return "questions";
    if (!i.scheduledAt) return "unscheduled";
    if (new Date(i.scheduledAt).getTime() < now.getTime() - MISSED_AFTER_MIN * 60_000) return "missed";
    return "upcoming";
  }
  if (i.stage === "PASSED") return "passed";
  if (i.stage === "REJECTED") return "not_passed";
  if (!i.rubric && i.cards.submitted < i.cards.expected) return "scorecards";
  return "decision";
}

/** Filters on the list, each a group of outcomes. */
export const OUTCOME_GROUPS = {
  upcoming: ["upcoming", "unscheduled", "questions", "missed"],
  live: ["live"],
  decision: ["decision", "scorecards"],
  passed: ["passed"],
  not_passed: ["not_passed"],
  cancelled: ["cancelled"],
} as const satisfies Record<string, readonly OutcomeKey[]>;

export type OutcomeGroup = keyof typeof OUTCOME_GROUPS;

export function groupOf(o: OutcomeKey): OutcomeGroup {
  for (const [g, keys] of Object.entries(OUTCOME_GROUPS) as [OutcomeGroup, readonly OutcomeKey[]][]) if (keys.includes(o)) return g;
  return "upcoming";
}
