/**
 * The rounds on the Candidates tab: the summary the list, board, batch
 * Results and profile timeline render, the Waiting on filter, and the
 * words under the strip. The summary is built from the same loader the
 * Interviews tab uses, so the two can never disagree on a person.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateResult } from "@/lib/crm/results";
import { strip } from "@/lib/interview/rounds";
import {
  planColumns,
  roundDetail,
  roundInColumn,
  roundsBadge,
  roundsLine,
  roundsSub,
  waitingKey,
  type RoundsSummary,
} from "@/lib/interview/rounds-view";
import { EMPTY_FILTERS, filterRows, waitingCounts, type RosterRow } from "@/lib/crm/roster";

const db = vi.hoisted(() => ({
  workspace: { findUnique: vi.fn() },
  candidate: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
}));
const loadResults = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/crm/results-server", () => ({ loadCandidateResults: loadResults }));

const { deciderNames, loadCandidateRounds, summarizeRounds } = await import("@/lib/interview/rounds-server");

const fmt = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

// ── A small demo workspace, shaped like the recruiter demo seed ─────────

type R = { id: string; kind: string; name: string; format?: string | null; nextStep?: string | null; skipped?: boolean; sessions?: string[]; ai?: string[]; decidedById?: string | null };

function rounds(list: R[]) {
  return list.map((r, i) => ({
    id: r.id,
    order: i,
    kind: r.kind,
    name: r.name,
    format: r.format ?? null,
    durationMin: r.kind === "interview" ? 60 : null,
    decidedAt: r.nextStep ? new Date("2026-09-26T09:00:00.000Z") : null,
    decidedById: r.decidedById ?? (r.nextStep ? "u_arvind" : null),
    required: true,
    skipped: !!r.skipped,
    nextStep: r.nextStep ?? null,
    planRoundId: `plan_${r.id.split("_")[1]}`,
    sessions: (r.sessions ?? []).map((id) => ({ id, status: id.includes("cancel") ? "cancelled" : "completed", verdict: null })),
    aiSessions: (r.ai ?? []).map((id) => ({ id })),
  }));
}

function res(id: string, candidateId: string, kind: CandidateResult["kind"], state: CandidateResult["state"], extra: Partial<CandidateResult> = {}): CandidateResult {
  return {
    id,
    candidateId,
    kind,
    title: id,
    state,
    score: null,
    rating: null,
    verdict: null,
    passed: null,
    sentAt: "2026-09-20T09:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    deadlineAt: null,
    scheduledAt: null,
    minutesTaken: null,
    minutesAllowed: null,
    href: `/w/acme/x/${id}`,
    ...extra,
  };
}

const PLAN: R[] = [
  { id: "ai", kind: "ai_interview", name: "AI interview" },
  { id: "th", kind: "take_home", name: "Take home" },
  { id: "intro", kind: "interview", name: "Intro chat", format: "discussion" },
  { id: "coding", kind: "interview", name: "Coding round", format: "coding" },
];

/** Each person's rounds and results. */
const people: { id: string; name: string; stage: string; rounds: R[]; results: CandidateResult[] }[] = [
  {
    // Invite out, not started: waiting on the candidate.
    id: "sofia",
    name: "Sofia",
    stage: "SCREENING",
    rounds: PLAN.map((p) => ({ ...p, id: `sofia_${p.id}`, ai: p.id === "ai" ? ["ai_sofia"] : [] })),
    results: [res("ai_sofia", "sofia", "ai_screening", "invited")],
  },
  {
    // AI above bar and moved on, take-home not sent: send or schedule next.
    id: "maya",
    name: "Maya",
    stage: "SCREENING",
    rounds: PLAN.map((p) => ({ ...p, id: `maya_${p.id}`, ai: p.id === "ai" ? ["ai_maya"] : [], nextStep: p.id === "ai" ? "advance" : null })),
    results: [res("ai_maya", "maya", "ai_screening", "scored", { score: 72, passed: true, passMark: 60, finishedAt: "2026-09-21T10:00:00.000Z" })],
  },
  {
    // Coding below bar, no next step yet: needs next step.
    id: "kofi",
    name: "Kofi",
    stage: "SCREENING",
    rounds: PLAN.map((p): R => ({
      ...p,
      id: `kofi_${p.id}`,
      ai: p.id === "ai" ? ["ai_kofi"] : [],
      sessions: p.id === "th" ? ["th_kofi"] : p.id === "intro" ? ["iv_kofi_intro"] : p.id === "coding" ? ["iv_kofi_coding"] : [],
      nextStep: p.id === "coding" ? null : "advance",
    })).concat([{ id: "kofi_beh", kind: "interview", name: "Behavioural", format: "behavioural" }]),
    results: [
      res("ai_kofi", "kofi", "ai_screening", "scored", { score: 72, passed: true, passMark: 60 }),
      res("th_kofi", "kofi", "take_home", "scored", { score: 66, passed: true, passMark: 60 }),
      res("iv_kofi_intro", "kofi", "interview", "scored", { rating: 3.4, ratingScale: 4, ratingBar: 3, passed: true, finishedAt: "2026-09-22T10:00:00.000Z" }),
      res("iv_kofi_coding", "kofi", "interview", "scored", { rating: 2.1, ratingScale: 4, ratingBar: 3, passed: false, finishedAt: "2026-09-26T10:00:00.000Z" }),
    ],
  },
  {
    // Intro held, scorecards not in: review.
    id: "ravi",
    name: "Ravindra",
    stage: "SCREENING",
    rounds: [
      { id: "ravi_intro", kind: "interview", name: "Intro chat", format: "discussion", sessions: ["iv_ravi"] },
      { id: "ravi_coding", kind: "interview", name: "Coding round", format: "coding" },
    ],
    results: [res("iv_ravi", "ravi", "interview", "submitted", { finishedAt: "2026-09-28T10:00:00.000Z" })],
  },
  {
    // Every round above bar: final decision.
    id: "lena",
    name: "Lena",
    stage: "SCREENING",
    rounds: [
      { id: "lena_intro", kind: "interview", name: "Intro chat", sessions: ["iv_lena_1"], nextStep: "advance" },
      { id: "lena_coding", kind: "interview", name: "Coding round", sessions: ["iv_lena_2"] },
    ],
    results: [
      res("iv_lena_1", "lena", "interview", "scored", { rating: 3.5, ratingScale: 4, ratingBar: 3, passed: true }),
      res("iv_lena_2", "lena", "interview", "scored", { rating: 3.2, ratingScale: 4, ratingBar: 3, passed: true }),
    ],
  },
  {
    // Coding booked for later: waiting on nobody.
    id: "priya",
    name: "Priya",
    stage: "SCREENING",
    rounds: [
      { id: "priya_intro", kind: "interview", name: "Intro chat", sessions: ["iv_priya_1"], nextStep: "advance" },
      { id: "priya_coding", kind: "interview", name: "Coding round", sessions: ["iv_priya_2"] },
    ],
    results: [
      res("iv_priya_1", "priya", "interview", "scored", { rating: 3.5, ratingScale: 4, ratingBar: 3, passed: true }),
      res("iv_priya_2", "priya", "interview", "invited", { scheduledAt: "2099-10-02T11:00:00.000Z" }),
    ],
  },
  {
    // Stopped after the take-home and marked not passed: nothing owed.
    id: "grace",
    name: "Grace",
    stage: "REJECTED",
    rounds: PLAN.map((p) => ({ ...p, id: `grace_${p.id}`, sessions: p.id === "th" ? ["th_grace"] : [], nextStep: p.id === "th" ? "stop" : null })),
    results: [res("th_grace", "grace", "take_home", "scored", { score: 41, passed: false, passMark: 60 })],
  },
  // No plan at all.
  { id: "noplan", name: "No plan", stage: "NEW", rounds: [], results: [] },
];

