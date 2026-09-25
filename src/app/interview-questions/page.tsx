import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { parseJsonArray, TECHNOLOGIES } from "@/lib/interview-questions/shared";
import CompanyGrid, { type CompanyCard } from "./CompanyGrid";
import TechCards from "./TechCards";
import PopularList from "./_components/PopularList";
import { Bookmark, Send } from "lucide-react";
import ScrollProgressBar from "@/app/hire/ScrollProgressBar";
import WowReveal from "@/components/wow/WowReveal";
import QuestionVerseHero from "./_wow/QuestionVerseHero";
import SignalTicker from "./_wow/SignalTicker";

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
    <div className="min-h-screen bg-[var(--wow-bg)] text-[var(--wow-fg)]">
      <ScrollProgressBar />

      {/* Hero (starts under the transparent bar) */}
      <QuestionVerseHero
        total={publishedTotal}
        stacks={TECHNOLOGIES.length}
        companies={companies.length}
        featured={popular}
      />

      <SignalTicker items={popular.map((q) => ({ title: q.title, slug: q.slug, company: q.company?.name ?? null }))} />

      <main className="bg-bg pb-24 md:pb-32">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-4 pt-14 md:gap-24 md:px-6 md:pt-[88px]">
          <section id="topics" aria-label="Browse by topic">
            <TechCards stats={techStats} />
          </section>

          {popular.length > 0 && (
            <section id="popular" className="flex flex-col gap-4 md:gap-7">
              <WowReveal y={24}>
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] text-fg md:text-[30px] md:leading-[1.15]">
                    Most viewed questions
                  </h2>
                  <p className="text-sm text-subtle md:text-[15px]">
                    What candidates open most across every topic. Start here if you have one evening.
                  </p>
                </div>
              </WowReveal>
              <WowReveal y={24} delay={0.05}>
                <PopularList questions={popular} />
              </WowReveal>
            </section>
          )}

          <section id="companies" aria-label="Browse by company">
            <CompanyGrid companies={cards} />
          </section>

          <WowReveal y={24}>
            <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 py-7 md:flex md:min-h-[200px] md:items-center md:justify-between md:gap-10 md:px-14 md:py-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_240px_at_0%_0%,rgb(var(--c-accent)/0.10),transparent_70%),radial-gradient(500px_260px_at_100%_100%,rgb(var(--c-accent-2)/0.10),transparent_70%)]"
              />
              <div className="relative flex flex-col gap-2.5">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-fg md:text-[30px]">Interviewed recently?</h2>
                <p className="max-w-[560px] text-[15px] leading-relaxed text-muted md:text-base">
                  Share the questions you were asked and how the rounds ran. It helps the next candidate walk in prepared.
                </p>
              </div>
              <div className="relative mt-5 flex flex-col gap-3 sm:flex-row md:mt-0 md:shrink-0">
                <Link
                  href="/interview-questions/share"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-[22px] text-[15px] font-semibold text-accent-ink transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_10px_30px_-10px_rgb(var(--c-accent)/0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Send className="h-4 w-4" aria-hidden /> Share your experience
                </Link>
                <Link
                  href="/interview-questions/saved"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border-strong px-5 text-[15px] font-medium text-fg transition-colors hover:border-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                >
                  <Bookmark className="h-4 w-4" aria-hidden /> Saved questions
                </Link>
              </div>
            </section>
          </WowReveal>
        </div>
      </main>
    </div>
  );
}
