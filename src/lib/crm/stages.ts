/**
 * Screening stage taxonomy + helpers (IP-34, narrowed to screening only).
 *
 * `stage` is orthogonal to `Candidate.status`:
 *   - `stage` = where they are in screening (New, Screening, Passed, Not passed)
 *   - `status` = legacy disposition flag (active/hired/etc.)
 * Both columns coexist for backwards compat. New CRM UI keys off `stage`.
 */

export const PIPELINE_STAGES = ["NEW", "SCREENING", "PASSED", "REJECTED"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/**
 * Stages from before screening-only Candidates (the app is not an ATS: it
 * stops at a screening decision, and the ATS takes over from Passed). Old
 * audit rows and API callers may still use them.
 */
const LEGACY_STAGES: Record<string, PipelineStage> = {
  APPLIED: "NEW",
  SCREENED: "SCREENING",
  TAKE_HOME: "SCREENING",
  ONSITE: "SCREENING",
  OFFER: "PASSED",
  HIRED: "PASSED",
};

/** Current stage for any stored or legacy value; unknown values read as New. */
export function normalizeStage(s: unknown): PipelineStage {
  if (typeof s !== "string") return "NEW";
  if (isPipelineStage(s)) return s;
  return LEGACY_STAGES[s] ?? "NEW";
}

/**
 * Forward-only progression order. Used by IP-69 auto-transitions: only move
 * a candidate forward, never back, when a workflow event fires.
 */
export const STAGE_RANK: Record<PipelineStage, number> = {
  NEW: 0,
  SCREENING: 1,
  PASSED: 2,
  REJECTED: 3, // terminal but not "ahead" of PASSED — see isForwardTransition
};

export function isPipelineStage(s: string): s is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(s);
}

/**
 * True when `from → to` represents forward progress for IP-69 auto-transitions.
 * Decisions (PASSED, REJECTED) are final for automation: events never move a
 * decided candidate.
 */
export function isForwardTransition(from: PipelineStage, to: PipelineStage): boolean {
  if (from === "PASSED" || from === "REJECTED") return false;
  return STAGE_RANK[to] > STAGE_RANK[from];
}

export const REJECT_REASONS = [
  "SKILL_GAP",
  "CULTURE_FIT",
  "COMP_MISMATCH",
  "NO_RESPONSE",
  "WITHDREW",
  "OTHER",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: "New",
  SCREENING: "Screening",
  PASSED: "Passed",
  REJECTED: "Not passed",
};

// Stage badges need legible contrast in BOTH light and dark mode. Each entry
// pairs a saturated light-mode triple (text-700 / bg-100 / border-300) with a
// pale dark-mode triple via Tailwind `dark:` variants.
export const STAGE_TONES: Record<PipelineStage, string> = {
  NEW:
    "border-slate-300 bg-slate-100 text-slate-700 " +
    "dark:border-slate-500/30 dark:bg-slate-500/[0.05] dark:text-slate-300",
  SCREENING:
    "border-indigo-300 bg-indigo-100 text-indigo-700 " +
    "dark:border-indigo-500/30 dark:bg-indigo-500/[0.06] dark:text-indigo-300",
  PASSED:
    "border-emerald-300 bg-emerald-100 text-emerald-700 " +
    "dark:border-emerald-500/30 dark:bg-emerald-500/[0.06] dark:text-emerald-300",
  REJECTED:
    "border-rose-300 bg-rose-100 text-rose-700 " +
    "dark:border-rose-500/30 dark:bg-rose-500/[0.05] dark:text-rose-300",
};

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  SKILL_GAP: "Skill gap",
  CULTURE_FIT: "Team fit",
  COMP_MISMATCH: "Compensation mismatch",
  NO_RESPONSE: "No response",
  WITHDREW: "Candidate withdrew",
  OTHER: "Other (see notes)",
};

/** Reasons offered when marking someone Not passed. Compensation is an offer
 *  question, which belongs to the ATS, so it stays readable but is not offered. */
export const REJECT_REASON_CHOICES = REJECT_REASONS.filter((r) => r !== "COMP_MISMATCH");
