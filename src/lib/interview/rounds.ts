/**
 * Interview plans and rounds: the ordered steps a candidate goes through
 * (AI interview, take-home, then live interviews such as intro, coding,
 * technical discussion and behavioural), and where each round stands.
 *
 * Pure, with no Prisma imports, so the Candidates and Interviews tabs, the
 * backfill script and the unit tests all share one set of rules.
 *
 * Product rules this module keeps:
 * - A round result (above or below bar) only labels a score. After each
 *   round a recruiter picks the next step: move on or stop. Nothing here
 *   passes or fails a candidate; the candidate's stage is the decision.
 * - A below-bar round never stops a candidate by itself. It waits for the
 *   recruiter's next step.
 * - Passing someone whose required rounds are not all above bar is a
 *   manual pass (see passNeedsOverride).
 */

import type { FormatId } from "@/lib/interview/wizard";

// ── Kinds, role types, hiring types ─────────────────────────────────────

export type PlanRoundKind = "ai_interview" | "take_home" | "interview";
export type RoleType = "technical" | "non_technical";
export type HiringType = RoleType | "both";

export const HIRING_TYPES: HiringType[] = ["technical", "non_technical", "both"];

export const HIRING_TYPE_LABELS: Record<HiringType, string> = {
  technical: "Technical roles",
  non_technical: "Non-technical roles",
  both: "Both",
};

export const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  technical: "Technical",
  non_technical: "Non-technical",
};

export const PLAN_ROUND_KIND_LABELS: Record<PlanRoundKind, string> = {
  ai_interview: "AI interview",
  take_home: "Take home",
  interview: "Live interview",
};

/** Reads a stored hiring type; anything unknown counts as technical. */
export function normalizeHiringType(v: string | null | undefined): HiringType {
  return v === "non_technical" || v === "both" ? v : "technical";
}

export function normalizeRoleType(v: string | null | undefined): RoleType {
  return v === "non_technical" ? "non_technical" : "technical";
}

/** Role types a workspace can make plans for. */
export function roleTypesFor(hiring: HiringType): RoleType[] {
  return hiring === "both" ? ["technical", "non_technical"] : [hiring];
}

/** Live interview formats a plan of this role type may use. Non-technical roles get no coding. */
export function formatsFor(role: RoleType): FormatId[] {
  return role === "technical" ? ["intro", "coding", "discussion", "mixed", "behavioural"] : ["intro", "discussion", "behavioural"];
}

/** Whether a round fits a plan of this role type. */
export function roundAllowed(role: RoleType, round: { kind: PlanRoundKind; format?: string | null }): boolean {
  if (round.kind !== "interview") return true;
  return !!round.format && (formatsFor(role) as string[]).includes(round.format);
}

// ── Templates ───────────────────────────────────────────────────────────

export type RoundSpec = {
  kind: PlanRoundKind;
  name: string;
  /** Live interviews only. */
  format?: FormatId;
  /** Live interviews: minutes. AI interview and take-home: days the invite stays open. */
  durationMin?: number;
  required: boolean;
};

export type PlanTemplate = {
  key: string;
  name: string;
  roleType: RoleType;
  blurb: string;
  continuesInAts: boolean;
  rounds: RoundSpec[];
};

const AI: RoundSpec = { kind: "ai_interview", name: "AI interview", durationMin: 5, required: true };
const TAKE_HOME: RoundSpec = { kind: "take_home", name: "Take home", durationMin: 3, required: true };
const INTRO: RoundSpec = { kind: "interview", name: "Intro chat", format: "intro", durationMin: 30, required: true };
const CODING: RoundSpec = { kind: "interview", name: "Coding round", format: "coding", durationMin: 60, required: true };
const BEHAVIOURAL: RoundSpec = { kind: "interview", name: "Behavioural", format: "behavioural", durationMin: 45, required: true };

