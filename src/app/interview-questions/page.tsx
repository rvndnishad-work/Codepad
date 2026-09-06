import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { parseJsonArray, TECHNOLOGIES } from "@/lib/interview-questions/shared";
import CompanyGrid, { type CompanyCard } from "./CompanyGrid";
import TechCards from "./TechCards";
import QuestionCard from "./_components/QuestionCard";
import { Building2, Layers, Sparkles, Flame, Bookmark, Users, RadioTower } from "lucide-react";
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
    <div className="min-h-screen bg-[var(--wow-bg)] pb-32 text-[var(--wow-fg)] transition-colors">
      <ScrollProgressBar />

      {/* ── Cinematic signal-deck hero (starts under the transparent bar) ── */}
      <QuestionVerseHero
        total={publishedTotal}
        stacks={TECHNOLOGIES.length}
        companies={companies.length}
        featured={popular}
      />

      {/* ── Live transmission strip ── */}
      <SignalTicker items={popular.map((q) => ({ title: q.title, slug: q.slug, company: q.company?.name ?? null }))} />

      <main className="mx-auto max-w-6xl space-y-20 px-4 pt-14">
        {/* Tech constellation — the primary, dev-first entry point */}
        <section>
          <WowReveal>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff2fb3]">
                  <Layers className="h-3.5 w-3.5" /> Tech constellation
                </p>
                <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">
                  PICK YOUR ARENA.
                </h2>
              </div>
              <Link
                href="/interview-questions/saved"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] px-4 py-2 text-xs font-bold text-muted backdrop-blur-sm transition hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)]"
              >
                <Bookmark className="h-3.5 w-3.5" /> Saved signals
              </Link>
            </div>
          </WowReveal>
          <TechCards stats={techStats} />
        </section>

        {/* Most-intercepted transmissions */}
        {popular.length > 0 && (
          <section>
            <WowReveal>
              <div className="mb-6">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff2fb3]">
                  <Flame className="h-3.5 w-3.5" /> Hot signals
                </p>
                <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">
                  MOST INTERCEPTED.
                </h2>
              </div>
            </WowReveal>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {popular.map((q) => (
                <QuestionCard key={q.slug} q={q} />
              ))}
            </div>
          </section>
        )}

        {/* Target list — companies */}
        <section>
          <WowReveal>
            <div className="mb-6">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff2fb3]">
                <Building2 className="h-3.5 w-3.5" /> Target list
              </p>
              <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">
                KNOW THEIR PLAYBOOK.
              </h2>
            </div>
          </WowReveal>
          <CompanyGrid companies={cards} />
        </section>

        {/* Transmission CTA */}
        <WowReveal>
          <section className="wow-noise relative overflow-hidden rounded-[2rem] bg-[#0c1030] px-6 py-14 text-center text-white md:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-[-160px] h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[#8b93ff]/25 blur-[120px]" />
              <div className="absolute bottom-[-140px] right-[-100px] h-[300px] w-[300px] rounded-full bg-[#ff2fb3]/20 blur-[100px]" />
              <div className="wow-grid-bg absolute inset-0 opacity-60" />
            </div>
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
                <RadioTower className="h-3.5 w-3.5 text-[#ffe600]" />
                Open channel
              </p>
              <h2 className="wow-font-display mx-auto mt-6 max-w-2xl text-4xl md:text-6xl">
                GOT SIGNAL?<br /><span className="wow-gradient-text">TRANSMIT IT.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
                Interviewed recently? Beam your experience back to the deck and
                arm the next candidate walking into that room.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/interview-questions/share"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee] bg-[length:180%_100%] bg-left px-7 py-3 text-[13px] font-black uppercase tracking-wider text-white shadow-[0_6px_24px_-8px_rgba(139,147,255,0.7)] transition-all duration-300 hover:bg-right hover:shadow-[0_8px_30px_-6px_rgba(255,47,179,0.6)] active:translate-y-px"
                >
                  <Sparkles className="h-4 w-4" /> Share your experience
                </Link>
                <Link
                  href="/interview-questions/saved"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-7 py-3 text-[13px] font-black uppercase tracking-wider text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white"
                >
                  <Users className="h-4 w-4" /> Saved signals
                </Link>
              </div>
            </div>
          </section>
        </WowReveal>
      </main>
    </div>
  );
}
