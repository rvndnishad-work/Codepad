/**
 * Seed hand-authored interview questions from prisma/data/curated/*.json.
 * Each file is a flat array of question objects (with a `technology` field).
 * Idempotent + additive: skips any (title, technology) already present, so it
 * is safe to run repeatedly and against any database (dev or prod).
 *
 *   npx tsx prisma/seed-curated-questions.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type Q = {
  title: string;
  description?: string;
  answer?: string;
  difficulty?: string;
  round?: string;
  tags?: string[];
  technology: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "question";

function seededCount(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  let slug = root;
  let n = 2;
  while (await prisma.prepQuestion.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${n++}`;
  }
  return slug;
}

function loadCurated(): Q[] {
  const dir = join(process.cwd(), "prisma", "data", "curated");
  if (!existsSync(dir)) return [];
  const out: Q[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const arr = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (Array.isArray(arr)) out.push(...arr);
  }
  return out;
}

async function main() {
  const items = loadCurated();
  let created = 0;
  let skipped = 0;
  const perTech: Record<string, number> = {};

  for (const q of items) {
    if (!q.title?.trim() || !q.technology) {
      skipped++;
      continue;
    }
    const exists = await prisma.prepQuestion.findFirst({
      where: { title: q.title, technology: q.technology },
      select: { id: true },
    });
    if (exists) {
      skipped++;
      continue;
    }
    const slug = await uniqueSlug(q.title);
    await prisma.prepQuestion.create({
      data: {
        title: q.title,
        slug,
        description: q.description || null,
        answer: q.answer || null,
        technology: q.technology,
        difficulty: ["easy", "medium", "hard"].includes(q.difficulty ?? "") ? q.difficulty! : "medium",
        round: q.round || null,
        tags: JSON.stringify(Array.isArray(q.tags) ? q.tags : []),
        yearsAsked: "[]",
        views: seededCount(slug, 40, 1200),
        likes: seededCount(slug + "l", 0, 80),
        status: "published",
        seoTitle: `${q.title} | Interview Question`,
        seoDescription: (q.description || q.title).slice(0, 155),
      },
    });
    created++;
    perTech[q.technology] = (perTech[q.technology] ?? 0) + 1;
  }

  console.log(`Created ${created}, skipped ${skipped} (already present / invalid).`);
  console.log("Per technology this run:", perTech);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