/**
 * Starting points only: a plan made from one can have any rounds in any
 * order. The long templates leave the AI interview and take-home out; a
 * company adds the ones it uses.
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: "quick_technical",
    name: "Quick screen",
    roleType: "technical",
    blurb: "AI interview, coding round",
    continuesInAts: true,
    rounds: [AI, CODING],
  },
  {
    key: "technical",
    name: "Technical role",
    roleType: "technical",
    blurb: "Intro, coding, technical discussion, behavioural",
    continuesInAts: false,
    rounds: [INTRO, CODING, { kind: "interview", name: "Technical discussion", format: "discussion", durationMin: 60, required: true }, BEHAVIOURAL],
  },
  {
    key: "quick_non_technical",
    name: "Quick screen",
    roleType: "non_technical",
    blurb: "AI interview, role discussion",
    continuesInAts: true,
    rounds: [AI, { kind: "interview", name: "Role discussion", format: "discussion", durationMin: 45, required: true }],
  },
  {
    key: "non_technical",
    name: "Non-technical role",
    roleType: "non_technical",
    blurb: "Intro, case discussion, behavioural",
    continuesInAts: false,
    rounds: [INTRO, { kind: "interview", name: "Case discussion", format: "discussion", durationMin: 60, required: true }, BEHAVIOURAL],
  },
];

/** Rounds a company can add to the start of a long template. */
export const EARLY_ROUNDS: RoundSpec[] = [AI, TAKE_HOME];

/** Templates offered in a workspace, filtered by its hiring type. */
export function templatesFor(hiring: HiringType): PlanTemplate[] {
  const roles = roleTypesFor(hiring);
  return PLAN_TEMPLATES.filter((t) => roles.includes(t.roleType));
}

export function templateByKey(key: string | null | undefined): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((t) => t.key === key);
}

// ── Attempts: one interview, take-home or AI interview ──────────────────

/**
 * Where one sitting of a round stands. A round can have several (a rebooked
 * interview, a resent invite); the latest one that was not cancelled counts.
 */
export type AttemptState =
  | "scheduled" // live interview booked
  | "invited" // AI interview or take-home link sent, not started
  | "in_progress" // in the room, or the candidate is working on it
  | "awaiting_review" // held or submitted, scores not in yet
  | "above_bar"
  | "below_bar"
  | "did_not_finish" // left early, no-show, or the invite expired unstarted
  | "cancelled";

export type Attempt = { state: AttemptState; at: string | null };

/** Interviewer verdicts that fail an interview whatever the scores say. */
const FAILING_VERDICTS = new Set(["failed", "suspicious"]);

/** A scheduled interview this long past its start with nobody in the room counts as a no-show. */
export const NO_SHOW_AFTER_MIN = 30;

/**
 * A live interview (InterviewSession, not a take-home). `average` is the
 * panel scorecard average on 1-4, or the older rubric mapped the same way;
 * null while nothing is scored.
 */
export function liveAttempt(
  i: {
    state: "scheduled" | "live" | "completed" | "cancelled";
    verdict: string | null;
    scheduledAt: string | null;
    finishedAt?: string | null;
    cards: { expected: number; submitted: number };
    average: number | null;
    passMark: number;
  },
  now: Date = new Date(),
): Attempt {
  const at = i.finishedAt ?? i.scheduledAt;
  if (i.state === "cancelled") return { state: "cancelled", at };
  if (i.state === "live") return { state: "in_progress", at };
  if (i.state === "scheduled") {
    if (i.scheduledAt && new Date(i.scheduledAt).getTime() < now.getTime() - NO_SHOW_AFTER_MIN * 60_000) return { state: "did_not_finish", at };
    return { state: "scheduled", at };
  }
  if (i.verdict === "left_in_between") return { state: "did_not_finish", at };
  if (i.verdict && FAILING_VERDICTS.has(i.verdict)) return { state: "below_bar", at };
  if (i.average == null || i.cards.submitted < i.cards.expected) return { state: "awaiting_review", at };
  return { state: i.average >= i.passMark ? "above_bar" : "below_bar", at };
}

/** An AI interview (AIInterviewSession). `score` is 0-100. */
export function aiAttempt(
  s: { status: string; startedAt?: string | null; finishedAt?: string | null; createdAt?: string | null; expiresAt?: string | null; score: number | null; passMark: number },
  now: Date = new Date(),
): Attempt {
  const at = s.finishedAt ?? s.startedAt ?? s.createdAt ?? null;
  switch (s.status) {
    case "COMPLETED":
      if (s.score == null) return { state: "awaiting_review", at };
      return { state: s.score >= s.passMark ? "above_bar" : "below_bar", at };
    case "ACTIVE":
      return { state: "in_progress", at };
    case "EXPIRED":
      return { state: "did_not_finish", at };
    default:
      if (!s.startedAt && s.expiresAt && new Date(s.expiresAt).getTime() <= now.getTime()) return { state: "did_not_finish", at };
      return { state: s.startedAt ? "in_progress" : "invited", at };
  }
}