async function loadAll() {
  db.workspace.findUnique.mockResolvedValue({ hiringType: "technical" });
  db.candidate.findMany.mockResolvedValue(people.map((p) => ({ id: p.id, stage: p.stage, plan: p.rounds.length ? { name: "Frontend", roleType: "technical" } : null, rounds: rounds(p.rounds) })));
  db.user.findMany.mockResolvedValue([{ id: "u_arvind", name: "Arvind", email: "a@x.com" }]);
  loadResults.mockResolvedValue(new Map(people.map((p) => [p.id, p.results])));
  const loaded = await loadCandidateRounds("ws", "acme", people.map((p) => p.id));
  const nameOf = await deciderNames(loaded.values());
  return { loaded, summaries: new Map([...loaded].map(([id, cr]) => [id, cr.progress.rounds.length ? summarizeRounds(cr, nameOf) : null])) };
}

function row(id: string, summary: RoundsSummary | null): RosterRow {
  const p = people.find((x) => x.id === id)!;
  return {
    id,
    name: p.name,
    email: null,
    phone: null,
    source: null,
    tags: [],
    stage: p.stage,
    status: "active",
    rejectReason: null,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    stageChangedAt: null,
    daysInStage: 1,
    batchId: null,
    ownerId: null,
    results: [],
    latest: null,
    pending: null,
    combined: null,
    byKind: { ai_screening: null, take_home: null, interview: null },
    interviewRating: null,
    takeHomeMinutes: null,
    next: { label: "", detail: null, tone: "plain", href: null } as unknown as RosterRow["next"],
    attention: false,
    manualPass: null,
    rounds: summary,
  };
}

