/**
 * Loads candidates' interview rounds with where each one stands, for the
 * pages that show them (candidate profile, Interviews list, wizard). The
 * state of a round comes from the results of the interviews, take-homes and
 * AI interviews linked to it (candidateRoundId), read through the same
 * normalised results the Candidates tab uses.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { loadCandidateResults } from "@/lib/crm/results-server";
import { INTERVIEW_PASS_RATING, type CandidateResult } from "@/lib/crm/results";
import type { RoundResultView, RoundsSummary, RoundView } from "@/lib/interview/rounds-view";
import {
  attemptFromResult,
  normalizeHiringType,
  normalizeRoleType,
  overrideReason,
  parseRoundSettings,
  planProgress,
  roundSource,
  roundAfter,
  roundStateLabel,
  segmentOf,
  type Attempt,
  type NextStep,
  type PlanProgress,
  type PlanRound,
  type PlanRoundKind,
  type RoleType,
} from "@/lib/interview/rounds";

export type RoundMeta = {
  format: string | null;
  /** The plan round this copy came from; null when added for this person. */
  planRoundId: string | null;
  /** AI interview and take-home rounds: the AI screening or template the plan round sends, when one is picked. */
  sends: string | null;
  manual: boolean;
  held: boolean;
  durationMin: number | null;
  /** The latest sitting that has a result: when, the score in words and against its bar, and its report. */
  latest: RoundResultView | null;
  /** The latest sitting booked, sent or running, with no result yet. */
  pending: RoundView["pending"];
  decidedAt: string | null;
  decidedById: string | null;
};

export type CandidateRounds = {
  candidateId: string;
  planName: string | null;
  roleType: RoleType;
  progress: PlanProgress;
  /** Per round id: format, whether it came from the plan, whether it has happened, and its latest result. */
  meta: Map<string, RoundMeta>;
  /** Interview or AI interview id to the round it belongs to. */
  roundOfSession: Map<string, string>;
};

/** "3.2 of 4" for a scored interview, "74%" for the others. */
function scoreText(r: CandidateResult): string | null {
  if (r.kind === "interview" && r.rating != null) return `${r.rating.toFixed(1)} of ${r.ratingScale ?? 5}`;
  return r.score != null ? `${Math.round(r.score)}%` : null;
}

/** Names of the AI screenings and take-home templates plan rounds send, looked up once for every candidate. */
async function sourceNames(workspaceId: string, rounds: { kind: string; json: string | null }[]): Promise<(kind: string, json: string | null) => string | null> {
  const ai = new Set<string>();
  const th = new Set<string>();
  for (const r of rounds) {
    if (!r.json) continue;
    const id = roundSource(r.kind as PlanRoundKind, parseRoundSettings(r.json));
    if (!id) continue;
    (r.kind === "ai_interview" ? ai : th).add(id);
  }
  const [a, t] = await Promise.all([
    ai.size ? prisma.aIScreeningBatch.findMany({ where: { workspaceId, id: { in: [...ai] } }, select: { id: true, positionTitle: true } }) : [],
    th.size ? prisma.takeHomeTemplate.findMany({ where: { workspaceId, id: { in: [...th] } }, select: { id: true, name: true } }) : [],
  ]);
  const names = new Map<string, string>([...a.map((x): [string, string] => [x.id, x.positionTitle]), ...t.map((x): [string, string] => [x.id, x.name])]);
  return (kind, json) => {
    const id = json ? roundSource(kind as PlanRoundKind, parseRoundSettings(json)) : null;
    return id ? (names.get(id) ?? null) : null;
  };
}

/** The score and the pass mark on 0-1, and the bar in words. */
function scoreBar(r: CandidateResult): Pick<RoundResultView, "frac" | "bar" | "barText"> {
  if (r.kind === "interview") {
    const scale = r.ratingScale ?? 5;
    const bar = r.ratingBar ?? INTERVIEW_PASS_RATING;
    return { frac: r.rating != null ? r.rating / scale : null, bar: bar / scale, barText: `bar ${Number(bar.toFixed(2))}` };
  }
  const mark = r.passMark ?? null;
  return { frac: r.score != null ? r.score / 100 : null, bar: mark != null ? mark / 100 : null, barText: mark != null ? `bar ${mark}%` : null };
}

/**
 * `results` may be passed in when the caller has already loaded them for
 * these candidates (the roster does), to skip loading them twice.
 */
