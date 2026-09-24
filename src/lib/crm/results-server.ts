/**
 * Loads every assessment result for a set of candidates, in the normalised
 * shape from results.ts. Server-only.
 */
import { prisma } from "@/lib/prisma";
import {
  describeScore,
  rubricAverage,
  rubricToScore,
  type CandidateResult,
  type ResultState,
} from "@/lib/crm/results";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const minutes = (sec: number | null | undefined) => (sec && sec > 0 ? Math.max(1, Math.round(sec / 60)) : null);

/**
 * Results grouped by candidate id. Pass `candidateIds` to scope the query;
 * omit it to load the whole workspace (the list page does this once).
 */
export async function loadCandidateResults(
  workspaceId: string,
  workspaceSlug: string,
  candidateIds?: string[],
): Promise<Map<string, CandidateResult[]>> {
  const out = new Map<string, CandidateResult[]>();
  if (candidateIds && candidateIds.length === 0) return out;
  const candidateFilter = candidateIds ? { in: candidateIds } : { not: null };

  const [legacy, sessions, screenings] = await Promise.all([
    prisma.takeHomeAssignment.findMany({
      where: { workspaceId, candidateId: candidateFilter },
      select: {
        id: true,
        candidateId: true,
        status: true,
        token: true,
        timeLimitMin: true,
        expiresAt: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true,
        challenge: { select: { title: true } },
        attempt: { select: { id: true, score: true, durationSec: true } },
      },
    }),
    prisma.interviewSession.findMany({
      where: { workspaceId, candidateId: candidateFilter },
      select: {
        id: true,
        candidateId: true,
        type: true,
        title: true,
        status: true,
        shareToken: true,
        challengeIds: true,
        totalSec: true,
        deadlineAt: true,
        scheduledAt: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
        verdict: true,
        rubric: { select: { ratings: true } },
      },
    }),
    prisma.aIInterviewSession.findMany({
      where: { workspaceId, practice: false, candidateId: candidateFilter },
      select: {
        id: true,
        candidateId: true,
        positionTitle: true,
        status: true,
        score: true,
        timeSpentSec: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const takeHomeSessionIds = sessions.filter((s) => s.type === "take-home").map((s) => s.id);
  const attempts = takeHomeSessionIds.length
    ? await prisma.challengeAttempt.findMany({
        where: { sessionId: { in: takeHomeSessionIds }, status: { in: ["passed", "failed"] } },
        select: { sessionId: true, challengeId: true, score: true, durationSec: true, finishedAt: true, startedAt: true },
        orderBy: { startedAt: "asc" },
      })
    : [];
  // Latest finished attempt per (session, challenge) wins, as on the review page.
  const attemptsBySession = new Map<string, Map<string, (typeof attempts)[number]>>();
  for (const a of attempts) {
    if (!a.sessionId) continue;
    const m = attemptsBySession.get(a.sessionId) ?? new Map();
    m.set(a.challengeId, a);
    attemptsBySession.set(a.sessionId, m);
  }

  const push = (r: CandidateResult) => {
    const list = out.get(r.candidateId) ?? [];
    list.push(r);
    out.set(r.candidateId, list);
  };

  for (const th of legacy) {
    if (!th.candidateId) continue;
    const score = th.attempt?.score ?? null;
    const state: ResultState =
      score != null
        ? "scored"
        : th.status === "SUBMITTED"
          ? "submitted"
          : th.status === "EXPIRED" || (th.status === "PENDING" && th.expiresAt < new Date())
            ? "expired"
            : th.status === "ACTIVE" || th.status === "STARTED" || th.startedAt
              ? "in_progress"
              : "invited";
    push({
      id: th.id,
      candidateId: th.candidateId,
      kind: "take_home",
      title: th.challenge.title,
      state,
      score,
      rating: null,
      ...(score != null ? describeScore("take_home", score) : { verdict: null, passed: null }),
      sentAt: th.createdAt.toISOString(),
      startedAt: iso(th.startedAt),
      finishedAt: iso(th.submittedAt),
      deadlineAt: th.expiresAt.toISOString(),
      scheduledAt: null,
      minutesTaken:
        minutes(th.attempt?.durationSec) ??
        (th.startedAt && th.submittedAt ? minutes((th.submittedAt.getTime() - th.startedAt.getTime()) / 1000) : null),
      minutesAllowed: th.timeLimitMin,
      href: th.attempt ? `/w/${workspaceSlug}/attempts/${th.attempt.id}` : null,
    });
  }

  for (const s of sessions) {
    if (!s.candidateId) continue;
    if (s.type === "take-home") {
      let challengeIds: string[] = [];
      try {
        const parsed = JSON.parse(s.challengeIds || "[]");
        if (Array.isArray(parsed)) challengeIds = parsed.filter((x): x is string => typeof x === "string");
      } catch {
        /* treat as no challenges */
      }
      const byChallenge = attemptsBySession.get(s.id);
      const scored = challengeIds
        .map((cid) => byChallenge?.get(cid))
        .filter((a): a is NonNullable<typeof a> => !!a && a.score != null);
      const score = scored.length
        ? Math.round(scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length)
        : null;
      const taken = byChallenge
        ? [...byChallenge.values()].reduce((sum, a) => sum + (a.durationSec ?? 0), 0)
        : 0;
      const finished = s.status === "completed";
      const state: ResultState =
        score != null && finished
          ? "scored"
          : finished
            ? "submitted"
            : s.status === "expired" || s.status === "abandoned" || (s.status === "scheduled" && s.deadlineAt && s.deadlineAt < new Date())
              ? "expired"
              : s.status === "in_progress"
                ? "in_progress"
                : "invited";
      push({
        id: s.id,
        candidateId: s.candidateId,
        kind: "take_home",
        title: s.title,
        state,
        score: finished ? score : null,
        rating: null,
        ...(finished && score != null ? describeScore("take_home", score) : { verdict: null, passed: null }),
        sentAt: s.createdAt.toISOString(),
        startedAt: iso(s.startedAt),
        finishedAt: iso(s.finishedAt),
        deadlineAt: iso(s.deadlineAt),
        scheduledAt: null,
        minutesTaken: minutes(taken),
        minutesAllowed: minutes(s.totalSec),
        href: `/w/${workspaceSlug}/take-homes/${s.id}`,
      });
      continue;
    }

    // Live interviews. A rubric makes it scored; finished without one is
    // waiting on feedback.
    const rating = rubricAverage(s.rubric?.ratings);
    const score = rating != null ? rubricToScore(rating) : null;
    const state: ResultState =
      score != null
        ? "scored"
        : s.status === "completed" || s.status === "finished" || s.finishedAt
          ? "submitted"
          : s.status === "abandoned" || s.status === "expired"
            ? "expired"
            : s.status === "in_progress" || s.startedAt
              ? "in_progress"
              : "invited";
    push({
      id: s.id,
      candidateId: s.candidateId,
      kind: "interview",
      title: s.title,
      state,
      score,
      rating,
      ...(score != null ? describeScore("interview", score, rating) : { verdict: null, passed: null }),
      sentAt: s.createdAt.toISOString(),
      startedAt: iso(s.startedAt),
      finishedAt: iso(s.finishedAt),
      deadlineAt: null,
      scheduledAt: iso(s.scheduledAt),
      minutesTaken:
        s.startedAt && s.finishedAt ? minutes((s.finishedAt.getTime() - s.startedAt.getTime()) / 1000) : null,
      minutesAllowed: minutes(s.totalSec),
      href: `/interview/${s.shareToken}`,
    });
  }

  for (const a of screenings) {
    if (!a.candidateId) continue;
    const done = a.status === "COMPLETED" || !!a.finishedAt;
    const score = done ? a.score : null;
    const state: ResultState =
      score != null
        ? "scored"
        : done
          ? "submitted"
          : a.status === "EXPIRED"
            ? "expired"
            : a.startedAt
              ? "in_progress"
              : "invited";
    push({
      id: a.id,
      candidateId: a.candidateId,
      kind: "ai_screening",
      title: a.positionTitle,
      state,
      score,
      rating: null,
      ...(score != null ? describeScore("ai_screening", score) : { verdict: null, passed: null }),
      sentAt: a.createdAt.toISOString(),
      startedAt: iso(a.startedAt),
      finishedAt: iso(a.finishedAt),
      deadlineAt: null,
      scheduledAt: null,
      minutesTaken: minutes(a.timeSpentSec),
      minutesAllowed: null,
      href: `/w/${workspaceSlug}/ai-interviews?candidate=${a.candidateId}`,
    });
  }

  return out;
}
