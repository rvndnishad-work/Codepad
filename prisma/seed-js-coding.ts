import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type Example = { label: string; code: string; runnable?: boolean };
type QuestionInput = {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  description: string;
  answer: string;
  examples: Example[];
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const filePath = join(process.cwd(), "prisma", "data", "js-coding-questions.json");
  const raw = readFileSync(filePath, "utf8");
  const questions = JSON.parse(raw) as QuestionInput[];

  console.log(`Read ${questions.length} questions from JSON. Seeding into the database...`);

  let seededCount = 0;
  for (const q of questions) {
    const slug = slugify(q.title);
    await prisma.prepQuestion.upsert({
      where: { slug },
      update: {
        title: q.title,
        description: q.description,
        answer: q.answer,
        technology: "javascript-coding",
        difficulty: q.difficulty,
        tags: JSON.stringify(q.tags),
        examplesData: JSON.stringify(q.examples),
        status: "published",
      },
      create: {
        title: q.title,
        slug,
        description: q.description,
        answer: q.answer,
        technology: "javascript-coding",
        difficulty: q.difficulty,
        round: "Technical",
        tags: JSON.stringify(q.tags),
        yearsAsked: JSON.stringify([2024]),
        examplesData: JSON.stringify(q.examples),
        views: Math.floor(Math.random() * 4000) + 200,
        likes: Math.floor(Math.random() * 300) + 5,
        status: "published",
        seoTitle: `${q.title} | JS Coding Challenge`,
        seoDescription: q.description.slice(0, 155),
      },
    });
    seededCount++;
  }

  console.log(`Successfully seeded ${seededCount} JavaScript coding questions.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("Failed to seed coding questions:", e);
  await prisma.$disconnect();
  process.exit(1);
});
