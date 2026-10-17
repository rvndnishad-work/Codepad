/**
 * Augment Python (technology='python') questions from prisma/data:
 *
 *  - python-augments-<n>.ts       legacy answer + runnable examples
 *  - python-augments-ultra-NN.ts  the full treatment: Question Body, tutorial
 *                                 answer, interview card and verified examples
 *
 * Ultra entries win over a legacy entry for the same title. Examples run in
 * the page (Pyodide); "Run Playground" hands off to /play?template=python.
 * Matches by exact title + technology='python'. Idempotent (sets fields).
 *
 *   npm run augment:py     (or: npx tsx prisma/augment-python.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { PythonAugment, PythonUltraAugment } from "./data/python-augments.types";

const prisma = new PrismaClient();

async function load<T>(pattern: RegExp): Promise<T[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => pattern.test(f)).sort();
  const all: T[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const arr = (mod.default ?? mod.augments) as T[];
    if (Array.isArray(arr)) all.push(...arr);
  }
  return all;
}

async function main() {
  const legacy = await load<PythonAugment>(/^python-augments-\d+\.ts$/);
  const ultra = await load<PythonUltraAugment>(/^python-augments-ultra-\d+\.ts$/);
  const ultraTitles = new Set(ultra.map((u) => u.title));

  let updated = 0;
  const notFound: string[] = [];
  const find = (title: string) =>
    prisma.prepQuestion.findFirst({ where: { title, technology: "python" }, select: { id: true } });

  for (const a of legacy) {
    if (ultraTitles.has(a.title)) continue;
    const q = await find(a.title);
    if (!q) { notFound.push(a.title); continue; }
    await prisma.prepQuestion.update({
      where: { id: q.id },
      data: {
        ...(a.answer ? { answer: a.answer } : {}),
        ...(a.examples ? { examplesData: JSON.stringify(a.examples) } : {}),
      },
    });
    updated++;
  }

  for (const a of ultra) {
    const q = await find(a.title);
    if (!q) { notFound.push(a.title); continue; }
    await prisma.prepQuestion.update({
      where: { id: q.id },
      data: {
        answer: a.answer,
        description: a.description,
        seoDescription: a.seoDescription,
        examplesData: JSON.stringify(a.examples.map(({ python: _v, ...e }) => ({ ...e, tech: "python" }))),
        ...(a.difficulty ? { difficulty: a.difficulty } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated} Python questions (${ultra.length} with the full treatment).`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
