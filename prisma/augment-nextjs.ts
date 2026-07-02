/**
 * Augment Next.js (technology='nextjs') questions with a detailed markdown
 * answer (optional inline SVG diagrams + GFM tables) and code examples, from
 * prisma/data/nextjs-augments*.ts.
 *
 * Matches by exact title + technology='nextjs'. Idempotent (sets fields).
 *
 *   npm run augment:next     (or: npx tsx prisma/augment-nextjs.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { NextAugment } from "./data/nextjs-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<NextAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^nextjs-augments.*\.ts$/.test(f))
    .sort();

  const all: NextAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as NextAugment[];
    if (Array.isArray(arr)) all.push(...arr);
  }
  return all;
}

async function main() {
  const items = await loadAugments();

  let updated = 0;
  const notFound: string[] = [];

  for (const a of items) {
    const q = await prisma.prepQuestion.findFirst({
      where: { title: a.title, technology: "nextjs" },
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

  console.log(`Augmented ${updated}/${items.length} Next.js questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
