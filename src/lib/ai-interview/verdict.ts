/**
 * Absolute screening verdicts.
 *
 * Relative rank ("Best Fit of batch") means nothing without an absolute bar —
 * a 10% score that tops a one-candidate batch must never read as a win. Every
 * recruiter surface (console list, detail drawer, candidate activity board)
 * derives its pass/fail language from here so thresholds can't drift apart.
 */

export type VerdictTier = "STRONG_FIT" | "GOOD_FIT" | "BORDERLINE" | "NOT_A_FIT";

export type ScreeningVerdict = {
  tier: VerdictTier;
  /** Short label for chips/badges. */
  label: string;
  /** Longer HR-friendly phrasing for detail surfaces. */
  guidance: string;
  /** Score at or above the hiring bar (>= GOOD_FIT). */
  passed: boolean;
  /** Tailwind classes for a badge chip. */
  className: string;
};

/** Default bar: a score at or above this clears it. Each screening can set its own. */
export const SCREENING_PASS_THRESHOLD = 60;

/** The range a recruiter can set a screening's pass mark to. */
export const PASS_MARK_MIN = 30;
export const PASS_MARK_MAX = 95;

/** A screening's pass mark: its own setting, or the default when unset or unreadable. */
export function passMarkOf(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return SCREENING_PASS_THRESHOLD;
  return Math.max(PASS_MARK_MIN, Math.min(PASS_MARK_MAX, Math.round(value)));
}

/** Score bands around a bar: strong from 80 (or the bar, if higher), borderline within 20 below it. */
export function verdictBands(bar?: number | null) {
  const b = passMarkOf(bar);
  return { bar: b, strong: Math.max(80, b), borderline: Math.max(0, b - 20) };
}

/**
 * What a bar means for a questionnaire: how many of `questions` must be fully
 * right (5 of 5) to reach it when the rest earn nothing.
 */
export function fullyRightNeeded(bar: number, questions: number): number {
  return Math.ceil((passMarkOf(bar) / 100) * Math.max(1, questions));
}

const VERDICTS: Record<VerdictTier, Omit<ScreeningVerdict, "tier">> = {
  STRONG_FIT: {
    label: "Strong fit",
    guidance: "Exceeds the hiring bar — prioritize for the next stage.",
    passed: true,
    className: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/30",
  },
  GOOD_FIT: {
    label: "Good fit",
    guidance: "Clears the hiring bar — worth a human interview.",
    passed: true,
    className: "text-sky-600 dark:text-sky-400 bg-sky-500/[0.08] border-sky-500/30",
  },
  BORDERLINE: {
    label: "Borderline",
    guidance: "Below the bar — review the transcript before deciding.",
    passed: false,
    className: "text-amber-600 dark:text-amber-400 bg-amber-500/[0.08] border-amber-500/30",
  },
  NOT_A_FIT: {
    label: "Not a fit",
    guidance: "Well below the hiring bar on this role's rubric.",
    passed: false,
    className: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] border-rose-500/30",
  },
};

/**
 * Map a composite screening score (0-100) to a verdict against the
 * screening's pass mark (default 60).
 * Returns null for ungraded sessions (null/undefined score).
 */
export function getScreeningVerdict(score: number | null | undefined, passMark?: number | null): ScreeningVerdict | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const b = verdictBands(passMark);
  const tier: VerdictTier =
    clamped >= b.strong ? "STRONG_FIT" : clamped >= b.bar ? "GOOD_FIT" : clamped >= b.borderline ? "BORDERLINE" : "NOT_A_FIT";
  return { tier, ...VERDICTS[tier] };
}
