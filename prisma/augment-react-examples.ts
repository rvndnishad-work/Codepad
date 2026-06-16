/**
 * Augment React (technology='reactjs') questions with a richer, interview-depth
 * answer and one or more code examples.
 *
 * Source files: prisma/data/react-augments*.ts — each a module with
 *   `export default [ { title, answer?, examples?: [{label,code,runnable?}] } ]`
 * (We use TS modules + template-literal `code` instead of JSON so multi-line JSX
 * needs no escaping.) `.json` files matching the same prefix are also read.
 *
 * Matches by exact title + technology='reactjs'. Idempotent (sets fields).
 *
 * React examples can't run in the in-page JS worker, so the detail page renders
 * them as highlighted code with an "Open in Playground" button. Author each
 * example's `code` as a self-contained `App.js` (default-exported component) so
 * it runs as-is in the empty-react Sandpack template.
 *
 *   npm run augment:react        (or: npx tsx prisma/augment-react-examples.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const prisma = new PrismaClient();

type Augment = {
  title: string;
  answer?: string;
  examples?: { label?: string; code: string; runnable?: boolean }[];
};

async function loadAugments(): Promise<Augment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^react-augments.*\.(ts|json)$/.test(f))
    .sort();

  const all: Augment[] = [];
  for (const f of files) {
    const full = join(dir, f);
    if (f.endsWith(".json")) {
      all.push(...(JSON.parse(readFileSync(full, "utf8")) as Augment[]));
    } else {
      const mod = await import(pathToFileURL(full).href);
      const arr = (mod.default ?? mod.augments) as Augment[];
      if (Array.isArray(arr)) all.push(...arr);
    }
  }
  return all;
}

async function main() {
  const items = await loadAugments();

  let updated = 0;
  const notFound: string[] = [];

  for (const a of items) {
    const q = await prisma.prepQuestion.findFirst({
      where: { title: a.title, technology: "reactjs" },
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

  console.log(`Augmented ${updated}/${items.length} React questions with examples/details.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound.slice(0, 30));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
