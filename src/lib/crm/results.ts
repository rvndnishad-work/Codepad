/**
 * One view of every assessment a candidate has taken.
 *
 * Scores live in four places: legacy take-home assignments, take-home
 * sessions (graded per challenge attempt), AI screenings, and live interview
 * rubrics. The list, the profile and a batch's Results tab all read the
 * normalised shape below, so a score can no longer show on one screen and go
 * missing on another (the old leaderboard gave session take-homes no score
 * and left AI screenings out).
 *
 * Client-safe: pure functions only. The Prisma loader lives in
 * results-server.ts.
 */
import { getScreeningVerdict } from "@/lib/ai-interview/verdict";
import type { PipelineStage } from "@/lib/crm/stages";

export type ResultKind = "take_home" | "ai_screening" | "interview";

export type ResultState =
  /** Invite sent, candidate has not started. */
  | "invited"
  | "in_progress"
  /** Finished but has no score yet. */
  | "submitted"
  | "scored"
  | "expired";

export type CandidateResult = {
  id: string;
  candidateId: string;
  kind: ResultKind;
  title: string;
  state: ResultState;
  /** 0 to 100. Interviews convert their 1 to 5 rubric with `rubricToScore`. */
  score: number | null;
  /** Interview only: the raw rubric average, 1 to 5. */
  rating: number | null;
  /** Short verdict label ("Strong fit", "Passed", "4.5 of 5"). */
  verdict: string | null;
  passed: boolean | null;
  sentAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Take-homes: the last moment the candidate may start. */
  deadlineAt: string | null;
  /** Interviews: the planned meeting time. */
  scheduledAt: string | null;
  minutesTaken: number | null;
  minutesAllowed: number | null;
  href: string | null;
};

/** Weights for the combined score. Missing kinds are left out and the rest
 *  re-normalised, so a candidate with only a screening is ranked on it. */
export const RESULT_WEIGHTS: Record<ResultKind, number> = {
  ai_screening: 0.3,
  take_home: 0.4,
  interview: 0.3,
};

export const RESULT_KIND_LABELS: Record<ResultKind, string> = {
  take_home: "Take-home",
  ai_screening: "AI screening",
  interview: "Interview",
};

/** Take-homes pass at the same bar as AI screenings. */
export const TAKE_HOME_PASS = 60;

/** Average a rubric JSON (`{ criterion: 1..5 }`). Null when empty or unreadable. */
export function rubricAverage(ratingsJson: string | null | undefined): number | null {
  if (!ratingsJson) return null;
  try {
    const parsed = JSON.parse(ratingsJson) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const values = Object.values(parsed as Record<string, unknown>).filter(
      (v): v is number => typeof v === "number" && v >= 1 && v <= 5,
    );
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  } catch {
    return null;
  }
}

/** Map a 1 to 5 rating onto 0 to 100 (1 → 0, 3 → 50, 5 → 100). */
export function rubricToScore(rating: number): number {
  return Math.round(((rating - 1) / 4) * 100);
}

/** Verdict text and pass flag for a scored result. */
export function describeScore(kind: ResultKind, score: number, rating?: number | null) {
  if (kind === "ai_screening") {
    const v = getScreeningVerdict(score);
    return { verdict: v?.label ?? null, passed: v?.passed ?? null };
  }
  if (kind === "interview") {
    const r = rating ?? 1 + (score / 100) * 4;
    return { verdict: `${r.toFixed(1)} of 5`, passed: r >= 3.5 };
  }
  return { verdict: score >= TAKE_HOME_PASS ? "Passed" : "Below bar", passed: score >= TAKE_HOME_PASS };
}

const ts = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);

/** When a result last changed, for "latest" ordering. */
export function resultTime(r: CandidateResult): number {
  return Math.max(ts(r.finishedAt), ts(r.startedAt), ts(r.sentAt));
}

export type ResultsSummary = {
  /** Most recent scored result. */
  latest: CandidateResult | null;
  /** Best score per kind (the candidate's strongest attempt counts). */
  byKind: Record<ResultKind, number | null>;
  /** Interview rubric average, 1 to 5, for display. */
  interviewRating: number | null;
  /** Weighted over the kinds that have a score; null when none do. */
  combined: number | null;
  /** Finished results, scored or not (the old tile counted scores only). */
  submitted: number;
  /** Take-home minutes on the best-scoring take-home. */
  takeHomeMinutes: number | null;
};

export function summarizeResults(results: CandidateResult[]): ResultsSummary {
  const byKind: Record<ResultKind, number | null> = {
    take_home: null,
    ai_screening: null,
    interview: null,
  };
  let interviewRating: number | null = null;
  let takeHomeMinutes: number | null = null;
  let latest: CandidateResult | null = null;
  let submitted = 0;

  for (const r of results) {
    if (r.state === "submitted" || r.state === "scored") submitted++;
    if (r.score == null) continue;
    const best = byKind[r.kind];
    if (best == null || r.score > best) {
      byKind[r.kind] = r.score;
      if (r.kind === "interview") interviewRating = r.rating;
      if (r.kind === "take_home") takeHomeMinutes = r.minutesTaken;
    }
    if (!latest || resultTime(r) > resultTime(latest)) latest = r;
  }

  let weight = 0;
  let sum = 0;
  for (const kind of Object.keys(byKind) as ResultKind[]) {
    const v = byKind[kind];
    if (v == null) continue;
    weight += RESULT_WEIGHTS[kind];
    sum += v * RESULT_WEIGHTS[kind];
  }
  const combined = weight > 0 ? Math.round(sum / weight) : null;

  return { latest, byKind, interviewRating, combined, submitted, takeHomeMinutes };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Next step
 * ────────────────────────────────────────────────────────────────────────── */

export type NextStepTone = "danger" | "warning" | "info" | "plain";

export type NextStep = {
  label: string;
  tone: NextStepTone;
  /** Secondary line, e.g. "2 days waiting". */
  detail: string | null;
  /** Where the action happens, when there is one page for it. */
  href: string | null;
  /** True when the recruiter (not the candidate) is the one holding things up. */
  onUs: boolean;
};

export type NextStepInput = {
  stage: PipelineStage | string;
  stageChangedAt: string | null;
  createdAt: string;
  batchId: string | null;
  results: CandidateResult[];
  now?: number;
};

const DAY = 24 * 60 * 60 * 1000;

/** Days since `iso`, floored, never negative. */
export function daysSince(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY));
}

