/**
 * Confirms what actually landed in the database for one ultra batch: every
 * title matched a row, and each row carries the answer, the Question Body,
 * a short seoDescription and at least one example.
 *
 * Usage: npx tsx scripts/db-check-node-ultra.mts node-augments-ultra-10.ts
 */
import path from "path";
import { pathToFileURL } from "url";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx scripts/db-check-node-ultra.mts <node-augments-ultra-NN.ts>");
  process.exit(1);
}

const mod: Record<string, unknown> = await import(
  pathToFileURL(path.resolve(process.cwd(), "prisma/data", file)).href
);
const unwrap = (v: unknown): unknown[] | null =>
  Array.isArray(v) ? v : v && typeof v === "object" ? unwrap((v as { default?: unknown }).default) : null;
const augments = (unwrap(mod) ?? unwrap(mod.default)) as { title: string }[] | null;
if (!augments) {
  console.error(`Could not find the augments array in ${file}`);
  process.exit(1);
}

const prisma = new PrismaClient();
const titles = augments.map((a) => a.title);
const rows = await prisma.prepQuestion.findMany({
  where: { title: { in: titles } },
  select: { slug: true, title: true, description: true, seoDescription: true, answer: true, examplesData: true },
});

let bad = 0;
for (const r of rows) {
  const a = r.answer ?? "";
  const problems: string[] = [];
  if (!a.includes("#1c140a")) problems.push("no amber card");
  if (!a.includes("iq-diagram")) problems.push("no diagram");
  if (!r.description) problems.push("no Question Body");
  if (!r.seoDescription) problems.push("no seoDescription");
  else if (r.seoDescription.length > 155) problems.push(`seoDescription ${r.seoDescription.length} chars`);
  const examples = r.examplesData ? (JSON.parse(r.examplesData) as unknown[]).length : 0;
  if (!examples) problems.push("no examples");
  if (problems.length) bad++;
  console.log(
    `${problems.length ? "✖" : "✔"} ${(a.length / 1024).toFixed(1)}KB  ` +
      `pin=${(a.match(/📌/g) ?? []).length} desc=${r.description?.length ?? 0} ` +
      `seo=${r.seoDescription?.length ?? 0} ex=${examples}  ${r.slug}`,
  );
  for (const p of problems) console.log(`     - ${p}`);
}

const missing = titles.filter((t) => !rows.some((r) => r.title === t));
for (const t of missing) console.log(`✖ NO ROW for title: ${t}`);

console.log(`\nmatched ${rows.length} of ${titles.length}` + (bad || missing.length ? " — with problems above" : " — all good"));
await prisma.$disconnect();
process.exit(bad || missing.length ? 1 : 0);