/**
 * A take-home, from its take-home state (see lib/take-home/status.ts) and
 * its reviewed score (0-100, null until reviewed).
 */
export function takeHomeAttempt(t: { state: "not_started" | "in_progress" | "submitted" | "expired" | "cancelled"; score: number | null; passMark: number; at: string | null }): Attempt {
  switch (t.state) {
    case "cancelled":
      return { state: "cancelled", at: t.at };
    case "expired":
      return { state: "did_not_finish", at: t.at };
    case "not_started":
      return { state: "invited", at: t.at };
    case "in_progress":
      return { state: "in_progress", at: t.at };
    default:
      if (t.score == null) return { state: "awaiting_review", at: t.at };
      return { state: t.score >= t.passMark ? "above_bar" : "below_bar", at: t.at };
  }
}

// ── Rounds ──────────────────────────────────────────────────────────────

export type RoundState =
  | "not_started" // nothing booked or sent yet
  | "scheduled" // booked (live) or invited (AI interview, take-home)
  | "in_progress"
  | "awaiting_review"
  | "above_bar"
  | "below_bar"
  | "did_not_finish"
  | "skipped" // a recruiter removed it for this person
  | "stopped"; // not held because the recruiter stopped at an earlier round

export type NextStep = "advance" | "stop";

export type RoundInput = {
  id: string;
  order: number;
  kind: PlanRoundKind;
  name: string;
  required: boolean;
  skipped: boolean;
  nextStep: NextStep | null;
  /** Live interviews: the wizard format. */
  format?: string | null;
  /** Every sitting of this round, in any order. */
  attempts: Attempt[];
};

export const ROUND_STATE_LABELS: Record<RoundState, string> = {
  not_started: "Not started",
  scheduled: "Scheduled",
  in_progress: "In progress",
  awaiting_review: "Awaiting review",
  above_bar: "Above bar",
  below_bar: "Below bar",
  did_not_finish: "Did not finish",
  skipped: "Skipped",
  stopped: "Stopped",
};

/** "Scheduled" for a live interview reads as "Invited" for the others. */
export function roundStateLabel(state: RoundState, kind: PlanRoundKind): string {
  if (state === "scheduled" && kind !== "interview") return "Invited";
  if (state === "not_started") return kind === "interview" ? "To schedule" : "To send";
  return ROUND_STATE_LABELS[state];
}

/** The attempt that counts: the latest one not cancelled. */
export function currentAttempt(attempts: Attempt[]): Attempt | null {
  let best: Attempt | null = null;
  let bestAt = -Infinity;
  attempts.forEach((a, i) => {
    if (a.state === "cancelled") return;
    // Undated attempts sort by position, after dated ones seen so far.
    const t = a.at ? new Date(a.at).getTime() : bestAt + i + 1;
    if (!best || t >= bestAt) {
      best = a;
      bestAt = t;
    }
  });
  return best;
}

/** A round's own state, before the plan decides whether it was stopped. */
export function ownRoundState(r: Pick<RoundInput, "skipped" | "attempts">): RoundState {
  if (r.skipped) return "skipped";
  const a = currentAttempt(r.attempts);
  if (!a) return "not_started";
  switch (a.state) {
    case "scheduled":
    case "invited":
      return "scheduled";
    case "in_progress":
      return "in_progress";
    case "awaiting_review":
      return "awaiting_review";
    case "above_bar":
      return "above_bar";
    case "below_bar":
      return "below_bar";
    case "did_not_finish":
      return "did_not_finish";
    default:
      return "not_started";
  }
}

const RESULT_STATES: RoundState[] = ["above_bar", "below_bar", "did_not_finish"];

/** Has a result a recruiter can act on (a next step). */
export function hasResult(s: RoundState): boolean {
  return RESULT_STATES.includes(s);
}

// ── A candidate's whole plan ────────────────────────────────────────────

