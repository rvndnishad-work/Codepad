import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";

/**
 * Global instant-search for the Interview Questions module. Matches across
 * question titles, company names, and technology labels. Read-only, public.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ questions: [], companies: [], technologies: [] });
  }
  const contains = { contains: q, mode: "insensitive" as const };

  const [questions, companies] = await Promise.all([
    prisma.prepQuestion.findMany({
      where: { status: "published", OR: [{ title: contains }, { tags: contains }] },
      select: { title: true, slug: true, difficulty: true, technology: true, company: { select: { name: true } } },
      orderBy: { views: "desc" },
      take: 8,
    }),
    prisma.company.findMany({
      where: { name: contains },
      select: { name: true, slug: true, logo: true },
      take: 5,
    }),
  ]);

  const needle = q.toLowerCase();
  const technologies = TECHNOLOGIES.filter(
    (t) => t.label.toLowerCase().includes(needle) || t.slug.includes(needle),
  ).slice(0, 5);

  return NextResponse.json({
    questions: questions.map((x) => ({
      title: x.title,
      slug: x.slug,
      difficulty: x.difficulty,
      technology: x.technology,
      company: x.company?.name ?? null,
    })),
    companies,
    technologies,
  });
}
