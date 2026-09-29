/**
 * Rebuild interview rounds for candidates who had interviews, take-homes or
 * AI interviews before interview plans existed (phase 1 of the interview
 * rounds plan).
 *
 * For each candidate with no CandidateRound rows yet: one round per item, in
 * date order, cancelled ones left out. Every round but the last is marked
 * "advance" (the candidate did go on); the last waits for a recruiter. The
 * sessions are linked to their new round through candidateRoundId. Nothing
 * about the candidate's stage or results changes.
 *
 * Dry run by default: prints what it would do. Safe to run again; candidates
 * that already have rounds are skipped.
 *
 *   npx tsx scripts/backfill-candidate-rounds.ts                 # dry run, all workspaces
 *   npx tsx scripts/backfill-candidate-rounds.ts --workspace=acme-hiring
 *   npx tsx scripts/backfill-candidate-rounds.ts --apply          # write
 *
 * Retired single-challenge take-homes (TakeHomeAssignment) have no round link
 * and are left out; the summary counts them.
 */
import { prisma } from "../src/lib/prisma";
import { loadCandidateResults } from "../src/lib/crm/results-server";
import { attemptFromResult, roundsFromHistory, type HistoryItem, type PlanRoundKind } from "../src/lib/interview/rounds";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const onlySlug = args.find((a) => a.startsWith("--workspace="))?.split("=")[1];

const KIND: Record<string, PlanRoundKind> = { take_home: "take_home", ai_screening: "ai_interview", interview: "interview" };

async function main() {
  const workspaces = await prisma.workspace.findMany({
    where: onlySlug ? { slug: onlySlug } : {},
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
  if (onlySlug && workspaces.length === 0) throw new Error(`No workspace with slug "${onlySlug}"`);

  const totals = { workspaces: 0, candidates: 0, rounds: 0, linkedSessions: 0, linkedAi: 0, legacySkipped: 0, alreadyHadRounds: 0 };
  const byKind: Record<PlanRoundKind, number> = { ai_interview: 0, take_home: 0, interview: 0 };

  for (const ws of workspaces) {
    const results = await loadCandidateResults(ws.id, ws.slug);
    if (results.size === 0) continue;

    const candidateIds = [...results.keys()];
    const [withRounds, sessions, aiSessions] = await Promise.all([
      prisma.candidateRound.findMany({ where: { candidateId: { in: candidateIds } }, select: { candidateId: true }, distinct: ["candidateId"] }),
      prisma.interviewSession.findMany({
        where: { workspaceId: ws.id, candidateId: { in: candidateIds } },
        select: { id: true, status: true, verdict: true, format: true, candidateRoundId: true },
      }),
      prisma.aIInterviewSession.findMany({
        where: { workspaceId: ws.id, candidateId: { in: candidateIds }, practice: false },
        select: { id: true, candidateRoundId: true },
      }),
    ]);
    const hasRounds = new Set(withRounds.map((r) => r.candidateId));
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const aiById = new Map(aiSessions.map((s) => [s.id, s]));

    let wsCandidates = 0;
    let wsRounds = 0;
    for (const [candidateId, list] of results) {
      if (hasRounds.has(candidateId)) {
        totals.alreadyHadRounds++;
        continue;
      }
      const items: HistoryItem[] = [];
      for (const r of list) {
        const session = sessionById.get(r.id);
        const isAi = r.kind === "ai_screening" && aiById.has(r.id);
        if (!session && !isAi) {
          totals.legacySkipped++;
          continue;
        }
        if (session?.candidateRoundId || (isAi && aiById.get(r.id)?.candidateRoundId)) continue;
        const attempt = attemptFromResult(r, session ? { status: session.status, verdict: session.verdict } : undefined);
        items.push({ key: r.id, kind: KIND[r.kind], format: session?.format ?? null, at: attempt.at ?? r.sentAt, attempt });
      }
      const rounds = roundsFromHistory(items);
      if (rounds.length === 0) continue;
      wsCandidates++;
      wsRounds += rounds.length;
      for (const r of rounds) byKind[r.kind]++;

      if (!apply) continue;
      await prisma.$transaction(async (tx) => {
        for (const r of rounds) {
          const row = await tx.candidateRound.create({
            data: { candidateId, order: r.order, kind: r.kind, name: r.name, format: r.format, nextStep: r.nextStep },
            select: { id: true },
          });
          if (r.kind === "ai_interview") {
            await tx.aIInterviewSession.update({ where: { id: r.key }, data: { candidateRoundId: row.id } });
            totals.linkedAi++;
          } else {
            await tx.interviewSession.update({ where: { id: r.key }, data: { candidateRoundId: row.id } });
            totals.linkedSessions++;
          }
        }
      });
    }
    if (wsCandidates) {
      totals.workspaces++;
      totals.candidates += wsCandidates;
      totals.rounds += wsRounds;
      console.log(`${ws.slug}: ${wsCandidates} candidates, ${wsRounds} rounds`);
    }
  }

  console.log("");
  console.log(apply ? "Applied." : "Dry run (nothing written). Add --apply to write.");
  console.log(`Workspaces: ${totals.workspaces}`);
  console.log(`Candidates given rounds: ${totals.candidates}`);
  console.log(`Rounds: ${totals.rounds} (AI interview ${byKind.ai_interview}, take-home ${byKind.take_home}, live ${byKind.interview})`);
  if (apply) console.log(`Linked: ${totals.linkedSessions} interviews and take-homes, ${totals.linkedAi} AI interviews`);
  console.log(`Skipped: ${totals.alreadyHadRounds} candidates already had rounds, ${totals.legacySkipped} retired take-home invites`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
