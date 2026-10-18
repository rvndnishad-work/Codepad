/**
 * Augment Vue (technology='vuejs') questions with a detailed markdown answer
 * (optional inline SVG diagrams + GFM tables), the Question Body, an SEO
 * description, code examples and, where set, a corrected difficulty, from
 * prisma/data/vue-augments*.ts (loaded in name order).
 *
 * Matches by exact title + technology='vuejs'. Idempotent (sets fields).
 *
 *   npm run augment:vue     (or: npx tsx prisma/augment-vue.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { VueAugment } from "./data/vue-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<VueAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^vue-augments-.*\.ts$/.test(f))
    .sort();

  const all: VueAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as VueAugment[];
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
      where: { title: a.title, technology: "vuejs" },
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
        ...(a.difficulty ? { difficulty: a.difficulty } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated}/${items.length} Vue questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
