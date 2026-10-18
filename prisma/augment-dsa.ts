/**
 * Augment DSA (technology='dsa') questions from prisma/data/dsa-augments*.ts.
 *
 *  - dsa-augments-<n>.ts       legacy single answer + multi-language variants
 *  - dsa-augments-ultra-NN.ts  one complete answer per language (Python,
 *                              JavaScript, Java, C++): the page shows a
 *                              language selector that swaps the question body,
 *                              the answer and the runnable code together.
 *
 * Ultra files load last, so they win over a legacy entry for the same title.
 * Matches by exact title + technology='dsa'. Idempotent.
 *
 *   npm run augment:dsa      (or: npx tsx prisma/augment-dsa.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { DSA_LANGUAGES, type DsaAugment, type DsaUltraAugment } from "./data/dsa-augments.types";

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
  const legacy = await load<DsaAugment>(/^dsa-augments-\d+\.ts$/);
  const ultra = await load<DsaUltraAugment>(/^dsa-augments-ultra-\d+\.ts$/);
  const ultraTitles = new Set(ultra.map((u) => u.title));

  let updated = 0;
  const notFound: string[] = [];
  const find = (title: string) =>
    prisma.prepQuestion.findFirst({ where: { title, technology: "dsa" }, select: { id: true } });

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
    const languages = Object.fromEntries(
      DSA_LANGUAGES.filter((l) => a.languages[l]).map((l) => [
        l,
        { ...a.languages[l], examples: a.languages[l].examples.map((e) => ({ ...e, tech: l })) },
      ]),
    );
    // The first language is also stored on the plain fields, for SSR, SEO and
    // anything that reads a question without the selector.
    const def = languages[DSA_LANGUAGES.find((l) => languages[l])!];
    await prisma.prepQuestion.update({
      where: { id: q.id },
      data: {
        answer: def.answer,
        description: def.description,
        examplesData: JSON.stringify(def.examples),
        frameworksData: JSON.stringify(languages),
        ...(a.seoDescription ? { seoDescription: a.seoDescription } : {}),
        ...(a.difficulty ? { difficulty: a.difficulty } : {}),
      },
    });
    updated++;
  }

  console.log(`Augmented ${updated}/${legacy.filter((a) => !ultraTitles.has(a.title)).length + ultra.length} DSA questions (${ultra.length} with per-language answers).`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