/**
 * What the candidate is waiting on, for the "Waiting on" filter:
 * - schedule: the next round is not booked or sent
 * - candidate: an AI interview or take-home invite is out
 * - interview: a live interview is booked or running
 * - review: scorecards or a take-home review are not in yet
 * - next_step: a round has a result and the recruiter has not picked move on or stop
 * - decision: no rounds left (or stopped); the recruiter passes or not
 * - null: already Passed or Not passed, or the candidate has no rounds
 */
export type WaitingOn = "schedule" | "candidate" | "interview" | "review" | "next_step" | "decision" | null;

export type PlanRound = RoundInput & { state: RoundState; /** 1-based among rounds not skipped; null when skipped. */ number: number | null };

export type PlanProgress = {
  rounds: PlanRound[];
  /** Rounds not skipped. */
  total: number;
  /** Rounds with a result the candidate moved past, or the last one. */
  done: number;
  /** The round the candidate is on, or next to book. Null when none is left. */
  current: PlanRound | null;
  /** The recruiter stopped at this round. */
  stoppedAt: PlanRound | null;
  waitingOn: WaitingOn;
  /** No round left to hold, and no decision yet. */
  readyForDecision: boolean;
};

function isDecided(stage: string | null | undefined): boolean {
  const s = (stage ?? "").toUpperCase();
  return s === "PASSED" || s === "REJECTED";
}

/**
 * Where a candidate stands across their rounds. `stage` is the candidate's
 * pipeline stage; a decided stage clears `waitingOn` but never changes a
 * round's state.
 */
export function planProgress(input: RoundInput[], stage?: string | null): PlanProgress {
  const sorted = [...input].sort((a, b) => a.order - b.order);
  let n = 0;
  let stoppedAt: PlanRound | null = null;
  const rounds: PlanRound[] = sorted.map((r) => {
    const own = ownRoundState(r);
    const number = r.skipped ? null : ++n;
    let state = own;
    if (stoppedAt && own !== "skipped" && !hasResult(own) && own !== "in_progress" && own !== "awaiting_review") state = "stopped";
    const pr: PlanRound = { ...r, state, number };
    if (!stoppedAt && r.nextStep === "stop" && own !== "skipped") stoppedAt = pr;
    return pr;
  });

  const live = rounds.filter((r) => r.state !== "skipped");
  // The first round the candidate has not moved past.
  let current: PlanRound | null = null;
  for (const r of live) {
    if (r.state === "stopped") break;
    const movedPast = hasResult(r.state) && r.nextStep === "advance";
    if (!movedPast) {
      current = r;
      break;
    }
  }
  if (stoppedAt && current === stoppedAt) current = null;

  const done = live.filter((r) => hasResult(r.state)).length;

  let waitingOn: WaitingOn = null;
  if (live.length === 0) waitingOn = null;
  else if (stoppedAt) waitingOn = "decision";
  else if (!current) waitingOn = "decision";
  else if (hasResult(current.state)) {
    // The last round with a result needs no next step: the decision is next.
    const isLast = live[live.length - 1] === current;
    waitingOn = isLast && current.state !== "did_not_finish" ? "decision" : "next_step";
  } else if (current.state === "awaiting_review") waitingOn = "review";
  else if (current.state === "scheduled" || current.state === "in_progress") waitingOn = current.kind === "interview" ? "interview" : "candidate";
  else waitingOn = "schedule";

  const readyForDecision = waitingOn === "decision" && !isDecided(stage);
  if (isDecided(stage)) waitingOn = null;
  if (waitingOn === "decision" && current && hasResult(current.state)) current = null;

  return { rounds, total: live.length, done, current, stoppedAt, waitingOn, readyForDecision };
}

/**
 * Passing this candidate now is a manual pass (an override): some required
 * round is not above bar, whether it is below bar, unfinished or not held.
 */
export function passNeedsOverride(p: PlanProgress): boolean {
  return p.rounds.some((r) => r.required && r.state !== "skipped" && r.state !== "above_bar");
}

/**
 * Why passing now would be a manual pass, in words ("Coding round below the
 * bar; 2 rounds not held"). Null when every required round is above bar.
 */
