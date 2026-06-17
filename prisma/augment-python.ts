/**
 * Augment Python (technology='python') questions with a detailed markdown
 * answer (GFM tables + "Interview tip") and runnable Python code examples, from
 * prisma/data/python-augments*.ts.
 *
 * Each example's "Run Playground" hands off to /play?template=python and
 * executes on the Piston backend. Matches by exact title + technology='python'.
 * Idempotent (sets fields).
 *
 *   npm run augment:py     (or: npx tsx prisma/augment-python.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { PythonAugment } from "./data/python-augments.types";

const prisma = new PrismaClient();

async function loadAugments(): Promise<PythonAugment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^python-augments.*\.ts$/.test(f))
    .sort();

  const all: PythonAugment[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as PythonAugment[];
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
      where: { title: a.title, technology: "python" },
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

  console.log(`Augmented ${updated}/${items.length} Python questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