describe("rounds summary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches the Interviews tab for the same person: same strip, same waiting on", async () => {
    const { loaded, summaries } = await loadAll();
    for (const [id, cr] of loaded) {
      const s = summaries.get(id);
      if (!s) continue;
      expect(s.rounds.filter((r) => !r.skipped).map((r) => r.seg)).toEqual(strip(cr.progress));
      expect(s.waitingOn).toBe(cr.progress.waitingOn);
      expect(s.currentId).toBe(cr.progress.current?.id ?? null);
      expect(s.total).toBe(cr.progress.total);
    }
  });

  it("carries the score against the bar, the report link and who moved them on", async () => {
    const { summaries } = await loadAll();
    const kofi = summaries.get("kofi")!;
    const coding = kofi.rounds.find((r) => r.id === "kofi_coding")!;
    expect(coding.result).toMatchObject({ score: "2.1 of 4", barText: "bar 3", href: "/w/acme/interviews/iv_kofi_coding/report" });
    expect(coding.result!.frac).toBeCloseTo(2.1 / 4);
    expect(coding.result!.bar).toBeCloseTo(3 / 4);
    const ai = kofi.rounds.find((r) => r.id === "kofi_ai")!;
    expect(ai.result).toMatchObject({ score: "72%", barText: "bar 60%", frac: 0.72, bar: 0.6, href: "/w/acme/x/ai_kofi" });
    expect(ai.decidedBy).toBe("Arvind");
    expect(ai.planRoundId).toBe("plan_ai");
    expect(kofi.rounds.find((r) => r.id === "kofi_beh")!.state).toBe("not_started");
  });

  it("keeps a booked interview's time and lobby link", async () => {
    const { summaries } = await loadAll();
    const coding = summaries.get("priya")!.rounds.find((r) => r.id === "priya_coding")!;
    expect(coding.state).toBe("scheduled");
    expect(coding.pending).toEqual({ at: "2099-10-02T11:00:00.000Z", due: null, href: null, lobbyHref: "/w/acme/interviews/iv_priya_2/lobby" });
    expect(roundsSub(summaries.get("priya")!, "SCREENING", fmt)).toBe("Scheduled 2099-10-02");
  });

  it("has no summary for someone without rounds", async () => {
    const { summaries } = await loadAll();
    expect(summaries.get("noplan")).toBeNull();
  });
});

