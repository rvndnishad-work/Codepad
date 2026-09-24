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
import { normalizeStage, type PipelineStage } from "@/lib/crm/stages";

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

/** Interview rubric average at or above this clears the bar. */
export const INTERVIEW_PASS_RATING = 3.5;

/** Interviewer verdicts that fail the interview whatever the rubric says. */
const FAILING_INTERVIEW_VERDICTS: Record<string, string> = {
  failed: "marked failed",
  suspicious: "marked suspicious",
  left_in_between: "left early",
};

/**
 * Verdict text and pass flag for a scored result. For interviews the
 * interviewer's own verdict counts too: a "failed" interview never reads as
 * passed because its rubric happens to clear the bar.
 */
export function describeScore(kind: ResultKind, score: number, rating?: number | null, interviewerVerdict?: string | null) {
  if (kind === "ai_screening") {
    const v = getScreeningVerdict(score);
    return { verdict: v?.label ?? null, passed: v?.passed ?? null };
  }
  if (kind === "interview") {
    const r = rating ?? 1 + (score / 100) * 4;
    const flagged = interviewerVerdict ? FAILING_INTERVIEW_VERDICTS[interviewerVerdict] : undefined;
    if (flagged) return { verdict: `${r.toFixed(1)} of 5, ${flagged}`, passed: false };
    return { verdict: `${r.toFixed(1)} of 5`, passed: r >= INTERVIEW_PASS_RATING };
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

/**
 * Short state text for a result that has no score yet, e.g. for the list
 * when nothing is scored ("No feedback yet").
 */
export function resultStateText(r: CandidateResult): string {
  switch (r.state) {
    case "scored":
      return r.score != null ? `Scored ${r.score}` : "Scored";
    case "submitted":
      return r.kind === "interview" ? "No feedback yet" : r.kind === "take_home" ? "Not reviewed" : "Finished";
    case "in_progress":
      return "In progress";
    case "expired":
      return "Expired";
    default:
      return r.kind === "interview" ? "Booked" : "Invited";
  }
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

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * What should happen next for this candidate. Screening ends at a decision
 * (Passed or Not passed); the ATS takes it from there. Ordered by urgency:
 * work that waits on the recruiter first, then deadlines on the candidate
 * side, then the decision itself.
 */
export function computeNextStep(input: NextStepInput): NextStep {
  const now = input.now ?? Date.now();
  const stage = normalizeStage(input.stage);
  const byTime = [...input.results].sort((a, b) => resultTime(b) - resultTime(a));

  if (stage === "PASSED") {
    // Automation never passes anyone, so a Pass over a failing or missing
    // result is a recruiter's manual override and reads as one.
    const check = passCheck(input.results);
    if (check.override) return { label: "Manual pass", tone: "warning", detail: check.reason, href: null, onUs: false };
    return { label: "Passed", tone: "plain", detail: null, href: null, onUs: false };
  }
  if (stage === "REJECTED") return { label: "Not passed", tone: "plain", detail: null, href: null, onUs: false };

  // 1. Finished work nobody has looked at yet.
  const unreviewed = byTime.find((r) => r.kind === "take_home" && r.state === "submitted");
  if (unreviewed) {
    return { label: "Review take-home", tone: "warning", detail: waiting(unreviewed.finishedAt, now), href: unreviewed.href, onUs: true };
  }
  const noFeedback = byTime.find((r) => r.kind === "interview" && r.state === "submitted");
  if (noFeedback) {
    return { label: "Collect feedback", tone: "warning", detail: waiting(noFeedback.finishedAt, now), href: noFeedback.href, onUs: true };
  }

  // 2. Deadlines and work in flight on the candidate side.
  const open = byTime.find((r) => r.kind === "take_home" && (r.state === "invited" || r.state === "in_progress"));
  if (open?.deadlineAt && open.state === "invited") {
    const left = new Date(open.deadlineAt).getTime() - now;
    if (left < 0) return { label: "Take-home link expired", tone: "danger", detail: "Not started", href: open.href, onUs: true };
    if (left < 2 * DAY) {
      return { label: left < DAY ? "Link expires today" : "Link expires tomorrow", tone: "danger", detail: "Not started", href: open.href, onUs: false };
    }
  }
  const interview = byTime.find((r) => r.kind === "interview" && (r.state === "invited" || r.state === "in_progress"));
  if (interview) {
    return {
      label: interview.state === "in_progress" ? "Interview live now" : "Interview booked",
      tone: "info",
      detail: interview.scheduledAt ? shortDate(interview.scheduledAt) : null,
      href: interview.href,
      onUs: false,
    };
  }
  const inFlight = open ?? byTime.find((r) => r.kind === "ai_screening" && (r.state === "invited" || r.state === "in_progress"));
  if (inFlight) {
    const what = inFlight.kind === "take_home" ? "take-home" : "AI screening";
    return {
      label: inFlight.state === "in_progress" ? `${what.charAt(0).toUpperCase()}${what.slice(1)} in progress` : `Waiting on ${what}`,
      tone: "plain",
      detail: inFlight.state === "invited" ? `Sent ${daysSince(inFlight.sentAt, now)}d ago` : null,
      href: inFlight.href,
      onUs: false,
    };
  }

  // 3. Everything sent has come back: the decision is ours.
  const scored = byTime.filter((r) => r.state === "scored" && r.score != null);
  if (scored.length) {
    const summary = summarizeResults(input.results);
    // The best attempt per kind counts, as in the combined score: a retake
    // that clears the bar is not "below the bar".
    const below = passCheck(input.results).below.length;
    return {
      label: "Make a decision",
      tone: "warning",
      detail:
        summary.combined != null
          ? `Combined ${summary.combined}${below ? `, ${below === 1 ? "one" : below === 2 ? "two" : "three"} below the bar` : ""}`
          : null,
      href: null,
      onUs: true,
    };
  }

  // 4. Nothing sent yet (or only expired links).
  if (stage === "NEW" && !input.batchId) return { label: "Add to a batch", tone: "plain", detail: null, href: null, onUs: true };
  const expired = byTime.find((r) => r.state === "expired");
  return {
    label: "Send an assessment",
    tone: expired ? "warning" : "plain",
    detail: expired ? `${RESULT_KIND_LABELS[expired.kind]} expired` : null,
    href: null,
    onUs: true,
  };
}

/** True when a candidate is flagged in the "Needs attention" filter. */
export function needsAttention(next: NextStep, stage: string, daysInStage: number): boolean {
  const s = normalizeStage(stage);
  if (s === "PASSED" || s === "REJECTED") return false;
  if (next.tone === "warning" || next.tone === "danger") return true;
  return daysInStage >= STUCK_AFTER_DAYS && next.onUs;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Screening checklist
 * ────────────────────────────────────────────────────────────────────────── */

/** The three ways a candidate is screened, in the order they are shown. */
export const CHECK_ORDER: ResultKind[] = ["ai_screening", "take_home", "interview"];

export type CheckState = "todo" | "waiting" | "review" | "done" | "expired";

export type CheckItem = {
  kind: ResultKind;
  state: CheckState;
  /** Plain status line: "Not sent", "Invited", "Not reviewed", "Scored 82". */
  status: string;
  /** Headline number when scored: a 0 to 100 score, or a 1 to 5 rating for interviews. */
  value: string | null;
  verdict: string | null;
  passed: boolean | null;
  title: string | null;
  at: string | null;
  href: string | null;
  /** How many of this kind were sent, retakes included. */
  count: number;
};

/**
 * One line per assessment kind, done in any order. A scored result wins (the
 * best one, as in the combined score); otherwise the newest attempt.
 */
export function screeningChecklist(results: CandidateResult[]): CheckItem[] {
  return CHECK_ORDER.map((kind) => {
    const mine = results.filter((r) => r.kind === kind);
    const best = mine
      .filter((r) => r.state === "scored" && r.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    const r = best ?? [...mine].sort((a, b) => resultTime(b) - resultTime(a))[0];
    if (!r) {
      return {
        kind,
        state: "todo",
        status: kind === "interview" ? "Not scheduled" : "Not sent",
        value: null,
        verdict: null,
        passed: null,
        title: null,
        at: null,
        href: null,
        count: 0,
      };
    }
    const state: CheckState =
      r.state === "scored" ? "done" : r.state === "submitted" ? "review" : r.state === "expired" ? "expired" : "waiting";
    const value = r.score == null ? null : kind === "interview" && r.rating != null ? r.rating.toFixed(1) : String(r.score);
    const status =
      r.state === "scored"
        ? r.verdict ?? "Scored"
        : r.state === "invited" && kind === "interview"
          ? r.scheduledAt
            ? `Booked for ${shortDate(r.scheduledAt)}`
            : "Booked"
          : resultStateText(r);
    return {
      kind,
      state,
      status,
      value,
      verdict: r.verdict,
      passed: r.passed,
      title: r.title,
      at: r.finishedAt ?? r.startedAt ?? r.scheduledAt ?? r.sentAt,
      href: r.href,
      count: mine.length,
    };
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Pass check
 * ────────────────────────────────────────────────────────────────────────── */

export type PassCheck = {
  /** True when passing is a recruiter's manual override of the results. */
  override: boolean;
  /** Assessments whose best result is below the bar. */
  below: CheckItem[];
  /** Nothing has a score yet, so there is nothing to back a pass. */
  unscored: boolean;
  /** Plain reason for the override, e.g. "AI screening 5, Not a fit". */
  reason: string | null;
};

function belowText(i: CheckItem): string {
  const label = RESULT_KIND_LABELS[i.kind];
  // Interview verdicts already carry the rating ("2.5 of 5").
  if (i.kind === "interview") return `${label} ${i.verdict ?? i.value ?? "below the bar"}`;
  return `${label} ${i.value ?? ""}${i.verdict ? `, ${i.verdict}` : ""}`.trim();
}

/**
 * Whether passing this candidate is backed by their results. Passing is
 * always a person's call (automation stops at Screening); when the best
 * result of any assessment is below the bar, or nothing is scored yet, the
 * pass is a manual override: it needs confirming and is labelled as one.
 */
export function passCheckFromItems(items: CheckItem[]): PassCheck {
  const scored = items.filter((i) => i.state === "done");
  const below = scored.filter((i) => i.passed === false);
  const unscored = scored.length === 0;
  const reason = below.length ? below.map(belowText).join("; ") : unscored ? "No scored results yet" : null;
  return { override: below.length > 0 || unscored, below, unscored, reason };
}

export function passCheck(results: CandidateResult[]): PassCheck {
  return passCheckFromItems(screeningChecklist(results));
}
