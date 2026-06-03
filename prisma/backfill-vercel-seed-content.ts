/**
 * Backfill real starter content onto the already-seeded Vercel demo challenges
 * (and their position-0 steps) WITHOUT re-seeding — so existing take-home
 * tokens / interview sessions keep working but now show runnable code instead
 * of the "// starter code" placeholder.
 *
 * Run with: npx tsx prisma/backfill-vercel-seed-content.ts
 *
 * Idempotent: re-running just re-applies the same content.
 */
import { PrismaClient } from "@prisma/client";
import { VERCEL_SEED_CHALLENGES } from "./seed-data/vercel-challenges";

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  let stepsUpdated = 0;
  let missing = 0;

  for (const c of VERCEL_SEED_CHALLENGES) {
    const challenge = await prisma.challenge.findUnique({
      where: { slug: c.slug },
      select: { id: true },
    });
    if (!challenge) {
      console.log(`  ! missing challenge ${c.slug} — skipping (run the seed first)`);
      missing += 1;
      continue;
    }

    const starterFiles = JSON.stringify(c.starterFiles);
    const testFiles = JSON.stringify(c.testFiles);

    await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        template: c.template,
        category: c.category,
        estimatedMinutes: c.estimatedMinutes,
        tags: JSON.stringify(c.tags),
        starterFiles,
        testFiles,
      },
    });
    updated += 1;

    // Keep the position-0 step (the canonical read path) in sync.
    const res = await prisma.challengeStep.updateMany({
      where: { challengeId: challenge.id, position: 0 },
      data: {
        description: c.description,
        template: c.template,
        estimatedMinutes: c.estimatedMinutes,
        starterFiles,
        testFiles,
      },
    });
    stepsUpdated += res.count;
    console.log(`  ✓ ${c.slug} (${c.template}) — challenge + ${res.count} step(s)`);
  }

  console.log(`\nDone. challengesUpdated=${updated} stepsUpdated=${stepsUpdated} missing=${missing}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
