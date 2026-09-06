import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Radar, Send } from "lucide-react";
import { TECHNOLOGIES, RESERVED_TECH_SLUGS, techLabel, parseJsonArray, compactNumber } from "@/lib/interview-questions/shared";
import { getTechTheme } from "@/lib/interview-questions/techTheme";
import QuestionCard from "../_components/QuestionCard";
import JsonLd, { breadcrumb, faqPage } from "../_components/JsonLd";
import TechFilters from "./TechFilters";
import FrameworkPreference from "./FrameworkPreference";
import TechDossierHero from "./_wow/TechDossierHero";
import WowReveal from "@/components/wow/WowReveal";
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
  searchParams: Promise<{ difficulty?: string; company?: string; round?: string; q?: string }>;
}) {
  const { tech } = await params;
  if (RESERVED_TECH_SLUGS.has(tech)) notFound();
  const { difficulty, company, round, q } = await searchParams;

  const where: Prisma.PrepQuestionWhereInput = { technology: tech, status: "published" };
  if (difficulty) where.difficulty = difficulty;
  if (round) where.round = round;
  if (company) where.company = { slug: company };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { tags: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  // Every technology track is ordered easy -> hard (then by popularity) so a
  // learner can work through it progressively. Difficulty is a string, so the
  // rank is applied in JS below; the take covers the whole set per tech.
  const [questionsRaw, total, companiesInTech, roundsRaw, difficultyGroups, statsAggregate] = await Promise.all([
    prisma.prepQuestion.findMany({
      where,
      orderBy: [{ views: "desc" }],
      select: {
        title: true, slug: true, difficulty: true, technology: true, round: true,
        views: true, likes: true, yearsAsked: true, answer: true, tags: true,
        company: { select: { name: true, slug: true } },
      },
      take: 200,
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
    prisma.prepQuestion.groupBy({
      by: ["difficulty"],
      where: { technology: tech, status: "published" },
      _count: true,
    }),
    prisma.prepQuestion.aggregate({
      where: { technology: tech, status: "published" },
      _sum: { views: true, likes: true },
    }),
  ]);

  if (total === 0 && !isKnownTech(tech)) notFound();

  const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const questions = [...questionsRaw].sort(
    (a, b) =>
      (DIFF_RANK[a.difficulty ?? "medium"] ?? 1) - (DIFF_RANK[b.difficulty ?? "medium"] ?? 1) ||
      b.views - a.views,
  );

  const rounds = roundsRaw.map((r) => r.round!).filter(Boolean);
  const label = techLabel(tech);

  // Difficulty aggregations
  const diffCounts = { easy: 0, medium: 0, hard: 0 };
  for (const g of difficultyGroups) {
    if (g.difficulty === "easy") diffCounts.easy = g._count;
    else if (g.difficulty === "hard") diffCounts.hard = g._count;
    else diffCounts.medium = g._count;
  }

  const totalViews = statsAggregate._sum.views ?? 0;
  const totalLikes = statsAggregate._sum.likes ?? 0;

  const theme = getTechTheme(tech);

  const easyPct = total > 0 ? (diffCounts.easy / total) * 100 : 0;
  const mediumPct = total > 0 ? (diffCounts.medium / total) * 100 : 0;
  const hardPct = total > 0 ? (diffCounts.hard / total) * 100 : 0;

  // Dynamic top tag extraction
  const tagCounts = new Map<string, number>();
  questions.forEach((q) => {
    const tagsList = parseJsonArray<string>(q.tags);
    tagsList.forEach((t) => {
      if (t) {
        const normalized = t.trim().toLowerCase();
        tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
      }
    });
  });
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  // Study insights guide text mapping
  const STUDY_TIPS: Record<string, string> = {
    reactjs: "Focus on React 19 updates, Server Components/Actions lifecycle, hooks internals, Concurrent Mode rendering, and performance tuning (memo, transitions).",
    nodejs: "Master the Event Loop lifecycle, asynchronous primitives (Worker Threads, child processes), streaming pipelines, and backpressure management.",
    "ai-engineering":
      "Master prompt/context engineering, embeddings + RAG retrieval pipelines, tool-calling agent loops, eval design (LLM-as-judge, golden sets), and production concerns: streaming, caching, cost and guardrails.",
    javascript: "Study prototypical inheritance, memory leaks in closures, V8 compilation stages, event loop task queues, and advanced asynchronous patterns.",
    "javascript-coding": "Practice array/object deep transformations, Promise.all/allSettled polyfills, debounce/throttle variants, and custom Event Emitter class systems.",
    typescript: "Practice advanced mapped/conditional types, utility implementations, type assertion guards, and strict configuration parameters.",
    vuejs: "Understand Vue 3 reactivity tracking (Proxy handlers), Composition API patterns, Pinia stores state management, and server-side rendering strategies.",
    angular: "Study change detection zones (OnPush), standalone component structures, direct RxJS pipe pipelines, and dependency injection hierarchy.",
    dsa: "Focus on runtime optimization patterns (DP, sliding windows, fast/slow pointer trees), graph traversals, and asymptotic complexity boundaries.",
    "system-design": "Understand CAP theorem trade-offs, request distribution via load balancing, caching consistency, and distributed sharding algorithms.",
    python: "Master the GIL runtime limits, decorator wraps, generator pipe memory optimizations, and asyncio context loops.",
    sql: "Practice query optimizer execution plans, indexing mechanisms (B-Trees), transaction isolation levels (ACID), and window calculations.",
  };
  const studyTip = STUDY_TIPS[tech] ?? "Revisit core language idioms, architectural patterns, and runtime execution models. Practice code challenges daily.";

  // Dynamic company filter builder URL maintaining search queries
  const buildCompanyUrl = (companySlug: string) => {
    const params = new URLSearchParams();
    if (difficulty) params.set("difficulty", difficulty);
    if (round) params.set("round", round);
    if (q) params.set("q", q);
    if (companySlug && companySlug !== company) {
      params.set("company", companySlug);
    }
    const qs = params.toString();
    return `/interview-questions/${tech}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] pb-32 text-[var(--wow-fg)] transition-colors">
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

      {/* ── Sector dossier sub-hero ── */}
      <TechDossierHero
        tech={tech}
        label={label}
        tagline={theme.tagline}
        hex={theme.hex}
        total={total}
        views={totalViews}
        likes={totalLikes}
        diff={diffCounts}
      />
      {tech === "machine-coding" && (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <FrameworkPreference />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pt-10">
        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: Main catalog list with filters */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter console — sticky glass */}
            <div className="sticky top-[64px] z-20 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <TechFilters
                tech={tech}
                companies={companiesInTech}
                rounds={rounds}
                current={{
                  difficulty: difficulty ?? "",
                  company: company ?? "",
                  round: round ?? "",
                  q: q ?? "",
                }}
              />
            </div>

            {/* Question Catalog List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-[#ff2fb3]" />
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted">
                  Transmission log
                </h2>
                <span className="font-mono text-[11px] tabular-nums text-muted/60">// {questions.length} visible</span>
              </div>

              {/* Questions stack */}
              <div className="space-y-3">
                {questions.length > 0 ? (
                  questions.map((q) => <QuestionCard key={q.slug} q={q} />)
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--wow-card-border)] bg-[var(--wow-card)] py-12 text-center">
                    <p className="font-mono text-sm uppercase tracking-[0.18em] text-muted">No signals on this frequency.</p>
                    <p className="text-xs text-muted/60 mt-1">Try clearing filters or searching for something else.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky intel sidebar */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">

            {/* Widget 1: Difficulty mix */}
            <WowReveal>
              <div className="space-y-4 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 shadow-sm backdrop-blur-sm">
                <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8b93ff]" />
                  Difficulty mix
                </h3>
                <div className="space-y-3.5">
                  <div className="flex h-2.5 w-full gap-1 overflow-hidden">
                    {diffCounts.easy > 0 && (
                      <span style={{ flexGrow: diffCounts.easy }} className="min-w-3 rounded-full bg-emerald-500" title={`Easy: ${diffCounts.easy}`} />
                    )}
                    {diffCounts.medium > 0 && (
                      <span style={{ flexGrow: diffCounts.medium }} className="min-w-3 rounded-full bg-amber-500" title={`Medium: ${diffCounts.medium}`} />
                    )}
                    {diffCounts.hard > 0 && (
                      <span style={{ flexGrow: diffCounts.hard }} className="min-w-3 rounded-full bg-rose-500" title={`Hard: ${diffCounts.hard}`} />
                    )}
                  </div>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Easy
                      </span>
                      <span className="tabular-nums text-[var(--wow-fg)]">{diffCounts.easy} ({Math.round(easyPct)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Medium
                      </span>
                      <span className="tabular-nums text-[var(--wow-fg)]">{diffCounts.medium} ({Math.round(mediumPct)}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Hard
                      </span>
                      <span className="tabular-nums text-[var(--wow-fg)]">{diffCounts.hard} ({Math.round(hardPct)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </WowReveal>

            {/* Widget 2: Intercepted at */}
            {companiesInTech.length > 0 && (
              <WowReveal delay={0.08}>
                <div className="space-y-3 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 shadow-sm backdrop-blur-sm">
                  <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
                    Intercepted at
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {companiesInTech.map((c) => (
                      <Link
                        key={c.slug}
                        href={buildCompanyUrl(c.slug)}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold transition duration-200 ${
                          company === c.slug
                            ? "bg-white font-black text-black"
                            : "border border-[var(--wow-card-border)] text-muted hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)]"
                        }`}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </WowReveal>
            )}

            {/* Widget 3: Tested Topics */}
            {topTags.length > 0 && (
              <WowReveal delay={0.16}>
                <div className="space-y-3 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 shadow-sm backdrop-blur-sm">
                  <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff2fb3]" />
                    Tested topics
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {topTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-[var(--wow-card-border)] bg-[var(--wow-stage)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </WowReveal>
            )}

            {/* Widget 4: Decryption key (study guide) */}
            <WowReveal delay={0.24}>
              <div className="space-y-3 rounded-2xl border border-[#8b93ff]/25 bg-gradient-to-b from-[#8b93ff]/10 to-transparent p-5 shadow-sm backdrop-blur-sm">
                <h3 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffe600]" />
                  Decryption key
                </h3>
                <p className="text-xs font-semibold leading-relaxed text-muted">
                  {studyTip}
                </p>
              </div>
            </WowReveal>
          </div>
        </div>

        {/* Slim uplink banner */}
        <WowReveal>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:px-6">
            <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-muted">
              Intercepted something new? <span className="text-[var(--wow-fg)]">Beam it into the archive.</span>
            </p>
            <Link
              href="/interview-questions/share"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:scale-105"
            >
              <Send className="h-3.5 w-3.5" /> Share intel
            </Link>
          </div>
        </WowReveal>

        <p className="mt-8 font-mono text-[11px] tabular-nums text-muted/60">
          // {compactNumber(totalViews)} total views · {compactNumber(totalLikes)} upvotes · {total} decoded
        </p>
      </div>
    </div>
  );
}