export function overrideReason(p: PlanProgress): string | null {
  if (!passNeedsOverride(p)) return null;
  const open = p.rounds.filter((r) => r.required && r.state !== "skipped" && r.state !== "above_bar");
  const names = (xs: PlanRound[]) => xs.map((r) => r.name).join(", ");
  const below = open.filter((r) => r.state === "below_bar");
  const dnf = open.filter((r) => r.state === "did_not_finish");
  const rest = open.length - below.length - dnf.length;
  const parts = [
    below.length ? `${names(below)} below the bar` : null,
    dnf.length ? `${names(dnf)} not finished` : null,
    rest ? `${rest} ${rest === 1 ? "round" : "rounds"} not held` : null,
  ];
  return parts.filter(Boolean).join("; ");
}

/** The next round after this one that is not skipped, or null when it is the last. */
export function roundAfter(p: PlanProgress, roundId: string): PlanRound | null {
  const i = p.rounds.findIndex((r) => r.id === roundId);
  if (i < 0) return null;
  return p.rounds.slice(i + 1).find((r) => r.state !== "skipped") ?? null;
}

/**
 * The live round a new interview for this candidate most likely is: the
 * first live round not yet booked, from the round they are on. One whose
 * format matches the interview being set up wins. Null when none is open.
 */
export function suggestLiveRound(p: PlanProgress, format?: string | null): string | null {
  const start = p.current ? p.rounds.indexOf(p.current) : 0;
  const open = p.rounds.slice(Math.max(0, start)).filter((r) => r.kind === "interview" && r.state === "not_started");
  return (open.find((r) => format && r.format === format) ?? open[0])?.id ?? null;
}

// ── The strip and the one-line summary ──────────────────────────────────

export type Segment = "above" | "below" | "dnf" | "review" | "scheduled" | "open" | "off";

export function segmentOf(s: RoundState): Segment {
  switch (s) {
    case "above_bar":
      return "above";
    case "below_bar":
      return "below";
    case "did_not_finish":
      return "dnf";
    case "awaiting_review":
      return "review";
    case "scheduled":
    case "in_progress":
      return "scheduled";
    case "skipped":
    case "stopped":
      return "off";
    default:
      return "open";
  }
}

/** One segment per round, skipped rounds left out. */
export function strip(p: PlanProgress): Segment[] {
  return p.rounds.filter((r) => r.state !== "skipped").map((r) => segmentOf(r.state));
}

/** "Round 4 of 6 · Coding round". */
export function roundLabel(r: Pick<PlanRound, "number" | "name">, total: number): string {
  return r.number ? `Round ${r.number} of ${total} · ${r.name}` : r.name;
}

/** The line under the strip on the Candidates list. */
export function progressLine(p: PlanProgress): string {
  if (p.total === 0) return "No rounds yet";
  if (p.stoppedAt) return `Stopped after ${p.stoppedAt.name}`;
  if (p.current) {
    const label = roundLabel(p.current, p.total);
    if (hasResult(p.current.state)) return `${label} · ${roundStateLabel(p.current.state, p.current.kind).toLowerCase()}`;
    return label;
  }
  const live = p.rounds.filter((r) => r.state !== "skipped");
  if (live.every((r) => r.state === "above_bar")) return `All ${p.total} rounds above bar`;
  return `${p.done} of ${p.total} rounds held`;
}

// ── Copying a plan to a candidate ───────────────────────────────────────

export type PlanRoundRow = { id?: string; order: number; kind: PlanRoundKind; name: string; format?: string | null; durationMin?: number | null; passMark?: number | null; required: boolean };

/** The CandidateRound rows a candidate gets from a plan, in order from 1. */
export function copyRounds(plan: PlanRoundRow[]) {
  return [...plan]
    .sort((a, b) => a.order - b.order)
    .map((r, i) => ({
      planRoundId: r.id ?? null,
      order: i + 1,
      kind: r.kind,
      name: r.name,
      format: r.format ?? null,
      durationMin: r.durationMin ?? null,
      passMark: r.passMark ?? null,
      required: r.required,
    }));
}

/** Round rows for a new plan built from a template, with the chosen early rounds first. */
export function roundsFromTemplate(t: PlanTemplate, early: PlanRoundKind[] = []): PlanRoundRow[] {
  const first = EARLY_ROUNDS.filter((r) => early.includes(r.kind) && !t.rounds.some((x) => x.kind === r.kind));
  return [...first, ...t.rounds].map((r, i) => ({
    order: i + 1,
    kind: r.kind,
    name: r.kind === "take_home" ? kindName(r.kind, t.roleType) : r.name,
    format: r.format ?? null,
    durationMin: r.durationMin ?? null,
    passMark: null,
    required: r.required,
  }));
}

