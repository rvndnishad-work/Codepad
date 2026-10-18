/**
 * Applies the "ultra" files of one section: prisma/data/<prefix>-augments-ultra-NN.ts.
 * Each entry carries the full treatment (Question Body, tutorial answer,
 * interview card, verified examples), so it sets every field it has.
 * Matches by exact title + technology. Idempotent.
 *
 * The section loaders call loadUltra() first and skip their legacy entries
 * for those titles, then applyUltra(), so an ultra entry always wins.
 */
import type { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

export type UltraEntry = {
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  seoDescription?: string;
  description?: string;
  answer?: string;
  examples?: Record<string, unknown>[];
};

export async function loadUltra(prefix: string): Promise<UltraEntry[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const pattern = new RegExp(`^${prefix}-augments-ultra-\\d+\\.ts$`);
  const all: UltraEntry[] = [];
  for (const f of readdirSync(dir).filter((f) => pattern.test(f)).sort()) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    if (Array.isArray(mod.default)) all.push(...mod.default);
  }
  return all;
}

export const isUltraFile = (f: string) => /-augments-ultra-\d+\.ts$/.test(f);

/** `example` maps one stored example (e.g. to set its `tech` and drop verifier-only fields). */
export async function applyUltra(
  prisma: PrismaClient,
  technology: string,
  entries: UltraEntry[],
  example: (ex: Record<string, unknown>) => Record<string, unknown> = (ex) => ex,
): Promise<{ updated: number; notFound: string[] }> {
  let updated = 0;
  const notFound: string[] = [];
  for (const a of entries) {
    const q = await prisma.prepQuestion.findFirst({ where: { title: a.title, technology }, select: { id: true } });
    if (!q) { notFound.push(a.title); continue; }
    await prisma.prepQuestion.update({
      where: { id: q.id },
      data: {
        ...(a.answer ? { answer: a.answer } : {}),
        ...(a.description ? { description: a.description } : {}),
        ...(a.seoDescription ? { seoDescription: a.seoDescription } : {}),
        ...(a.examples ? { examplesData: JSON.stringify(a.examples.map(example)) } : {}),
        ...(a.difficulty ? { difficulty: a.difficulty } : {}),
      },
    });
    updated++;
  }
  return { updated, notFound };
}
