/**
 * Augment JavaScript (technology='javascript') questions with a gold-standard
 * markdown answer (inline SVG diagrams + GFM tables + the §7 interview card)
 * and runnable code examples, from prisma/data/js-augments-ultra*.ts.
 *
 * Matches by exact title + technology='javascript'. Idempotent (sets fields).
 * Separate from the older augment-js-examples.ts pipeline (js-augments*.json),
 * which this project supersedes question-by-question.
 *
 *   npm run augment:js-ultra     (or: npx tsx prisma/augment-js-ultra.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { JsAugment } from "./data/js-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<JsAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^js-augments-ultra.*\.ts$/.test(f))
    .sort();

  const all: JsAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as JsAugment[];
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
        ...(a.description ? { description: a.description } : {}),
        ...(a.seoDescription ? { seoDescription: a.seoDescription } : {}),
        ...(a.examples ? { examplesData: JSON.stringify(a.examples) } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated}/${items.length} JavaScript questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
