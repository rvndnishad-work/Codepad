import "server-only";
import { prisma } from "@/lib/prisma";
import {
  countedAttempts,
  decisionOf,
  integritySummary,
  legacyState,
  needsReview,
  parseIds,
  parseLimits,
  sessionState,
  takeHomeScore,
  DEFAULT_QUESTION_MINUTES,
  type Decision,
  type IntegrityLevel,
  type TakeHomeState,
} from "./status";

/** One take-home as the list, the review queue and the counts see it. */
export type TakeHomeRow = {
  id: string;
  /** "legacy" rows are the old single-challenge invites. */
  kind: "session" | "legacy";
  title: string;
  templateId: string | null;
  candidate: { id: string | null; name: string; email: string | null; stage: string | null };
  state: TakeHomeState;
  decision: Decision;
  needsReview: boolean;
  questions: number;
  answered: number;
  score: number | null;
  integrity: { level: IntegrityLevel; label: string };
  timeUsedMin: number | null;
  timeBudgetMin: number;
  sentAt: string;
  sentBy: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  /** Candidate link token; null once the take-home is closed. */
  token: string | null;
  linkPath: string | null;
};

const ATTEMPT_SELECT = {
  id: true,
  challengeId: true,
  status: true,
  score: true,
  durationSec: true,
  startedAt: true,
  finishedAt: true,
  integrityReport: { select: { suspicionScore: true, pasteCount: true, blurCount: true, totalBlurSec: true } },
} as const;

/**
 * Every take-home in a workspace, newest first, both models merged. The
 * list is filtered and paged in memory: a workspace holds hundreds of
 * take-homes at most, and the status (expired, decided) is computed, so a
 * database filter could not express it anyway.
 */
export async function loadTakeHomes(workspaceId: string, now: Date = new Date()): Promise<TakeHomeRow[]> {
  const [sessions, legacy] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { workspaceId, type: "take-home" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        title: true,
        status: true,
        candidateName: true,
        candidateAccessToken: true,
        challengeIds: true,
        playgroundIds: true,
        promptScenarioIds: true,
        questionTimeLimitsJson: true,
        deadlineAt: true,
        createdAt: true,
        finishedAt: true,
        takeHomeTemplateId: true,
        user: { select: { name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true, stage: true } },
      },
    }),
    prisma.takeHomeAssignment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        status: true,
        token: true,
        candidateName: true,
        candidateEmail: true,
        timeLimitMin: true,
        expiresAt: true,
        createdAt: true,
        submittedAt: true,
        challenge: { select: { title: true } },
        candidate: { select: { id: true, name: true, stage: true } },
        attempt: { select: ATTEMPT_SELECT },
      },
    }),
  ]);

  const attempts = sessions.length
    ? await prisma.challengeAttempt.findMany({
        where: { sessionId: { in: sessions.map((s) => s.id) } },
        select: { ...ATTEMPT_SELECT, sessionId: true },
      })
    : [];
  const bySession = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = bySession.get(a.sessionId!) ?? [];
    list.push(a);
    bySession.set(a.sessionId!, list);
  }

  const rows: TakeHomeRow[] = [];

  for (const s of sessions) {
    const challengeIds = parseIds(s.challengeIds);
    const others = parseIds(s.playgroundIds).length + parseIds(s.promptScenarioIds).length;
    const limits = parseLimits(s.questionTimeLimitsJson);
    const counted = countedAttempts(bySession.get(s.id) ?? [], challengeIds);
    const picked = challengeIds.map((id) => counted.get(id)).filter((a): a is NonNullable<typeof a> => !!a);
    const state = sessionState({ status: s.status, deadlineAt: s.deadlineAt, answered: picked.length }, now);
    const stage = s.candidate?.stage ?? null;
    const decision = decisionOf(stage);
    const used = picked.reduce((n, a) => n + (a.durationSec ?? 0), 0);
    const integrity = integritySummary(picked.map((a) => a.integrityReport));
    const open = state === "not_started" || state === "in_progress";
    rows.push({
      id: s.id,
      kind: "session",
      title: s.title,
      templateId: s.takeHomeTemplateId,
      candidate: {
        id: s.candidate?.id ?? null,
        name: s.candidate?.name ?? s.candidateName ?? "Unknown candidate",
        email: s.candidate?.email ?? null,
        stage,
      },
      state,
      decision,
      needsReview: needsReview(state, stage),
      questions: challengeIds.length + others,
      answered: picked.length,
      score: takeHomeScore(picked.map((a) => a.score)),
      integrity: { level: integrity.level, label: integrity.label },
      timeUsedMin: picked.length ? Math.round(used / 60) : null,
      timeBudgetMin: challengeIds.reduce((n, id) => n + (limits[id] ?? DEFAULT_QUESTION_MINUTES), 0),
      sentAt: s.createdAt.toISOString(),
      sentBy: s.user?.name ?? s.user?.email ?? null,
      deadlineAt: s.deadlineAt?.toISOString() ?? null,
      submittedAt: s.finishedAt?.toISOString() ?? null,
      token: open ? s.candidateAccessToken : null,
      linkPath: open && s.candidateAccessToken ? `/take-home/s/${s.candidateAccessToken}` : null,
    });
  }

  for (const a of legacy) {
    const state = legacyState({ status: a.status, expiresAt: a.expiresAt }, now);
    const stage = a.candidate?.stage ?? null;
    const decision = decisionOf(stage);
    const att = a.attempt && (a.attempt.status === "passed" || a.attempt.status === "failed") ? a.attempt : null;
    const integrity = integritySummary([att?.integrityReport]);
    const open = state === "not_started" || state === "in_progress";
    rows.push({
      id: a.id,
      kind: "legacy",
      title: a.challenge.title,
      templateId: null,
      candidate: { id: a.candidate?.id ?? null, name: a.candidate?.name ?? a.candidateName, email: a.candidateEmail, stage },
      state,
      decision,
      needsReview: needsReview(state, stage),
      questions: 1,
      answered: att ? 1 : 0,
      score: att?.score ?? null,
      integrity: { level: integrity.level, label: integrity.label },
      timeUsedMin: att?.durationSec != null ? Math.round(att.durationSec / 60) : null,
      timeBudgetMin: a.timeLimitMin,
      sentAt: a.createdAt.toISOString(),
      sentBy: null,
      deadlineAt: a.expiresAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      token: open ? a.token : null,
      linkPath: open ? `/take-home/${a.token}` : null,
    });
  }

  return rows.sort((x, y) => (x.sentAt < y.sentAt ? 1 : -1));
}

export type TakeHomeCounts = { review: number; all: number; notStarted: number; inProgress: number; expiringSoon: number };

export function countRows(rows: TakeHomeRow[], now: Date = new Date()): TakeHomeCounts {
  const soon = now.getTime() + 48 * 3_600_000;
  return {
    review: rows.filter((r) => r.needsReview).length,
    all: rows.length,
    notStarted: rows.filter((r) => r.state === "not_started").length,
    inProgress: rows.filter((r) => r.state === "in_progress").length,
    expiringSoon: rows.filter((r) => r.state === "not_started" && r.deadlineAt && new Date(r.deadlineAt).getTime() < soon).length,
  };
}
