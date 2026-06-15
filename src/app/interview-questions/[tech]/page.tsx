import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TECHNOLOGIES, RESERVED_TECH_SLUGS, techLabel } from "@/lib/interview-questions/shared";
import QuestionCard from "../_components/QuestionCard";
import JsonLd, { breadcrumb, faqPage } from "../_components/JsonLd";
import TechFilters from "./TechFilters";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const isKnownTech = (slug: string) => TECHNOLOGIES.some((t) => t.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ tech: string }> }) {
  const { tech } = await params;
  const label = techLabel(tech);
  return {
    title: `${label} Interview Questions & Answers — Interviewpad`,
    description: `Top ${label} interview questions with answers, filtered by difficulty, company and round. Practice for your next interview.`,
    alternates: { canonical: `/interview-questions/${tech}` },
  };
}

export default async function TechnologyPage({
  params,
  searchParams,
}: {
  params: Promise<{ tech: string }>;
  searchParams: Promise<{ difficulty?: string; company?: string; round?: string }>;
}) {
  const { tech } = await params;
  if (RESERVED_TECH_SLUGS.has(tech)) notFound();
  const { difficulty, company, round } = await searchParams;

  const where: Prisma.PrepQuestionWhereInput = { technology: tech, status: "published" };
  if (difficulty) where.difficulty = difficulty;
  if (round) where.round = round;
  if (company) where.company = { slug: company };

  const [questions, total, companiesInTech, roundsRaw] = await Promise.all([
    prisma.prepQuestion.findMany({
      where,
      orderBy: [{ views: "desc" }],
      select: {
        title: true, slug: true, difficulty: true, technology: true, round: true,
        views: true, likes: true, yearsAsked: true, answer: true,
        company: { select: { name: true, slug: true } },
      },
      take: 60,
    }),
    prisma.prepQuestion.count({ where: { technology: tech, status: "published" } }),
    prisma.company.findMany({
      where: { questions: { some: { technology: tech, status: "published" } } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.prepQuestion.findMany({
      where: { technology: tech, status: "published", round: { not: null } },
      select: { round: true },
      distinct: ["round"],
    }),
  ]);

  if (total === 0 && !isKnownTech(tech)) notFound();

  const rounds = roundsRaw.map((r) => r.round!).filter(Boolean);
  const label = techLabel(tech);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <JsonLd
        data={[
          breadcrumb([
            { name: "Interview Questions", path: "/interview-questions" },
            { name: label, path: `/interview-questions/${tech}` },
          ]),
          ...(questions.length > 0
            ? [faqPage(questions.slice(0, 10).map((q) => ({ question: q.title, answer: (q.answer ?? "").slice(0, 500) })))]
            : []),
        ]}
      />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Interview Questions
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{label} Interview Questions</h1>
        <p className="text-sm text-muted mt-2">{total} published questions · filter by difficulty, company and round.</p>

        <div className="mt-6">
          <TechFilters
            tech={tech}
            companies={companiesInTech}
            rounds={rounds}
            current={{ difficulty: difficulty ?? "", company: company ?? "", round: round ?? "" }}
          />
        </div>

        <div className="mt-6 space-y-3">
          {questions.length > 0 ? (
            questions.map((q) => <QuestionCard key={q.slug} q={q} />)
          ) : (
            <p className="text-sm text-muted py-10 text-center">No questions match these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
