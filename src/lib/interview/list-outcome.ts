/**
 * Where each interview on the workspace Interviews list stands, in the words
 * a recruiter uses. Pure, so the list and its tests share it.
 *
 * The outcome describes this interview only: coming up, live, waiting for
 * scorecards, then above or below its bar, or did not finish. The candidate's
 * own decision (Passed, Not passed) is a separate line under it, because a
 * candidate can pass after one round went badly (a manual pass) and a single
 * interview never passes anyone. Mixing the two on one pill is how "Passed"
 * ended up next to "Did not finish".
 */

export type OutcomeKey =
  | "live"
  | "questions"
  | "unscheduled"
  | "missed"
  | "upcoming"
  | "scorecards"
  | "above_bar"
  | "below_bar"
  | "did_not_finish"
  | "held"
  | "cancelled";

export type OutcomeInput = {
  state: "scheduled" | "live" | "completed" | "cancelled";
  /** "needed" while a teammate still has to pick the questions. */
  questions: "ready" | "needed" | "open";
  scheduledAt: string | null;
  /** Panel scorecards expected and submitted. */
  cards: { expected: number; submitted: number };
  /** A score exists outside the panel cards (the older end-of-room rubric). */
  rubric: boolean;
  /** The interviewer's take from the End interview dialog, e.g. "left_in_between". */
  verdict?: string | null;
  /** The panel (or rubric) average and its bar, when the viewer may see it. */
  score?: { value: number; bar: number } | null;
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
  if (i.verdict === "left_in_between") return "did_not_finish";
  if (!i.rubric && i.cards.submitted < i.cards.expected) return "scorecards";
  if (i.score) return i.score.value >= i.score.bar ? "above_bar" : "below_bar";
  return "held";
}

/** Filters on the list. Finished interviews file under the candidate's decision. */
export type OutcomeGroup = "upcoming" | "live" | "decision" | "moved_on" | "passed" | "not_passed" | "cancelled";

/**
 * The recruiter's next step on the round this interview belongs to, when it
 * is one of the candidate's rounds: move on or stop (null until picked), and
 * the name of the round after it (null when it is the last).
 */
export type RoundStepInfo = { nextStep: "advance" | "stop" | null; next: string | null };

const UPCOMING: OutcomeKey[] = ["upcoming", "unscheduled", "questions", "missed"];

export function groupOf(o: OutcomeKey, stage?: string | null, step?: RoundStepInfo | null): OutcomeGroup {
  if (UPCOMING.includes(o)) return "upcoming";
  if (o === "live" || o === "cancelled") return o;
  if (stage === "PASSED") return "passed";
  if (stage === "REJECTED") return "not_passed";
  // Moved on to a later round: nothing left to decide about this interview.
  if (step?.nextStep === "advance" && step.next) return "moved_on";
  return "decision";
}

/** Whether the interview itself has a result a recruiter can act on. */
export function hasInterviewResult(o: OutcomeKey): boolean {
  return o === "above_bar" || o === "below_bar" || o === "did_not_finish" || o === "held";
}

/**
 * The small line about the candidate under a finished interview. A pass
 * after a round that was below its bar or unfinished is a manual pass.
 */
export function candidateLine(
  o: OutcomeKey,
  stage: string | null | undefined,
  step?: RoundStepInfo | null,
): { text: string; tone: "success" | "danger" | "muted" } | null {
  if (o === "live" || o === "cancelled" || UPCOMING.includes(o)) return null;
  if (stage === "PASSED") return { text: o === "below_bar" || o === "did_not_finish" ? "Candidate passed manually" : "Candidate passed", tone: "success" };
  if (stage === "REJECTED") return { text: "Candidate not passed", tone: "danger" };
  if (!stage) return null;
  if (step?.nextStep === "advance" && step.next) return { text: `Moved on to ${step.next}`, tone: "success" };
  if (step?.nextStep === "stop") return { text: "Stopped here, not marked as not passed yet", tone: "danger" };
  if (step && step.next && hasInterviewResult(o)) return { text: "Next step not picked yet", tone: "muted" };
  return { text: "No decision on the candidate yet", tone: "muted" };
}
