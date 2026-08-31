/**
 * Seed the 14 net-new system-design case studies from
 * liquidslr/system-design-notes that were not in the 72 existing rows.
 * Idempotent: skips if title already exists (norm check).
 */
import { PrismaClient } from "@prisma/client";
import augments from "./data/system-design-augments-7";

const prisma = new PrismaClient();

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  const existing = await prisma.prepQuestion.findMany({
    where: { technology: "system-design" },
    select: { title: true },
  });
  const existingNorm = new Set(existing.map((e) => norm(e.title)));

  let created = 0;
  let skipped = 0;

  for (const a of augments) {
    const n = norm(a.title);
    if (existingNorm.has(n)) {
      console.log(`skip duplicate: ${a.title}`);
      skipped++;
      continue;
    }
    // Check again by exact title to be safe (augment script expects exact title)
    const found = await prisma.prepQuestion.findFirst({ where: { title: a.title, technology: "system-design" } });
    if (found) {
      console.log(`skip exact: ${a.title}`);
      skipped++;
      continue;
    }
    const slug = a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
    await prisma.prepQuestion.create({
      data: {
        title: a.title,
        slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
        description: `Design ${a.title.replace(/^How would you design /i, "").replace(/\?$/, "")} at scale — requirements, capacity, and trade-offs.`,
        answer: a.answer ?? "",
        technology: "system-design",
        round: "System Design",
        difficulty: "hard",
        status: "published",
        tags: JSON.stringify(["system-design", "case-study"]),
        examplesData: a.examples ? JSON.stringify(a.examples) : null,
      },
    });
    console.log(`created: ${a.title}`);
    created++;
    existingNorm.add(n);
  }

  console.log(`Done: created ${created}, skipped ${skipped}, total augments ${augments.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
