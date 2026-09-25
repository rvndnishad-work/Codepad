/**
 * One status model for every take-home, whichever table it lives in:
 * session take-homes (InterviewSession type "take-home", the current model)
 * and the retired single-challenge TakeHomeAssignment rows.
 *
 * Pure: shared by the list, the review queue, the report and the grade
 * routes' submission lock, and unit tested.
 */
import { TAKE_HOME_PASS } from "@/lib/crm/results";
import { awaitsReview } from "@/lib/workspace/display";
import { normalizeStage } from "@/lib/crm/stages";

export { TAKE_HOME_PASS };

export type TakeHomeState = "not_started" | "in_progress" | "submitted" | "expired" | "cancelled";

export const STATE_LABELS: Record<TakeHomeState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export type Tone = "neutral" | "indigo" | "warning" | "success" | "danger";

export const STATE_TONES: Record<TakeHomeState, Tone> = {
  not_started: "neutral",
  in_progress: "indigo",
  submitted: "warning",
  expired: "danger",
  cancelled: "neutral",
};

/** A stored session status that no longer accepts work. */
export const CLOSED_SESSION_STATUSES = ["completed", "expired", "cancelled", "abandoned"] as const;

/**
 * Where a session take-home stands. `answered` is how many of its coding
 * questions have a finished attempt; any work at all means it has started,
 * whatever the deadline says (the deadline is the last moment to START).
 */
export function sessionState(
  s: { status: string; deadlineAt: Date | string | null; answered: number },
  now: Date = new Date(),
): TakeHomeState {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "completed") return "submitted";
  if (s.status === "in_progress" || s.answered > 0) return "in_progress";
  if (s.status === "expired" || s.status === "abandoned") return "expired";
  if (s.deadlineAt && new Date(s.deadlineAt).getTime() < now.getTime()) return "expired";
  return "not_started";
}

/** Where a legacy single-challenge invite stands. */
export function legacyState(
  a: { status: string; expiresAt: Date | string },
  now: Date = new Date(),
): TakeHomeState {
  switch (a.status) {
    case "SUBMITTED":
      return "submitted";
    case "ACTIVE":
      return "in_progress";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    default:
      return new Date(a.expiresAt).getTime() < now.getTime() ? "expired" : "not_started";
  }
}

export type Decision = "passed" | "not_passed" | null;

/** The recruiter's decision, read from the candidate's screening stage. */
export function decisionOf(stage: string | null | undefined): Decision {
  if (!stage) return null;
  const s = normalizeStage(stage);
  return s === "PASSED" ? "passed" : s === "REJECTED" ? "not_passed" : null;
}

/** Submitted work that still waits on a Pass or Not passed. */
export function needsReview(state: TakeHomeState, stage: string | null | undefined): boolean {
  return state === "submitted" && awaitsReview("take-home", stage);
}

export type TakeHomeFilter = "all" | "not_started" | "in_progress" | "submitted" | "decided" | "closed";

export const FILTERS: { id: TakeHomeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "submitted", label: "Submitted" },
  { id: "decided", label: "Decided" },
  { id: "closed", label: "Expired or cancelled" },
];

export function parseFilter(v: unknown): TakeHomeFilter {
  return FILTERS.some((f) => f.id === v) ? (v as TakeHomeFilter) : "all";
}

/** "Submitted" means waiting on you; once decided it moves to "Decided". */
export function matchesFilter(f: TakeHomeFilter, state: TakeHomeState, decision: Decision): boolean {
  switch (f) {
    case "all":
      return true;
    case "submitted":
      return state === "submitted" && !decision;
    case "decided":
      return state === "submitted" && !!decision;
    case "closed":
      return state === "expired" || state === "cancelled";
    default:
      return state === f;
  }
}

/** The label a row shows: a decision wins over "Submitted". */
export function rowLabel(state: TakeHomeState, decision: Decision): { label: string; tone: Tone } {
  if (state === "submitted" && decision === "passed") return { label: "Passed", tone: "success" };
  if (state === "submitted" && decision === "not_passed") return { label: "Not passed", tone: "danger" };
  return { label: STATE_LABELS[state], tone: STATE_TONES[state] };
}

export type AttemptLike = {
  id: string;
  challengeId: string;
  status: string;
  score: number | null;
  startedAt: Date | string;
  finishedAt?: Date | string | null;
};

const isFinished = (a: { status: string }) => a.status === "passed" || a.status === "failed";
const t = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : 0);

