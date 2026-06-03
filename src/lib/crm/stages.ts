/**
 * Pipeline stage taxonomy + helpers (IP-34).
 *
 * `stage` is orthogonal to `Candidate.status`:
 *   - `stage` = where they are in the hiring process
 *   - `status` = legacy disposition flag (active/hired/etc.)
 * Both columns coexist for backwards compat. New CRM UI keys off `stage`.
 */

export const PIPELINE_STAGES = [
  "APPLIED",
  "SCREENED",
  "TAKE_HOME",
  "ONSITE",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/**
 * Forward-only progression order. Used by IP-69 auto-transitions: only move
 * a candidate forward, never back, when a workflow event fires.
 */
export const STAGE_RANK: Record<PipelineStage, number> = {
  APPLIED: 0,
  SCREENED: 1,
  TAKE_HOME: 2,
  ONSITE: 3,
  OFFER: 4,
  HIRED: 5,
  REJECTED: 6, // terminal but not "ahead" of HIRED — see isForwardTransition
};

export function isPipelineStage(s: string): s is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(s);
}

/**
 * True when `from → to` represents forward progress for IP-69 auto-transitions.
 * REJECTED is terminal but accepted from anywhere (recruiter signal); HIRED
 * is final and never auto-moves.
 */
export function isForwardTransition(from: PipelineStage, to: PipelineStage): boolean {
  if (from === "HIRED") return false;
  if (to === "REJECTED") return true;
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
  APPLIED: "Applied",
  SCREENED: "Screened",
  TAKE_HOME: "Take-home",
  ONSITE: "Onsite",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

// Stage badges need legible contrast in BOTH light and dark mode. The pale
// dark-mode tones (`text-*-300` on `bg-*-500/[0.05]`) sit at <2:1 contrast on
// a light theme — which is what you see in the context menu portal. Each
// entry pairs a saturated light-mode triple (text-700 / bg-100 / border-300)
// with the original pale dark-mode triple via Tailwind `dark:` variants.
export const STAGE_TONES: Record<PipelineStage, string> = {
  APPLIED:
    "border-slate-300 bg-slate-100 text-slate-700 " +
    "dark:border-slate-500/30 dark:bg-slate-500/[0.05] dark:text-slate-300",
  SCREENED:
    "border-indigo-300 bg-indigo-100 text-indigo-700 " +
    "dark:border-indigo-500/30 dark:bg-indigo-500/[0.06] dark:text-indigo-300",
  TAKE_HOME:
    "border-amber-300 bg-amber-100 text-amber-800 " +
    "dark:border-amber-500/30 dark:bg-amber-500/[0.06] dark:text-amber-300",
  ONSITE:
    "border-sky-300 bg-sky-100 text-sky-700 " +
    "dark:border-sky-500/30 dark:bg-sky-500/[0.06] dark:text-sky-300",
  OFFER:
    "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-700 " +
    "dark:border-fuchsia-500/30 dark:bg-fuchsia-500/[0.06] dark:text-fuchsia-300",
  HIRED:
    "border-emerald-300 bg-emerald-100 text-emerald-700 " +
    "dark:border-emerald-500/30 dark:bg-emerald-500/[0.06] dark:text-emerald-300",
  REJECTED:
    "border-rose-300 bg-rose-100 text-rose-700 " +
    "dark:border-rose-500/30 dark:bg-rose-500/[0.05] dark:text-rose-300",
};

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  SKILL_GAP: "Skill gap",
  CULTURE_FIT: "Culture / team fit",
  COMP_MISMATCH: "Compensation mismatch",
  NO_RESPONSE: "No response after outreach",
  WITHDREW: "Candidate withdrew",
  OTHER: "Other (see notes)",
};
