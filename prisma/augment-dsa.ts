/**
 * Augment DSA (technology='dsa') questions with a detailed markdown answer
 * (intuition + animated SVG + complexity table + dry run + interview tip) and
 * multi-language code examples (Python / JavaScript / Java / C++), from
 * prisma/data/dsa-augments*.ts.
 *
 * Matches by exact title + technology='dsa'. Idempotent (overwrites the
 * answer/examplesData fields for matched questions).
 *
 *   npm run augment:dsa      (or: npx tsx prisma/augment-dsa.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { DsaAugment } from "./data/dsa-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<DsaAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^dsa-augments.*\.ts$/.test(f) && !f.endsWith(".types.ts"))
    .sort();

  const all: DsaAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as DsaAugment[];
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
      where: { title: a.title, technology: "dsa" },
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

  console.log(`Augmented ${updated}/${items.length} DSA questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
