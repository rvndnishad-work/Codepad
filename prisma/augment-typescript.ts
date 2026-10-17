/**
 * Augment TypeScript (technology='typescript') questions from
 * prisma/data/typescript-augments-ultra-NN.ts: Question Body, tutorial answer,
 * interview card and examples verified by scripts/verify-ts-examples.ts.
 * Examples run in the page (TypeScript 5.4.5 transpile in a worker).
 * Matches by exact title + technology='typescript'. Idempotent (sets fields).
 *
 *   npm run augment:ts     (or: npx tsx prisma/augment-typescript.ts)
 */
import { PrismaClient } from "@prisma/client";
import { applyUltra, loadUltra } from "./lib/apply-ultra";

const prisma = new PrismaClient();

async function main() {
  const ultra = await loadUltra("typescript");
  const { updated, notFound } = await applyUltra(prisma, "typescript", ultra, (ex) => ({ ...ex, tech: "typescript" }));
  console.log(`Augmented ${updated}/${ultra.length} TypeScript questions.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