export async function loadCandidateRounds(
  workspaceId: string,
  workspaceSlug: string,
  candidateIds: string[],
  stages?: Map<string, string>,
  preloaded?: Map<string, CandidateResult[]>,
): Promise<Map<string, CandidateRounds>> {
  const out = new Map<string, CandidateRounds>();
  const ids = [...new Set(candidateIds)];
  if (!ids.length) return out;
  const [ws, candidates] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { hiringType: true } }),
    prisma.candidate.findMany({
      where: { workspaceId, id: { in: ids } },
      select: {
        id: true,
        stage: true,
        plan: { select: { name: true, roleType: true } },
        rounds: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            kind: true,
            name: true,
            format: true,
            durationMin: true,
            decidedAt: true,
            decidedById: true,
            required: true,
            skipped: true,
            nextStep: true,
            planRoundId: true,
            planRound: { select: { settingsJson: true } },
            sessions: { select: { id: true, status: true, verdict: true } },
            aiSessions: { select: { id: true } },
          },
        },
      },
    }),
  ]);
  const withRounds = candidates.filter((c) => c.rounds.length > 0);
  const results: Map<string, CandidateResult[]> = preloaded ?? (withRounds.length ? await loadCandidateResults(workspaceId, workspaceSlug, withRounds.map((c) => c.id)) : new Map());
  const hiring = normalizeHiringType(ws?.hiringType);
  const sendsName = await sourceNames(workspaceId, withRounds.flatMap((c) => c.rounds.map((r) => ({ kind: r.kind, json: r.planRound?.settingsJson ?? null }))));

  for (const c of candidates) {
    const byId = new Map((results.get(c.id) ?? []).map((r) => [r.id, r]));
    const roundOfSession = new Map<string, string>();
    const meta: CandidateRounds["meta"] = new Map();
    const inputs = c.rounds.map((r) => {
      const attempts: Attempt[] = [];
      let latest: RoundMeta["latest"] = null;
      let latestT = -Infinity;
      let pending: RoundMeta["pending"] = null;
      let pendingT = -Infinity;
      const note = (res: CandidateResult, a: Attempt) => {
        attempts.push(a);
        const t = a.at ? new Date(a.at).getTime() : 0;
        if (a.state === "scheduled" || a.state === "invited" || a.state === "in_progress") {
          if (t < pendingT) return;
          pendingT = t;
          const isLive = res.kind === "interview";
          pending = {
            at: a.state === "in_progress" ? (res.startedAt ?? a.at) : isLive ? (res.scheduledAt ?? a.at) : res.sentAt,
            due: res.deadlineAt,
            href: isLive ? null : res.href,
            lobbyHref: isLive ? `/w/${workspaceSlug}/interviews/${res.id}/lobby` : null,
          };
          return;
        }
        if (a.state !== "above_bar" && a.state !== "below_bar" && a.state !== "did_not_finish" && a.state !== "awaiting_review") return;
        if (t < latestT) return;
        latestT = t;
        const dnf = a.state === "did_not_finish";
        latest = { at: a.at, score: dnf ? null : scoreText(res), ...(dnf ? { frac: null, bar: null, barText: null } : scoreBar(res)), href: res.kind === "interview" ? `/w/${workspaceSlug}/interviews/${res.id}/report` : res.href };
      };
      for (const s of r.sessions) {
        roundOfSession.set(s.id, r.id);
        const res = byId.get(s.id);
        if (res) note(res, attemptFromResult(res, { status: s.status, verdict: s.verdict }));
      }
      for (const s of r.aiSessions) {
        roundOfSession.set(s.id, r.id);
        const res = byId.get(s.id);
        if (res) note(res, attemptFromResult(res));
      }
      meta.set(r.id, {
        format: r.format,
        planRoundId: r.planRoundId,
        sends: sendsName(r.kind, r.planRound?.settingsJson ?? null),
        manual: !r.planRoundId,
        held: r.sessions.length + r.aiSessions.length > 0 || !!r.nextStep,
        durationMin: r.durationMin,
        latest,
        pending,
        decidedAt: r.decidedAt?.toISOString() ?? null,
        decidedById: r.decidedById,
      });
      return {
        id: r.id,
        order: r.order,
        kind: r.kind as PlanRoundKind,
        name: r.name,
        format: r.format,
        required: r.required,
        skipped: r.skipped,
        nextStep: (r.nextStep as NextStep | null) ?? null,
        attempts,
      };
    });
    out.set(c.id, {
      candidateId: c.id,
      planName: c.plan?.name ?? null,
      roleType: c.plan ? normalizeRoleType(c.plan.roleType) : hiring === "non_technical" ? "non_technical" : "technical",
      progress: planProgress(inputs, stages?.get(c.id) ?? c.stage),
      meta,
      roundOfSession,
    });
  }
  return out;
}

/**
 * A candidate's rounds as plain data for the pages (see rounds-view).
 * `nameOf` turns the member ids who moved people on into names.
 */