/** What a round of this kind is called in a plan of this role type. Non-technical roles get a written task, not a take-home. */
export function kindName(kind: PlanRoundKind, role: RoleType): string {
  if (kind === "take_home") return role === "non_technical" ? "Written task" : "Take home";
  return PLAN_ROUND_KIND_LABELS[kind];
}

/** A live interview format's name; "discussion" is a role discussion in non-technical plans. */
export function formatLabel(format: string | null | undefined, role: RoleType): string {
  if (format === "discussion" && role === "non_technical") return "Role discussion";
  return (format && FORMAT_NAMES[format]) || "Interview";
}

// ── Rebuilding rounds from history (backfill) ───────────────────────────

export type HistoryItem = { key: string; kind: PlanRoundKind; format: string | null; at: string; attempt: Attempt };

const FORMAT_NAMES: Record<string, string> = {
  intro: "Intro chat",
  coding: "Coding round",
  discussion: "Technical discussion",
  mixed: "Coding and discussion",
  behavioural: "Behavioural",
};

export function historyRoundName(kind: PlanRoundKind, format: string | null): string {
  if (kind === "ai_interview") return "AI interview";
  if (kind === "take_home") return "Take home";
  return (format && FORMAT_NAMES[format]) || "Interview";
}

/**
 * Rounds for a candidate who had interviews, take-homes or AI interviews
 * before plans existed: one round per item, in date order, cancelled ones
 * left out. Every round but the last is marked "advance", since the
 * candidate did go on to a later one; the last waits for a recruiter.
 */
export function roundsFromHistory(items: HistoryItem[]) {
  const kept = items.filter((i) => i.attempt.state !== "cancelled").sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.key.localeCompare(b.key));
  return kept.map((item, i) => ({
    key: item.key,
    order: i + 1,
    kind: item.kind,
    name: historyRoundName(item.kind, item.format),
    format: item.kind === "interview" ? item.format : null,
    nextStep: (i < kept.length - 1 && hasResult(ownRoundState({ skipped: false, attempts: [item.attempt] })) ? "advance" : null) as NextStep | null,
  }));
}

/**
 * An attempt from a normalised candidate result (lib/crm/results-server).
 * `session` adds what results leave out for interviews and take-homes: the
 * stored status (to spot cancelled ones) and the interviewer's verdict.
 */
export function attemptFromResult(
  r: {
    kind: "take_home" | "ai_screening" | "interview";
    state: "invited" | "in_progress" | "submitted" | "scored" | "expired";
    passed: boolean | null;
    sentAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    scheduledAt: string | null;
  },
  session?: { status: string; verdict: string | null },
  now: Date = new Date(),
): Attempt {
  const at = r.finishedAt ?? r.startedAt ?? r.scheduledAt ?? r.sentAt;
  if (session?.status === "cancelled") return { state: "cancelled", at };
  if (r.kind === "interview" && session?.verdict === "left_in_between") return { state: "did_not_finish", at };
  switch (r.state) {
    case "scored":
      return { state: r.passed ? "above_bar" : "below_bar", at };
    case "submitted":
      return { state: "awaiting_review", at };
    case "expired":
      return { state: "did_not_finish", at };
    case "in_progress":
      return { state: "in_progress", at };
    default:
      if (r.kind !== "interview") return { state: "invited", at };
      if (r.scheduledAt && new Date(r.scheduledAt).getTime() < now.getTime() - NO_SHOW_AFTER_MIN * 60_000) return { state: "did_not_finish", at };
      return { state: "scheduled", at };
  }
}

// ── Editing a plan ──────────────────────────────────────────────────────

export const PLAN_NAME_MAX = 80;
export const ROUND_NAME_MAX = 60;
export const PLAN_ROUNDS_MAX = 12;
/** Live interview length, minutes. */
export const LIVE_MINUTES = { min: 15, max: 240 } as const;
/** AI interview and take-home invite window, days. */
export const INVITE_DAYS = { min: 1, max: 30 } as const;
/** Live interview pass mark on the 1-4 scorecard scale. */
export const LIVE_PASS = { min: 1.5, max: 4, step: 0.25 } as const;
/** AI interview and take-home pass mark, 0-100. */
export const SCORE_PASS = { min: 30, max: 95 } as const;

