/**
 * Seed script for prompt scenarios.
 *
 * Run with: npx tsx prisma/seed-prompt-scenarios.ts
 *
 * Idempotent: uses upsert by slug.
 */
import { PrismaClient } from "@prisma/client";
import { BUILTIN_SCENARIOS } from "../src/lib/prompt-challenges/prompt-scenarios";

const prisma = new PrismaClient();

async function main() {
  // Clean up existing built-in scenarios to keep standard platform standardized lists fresh
  await prisma.promptScenario.deleteMany({
    where: { workspaceId: null }
  });
  console.log("Cleared existing built-in prompt scenarios.");

  for (const s of BUILTIN_SCENARIOS) {
    await prisma.promptScenario.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        objective: s.objective,
        expectedTraits: JSON.stringify(s.expectedTraits),
        difficulty: s.difficulty,
        category: s.category,
        estimatedMinutes: s.estimatedMinutes,
        rubricWeights: JSON.stringify(s.rubricWeights),
        published: true,
        workspaceId: null,
      },
      update: {
        title: s.title,
        description: s.description,
        objective: s.objective,
        expectedTraits: JSON.stringify(s.expectedTraits),
        difficulty: s.difficulty,
        category: s.category,
        estimatedMinutes: s.estimatedMinutes,
        rubricWeights: JSON.stringify(s.rubricWeights),
      },
    });
    console.log(`✓ ${s.slug}`);
  }
  console.log(`Seeded ${BUILTIN_SCENARIOS.length} prompt scenarios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
