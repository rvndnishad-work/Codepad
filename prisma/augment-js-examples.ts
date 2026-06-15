/**
 * Augment JavaScript questions with a richer (interview-depth) answer and one
 * or more runnable code examples, from prisma/data/js-augments.json.
 * Matches by exact title + technology='javascript'. Idempotent (sets fields).
 *
 *   npx tsx prisma/augment-js-examples.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type Augment = {
  title: string;
  answer?: string;
  examples?: { label?: string; code: string; runnable?: boolean }[];
};

async function main() {
  // Read every prisma/data/js-augments*.json file (split into batches).
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^js-augments.*\.json$/.test(f)).sort();
  const items: Augment[] = files.flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

  let updated = 0;
  const notFound: string[] = [];

  for (const a of items) {
    const q = await prisma.prepQuestion.findFirst({
      where: { title: a.title, technology: "javascript" },
      select: { id: true },
    });
    if (!q) {
      notFound.push(a.title);
      continue;
    }
    await prisma.prepQuestion.update({
      where: { id: q.id },
      data: {
        ...(a.answer ? { answer: a.answer } : {}),
        ...(a.examples ? { examplesData: JSON.stringify(a.examples) } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated} JavaScript questions with examples/details.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound.slice(0, 20));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