export type PlanInput = {
  name: string;
  roleType: RoleType;
  continuesInAts: boolean;
  rounds: {
    /** Existing plan round id, kept so candidates' copies stay matched. */
    id?: string | null;
    kind: PlanRoundKind;
    name: string;
    format?: string | null;
    durationMin?: number | null;
    passMark?: number | null;
    required: boolean;
  }[];
};

export type CleanPlan = { name: string; roleType: RoleType; continuesInAts: boolean; rounds: (Omit<PlanRoundRow, "id"> & { id: string | null })[] };

const KINDS: PlanRoundKind[] = ["ai_interview", "take_home", "interview"];

/** Default length for a new round of this kind. */
export function defaultDuration(kind: PlanRoundKind, format?: string | null): number {
  if (kind !== "interview") return kind === "ai_interview" ? 5 : 3;
  return format === "intro" ? 30 : format === "behavioural" ? 45 : 60;
}

/**
 * Checks a plan before it is saved. Returns the cleaned plan, or the first
 * problem in words a recruiter can act on. Round order is the array order.
 */
export function validatePlan(input: PlanInput): { ok: true; plan: CleanPlan } | { ok: false; error: string } {
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Give the plan a name." };
  if (name.length > PLAN_NAME_MAX) return { ok: false, error: `Keep the plan name under ${PLAN_NAME_MAX} characters.` };
  const roleType = normalizeRoleType(input.roleType);
  const list = Array.isArray(input.rounds) ? input.rounds : [];
  if (list.length === 0) return { ok: false, error: "Add at least one round." };
  if (list.length > PLAN_ROUNDS_MAX) return { ok: false, error: `A plan can have up to ${PLAN_ROUNDS_MAX} rounds.` };
  const seen = new Set<string>();
  const rounds: CleanPlan["rounds"] = [];
  for (const [i, r] of list.entries()) {
    const n = i + 1;
    if (!KINDS.includes(r.kind)) return { ok: false, error: `Round ${n} has an unknown kind.` };
    const rName = (r.name ?? "").trim();
    if (!rName) return { ok: false, error: `Give round ${n} a name.` };
    if (rName.length > ROUND_NAME_MAX) return { ok: false, error: `Keep round ${n}'s name under ${ROUND_NAME_MAX} characters.` };
    const format = r.kind === "interview" ? (r.format ?? null) : null;
    if (r.kind === "interview" && !roundAllowed(roleType, { kind: r.kind, format })) {
      return { ok: false, error: roleType === "non_technical" && (format === "coding" || format === "mixed") ? `Round ${n} is a coding round, which non-technical plans do not have.` : `Pick a format for round ${n}.` };
    }
    const range = r.kind === "interview" ? LIVE_MINUTES : INVITE_DAYS;
    const duration = r.durationMin == null ? defaultDuration(r.kind, format) : Math.round(Number(r.durationMin));
    if (!Number.isFinite(duration) || duration < range.min || duration > range.max) {
      return { ok: false, error: r.kind === "interview" ? `Round ${n} can last ${range.min} to ${range.max} minutes.` : `Round ${n}'s invite can stay open ${range.min} to ${range.max} days.` };
    }
    let passMark: number | null = null;
    if (r.passMark != null && String(r.passMark) !== "") {
      const p = Number(r.passMark);
      if (r.kind === "interview") {
        if (!Number.isFinite(p) || p < LIVE_PASS.min || p > LIVE_PASS.max) return { ok: false, error: `Round ${n}'s pass mark goes from ${LIVE_PASS.min} to ${LIVE_PASS.max}.` };
        passMark = Math.round(p / LIVE_PASS.step) * LIVE_PASS.step;
      } else {
        if (!Number.isFinite(p) || p < SCORE_PASS.min || p > SCORE_PASS.max) return { ok: false, error: `Round ${n}'s pass mark goes from ${SCORE_PASS.min} to ${SCORE_PASS.max}.` };
        passMark = Math.round(p);
      }
    }
    const id = r.id ? String(r.id) : null;
    if (id) {
      if (seen.has(id)) return { ok: false, error: "A round appears twice. Reload and try again." };
      seen.add(id);
    }
    rounds.push({ id, order: n, kind: r.kind, name: rName, format, durationMin: duration, passMark, required: r.required !== false });
  }
  return { ok: true, plan: { name, roleType, continuesInAts: !!input.continuesInAts, rounds } };
}

