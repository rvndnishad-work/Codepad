/**
 * Seed the generated question bank (prisma/data/question-bank.json) into
 * PrepQuestion. Idempotent and ADDITIVE: skips any question whose
 * (title, technology) already exists, so it is safe to run repeatedly and
 * against any database (dev or prod). Never deletes or overwrites.
 *
 *   npx tsx prisma/seed-question-bank.ts
 *   # prod:  set DATABASE_URL / DIRECT_URL to the prod connection first
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type Q = {
  title: string;
  description: string;
  answer: string;
  difficulty: string;
  round: string;
  tags: string[];
  technology: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "question";

// Small deterministic-ish view/like seed so listings/"most-asked" look alive.
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

async function main() {
  const file = join(process.cwd(), "prisma", "data", "question-bank.json");
  const bank: Record<string, Q[]> = JSON.parse(readFileSync(file, "utf8"));

  let created = 0;
  let skipped = 0;
  const perTech: Record<string, number> = {};

  for (const [tech, questions] of Object.entries(bank)) {
    for (const q of questions) {
      const exists = await prisma.prepQuestion.findFirst({
        where: { title: q.title, technology: tech },
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
          technology: tech,
          difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
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
      perTech[tech] = (perTech[tech] ?? 0) + 1;
    }
  }

  const total = await prisma.prepQuestion.count();
  console.log(`Created ${created}, skipped ${skipped} (already present).`);
  console.log("Per technology this run:", perTech);
  console.log(`PrepQuestion total now: ${total}`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
