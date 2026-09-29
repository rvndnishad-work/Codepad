/**
 * A candidate's rounds in a shape the Candidates list, board, batch Results
 * and profile timeline can all render: plain data, no Maps or Dates, so it
 * crosses from server to client as is. Built on the server by
 * `summarizeRounds` (rounds-server); the words shown for it live here.
 *
 * Client-safe and pure. Dates are passed through a formatter so the tests
 * and the pages can each pick how they print them.
 */
import { roundStateLabel, type NextStep, type PlanRoundKind, type RoleType, type RoundState, type Segment, type WaitingOn } from "@/lib/interview/rounds";

export type RoundResultView = {
  at: string | null;
  /** "3.2 of 4" or "74%". Null when the round did not finish. */
  score: string | null;
  /** The score and the pass mark on 0-1, for the bar with its tick. */
  frac: number | null;
  bar: number | null;
  /** "bar 3" or "bar 60%". */
  barText: string | null;
  href: string | null;
};

export type RoundView = {
  id: string;
  /** The plan round this copy came from; null when added for this person. */
  planRoundId: string | null;
  number: number | null;
  name: string;
  kind: PlanRoundKind;
  format: string | null;
  required: boolean;
  skipped: boolean;
  /** Added for this person, not from the plan. */
  manual: boolean;
  /** Has happened (or has a next step), so it cannot be skipped or removed. */
  held: boolean;
  durationMin: number | null;
  state: RoundState;
  seg: Segment;
  stateLabel: string;
  nextStep: NextStep | null;
  decidedAt: string | null;
  decidedBy: string | null;
  /** The latest sitting with a result. */
  result: RoundResultView | null;
  /** A sitting booked, sent or running: when, the invite's last day, and where to open it. */
  pending: { at: string | null; due: string | null; href: string | null; lobbyHref: string | null } | null;
};

export type RoundsSummary = {
  planName: string | null;
  roleType: RoleType;
  /** Rounds not skipped. */
  total: number;
  done: number;
  waitingOn: WaitingOn;
  readyForDecision: boolean;
  currentId: string | null;
  stoppedAtId: string | null;
  /** Why passing now would be a manual pass, or null. */
  override: string | null;
  rounds: RoundView[];
};

/** The Waiting on filter: who or what each candidate is stuck on. */
export type WaitingKey = "candidate" | "schedule" | "next_step" | "review" | "decision";

export const WAITING_KEYS: WaitingKey[] = ["candidate", "schedule", "next_step", "review", "decision"];

export const WAITING_LABELS: Record<WaitingKey, string> = {
  candidate: "Candidate",
  schedule: "Send or schedule next",
  next_step: "Next step",
  review: "Review",
  decision: "Final decision",
};

/** Which Waiting on chip this candidate falls under, if any. A booked interview waits on nobody. */
export function waitingKey(s: RoundsSummary | null | undefined): WaitingKey | null {
  if (!s || s.total === 0) return null;
  if (s.readyForDecision) return "decision";
  switch (s.waitingOn) {
    case "candidate":
    case "schedule":
    case "next_step":
    case "review":
      return s.waitingOn;
    default:
      return null;
  }
}

export function liveRounds(s: RoundsSummary): RoundView[] {
  return s.rounds.filter((r) => !r.skipped);
}

export function currentRound(s: RoundsSummary): RoundView | null {
  return s.rounds.find((r) => r.id === s.currentId) ?? null;
}

export function stoppedRound(s: RoundsSummary): RoundView | null {
  return s.rounds.find((r) => r.id === s.stoppedAtId) ?? null;
}

/** The segments of the strip, with names for the tooltip. */
export function stripItems(s: RoundsSummary): { seg: Segment; name: string }[] {
  return liveRounds(s).map((r) => ({ seg: r.seg, name: r.name }));
}

type Fmt = (iso: string | null | undefined) => string;

function stateWords(r: RoundView): string {
  return roundStateLabel(r.state, r.kind).toLowerCase();
}

/** "Round 4 of 6 · Coding below bar · 2.1 of 4": the main line under the strip. */
export function roundsLine(s: RoundsSummary): string {
  if (s.total === 0) return "No rounds yet";
  const stopped = stoppedRound(s);
  if (stopped) return [`Stopped after ${stopped.name}`, stopped.result?.score].filter(Boolean).join(" · ");
  const cur = currentRound(s);
  const where = (r: RoundView) => (r.number ? `Round ${r.number} of ${s.total} · ${r.name}` : r.name);
  if (cur) {
    if (cur.state === "above_bar" || cur.state === "below_bar" || cur.state === "did_not_finish") {
      return [`${where(cur)} ${stateWords(cur)}`, cur.result?.score].filter(Boolean).join(" · ");
    }
    return where(cur);
  }
  const live = liveRounds(s);
  if (live.every((r) => r.state === "above_bar")) return `All ${s.total} ${s.total === 1 ? "round" : "rounds"} above bar`;
  const last = [...live].reverse().find((r) => r.result);
  if (last) return [`${where(last)} ${stateWords(last)}`, last.result?.score].filter(Boolean).join(" · ");
  return `${s.done} of ${s.total} rounds held`;
}