export function summarizeRounds(cr: CandidateRounds, nameOf: (id: string | null) => string | null = () => null): RoundsSummary {
  const p = cr.progress;
  return {
    planName: cr.planName,
    roleType: cr.roleType,
    total: p.total,
    done: p.done,
    waitingOn: p.waitingOn,
    readyForDecision: p.readyForDecision,
    currentId: p.current?.id ?? null,
    stoppedAtId: p.stoppedAt?.id ?? null,
    override: p.total > 0 ? overrideReason(p) : null,
    rounds: p.rounds.map((r) => {
      const m = cr.meta.get(r.id);
      return {
        id: r.id,
        planRoundId: m?.planRoundId ?? null,
        sends: m?.sends ?? null,
        number: r.number,
        name: r.name,
        kind: r.kind,
        format: m?.format ?? r.format ?? null,
        required: r.required,
        skipped: r.skipped,
        manual: m?.manual ?? false,
        held: m?.held ?? false,
        durationMin: m?.durationMin ?? null,
        state: r.state,
        seg: segmentOf(r.state),
        stateLabel: roundStateLabel(r.state, r.kind),
        nextStep: r.nextStep,
        decidedAt: m?.decidedAt ?? null,
        decidedBy: nameOf(m?.decidedById ?? null),
        result: m?.latest ?? null,
        pending: r.state === "scheduled" || r.state === "in_progress" ? (m?.pending ?? null) : null,
      };
    }),
  };
}

/** Names for the members who moved people on, for summarizeRounds. */
export async function deciderNames(rounds: Iterable<CandidateRounds>): Promise<(id: string | null) => string | null> {
  const ids = new Set<string>();
  for (const cr of rounds) for (const m of cr.meta.values()) if (m.decidedById) ids.add(m.decidedById);
  if (!ids.size) return () => null;
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true, email: true } });
  const map = new Map(users.map((u) => [u.id, u.name || u.email || null]));
  return (id) => (id ? (map.get(id) ?? null) : null);
}

export type NextRoundDue = {
  candidateId: string;
  name: string;
  planName: string | null;
  round: { id: string; name: string; number: number | null; format: string | null };
  total: number;
  /** The round they were moved on from, who moved them and when. */
  from: { name: string; by: string | null; at: string | null } | null;
};

/**
 * People a recruiter moved on whose next round is a live interview that is
 * not booked yet: the Interviews tab's "Next round due" list. Oldest move
 * first, so nobody waits longest unseen.
 */
export async function loadNextRoundDue(workspaceId: string, workspaceSlug: string): Promise<NextRoundDue[]> {
  const candidates = await prisma.candidate.findMany({
    where: { workspaceId, stage: { in: ["NEW", "SCREENING"] }, status: { not: "archived" }, rounds: { some: { nextStep: "advance" } } },
    select: { id: true, name: true, stage: true },
    take: 500,
  });
  if (!candidates.length) return [];
  const rounds = await loadCandidateRounds(workspaceId, workspaceSlug, candidates.map((c) => c.id), new Map(candidates.map((c) => [c.id, c.stage])));
  const due: (NextRoundDue & { fromById: string | null })[] = [];
  for (const c of candidates) {
    const cr = rounds.get(c.id);
    if (!cr || cr.progress.stoppedAt) continue;
    // The latest move on whose next round is a live interview nobody has booked. An earlier
    // round still running (a take-home out) does not hold this one back.
    let prev: PlanRound | null = null;
    let cur: PlanRound | null = null;
    for (const r of cr.progress.rounds) {
      if (r.nextStep !== "advance") continue;
      const next = roundAfter(cr.progress, r.id);
      if (next && next.kind === "interview" && next.state === "not_started") {
        prev = r;
        cur = next;
      }
    }
    if (!prev || !cur) continue;
    const pm = cr.meta.get(prev.id);
    due.push({
      candidateId: c.id,
      name: c.name,
      planName: cr.planName,
      round: { id: cur.id, name: cur.name, number: cur.number, format: cr.meta.get(cur.id)?.format ?? null },
      total: cr.progress.total,
      from: { name: prev.name, by: null, at: pm?.decidedAt ?? null },
      fromById: pm?.decidedById ?? null,
    });
  }
  const ids = [...new Set(due.flatMap((d) => (d.fromById ? [d.fromById] : [])))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name || u.email || null]));
  return due
    .sort((a, b) => (a.from?.at ?? "").localeCompare(b.from?.at ?? ""))
    .map(({ fromById, ...d }) => ({ ...d, from: d.from ? { ...d.from, by: fromById ? (nameOf.get(fromById) ?? null) : null } : null }));
}
