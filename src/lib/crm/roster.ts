/**
 * The row shape shared by the Candidates list, the board, the quick view and
 * a batch's tabs, plus the pure filtering used by all of them. Client-safe.
 */
import { passCheck, type CandidateResult, type NextStep, type ResultKind } from "@/lib/crm/results";
import { waitingKey, type RoundsSummary, type WaitingKey } from "@/lib/interview/rounds-view";

export type RosterRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  stage: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  stageChangedAt: string | null;
  daysInStage: number;
  batchId: string | null;
  ownerId: string | null;
  results: CandidateResult[];
  latest: { score: number; title: string; kind: ResultKind } | null;
  /** Newest result when nothing is scored yet, e.g. an interview awaiting feedback. */
  pending: { text: string; title: string; kind: ResultKind } | null;
  combined: number | null;
  byKind: Record<ResultKind, number | null>;
  interviewRating: number | null;
  /** Top of the interview rating scale: 5 (older rubric) or 4 (panel scorecards). */
  interviewScale?: number;
  takeHomeMinutes: number | null;
  next: NextStep;
  attention: boolean;
  /** Set when the candidate is Passed over results that do not back it: the
   *  reason, e.g. "AI screening 5, Not a fit". A recruiter's manual override. */
  manualPass: string | null;
  /** From the interview rounds: why passing now would be a manual pass ("Coding round below the bar"). Null when the rounds back a pass or there are none. */
  roundsPass?: string | null;
  /** The candidate's interview rounds, when they have any. */
  rounds?: RoundsSummary | null;
};

/**
 * The candidates in `rows` a pass would override: not yet Passed, and with a
 * best result below the bar or nothing scored. Empty means a plain pass.
 */
export function passOverrides(rows: (Pick<RosterRow, "id" | "name" | "stage" | "results"> & { roundsPass?: string | null })[]) {
  return rows
    .filter((r) => r.stage !== "PASSED")
    .map((r) => {
      const check = passCheck(r.results);
      const reason = [r.roundsPass ?? null, check.override ? (check.reason ?? "Below the bar") : null].filter(Boolean).join("; ");
      return { id: r.id, name: r.name, reason };
    })
    .filter((r) => r.reason);
}

export type RosterBatch = { id: string; name: string; status: string };
export type RosterMember = { id: string; name: string; email: string | null };

export type RosterFilters = {
  q: string;
  stage: string | null;
  batch: string | null; // batch id, "none", or null for any
  owner: string | null; // user id, "none", "me", or null
  source: string | null;
  tag: string | null;
  minScore: number | null;
  attention: boolean;
  archived: boolean;
  /** Waiting on filter, from the interview rounds. */
  waiting?: WaitingKey | null;
};

export const EMPTY_FILTERS: RosterFilters = {
  q: "",
  stage: null,
  batch: null,
  owner: null,
  source: null,
  tag: null,
  minScore: null,
  attention: false,
  archived: false,
  waiting: null,
};

/** Rows per Waiting on chip, for the counts. */
export function waitingCounts(rows: RosterRow[]): Record<WaitingKey, number> {
  const out: Record<WaitingKey, number> = { candidate: 0, schedule: 0, next_step: 0, review: 0, decision: 0 };
  for (const r of rows) {
    const k = waitingKey(r.rounds);
    if (k) out[k]++;
  }
  return out;
}

/** Everything except the stage, so the stage strip can count under the other filters. */
export function filterRows(rows: RosterRow[], f: RosterFilters, meId?: string): RosterRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.archived !== (r.status === "archived")) return false;
    if (f.batch === "none" ? r.batchId : f.batch && r.batchId !== f.batch) return false;
    if (f.owner) {
      const want = f.owner === "me" ? meId : f.owner;
      if (f.owner === "none" ? r.ownerId : r.ownerId !== want) return false;
    }
    if (f.source && (r.source ?? "").toLowerCase() !== f.source.toLowerCase()) return false;
    if (f.tag && !r.tags.includes(f.tag)) return false;
    if (f.minScore != null && (r.combined ?? -1) < f.minScore) return false;
    if (f.attention && !r.attention) return false;
    if (f.waiting && waitingKey(r.rounds) !== f.waiting) return false;
    if (q) {
      const hay = `${r.name} ${r.email ?? ""} ${r.phone ?? ""} ${r.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type SortKey = "attention" | "updated" | "name" | "score" | "stage_time";

export function sortRows(rows: RosterRow[], key: SortKey): RosterRow[] {
  const out = [...rows];
  switch (key) {
    case "name":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "score":
      return out.sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1) || a.name.localeCompare(b.name));
    case "stage_time":
      return out.sort((a, b) => b.daysInStage - a.daysInStage);
    case "attention": {
      // Work waiting on us first (most urgent tone, then longest waiting),
      // then everyone else by last update. Closed candidates sink.
      const rank = (r: RosterRow) =>
        r.stage === "PASSED" || r.stage === "REJECTED" ? 4 : r.next.tone === "danger" ? 0 : r.next.tone === "warning" ? 1 : r.attention ? 2 : 3;
      return out.sort(
        (a, b) => rank(a) - rank(b) || b.daysInStage - a.daysInStage || +new Date(b.updatedAt) - +new Date(a.updatedAt),
      );
    }
    default:
      return out.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Rows as CSV, for the Export action. */
export function rowsToCsv(
  rows: RosterRow[],
  lookups: { batch: (id: string | null) => string; owner: (id: string | null) => string; stage: (s: string) => string },
): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["name", "email", "phone", "stage", "days_in_stage", "batch", "owner", "source", "tags", "combined_score", "ai_screening", "take_home", "interview", "next_step"];
  const lines = rows.map((r) =>
    [
      r.name,
      r.email,
      r.phone,
      lookups.stage(r.stage),
      r.daysInStage,
      lookups.batch(r.batchId),
      lookups.owner(r.ownerId),
      r.source,
      r.tags.join("; "),
      r.combined,
      r.byKind.ai_screening,
      r.byKind.take_home,
      r.interviewRating,
      r.next.label,
    ]
      .map(esc)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n") + "\n";
}
