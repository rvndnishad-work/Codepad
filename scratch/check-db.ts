import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const scenariosCount = await prisma.promptScenario.count();
  const exemplarsCount = await prisma.promptExemplar.count();
  console.log(`Prompt Scenarios count: ${scenariosCount}`);
  console.log(`Prompt Exemplars count: ${exemplarsCount}`);

  if (scenariosCount > 0) {
    const scenarios = await prisma.promptScenario.findMany({
      select: { id: true, slug: true, title: true }
    });
    console.log("Scenarios:", scenarios);
  }

  if (exemplarsCount > 0) {
    const exemplars = await prisma.promptExemplar.findMany({
      select: { id: true, title: true, scenarioId: true }
    });
    console.log("Exemplars:", exemplars);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
