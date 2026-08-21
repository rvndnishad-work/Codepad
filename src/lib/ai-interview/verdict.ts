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

/** Score at/above this clears the hiring bar. */
export const SCREENING_PASS_THRESHOLD = 60;

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
 * Map a composite screening score (0-100) to a verdict.
 * Returns null for ungraded sessions (null/undefined score).
 */
export function getScreeningVerdict(score: number | null | undefined): ScreeningVerdict | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier: VerdictTier =
    clamped >= 80 ? "STRONG_FIT" : clamped >= 60 ? "GOOD_FIT" : clamped >= 40 ? "BORDERLINE" : "NOT_A_FIT";
  return { tier, ...VERDICTS[tier] };
}
