/**
 * A take-home's pass mark: the score its results need to read as a good
 * match. Each send (one run of the composer) sets its own, default 60, and a
 * recruiter can change it later. It only labels results. Passing someone is
 * always a recruiter's decision, and passing below the mark is a labelled
 * manual override.
 *
 * Pure, so the list, the report, the candidate results and the tests share it.
 */
import { PASS_MARK_MAX, PASS_MARK_MIN } from "@/lib/ai-interview/verdict";

/** Default mark, the fixed bar take-homes had before they could set one. */
export const TAKE_HOME_PASS_MARK = 60;

export { PASS_MARK_MAX, PASS_MARK_MIN };

/** Preset buttons in the composer and the change dialog. */
export const TAKE_HOME_PASS_PRESETS = [50, 60, 70, 80] as const;

/** Scores this far below the mark read as borderline rather than below it. */
export const BORDERLINE_BAND = 10;

/** A take-home's pass mark: its own setting, or the default when unset or unreadable. */
export function takeHomePassMarkOf(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return TAKE_HOME_PASS_MARK;
  return Math.max(PASS_MARK_MIN, Math.min(PASS_MARK_MAX, Math.round(value)));
}

export type TakeHomeMatch = "good" | "borderline" | "below";

export type TakeHomeVerdict = {
  match: TakeHomeMatch;
  label: string;
  tone: "success" | "warning" | "danger";
  /** At or above the mark. Passing anyone below it needs a manual override. */
  atMark: boolean;
};

const VERDICTS: Record<TakeHomeMatch, Omit<TakeHomeVerdict, "match">> = {
  good: { label: "Good match", tone: "success", atMark: true },
  borderline: { label: "Borderline", tone: "warning", atMark: false },
  below: { label: "Below the mark", tone: "danger", atMark: false },
};

/**
 * How a scored take-home reads against its mark: Good match at or above it,
 * Borderline within 10 below it, Below the mark under that. Null when there
 * is no score yet.
 */
export function takeHomeVerdict(score: number | null | undefined, passMark?: number | null): TakeHomeVerdict | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const mark = takeHomePassMarkOf(passMark);
  const match: TakeHomeMatch = s >= mark ? "good" : s >= mark - BORDERLINE_BAND ? "borderline" : "below";
  return { match, ...VERDICTS[match] };
}

/** Three sample scores around a mark, for the "how results read" preview. */
export function sampleScores(passMark: number): number[] {
  const mark = takeHomePassMarkOf(passMark);
  return [Math.min(100, mark + 14), Math.max(0, mark - 2), Math.max(0, mark - BORDERLINE_BAND - 8)];
}
