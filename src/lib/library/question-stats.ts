/**
 * Usage stats for one question in one workspace, worked out from results the
 * workspace already has (AI screening rounds, take-homes, live interviews).
 * Pure: the loader in question-stats-server.ts turns rows into samples.
 */

/** Where the candidate ended up. Only recruiters set these; null while still open. */
export type SampleOutcome = "passed" | "not_passed" | null;

/** One time the question was put to a candidate. */
export type QuestionSample = {
  /** 0 to 100, or null when the answer was never scored. */
  score: number | null;
  /** Seconds spent on the question, or null when unknown. */
  seconds: number | null;
  outcome: SampleOutcome;
};

export type QuestionStats = {
  timesAsked: number;
  /** Samples with a score. */
  scored: number;
  /** Mean score, 0 to 100, rounded. Null when nothing was scored. */
  averageScore: number | null;
  /**
   * Mean score of candidates who passed minus the mean of those who did not,
   * divided by 100 and kept within 0 to 1 (two decimals). Null until both
   * groups have at least one scored sample.
   */
  separation: number | null;
  passedCount: number;
  notPassedCount: number;
  /** Mean seconds on the question, rounded. Null when no time was recorded. */
  averageSeconds: number | null;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

const validScore = (s: number | null): s is number => typeof s === "number" && Number.isFinite(s);

/** Keep a score within 0 to 100. */
export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Separation between passed and not passed: difference of mean scores,
 * normalised to 0..1. A question where the not-passed group scored higher
 * reads as 0 (it does not separate them in the useful direction).
 */
export function separation(passedScores: number[], notPassedScores: number[]): number | null {
  const p = mean(passedScores.map(clampScore));
  const n = mean(notPassedScores.map(clampScore));
  if (p == null || n == null) return null;
  const d = (p - n) / 100;
  return Math.round(Math.max(0, Math.min(1, d)) * 100) / 100;
}

export function computeQuestionStats(samples: QuestionSample[]): QuestionStats {
  const scored = samples.filter((s) => validScore(s.score));
  const scores = scored.map((s) => clampScore(s.score as number));
  const passed = scored.filter((s) => s.outcome === "passed").map((s) => s.score as number);
  const notPassed = scored.filter((s) => s.outcome === "not_passed").map((s) => s.score as number);
  const times = samples.map((s) => s.seconds).filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0);
  const avg = mean(scores);
  const avgSec = mean(times);
  return {
    timesAsked: samples.length,
    scored: scored.length,
    averageScore: avg == null ? null : Math.round(avg),
    separation: separation(passed, notPassed),
    passedCount: samples.filter((s) => s.outcome === "passed").length,
    notPassedCount: samples.filter((s) => s.outcome === "not_passed").length,
    averageSeconds: avgSec == null ? null : Math.round(avgSec),
  };
}

/** Candidate stage to outcome. Legacy "hired" style values are not passes here. */
export function outcomeFromStage(stage: string | null | undefined): SampleOutcome {
  if (stage === "PASSED") return "passed";
  if (stage === "REJECTED") return "not_passed";
  return null;
}

/** Seconds between two times, or null when either is missing or the order is wrong. */
export function secondsBetween(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null;
  const s = Math.round((end.getTime() - start.getTime()) / 1000);
  return s > 0 ? s : null;
}

/** "45 s", "6 min", "1 h 5 min". */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "No data";
  if (seconds < 60) return `${seconds} s`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
