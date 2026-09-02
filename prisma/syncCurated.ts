/**
 * Sync curated JSON -> DB (UPDATE, not just insert).
 * Fixes the SVG d-sub + single-line // trimmed fences we just patched
 * in prisma/data/curated/*.json. seed-curated-questions.ts skips existing
 * rows, so it would NOT fix prod. This overwrites answer where title+technology matches.
 *
 * Usage against prod:
 *   $env:DATABASE_URL="postgresql://.../codepad?sslmode=require"
 *   $env:DIRECT_URL=$env:DATABASE_URL
 *   npx prisma generate
 *   npx tsx prisma/syncCurated.ts
 *
 * Or on Vercel: vercel env pull && npx tsx prisma/syncCurated.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const dir = join(process.cwd(), "prisma", "data", "curated");
  const files = readdirSync(dir).filter(f => f.endsWith(".json"));
  let updated = 0, unchanged = 0, notFound = 0;
  for (const f of files) {
    const arr: any[] = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const q of arr) {
      if (!q.title || !q.technology) continue;
      const existing = await prisma.prepQuestion.findFirst({
        where: { title: q.title, technology: q.technology },
        select: { id: true, answer: true },
      });
      if (!existing) { notFound++; continue; }
      if ((existing.answer || "") !== (q.answer || "")) {
        await prisma.prepQuestion.update({ where: { id: existing.id }, data: { answer: q.answer } });
        updated++;
        console.log(`Updated: ${q.technology} | ${q.title.slice(0,70)}`);
      } else unchanged++;
    }
  }
  console.log(`Done: updated=${updated} unchanged=${unchanged} notFound=${notFound}`);
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
