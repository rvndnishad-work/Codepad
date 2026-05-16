/**
 * Stage 1 backfill: ensure every Challenge has a ChallengeStep (position 0)
 * copying its starterFiles/testFiles/template/estimatedMinutes, and attach
 * existing ChallengeAttempt rows to that step.
 *
 * Run with: npx tsx prisma/migrate-challenges-to-steps.ts
 *
 * Idempotent: re-running creates no new rows once each Challenge has a
 * step. Safe to invoke after every schema change.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const challenges = await prisma.challenge.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      template: true,
      starterFiles: true,
      testFiles: true,
      estimatedMinutes: true,
      steps: { select: { id: true, position: true }, orderBy: { position: "asc" } },
    },
  });

  let createdSteps = 0;
  let alreadyHadStep = 0;
  let updatedAttempts = 0;

  for (const c of challenges) {
    let step0Id: string;

    if (c.steps.length === 0) {
      const step = await prisma.challengeStep.create({
        data: {
          challengeId: c.id,
          position: 0,
          // Step description defaults to the parent's full description.
          // Authors can refine per-step later.
          description: c.description,
          template: c.template,
          starterFiles: c.starterFiles,
          testFiles: c.testFiles,
          estimatedMinutes: c.estimatedMinutes,
        },
      });
      step0Id = step.id;
      createdSteps += 1;
      console.log(`  + step for "${c.title}" (${c.id})`);
    } else {
      step0Id = c.steps[0].id;
      alreadyHadStep += 1;
    }

    // Attach orphan attempts (stepId IS NULL) for this challenge to its
    // first step. Multi-step migrations in Stage 2 will refine this for
    // attempts that arrived from a track context.
    const result = await prisma.challengeAttempt.updateMany({
      where: { challengeId: c.id, stepId: null },
      data: { stepId: step0Id },
    });
    updatedAttempts += result.count;
  }

  console.log(
    `\nDone. createdSteps=${createdSteps} alreadyHadStep=${alreadyHadStep} updatedAttempts=${updatedAttempts}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
