/**
 * Augment practical JS coding questions (technology='javascript-coding')
 * with a gold-standard, thought-process-first markdown answer (inline SVG
 * diagrams + GFM tables + the §7 interview card, reframed as a coding
 * process) and runnable code examples, from
 * prisma/data/js-coding-augments-*.ts.
 *
 * Matches by exact title + technology='javascript-coding'. Idempotent
 * (sets fields). Mirrors augment-js-ultra.ts's pipeline exactly.
 *
 *   npm run augment:js-coding     (or: npx tsx prisma/augment-js-coding.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { JsCodingAugment } from "./data/js-coding-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<JsCodingAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^js-coding-augments-\d+\.ts$/.test(f))
    .sort();

  const all: JsCodingAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as JsCodingAugment[];
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
      where: { title: a.title, technology: "javascript-coding" },
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
        ...(a.description ? { description: a.description } : {}),
        ...(a.seoDescription ? { seoDescription: a.seoDescription } : {}),
        ...(a.examples ? { examplesData: JSON.stringify(a.examples) } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated}/${items.length} javascript-coding questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
