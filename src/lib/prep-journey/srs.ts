/**
 * Spaced Repetition System (SRS) engine for Interview Prep.
 * Implements an adapted SuperMemo-2 (SM-2) spaced repetition algorithm
 * to calculate optimal review intervals for technical questions and coding challenges.
 */

export interface SrsItemState {
  /** Number of consecutive successful recall repetitions. */
  repetitions: number;
  /** Easiness factor (EF), default 2.5, minimum 1.3. */
  easeFactor: number;
  /** Current interval in days before the next review. */
  intervalDays: number;
  /** ISO date string for when the item is due next (YYYY-MM-DD). */
  dueDate: string;
}

export type SrsRating = 0 | 1 | 2 | 3 | 4 | 5;
export type SrsQuality = "again" | "hard" | "good" | "easy";

export const DEFAULT_SRS_STATE: SrsItemState = {
  repetitions: 0,
  easeFactor: 2.5,
  intervalDays: 1,
  dueDate: new Date().toISOString().slice(0, 10),
};

/**
 * Maps intuitive human review ratings ("again", "hard", "good", "easy")
 * to SM-2 numeric grades (0–5).
 */
export function qualityToGrade(quality: SrsQuality): SrsRating {
  switch (quality) {
    case "again":
      return 1; // Complete blackout / failed
    case "hard":
      return 3; // Solved with significant struggle / hints
    case "good":
      return 4; // Solved with normal effort
    case "easy":
      return 5; // Solved instantly / perfect recall
  }
}

/**
 * Calculates the next SRS state based on performance grade.
 *
 * @param previous Previous SRS state
 * @param grade Performance rating (0–5, where >= 3 is passing)
 * @param currentDate Current date (defaults to today)
 */
export function calculateNextSrs(
  previous: SrsItemState = DEFAULT_SRS_STATE,
  grade: SrsRating,
  currentDate: Date = new Date()
): SrsItemState {
  let { repetitions, easeFactor, intervalDays } = previous;

  // Update Easiness Factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  if (grade >= 3) {
    // Successful recall
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    // Failed recall (lapse): reset repetitions, reset interval to 1 day
    repetitions = 0;
    intervalDays = 1;
  }

  // Calculate next due date
  const due = new Date(currentDate.getTime());
  due.setDate(due.getDate() + intervalDays);
  const dueDate = due.toISOString().slice(0, 10);

  return {
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    dueDate,
  };
}

/**
 * Check if an SRS item is currently due for review.
 */
export function isDueForReview(dueDateString: string, todayString: string): boolean {
  return dueDateString <= todayString;
}