/** The quieter line under it: when the next thing happens, or who decided. */
export function roundsSub(s: RoundsSummary, stage: string, fmt: Fmt, fmtWhen: Fmt = fmt): string | null {
  if (s.total === 0) return null;
  const stopped = stoppedRound(s);
  if (stopped) return stopped.decidedBy ? `Decided by ${stopped.decidedBy}${stopped.decidedAt ? `, ${fmt(stopped.decidedAt)}` : ""}` : null;
  const cur = currentRound(s);
  const decided = stage === "PASSED" || stage === "REJECTED";
  if (decided) {
    const open = liveRounds(s).filter((r) => !r.result && r.state !== "stopped").length;
    return open ? `${open} ${open === 1 ? "round" : "rounds"} not held · ${stage === "PASSED" ? "passed" : "decided"} before the end` : null;
  }
  if (!cur) return null;
  const p = cur.pending;
  switch (cur.state) {
    case "scheduled":
      if (cur.kind === "interview") return p?.at ? `Scheduled ${fmtWhen(p.at)}` : "Scheduled";
      return [`Invited ${fmt(p?.at)}, not started`, p?.due ? `expires ${fmt(p.due)}` : null].filter(Boolean).join(" · ");
    case "in_progress":
      return cur.kind === "interview" ? "In the room now" : `Started ${fmt(p?.at)}, not submitted yet`;
    case "awaiting_review":
      return cur.kind === "interview" ? `Held ${fmt(cur.result?.at ?? p?.at)}, scorecards not all in` : `Submitted ${fmt(cur.result?.at ?? p?.at)}, not reviewed yet`;
    case "not_started": {
      const prev = [...s.rounds].reverse().find((r) => r.nextStep === "advance" && (r.number ?? 0) < (cur.number ?? 0));
      const todo = cur.kind === "interview" ? "not booked yet" : "not sent yet";
      return prev?.decidedBy ? `Moved on by ${prev.decidedBy}${prev.decidedAt ? `, ${fmt(prev.decidedAt)}` : ""} · ${todo}` : todo.charAt(0).toUpperCase() + todo.slice(1);
    }
    case "did_not_finish":
      return "Rebook it, or stop here";
    default:
      return cur.result?.at ? `Held ${fmt(cur.result.at)}${cur.result.barText ? ` · ${cur.result.barText}` : ""}` : null;
  }
}

export type BadgeTone = "warning" | "secondary" | "neutral";

/** The small badge that says what the recruiter owes this candidate, if anything. */
export function roundsBadge(s: RoundsSummary | null | undefined): { text: string; tone: BadgeTone } | null {
  const key = waitingKey(s);
  if (!s || !key) return null;
  switch (key) {
    case "next_step":
      return { text: "Needs next step", tone: "warning" };
    case "decision":
      return { text: "Ready for decision", tone: "secondary" };
    case "schedule": {
      const cur = currentRound(s);
      return { text: cur && cur.kind !== "interview" ? "To send" : "To schedule", tone: "neutral" };
    }
    case "review":
      return { text: "Awaiting review", tone: "neutral" };
    default:
      return null;
  }
}

/** One line per round for the popover and the batch Results cells: "18 Sept · 72%, bar 60%". */
export function roundDetail(r: RoundView, fmt: Fmt, fmtWhen: Fmt = fmt): string {
  if (r.skipped) return "Skipped for this person";
  if (r.result) {
    const bits = [r.result.at ? fmt(r.result.at) : null, [r.result.score, r.result.barText].filter(Boolean).join(", ") || null];
    return bits.filter(Boolean).join(" · ") || stateWords(r);
  }
  if (r.pending) {
    if (r.state === "scheduled") return r.kind === "interview" ? `Booked for ${fmtWhen(r.pending.at)}` : `Invited ${fmt(r.pending.at)}`;
    if (r.state === "in_progress") return "In progress";
  }
  if (r.state === "stopped") return "Not held, stopped earlier";
  if (r.durationMin) return `${r.durationMin} min`;
  return r.kind === "interview" ? "Not booked yet" : "Not sent yet";
}

export type PlanColumn = { key: string; name: string; kind: PlanRoundKind; format: string | null };

/**
 * One column per plan round across a batch's candidates, in plan order, for
 * the batch Results tab. Rounds added for one person get no column.
 */
export function planColumns(summaries: (RoundsSummary | null | undefined)[]): PlanColumn[] {
  const seen = new Map<string, PlanColumn & { at: number }>();
  for (const s of summaries) {
    if (!s) continue;
    s.rounds.forEach((r, i) => {
      if (!r.planRoundId || seen.has(r.planRoundId)) return;
      seen.set(r.planRoundId, { key: r.planRoundId, name: r.name, kind: r.kind, format: r.format, at: i });
    });
  }
  return [...seen.values()].sort((a, b) => a.at - b.at).map(({ at: _at, ...c }) => c);
}

export function roundInColumn(s: RoundsSummary | null | undefined, key: string): RoundView | null {
  return s?.rounds.find((r) => r.planRoundId === key) ?? null;
}
