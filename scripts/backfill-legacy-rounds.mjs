/**
 * Backfill a single scaffold round for legacy AI screening sessions created
 * before the batch/round model (batchId null AND no AIInterviewRound rows).
 *
 * This makes the data uniform so the runtime no longer has to synthesize a
 * round on the fly. It is SAFE to run repeatedly (skips sessions that already
 * have rounds) and is NOT required for correctness — `resolveSessionRounds`
 * still synthesizes a round for any session that lacks one, so the adapter
 * stays as a fallback even after this runs.
 *
 * The round is created as sourceKind "scaffold" pointing at the session's
 * templateId. Its `paradigm` is left "frontend" as a hint only — for scaffold
 * rounds the authoritative surface kind comes from resolving the template, not
 * this column (see src/lib/ai-interview/round-content.ts).
 *
 * Run:  node --env-file=.env scripts/backfill-legacy-rounds.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.aIInterviewSession.findMany({
    where: { batchId: null, rounds: { none: {} } },
    select: {
      id: true,
      templateId: true,
      filesJson: true,
      status: true,
      score: true,
      ratings: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  console.log(`Found ${legacy.length} legacy session(s) without rounds.`);
  let created = 0;
  for (const s of legacy) {
    await prisma.aIInterviewRound.create({
      data: {
        sessionId: s.id,
        order: 0,
        paradigm: "frontend",
        sourceKind: "scaffold",
        templateId: s.templateId,
        estimatedMinutes: 30,
        filesJson: s.filesJson || "{}",
        status: s.status === "COMPLETED" ? "COMPLETED" : s.status === "ACTIVE" ? "ACTIVE" : "PENDING",
        score: s.score ?? null,
        ratings: s.ratings ?? null,
        startedAt: s.startedAt ?? null,
        finishedAt: s.finishedAt ?? null,
      },
    });
    created++;
  }
  console.log(`Backfilled ${created} round(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
