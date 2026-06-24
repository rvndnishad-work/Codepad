import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

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
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "content:curate"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const filePath = join(
      process.cwd(),
      "prisma",
      "data",
      "js-coding-questions.json"
    );
    const raw = readFileSync(filePath, "utf8");
    const questions = JSON.parse(raw) as QuestionInput[];

    let seededCount = 0;
    const errors: string[] = [];

    for (const q of questions) {
      try {
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
      } catch (err) {
        errors.push(
          `Failed: ${q.title} - ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      total: questions.length,
      seeded: seededCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Seed JS coding error:", error);
    return NextResponse.json(
      {
        error: "seed failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
