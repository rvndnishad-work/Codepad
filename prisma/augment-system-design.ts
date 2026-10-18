/**
 * Augment system-design (technology='system-design') questions with a detailed
 * markdown answer (inline SVG diagrams + comparison tables) and multi-variant
 * code examples, from prisma/data/system-design-augments*.ts.
 *
 * Matches by exact title + technology='system-design'. Idempotent (sets fields).
 *
 *   npm run augment:sd     (or: npx tsx prisma/augment-system-design.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { applyUltra, isUltraFile, loadUltra } from "./lib/apply-ultra";
import type { SystemDesignAugment } from "./data/system-design-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<SystemDesignAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^system-design-augments.*\.ts$/.test(f) && !isUltraFile(f))
    .sort();

  const all: SystemDesignAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as SystemDesignAugment[];
    if (Array.isArray(arr)) all.push(...arr);
  }
  return all;
}

async function main() {
  const ultra = await loadUltra("system-design");
  const ultraTitles = new Set(ultra.map((u) => u.title));
  const items = (await loadAugments()).filter((a) => !ultraTitles.has(a.title));

  let updated = 0;
  const notFound: string[] = [];

  for (const a of items) {
    const q = await prisma.prepQuestion.findFirst({
      where: { title: a.title, technology: "system-design" },
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

  const u = await applyUltra(prisma, "system-design", ultra, (ex) => ex);
  updated += u.updated;
  notFound.push(...u.notFound);
  console.log(`Applied ${u.updated} system-design answers with the full treatment.`);
  console.log(`Augmented ${updated}/${items.length + ultra.length} system-design questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