describe("Waiting on filter", () => {
  it("each chip returns the right people", async () => {
    const { summaries } = await loadAll();
    const rows = people.map((p) => row(p.id, summaries.get(p.id) ?? null));
    const who = (waiting: RosterFilters["waiting"]) => filterRows(rows, { ...EMPTY_FILTERS, waiting }).map((r) => r.id);
    expect(who("candidate")).toEqual(["sofia"]);
    expect(who("schedule")).toEqual(["maya"]);
    expect(who("next_step")).toEqual(["kofi"]);
    expect(who("review")).toEqual(["ravi"]);
    expect(who("decision")).toEqual(["lena"]);
    // No chip: everyone, including those waiting on nobody.
    expect(who(null)).toHaveLength(people.length);
    expect(waitingCounts(rows)).toEqual({ candidate: 1, schedule: 1, next_step: 1, review: 1, decision: 1 });
  });

  it("a booked interview, a decided person and no plan wait on nobody", async () => {
    const { summaries } = await loadAll();
    expect(waitingKey(summaries.get("priya"))).toBeNull();
    expect(waitingKey(summaries.get("grace"))).toBeNull();
    expect(waitingKey(summaries.get("noplan"))).toBeNull();
  });
});

describe("words under the strip", () => {
  it("says where each person is and what is owed", async () => {
    const { summaries } = await loadAll();
    const s = (id: string) => summaries.get(id)!;
    expect(roundsLine(s("kofi"))).toBe("Round 4 of 5 · Coding round below bar · 2.1 of 4");
    expect(roundsBadge(s("kofi"))).toEqual({ text: "Needs next step", tone: "warning" });
    expect(roundsLine(s("lena"))).toBe("All 2 rounds above bar");
    expect(roundsBadge(s("lena"))).toEqual({ text: "Ready for decision", tone: "secondary" });
    expect(roundsLine(s("sofia"))).toBe("Round 1 of 4 · AI interview");
    expect(roundsSub(s("sofia"), "SCREENING", fmt)).toBe("Invited 2026-09-20, not started");
    expect(roundsLine(s("maya"))).toBe("Round 2 of 4 · Take home");
    expect(roundsSub(s("maya"), "SCREENING", fmt)).toBe("Moved on by Arvind, 2026-09-26 · not sent yet");
    expect(roundsBadge(s("maya"))).toEqual({ text: "To send", tone: "neutral" });
    expect(roundsLine(s("grace"))).toBe("Stopped after Take home · 41%");
    expect(roundsSub(s("grace"), "REJECTED", fmt)).toBe("Decided by Arvind, 2026-09-26");
    expect(roundsSub(s("ravi"), "SCREENING", fmt)).toBe("Held 2026-09-28, scorecards not all in");
  });

  it("describes each round for the popover", async () => {
    const { summaries } = await loadAll();
    const kofi = summaries.get("kofi")!;
    expect(roundDetail(kofi.rounds.find((r) => r.id === "kofi_coding")!, fmt)).toBe("2026-09-26 · 2.1 of 4, bar 3");
    expect(roundDetail(kofi.rounds.find((r) => r.id === "kofi_beh")!, fmt)).toBe("60 min");
    const grace = summaries.get("grace")!;
    expect(roundDetail(grace.rounds.find((r) => r.id === "grace_intro")!, fmt)).toBe("Not held, stopped earlier");
  });
});

describe("batch Results columns", () => {
  it("one column per plan round, in plan order, and each person's round under it", async () => {
    const { summaries } = await loadAll();
    const all = [...summaries.values()];
    const cols = planColumns(all);
    expect(cols.map((c) => c.key)).toEqual(["plan_ai", "plan_th", "plan_intro", "plan_coding", "plan_beh"]);
    expect(roundInColumn(summaries.get("kofi"), "plan_coding")?.result?.score).toBe("2.1 of 4");
    expect(roundInColumn(summaries.get("lena"), "plan_ai")).toBeNull();
  });
});

type RosterFilters = import("@/lib/crm/roster").RosterFilters;
