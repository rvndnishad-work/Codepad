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
import { applyUltra, isUltraFile, loadUltra } from "./lib/apply-ultra";
import type { AiAugment } from "./data/ai-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<AiAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^ai-augments.*\.ts$/.test(f) && !f.includes("types") && !isUltraFile(f))
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
  const ultra = await loadUltra("ai");
  const ultraTitles = new Set(ultra.map((u) => u.title));
  const items = (await loadAugments()).filter((a) => !ultraTitles.has(a.title));

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

  const u = await applyUltra(prisma, "ai-engineering", ultra, (ex) => ex);
  updated += u.updated;
  notFound.push(...u.notFound);
  console.log(`Applied ${u.updated} AI Engineering answers with the full treatment.`);
  console.log(`Augmented ${updated}/${items.length + ultra.length} AI Engineering questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
