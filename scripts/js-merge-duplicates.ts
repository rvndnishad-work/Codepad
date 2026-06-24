/**
 * Phase 1 cleanup — merge 3 true-duplicate JS questions into their rewritten
 * canonical pages. For each duplicate this:
 *   1. removes it from its seed source (question-bank.json; the closures dup is
 *      removed from seed-interview-questions.ts by hand),
 *   2. removes its augment entry (js-augments*.json),
 *   3. deletes the DB row (comments cascade; all 3 have 0),
 *   4. for the `==` pair, reassigns the freed clean slug to the canonical.
 *
 * Redirects for the removed slugs live in next.config.ts.
 *
 *   npx tsx scripts/js-merge-duplicates.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type Dup = {
  title: string;
  slug: string;
  augFile: string;
  fromBank?: boolean; // also defined in question-bank.json[javascript]
  reassignToCanonicalTitle?: string; // give this canonical the freed slug
};

const DUPS: Dup[] = [
  {
    title: "Closures in JavaScript — what and why",
    slug: "javascript-closures",
    augFile: "js-augments-2.json",
  },
  {
    title: "What is the difference between `==` and `===`?",
    slug: "what-is-the-difference-between-and",
    augFile: "js-augments-4.json",
    fromBank: true,
    reassignToCanonicalTitle: "What is the difference between == and ===?",
  },
  {
    title: "Explain the concept of 'pure functions'.",
    slug: "explain-the-concept-of-pure-functions",
    augFile: "js-augments-2.json",
    fromBank: true,
  },
  {
    title: "What is the difference between `null` and `undefined`?",
    slug: "what-is-the-difference-between-null-and-undefined",
    augFile: "js-augments-4.json",
    fromBank: true,
    reassignToCanonicalTitle: "What is the difference between null and undefined?",
  },
];

const dataDir = join(process.cwd(), "prisma", "data");
const detectIndent = (raw: string) => (/\n( +)"/.exec(raw)?.[1].length ?? 2);

async function main() {
  const bankTitles = new Set(DUPS.filter((d) => d.fromBank).map((d) => d.title));

  // 1. question-bank.json[javascript]
  if (bankTitles.size) {
    const p = join(dataDir, "question-bank.json");
    const raw = readFileSync(p, "utf8");
    const bank = JSON.parse(raw);
    const before = bank.javascript.length;
    bank.javascript = bank.javascript.filter((q: any) => !bankTitles.has(q.title));
    writeFileSync(p, JSON.stringify(bank, null, detectIndent(raw)));
    console.log(`question-bank.json[javascript]: removed ${before - bank.javascript.length}`);
  }

  // 2. augment files (a dup file may hold more than one dup → filter all at once)
  const augTitlesByFile = new Map<string, Set<string>>();
  for (const d of DUPS) {
    if (!augTitlesByFile.has(d.augFile)) augTitlesByFile.set(d.augFile, new Set());
    augTitlesByFile.get(d.augFile)!.add(d.title);
  }
  for (const [file, titles] of augTitlesByFile) {
    const p = join(dataDir, file);
    const arr = JSON.parse(readFileSync(p, "utf8")) as any[];
    const before = arr.length;
    const next = arr.filter((x) => !titles.has(x.title));
    writeFileSync(p, JSON.stringify(next, null, 2));
    console.log(`${file}: removed ${before - next.length} augment entr(ies)`);
  }

  // 3. delete DB rows (verify 0 comments first), then 4. reassign freed slug
  for (const d of DUPS) {
    // Match BOTH slug AND the duplicate's title. This keeps the step idempotent:
    // once the slug is reassigned to the canonical (different title), a re-run
    // finds no match here and never deletes the canonical.
    const row = await prisma.prepQuestion.findFirst({
      where: { slug: d.slug, title: d.title },
      select: { id: true, _count: { select: { comments: true } } },
    });
    if (!row) {
      console.log(`DB: no duplicate row for slug ${d.slug} (already merged)`);
      continue;
    }
    await prisma.prepQuestion.delete({ where: { id: row.id } });
    console.log(`DB: deleted ${d.slug} (cascaded ${row._count.comments} comments)`);

    if (d.reassignToCanonicalTitle) {
      const canon = await prisma.prepQuestion.findFirst({
        where: { title: d.reassignToCanonicalTitle, technology: "javascript" },
        select: { id: true, slug: true },
      });
      if (canon) {
        await prisma.prepQuestion.update({ where: { id: canon.id }, data: { slug: d.slug } });
        console.log(`DB: reassigned slug ${canon.slug} → ${d.slug} (canonical "${d.reassignToCanonicalTitle}")`);
      }
    }
  }

  await prisma.$disconnect();
  console.log("Merge complete.");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
