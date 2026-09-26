/**
 * Collect the samples behind a question's usage stats from results the
 * workspace already has. Server-only.
 *
 * - Bank questions (and bank variants) are asked in AI screening theory
 *   rounds. Each asked question has its own grade (0 to 5) and time.
 * - Coding challenges show up in AI screening rounds, take-homes and live
 *   interviews, each with a score and a time.
 * Outcomes come from the candidate's stage (Passed / Not passed).
 */
import { prisma } from "@/lib/prisma";
import { parseAnswers, parseTheoryRound } from "@/lib/ai-interview/theory";
import { computeQuestionStats, outcomeFromStage, secondsBetween, type QuestionSample, type QuestionStats } from "./question-stats";

/** Theory-round samples for questions whose `src` is `srcKey` (a bank slug, or `variant:<id>`). */
export async function theorySamples(workspaceId: string, srcKey: string): Promise<QuestionSample[]> {
  const needle = `"src":${JSON.stringify(srcKey)}`;
  const rounds = await prisma.aIInterviewRound.findMany({
    where: { paradigm: "theory", theoryJson: { contains: needle }, session: { workspaceId, practice: false } },
    select: { theoryJson: true, answersJson: true, session: { select: { candidate: { select: { stage: true } } } } },
    take: 2000,
  });
  const out: QuestionSample[] = [];
  for (const r of rounds) {
    const data = parseTheoryRound(r.theoryJson);
    if (!data) continue;
    const answers = parseAnswers(r.answersJson).items;
    const outcome = outcomeFromStage(r.session.candidate?.stage);
    data.items.forEach((item, i) => {
      if (item.src !== srcKey) return;
      const a = answers[i];
      // Not reached yet (or the answer list no longer lines up): not asked.
      if (!a || a.q.trim() !== item.q.trim()) return;
      const graded = a.grade && a.grade.verdict !== "unscored";
      out.push({ score: graded ? Math.round((a.grade!.score / 5) * 100) : null, seconds: a.seconds || null, outcome });
    });
  }
  return out;
}

/** Samples for a coding challenge across AI screening, take-homes and live interviews. */
export async function challengeSamples(workspaceId: string, challengeId: string): Promise<QuestionSample[]> {
  const [rounds, takeHomes, sessions] = await Promise.all([
    prisma.aIInterviewRound.findMany({
      where: { sourceKind: "challenge", sourceId: challengeId, startedAt: { not: null }, session: { workspaceId, practice: false } },
      select: { score: true, startedAt: true, finishedAt: true, session: { select: { candidate: { select: { stage: true } } } } },
      take: 2000,
    }),
    prisma.takeHomeAssignment.findMany({
      where: { challengeId, workspaceId, startedAt: { not: null } },
      select: {
        startedAt: true,
        submittedAt: true,
        candidate: { select: { stage: true } },
        attempt: { select: { score: true, durationSec: true } },
      },
      take: 2000,
    }),
    prisma.interviewSession.findMany({
      where: { workspaceId, challengeIds: { contains: JSON.stringify(challengeId) }, status: { in: ["in_progress", "completed"] } },
      select: { id: true, candidate: { select: { stage: true } } },
      take: 2000,
    }),
  ]);

  const samples: QuestionSample[] = [
    ...rounds.map((r) => ({
      score: r.score,
      seconds: secondsBetween(r.startedAt, r.finishedAt),
      outcome: outcomeFromStage(r.session.candidate?.stage),
    })),
    ...takeHomes.map((t) => ({
      score: t.attempt?.score ?? null,
      seconds: t.attempt?.durationSec || secondsBetween(t.startedAt, t.submittedAt),
      outcome: outcomeFromStage(t.candidate?.stage),
    })),
  ];

  if (sessions.length) {
    const attempts = await prisma.challengeAttempt.findMany({
      where: { challengeId, sessionId: { in: sessions.map((s) => s.id) } },
      select: { sessionId: true, score: true, durationSec: true },
    });
    // A live interview can hold several runs of the same challenge: keep the best.
    const best = new Map<string, { score: number | null; seconds: number | null }>();
    for (const a of attempts) {
      const prev = best.get(a.sessionId!);
      const score = a.score ?? null;
      best.set(a.sessionId!, {
        score: prev?.score == null ? score : score == null ? prev.score : Math.max(prev.score, score),
        seconds: Math.max(prev?.seconds ?? 0, a.durationSec ?? 0) || null,
      });
    }
    for (const s of sessions) {
      const b = best.get(s.id);
      samples.push({ score: b?.score ?? null, seconds: b?.seconds ?? null, outcome: outcomeFromStage(s.candidate?.stage) });
    }
  }
  return samples;
}

export type QuestionRef = { kind: "bank"; slug: string } | { kind: "variant"; id: string } | { kind: "challenge"; id: string };

export async function loadQuestionStats(workspaceId: string, ref: QuestionRef): Promise<QuestionStats> {
  const samples =
    ref.kind === "challenge"
      ? await challengeSamples(workspaceId, ref.id)
      : await theorySamples(workspaceId, ref.kind === "bank" ? ref.slug : `variant:${ref.id}`);
  return computeQuestionStats(samples);
}
