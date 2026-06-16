import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { parseJsonArray, TECHNOLOGIES } from "@/lib/interview-questions/shared";
import CompanyGrid, { type CompanyCard } from "./CompanyGrid";
import GlobalSearch from "./GlobalSearch";
import TechCards from "./TechCards";
import QuestionCard from "./_components/QuestionCard";
import { Building2, Layers, Sparkles, Flame, Bookmark, Users } from "lucide-react";

export const metadata = {
  title: "Interview Questions by Company & Technology — Interviewpad",
  description:
    "Browse 1000s of real interview questions and experiences by company, technology, role and difficulty. Prepare for Google, Amazon, Meta and more.",
  alternates: { canonical: "/interview-questions" },
};

export const dynamic = "force-dynamic";

export default async function InterviewQuestionsPage() {
  const [companies, qGroups, eGroups, techGroups, popular, publishedTotal] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.prepQuestion.groupBy({
      by: ["companyId", "difficulty"],
      where: { status: "published", companyId: { not: null } },
      _count: true,
    }),
    prisma.prepExperience.groupBy({
      by: ["companyId"],
      where: { status: "published", companyId: { not: null } },
      _count: true,
    }),
    prisma.prepQuestion.groupBy({
      by: ["technology", "difficulty"],
      where: { status: "published", technology: { not: null } },
      _count: true,
    }),
    prisma.prepQuestion.findMany({
      where: { status: "published" },
      orderBy: { views: "desc" },
      take: 6,
      select: {
        title: true, slug: true, difficulty: true, technology: true, round: true,
        views: true, likes: true, yearsAsked: true,
        company: { select: { name: true, slug: true } },
      },
    }),
    prisma.prepQuestion.count({ where: { status: "published" } }),
  ]);

  const techStats: Record<string, { easy: number; medium: number; hard: number; total: number }> = {};
  for (const t of TECHNOLOGIES) {
    techStats[t.slug] = { easy: 0, medium: 0, hard: 0, total: 0 };
  }
  for (const g of techGroups) {
    if (g.technology && techStats[g.technology]) {
      const count = g._count;
      if (g.difficulty === "easy") techStats[g.technology].easy += count;
      else if (g.difficulty === "hard") techStats[g.technology].hard += count;
      else techStats[g.technology].medium += count;
      techStats[g.technology].total += count;
    }
  }

  const expCount = new Map<string, number>();
  for (const g of eGroups) if (g.companyId) expCount.set(g.companyId, g._count);

  const cards: CompanyCard[] = companies.map((c) => {
    const byDiff = { easy: 0, medium: 0, hard: 0 };
    for (const g of qGroups) {
      if (g.companyId !== c.id) continue;
      if (g.difficulty === "easy") byDiff.easy += g._count;
      else if (g.difficulty === "hard") byDiff.hard += g._count;
      else byDiff.medium += g._count;
    }
    return {
      name: c.name,
      slug: c.slug,
      logo: c.logo,
      industry: c.industry,
      roles: parseJsonArray(c.hiringRoles),
      total: byDiff.easy + byDiff.medium + byDiff.hard,
      easy: byDiff.easy,
      medium: byDiff.medium,
      hard: byDiff.hard,
      experiences: expCount.get(c.id) ?? 0,
    };
  });

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/5 to-transparent">
        <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Interview Prep Library
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl">
            Real interview questions, by company & technology
          </h1>
          <p className="text-muted mt-4 max-w-2xl text-sm sm:text-base leading-relaxed">
            {publishedTotal.toLocaleString()} questions and counting across {TECHNOLOGIES.length} technologies
            and {companies.length} companies. Search, filter by difficulty and round, and learn from real
            interview experiences.
          </p>
          <div className="mt-7 max-w-xl">
            <GlobalSearch />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Browse by technology — the primary, dev-first entry point */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-muted">
              <Layers className="w-4 h-4" />
              Browse by technology
            </h2>
            <Link
              href="/interview-questions/saved"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-accent transition"
            >
              <Bookmark className="w-3.5 h-3.5" /> Saved
            </Link>
          </div>
          <TechCards stats={techStats} />
        </section>

        {/* Most-asked questions — surface real questions upfront */}
        {popular.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-muted mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              Most-asked questions
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {popular.map((q) => (
                <QuestionCard key={q.slug} q={q} />
              ))}
            </div>
          </section>
        )}

        {/* Companies */}
        <section>
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-muted mb-4">
            <Building2 className="w-4 h-4" />
            Browse by company
          </h2>
          <CompanyGrid companies={cards} />
        </section>

        {/* Community CTA */}
        <section className="rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold">Interviewed recently?</h2>
            <p className="text-sm text-muted mt-1">Share your experience and help the next candidate prepare.</p>
          </div>
          <Link
            href="/interview-questions/share"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg text-sm font-black uppercase tracking-wider hover:bg-accent-soft transition shrink-0"
          >
            <Users className="w-4 h-4" /> Share your experience
          </Link>
        </section>
      </div>
    </div>
  );
}