// ── Keeping candidates' copies in step with their plan ──────────────────

export type CandidateRoundRow = {
  id: string;
  planRoundId: string | null;
  order: number;
  kind: PlanRoundKind;
  format: string | null;
  skipped: boolean;
  /** Has an interview, take-home or AI interview linked, or a next step set. */
  held: boolean;
};

export type RoundSync = {
  create: (ReturnType<typeof copyRounds>[number] & { order: number; skipped: boolean })[];
  update: { id: string; order: number; planRoundId?: string; fields?: Omit<ReturnType<typeof copyRounds>[number], "order" | "planRoundId"> }[];
  remove: string[];
};

/**
 * What to change in one candidate's rounds so they follow `plan`. Changes
 * only reach rounds not yet held: held rounds keep their name and history,
 * rounds from an old plan that were never held go, and missing plan rounds
 * are added. A held round from before this plan (another plan, or rebuilt
 * from history) counts as the next plan round of the same kind and format
 * (any live round, when its format is not known), so no one is asked to do
 * a round twice. Rounds a recruiter added by hand
 * stay. A new round that would land before a round the candidate already
 * held is added as skipped, so it never sends someone back.
 */
export function syncRounds(plan: PlanRoundRow[], current: CandidateRoundRow[]): RoundSync {
  const planRows = copyRounds(plan);
  const planIndex = new Map<string, number>();
  planRows.forEach((r, i) => r.planRoundId && planIndex.set(r.planRoundId, i + 1));

  const remove: string[] = [];
  type Item = { key: number; tie: number; existing?: CandidateRoundRow; fresh?: RoundSync["create"][number]; mapped: boolean; adopt?: string };
  const items: Item[] = [];
  const taken = new Set<number>();
  let lastKey = 0;
  let tie = 0;
  for (const r of [...current].sort((a, b) => a.order - b.order)) {
    const idx = r.planRoundId ? planIndex.get(r.planRoundId) : undefined;
    if (idx !== undefined && !taken.has(idx)) {
      taken.add(idx);
      lastKey = idx;
      items.push({ key: idx, tie: 0, existing: r, mapped: true });
      continue;
    }
    if (r.held) {
      const j = planRows.findIndex((p, i) => i + 1 > lastKey && !taken.has(i + 1) && p.kind === r.kind && (r.kind !== "interview" || !r.format || p.format === r.format));
      if (j >= 0 && planRows[j].planRoundId) {
        taken.add(j + 1);
        lastKey = j + 1;
        items.push({ key: j + 1, tie: 0, existing: r, mapped: true, adopt: planRows[j].planRoundId! });
      } else {
        items.push({ key: lastKey, tie: ++tie, existing: r, mapped: false });
      }
    } else if (!r.planRoundId) {
      // Added by hand: keeps its place.
      items.push({ key: lastKey, tie: ++tie, existing: r, mapped: false });
    } else {
      remove.push(r.id);
    }
  }
  planRows.forEach((row, i) => {
    if (taken.has(i + 1)) return;
    items.push({ key: i + 1, tie: 1000 + i, fresh: { ...row, skipped: false }, mapped: true });
  });
  items.sort((a, b) => a.key - b.key || a.tie - b.tie);

  const lastHeld = items.reduce((at, it, i) => (it.existing?.held ? i : at), -1);
  const create: RoundSync["create"] = [];
  const update: RoundSync["update"] = [];
  items.forEach((it, i) => {
    const order = i + 1;
    if (it.fresh) {
      create.push({ ...it.fresh, order, skipped: i < lastHeld });
      return;
    }
    const r = it.existing!;
    if (it.adopt) {
      update.push({ id: r.id, order, planRoundId: it.adopt });
    } else if (it.mapped && !r.held) {
      const { order: _o, planRoundId: _p, ...fields } = planRows[it.key - 1];
      void _o;
      void _p;
      update.push({ id: r.id, order, fields });
    } else if (r.order !== order) {
      update.push({ id: r.id, order });
    }
  });
  return { create, update, remove };
}
