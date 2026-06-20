/**
 * Augment Frontend Machine Coding (technology='machine-coding') questions with a
 * TUTORIAL-style answer + a self-contained runnable React solution.
 *
 * Source files: prisma/data/machine-coding-augments*.ts — each a module with
 *   `export default [ { title, answer?, examples?: [{label,code,runnable?}] } ]`
 * (TS modules + double-quoted "\n"-joined `answer` so markdown ```jsx fences work;
 * `code` as a backtick-free self-contained App.js). `.json` files also read.
 *
 * Matches by exact title + technology='machine-coding'. Idempotent (sets fields).
 * The detail page treats machine-coding like reactjs: highlighted code + an
 * "Open in Playground" button into the empty-react Sandpack template.
 *
 *   npm run augment:mc        (or: npx tsx prisma/augment-machine-coding.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const prisma = new PrismaClient();

type FrameworkBundle = { answer: string; files: Record<string, string> };
type Augment = {
  title: string;
  answer?: string;
  examples?: { label?: string; code?: string; files?: Record<string, string>; runnable?: boolean }[];
  frameworks?: { react?: FrameworkBundle; vue?: FrameworkBundle; angular?: FrameworkBundle };
};

async function loadAugments(): Promise<Augment[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^machine-coding-augments.*\.(ts|json)$/.test(f) && !f.includes(".types."))
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
      where: { title: a.title, technology: "machine-coding" },
      select: { id: true },
    });
    if (!q) {
      notFound.push(a.title);
      continue;
    }
    let data: Record<string, unknown> = {
      ...(a.answer ? { answer: a.answer } : {}),
      ...(a.examples ? { examplesData: JSON.stringify(a.examples) } : {}),
    };

    // Per-framework bundles: store the whole map, and mirror the default
    // (React, or the first present) onto answer/examplesData for SSR + SEO.
    if (a.frameworks && Object.keys(a.frameworks).length > 0) {
      const fw = a.frameworks as Record<string, FrameworkBundle>;
      const def = fw.react ?? Object.values(fw)[0];
      data = {
        ...data,
        answer: def.answer,
        examplesData: JSON.stringify([{ label: "Complete solution", files: def.files }]),
        frameworksData: JSON.stringify(fw),
      };
    }

    await prisma.prepQuestion.update({ where: { id: q.id }, data });
    updated++;
  }

  console.log(`Augmented ${updated}/${items.length} Machine Coding questions with tutorial + solution.`);
  if (notFound.length) console.log(`No exact-title match for ${notFound.length}:`, notFound.slice(0, 30));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