/**
 * The attempt that counts for each question: the FIRST finished one. Later
 * attempts (from before submissions were locked) never replace it, so a
 * candidate cannot improve a score after handing the work in.
 */
export function countedAttempts<A extends AttemptLike>(attempts: A[], challengeIds: string[]): Map<string, A> {
  const out = new Map<string, A>();
  const sorted = attempts.filter(isFinished).sort((a, b) => t(a.finishedAt ?? a.startedAt) - t(b.finishedAt ?? b.startedAt));
  for (const a of sorted) {
    if (challengeIds.includes(a.challengeId) && !out.has(a.challengeId)) out.set(a.challengeId, a);
  }
  return out;
}

/** The take-home score: the average of each answered question, one attempt each. Null when nothing is scored. */
export function takeHomeScore(scores: (number | null | undefined)[]): number | null {
  const s = scores.filter((x): x is number => typeof x === "number");
  return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
}

export function aboveBar(score: number | null): boolean | null {
  return score == null ? null : score >= TAKE_HOME_PASS;
}

export type IntegrityLevel = "clean" | "some" | "high" | "none";

export type IntegritySummary = { level: IntegrityLevel; pastes: number; blurs: number; blurSec: number; label: string };

/**
 * Roll every answered question's integrity report into one line. Uses the
 * same cut-offs as the attempt page did (under 25 secure, under 55 low risk).
 */
export function integritySummary(
  reports: ({ suspicionScore: number; pasteCount: number; blurCount: number; totalBlurSec: number } | null | undefined)[],
): IntegritySummary {
  const r = reports.filter((x): x is NonNullable<typeof x> => !!x);
  if (!r.length) return { level: "none", pastes: 0, blurs: 0, blurSec: 0, label: "Not recorded" };
  const worst = Math.max(...r.map((x) => x.suspicionScore));
  const pastes = r.reduce((n, x) => n + x.pasteCount, 0);
  const blurs = r.reduce((n, x) => n + x.blurCount, 0);
  const blurSec = r.reduce((n, x) => n + x.totalBlurSec, 0);
  const level: IntegrityLevel = worst >= 55 ? "high" : worst >= 25 || pastes > 0 ? "some" : "clean";
  const label =
    level === "clean"
      ? "Clean"
      : pastes > 0
        ? `${pastes} large paste${pastes === 1 ? "" : "s"}`
        : blurs > 0
          ? `Left the tab ${blurs} time${blurs === 1 ? "" : "s"}`
          : level === "high"
            ? "High risk"
            : "Some flags";
  return { level, pastes, blurs, blurSec, label };
}

/**
 * Why a submission to a take-home must be refused, or null when it may be
 * recorded. `answered` is whether this question already has a finished
 * attempt in the take-home; `started` whether any question does.
 */
export function submissionBlock(input: {
  status: string;
  deadlineAt: Date | string | null;
  challengeIds: string[];
  challengeId: string;
  ownsSession: boolean;
  answered: boolean;
  started: boolean;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  if (!input.ownsSession) return "This take-home belongs to someone else.";
  if (input.status === "cancelled") return "This take-home was cancelled.";
  if ((CLOSED_SESSION_STATUSES as readonly string[]).includes(input.status)) return "This take-home is already submitted or closed.";
  if (!input.challengeIds.includes(input.challengeId)) return "This question is not part of the take-home.";
  if (input.answered) return "You already submitted this question.";
  if (!input.started && input.deadlineAt && new Date(input.deadlineAt).getTime() < now.getTime()) {
    return "The deadline to start this take-home has passed.";
  }
  return null;
}

export function parseIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function parseLimits(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, number> = {};
    for (const [k, n] of Object.entries(v)) if (typeof n === "number" && n > 0) out[k] = n;
    return out;
  } catch {
    return {};
  }
}

export const DEFAULT_QUESTION_MINUTES = 30;

export type TemplateItem = { challengeId: string; minutes: number };

/** Template items from their stored JSON, dropping anything malformed. */
export function parseTemplateItems(raw: string | null | undefined): TemplateItem[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    const seen = new Set<string>();
    const out: TemplateItem[] = [];
    for (const x of v) {
      if (!x || typeof x.challengeId !== "string" || seen.has(x.challengeId)) continue;
      seen.add(x.challengeId);
      const m = Number(x.minutes);
      out.push({ challengeId: x.challengeId, minutes: Number.isFinite(m) && m > 0 ? Math.round(m) : DEFAULT_QUESTION_MINUTES });
    }
    return out;
  } catch {
    return [];
  }
}
