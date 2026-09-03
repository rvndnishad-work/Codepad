import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Heart, BarChart3, Award, MessageSquare } from "lucide-react";
import { TECHNOLOGIES, RESERVED_TECH_SLUGS, techLabel, parseJsonArray, compactNumber } from "@/lib/interview-questions/shared";
import { getTechTheme } from "@/lib/interview-questions/techTheme";
import QuestionCard from "../_components/QuestionCard";
import JsonLd, { breadcrumb, faqPage } from "../_components/JsonLd";
import TechFilters from "./TechFilters";
import FrameworkPreference from "./FrameworkPreference";
import TechSvg from "@/components/TechSvg";
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

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Animated Back Arrow Link */}
        <Link
          href="/interview-questions"
          className="group inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-200" />
          <span>Back to Prep Library</span>
        </Link>

        {/* Immersive Insights Dashboard Banner */}
        <div className={`group relative rounded-3xl border ${theme.border} ${theme.bg} backdrop-blur-md p-6 sm:p-8 overflow-hidden transition-all duration-500 mb-8 ${theme.hoverBorder} ${theme.glow}`}>
          {/* Radial Decorative Glow */}
          <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-3xl opacity-20 transition-opacity duration-500 bg-current ${theme.text}`} />

          {/* Floating Massive Icon */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 sm:opacity-20 pointer-events-none transform group-hover:scale-105 group-hover:rotate-6 transition-transform duration-500">
            <TechSvg tech={tech} className="w-24 h-24 sm:w-36 sm:h-36" />
          </div>

          <div className="relative space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-bg border border-border mb-3 text-muted">
                <Award className="w-3.5 h-3.5 text-accent" />
                Category Blueprint
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{label} Interview Library</h1>
              <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">{theme.tagline}</p>
              {tech === "machine-coding" && <FrameworkPreference />}
            </div>

            {/* Stats row */}
            <div className="flex items-center flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-4 bg-bg/60 border border-border rounded-xl px-4 py-2.5 backdrop-blur-sm text-xs">
                <span className="text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" /> Questions
                </span>
                <span className="font-extrabold text-fg">{total}</span>
              </div>
              <div className="flex items-center gap-4 bg-bg/60 border border-border rounded-xl px-4 py-2.5 backdrop-blur-sm text-xs">
                <span className="text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Views
                </span>
                <span className="font-extrabold text-fg">{compactNumber(totalViews)}</span>
              </div>
              <div className="flex items-center gap-4 bg-bg/60 border border-border rounded-xl px-4 py-2.5 backdrop-blur-sm text-xs">
                <span className="text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" /> Upvotes
                </span>
                <span className="font-extrabold text-fg">{compactNumber(totalLikes)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Main catalog list with filters */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filters Panel — sticky glass (hire cohesion) */}
            <div className="sticky top-[64px] z-20 bg-surface/60 dark:bg-surface/40 backdrop-blur-xl border border-white/10 shadow-soft rounded-2xl p-4 supports-[backdrop-filter]:bg-surface/60">
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
                <MessageSquare className="w-4 h-4 text-muted" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                  Question Catalog
                </h2>
                <span className="text-xs text-muted/60 font-semibold">({questions.length} visible)</span>
              </div>

              {/* Questions stack */}
              <div className="space-y-3">
                {questions.length > 0 ? (
                  questions.map((q) => <QuestionCard key={q.slug} q={q} />)
                ) : (
                  <div className="rounded-2xl border border-dashed border-border py-12 text-center bg-surface/30">
                    <p className="text-sm text-muted">No questions match the selected filters.</p>
                    <p className="text-xs text-muted/60 mt-1">Try clearing filters or searching for something else.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky insights sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            
            {/* Sidebar Widget 1: Difficulty Distribution */}
            <div className="p-5 rounded-2xl border border-border bg-surface/45 backdrop-blur-sm space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-accent" />
                Difficulty Distribution
              </h3>
              <div className="space-y-3.5">
                {/* Visual track */}
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-bg border border-border gap-0.5 p-[1px]">
                  {diffCounts.easy > 0 && (
                    <div style={{ width: `${easyPct}%` }} className="bg-emerald-500 rounded-full animate-all duration-300" title={`Easy: ${diffCounts.easy}`} />
                  )}
                  {diffCounts.medium > 0 && (
                    <div style={{ width: `${mediumPct}%` }} className="bg-amber-500 rounded-full animate-all duration-300" title={`Medium: ${diffCounts.medium}`} />
                  )}
                  {diffCounts.hard > 0 && (
                    <div style={{ width: `${hardPct}%` }} className="bg-rose-500 rounded-full animate-all duration-300" title={`Hard: ${diffCounts.hard}`} />
                  )}
                </div>

                {/* Values list */}
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Easy
                    </span>
                    <span className="text-fg">{diffCounts.easy} ({Math.round(easyPct)}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Medium
                    </span>
                    <span className="text-fg">{diffCounts.medium} ({Math.round(mediumPct)}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Hard
                    </span>
                    <span className="text-fg">{diffCounts.hard} ({Math.round(hardPct)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Widget 2: Hiring Companies */}
            {companiesInTech.length > 0 && (
              <div className="p-5 rounded-2xl border border-border bg-surface/45 backdrop-blur-sm space-y-3 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted">
                  Hiring Companies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {companiesInTech.map((c) => (
                    <Link
                      key={c.slug}
                      href={buildCompanyUrl(c.slug)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition duration-200 ${
                        company === c.slug
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-bg/40 text-muted/90 hover:border-accent hover:text-accent"
                      }`}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar Widget 3: Tested Topics (dynamic cloud) */}
            {topTags.length > 0 && (
              <div className="p-5 rounded-2xl border border-border bg-surface/45 backdrop-blur-sm space-y-3 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted">
                  Tested Topics
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {topTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-md border border-border/80 bg-bg/30 text-[11px] font-bold uppercase tracking-wide text-muted/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar Widget 4: Study Guide */}
            <div className="p-5 rounded-2xl border border-border bg-surface/45 backdrop-blur-sm space-y-3 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-accent" />
                Study Guide
              </h3>
              <p className="text-xs text-muted leading-relaxed font-semibold">
                {studyTip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
