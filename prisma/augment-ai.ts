/**
 * Augment AI Engineering (technology='ai-engineering') questions with a
 * detailed markdown answer (optional inline SVG diagrams + GFM tables) and
 * code examples, from prisma/data/ai-augments*.ts.
 *
 * Matches by exact title + technology='ai-engineering'. Idempotent (sets fields).
 *
 *   npm run augment:ai     (or: npx tsx prisma/augment-ai.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { AiAugment } from "./data/ai-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<AiAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^ai-augments.*\.ts$/.test(f) && !f.includes("types"))
    .sort();

  const all: AiAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as AiAugment[];
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
      where: { title: a.title, technology: "ai-engineering" },
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

  console.log(`Augmented ${updated}/${items.length} AI Engineering questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