function waiting(iso: string | null, now: number): string {
  const d = daysSince(iso, now);
  if (d === 0) return "Waiting since today";
  return `${d} ${d === 1 ? "day" : "days"} waiting`;
}

/** Stage after which a stalled candidate is flagged, in days. */
export const STUCK_AFTER_DAYS = 7;

/**
 * What should happen next for this candidate. Ordered by urgency: work that
 * waits on the recruiter first, then deadlines, then the stage default.
 */
export function computeNextStep(input: NextStepInput): NextStep {
  const now = input.now ?? Date.now();
  const stage = input.stage;
  const byTime = [...input.results].sort((a, b) => resultTime(b) - resultTime(a));

  if (stage === "HIRED") return { label: "Hired", tone: "plain", detail: null, href: null, onUs: false };
  if (stage === "REJECTED") return { label: "Closed", tone: "plain", detail: null, href: null, onUs: false };

  // 1. Finished work nobody has looked at yet.
  const unreviewed = byTime.find((r) => r.kind === "take_home" && r.state === "submitted");
  if (unreviewed) {
    return {
      label: "Review take-home",
      tone: "warning",
      detail: waiting(unreviewed.finishedAt, now),
      href: unreviewed.href,
      onUs: true,
    };
  }
  // A scored screening while still at Applied/Screened needs a decision.
  const screening = byTime.find((r) => r.kind === "ai_screening" && r.state === "scored");
  if (screening && (stage === "APPLIED" || stage === "SCREENED") && !byTime.some((r) => r.kind === "take_home")) {
    const d = daysSince(screening.finishedAt, now);
    if (screening.passed === false) {
      return { label: "Review screening", tone: "warning", detail: waiting(screening.finishedAt, now), href: screening.href, onUs: true };
    }
    if (stage === "APPLIED" || d >= 1) {
      return { label: "Send take-home", tone: "plain", detail: `Screening ${screening.score}`, href: null, onUs: true };
    }
  }

  // 2. Deadlines on the candidate side.
  const open = byTime.find((r) => r.kind === "take_home" && (r.state === "invited" || r.state === "in_progress"));
  if (open?.deadlineAt) {
    const left = new Date(open.deadlineAt).getTime() - now;
    if (left < 0 && open.state === "invited") {
      return { label: "Take-home link expired", tone: "danger", detail: "Not started", href: open.href, onUs: true };
    }
    if (left >= 0 && left < 2 * DAY && open.state === "invited") {
      return {
        label: left < DAY ? "Link expires today" : "Link expires tomorrow",
        tone: "danger",
        detail: "Not started",
        href: open.href,
        onUs: false,
      };
    }
  }
  if (open) {
    return {
      label: open.state === "in_progress" ? "Take-home in progress" : "Waiting on take-home",
      tone: "plain",
      detail: open.state === "invited" ? `Sent ${daysSince(open.sentAt, now)}d ago` : null,
      href: open.href,
      onUs: false,
    };
  }

  const interview = byTime.find((r) => r.kind === "interview");
  if (interview && (interview.state === "invited" || interview.state === "in_progress")) {
    const at = interview.scheduledAt ? new Date(interview.scheduledAt) : null;
    return {
      label: interview.state === "in_progress" ? "Interview live now" : "Interview booked",
      tone: "info",
      detail: at ? at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null,
      href: interview.href,
      onUs: false,
    };
  }
  if (interview && interview.state === "submitted") {
    return { label: "Collect feedback", tone: "warning", detail: waiting(interview.finishedAt, now), href: interview.href, onUs: true };
  }

  // 3. Stage defaults.
  switch (stage) {
    case "APPLIED":
      if (!input.batchId) return { label: "Add to a batch", tone: "plain", detail: null, href: null, onUs: true };
      return { label: "Screen candidate", tone: "plain", detail: null, href: null, onUs: true };
    case "SCREENED":
      return { label: "Send take-home", tone: "plain", detail: null, href: null, onUs: true };
    case "TAKE_HOME":
      return { label: "Send take-home", tone: "warning", detail: "None sent yet", href: null, onUs: true };
    case "ONSITE":
      if (interview?.state === "scored") return { label: "Decide on offer", tone: "warning", detail: `Interview ${interview.verdict}`, href: null, onUs: true };
      return { label: "Schedule interview", tone: "plain", detail: null, href: null, onUs: true };
    case "OFFER":
      return { label: "Waiting on reply", tone: "plain", detail: waiting(input.stageChangedAt ?? input.createdAt, now).replace("waiting", "since offer"), href: null, onUs: false };
    default:
      return { label: "No action", tone: "plain", detail: null, href: null, onUs: false };
  }
}

/** True when a candidate is flagged in the "Needs attention" filter. */
export function needsAttention(next: NextStep, stage: string, daysInStage: number): boolean {
  if (stage === "HIRED" || stage === "REJECTED") return false;
  if (next.tone === "warning" || next.tone === "danger") return true;
  return daysInStage >= STUCK_AFTER_DAYS && next.onUs;
}
