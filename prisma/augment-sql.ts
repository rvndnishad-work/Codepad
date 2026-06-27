/**
 * Augment SQL (technology='sql') questions with detailed gold-standard answers
 * (GFM tables, theme-responsive SVG diagrams, and rich explanations) and runnable
 * SQL examples with schemas, from prisma/data/sql-augments*.ts.
 *
 * Matches by exact title + technology='sql'.
 * Idempotent (sets fields).
 *
 *   npm run augment:sql     (or: npx tsx prisma/augment-sql.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { SqlAugment } from "./data/sql-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<SqlAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^sql-augments.*\.ts$/.test(f))
    .sort();

  const all: SqlAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as SqlAugment[];
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
      where: { title: a.title, technology: "sql" },
      select: { id: true },
    });
    if (!q) {
      notFound.push(a.title);
      continue;
    }
    await prisma.prepQuestion.update({
      where: { id: q.id },
      data: {
        ...(a.description ? { description: a.description } : {}),
        ...(a.answer ? { answer: a.answer } : {}),
        ...(a.examples ? { examplesData: JSON.stringify(a.examples) } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated}/${items.length} SQL questions.`);
  if (notFound.length) {
    console.log(`No exact-title match for ${notFound.length}:`, notFound);
  }
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
