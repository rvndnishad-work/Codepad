import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Send } from "lucide-react";
import { TECHNOLOGIES, RESERVED_TECH_SLUGS, techLabel, parseJsonArray } from "@/lib/interview-questions/shared";
import { getTechTheme } from "@/lib/interview-questions/techTheme";
import QuestionGroups from "./QuestionGroups";
import ProgressPanel from "./ProgressPanel";
import { DifficultyBar, DIFFICULTY_BG } from "../_components/Difficulty";
import { DIFFICULTY_ORDER } from "@/lib/interview-questions/topic-catalog";
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
  const [questionsRaw, total, companiesInTech, roundsRaw, difficultyGroups, statsAggregate, allInTech] = await Promise.all([
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
    // The whole topic, for progress and "up next" whatever the filters are.
    prisma.prepQuestion.findMany({
      where: { technology: tech, status: "published" },
      select: { slug: true, title: true, difficulty: true, views: true },
      take: 1000,
    }),
  ]);

  if (total === 0 && !isKnownTech(tech)) notFound();

  const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const questions = [...questionsRaw].sort(
    (a, b) =>
      (DIFF_RANK[a.difficulty ?? "medium"] ?? 1) - (DIFF_RANK[b.difficulty ?? "medium"] ?? 1) ||
      b.views - a.views,
  );

  const ordered = [...allInTech].sort(
    (a, b) =>
      (DIFF_RANK[a.difficulty ?? "medium"] ?? 1) - (DIFF_RANK[b.difficulty ?? "medium"] ?? 1) ||
      b.views - a.views,
  );
  const filtered = Boolean(difficulty || company || round || q);

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
    <div className="min-h-screen bg-[var(--wow-bg)] text-[var(--wow-fg)]">
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

      {/* Topic hero */}
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
      <TechFilters
        tech={tech}
        label={label}
        companies={companiesInTech}
        rounds={rounds}
        counts={{ ...diffCounts, total }}
        current={{
          difficulty: difficulty ?? "",
          company: company ?? "",
          round: round ?? "",
          q: q ?? "",
        }}
      />

      <div className="bg-bg">
        <div className="mx-auto max-w-[1280px] px-4 pt-4 md:px-6 md:pt-8">
          {tech === "machine-coding" && <FrameworkPreference />}

          <div className="mt-4 md:hidden">
            <ProgressPanel ordered={ordered} total={total} variant="strip" />
          </div>

          <div className="mt-7 grid grid-cols-1 items-start gap-8 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_384px]">
            <div>
              {questions.length > 0 ? (
                <QuestionGroups questions={questions} filtered={filtered} />
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
                  <p className="text-[15px] font-medium text-fg">No questions match these filters.</p>
                  <p className="mt-1 text-sm text-subtle">Try another difficulty or clear the search.</p>
                </div>
              )}
            </div>

            <aside className="flex flex-col gap-4">
              <div className="hidden md:block">
                <ProgressPanel ordered={ordered} total={total} variant="card" />
              </div>

              <div className="hidden flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 md:flex">
                <h3 className="text-sm font-semibold text-fg">Difficulty mix</h3>
                <DifficultyBar easy={diffCounts.easy} medium={diffCounts.medium} hard={diffCounts.hard} height={6} delay={0.2} />
                <div className="flex flex-col gap-2">
                  {DIFFICULTY_ORDER.map((d) => (
                    <div key={d} className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2 capitalize text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_BG[d]}`} aria-hidden />
                        {d}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-subtle">
                        {diffCounts[d]} · {total > 0 ? Math.round((diffCounts[d] / total) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {topTags.length > 0 && (
                <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-[18px] md:p-5">
                  <h3 className="text-sm font-semibold text-fg">Topics tested</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {topTags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/interview-questions/${tech}?q=${encodeURIComponent(tag)}`}
                        scroll={false}
                        className={`flex h-[30px] items-center rounded-lg border px-[11px] text-[13px] transition-colors motion-reduce:transition-none ${
                          q?.toLowerCase() === tag
                            ? "border-accent bg-accent/10 text-fg"
                            : "border-border bg-bg text-muted hover:border-border-strong hover:text-fg"
                        }`}
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {companiesInTech.length > 0 && (
                <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-[18px] md:p-5">
                  <h3 className="text-sm font-semibold text-fg">Asked at</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {companiesInTech.map((c) => (
                      <Link
                        key={c.slug}
                        href={buildCompanyUrl(c.slug)}
                        scroll={false}
                        className={`flex h-[30px] items-center rounded-lg border px-[11px] text-[13px] transition-colors motion-reduce:transition-none ${
                          company === c.slug
                            ? "border-accent bg-accent/10 text-fg"
                            : "border-border bg-bg text-muted hover:border-border-strong hover:text-fg"
                        }`}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-[18px] md:p-5">
                <h3 className="text-sm font-semibold text-fg">Where to focus</h3>
                <p className="text-sm leading-relaxed text-muted">{studyTip}</p>
              </div>
            </aside>
          </div>

          <WowReveal y={20}>
            <div className="mb-24 mt-12 flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 md:mb-32 md:mt-16 md:min-h-[88px] md:flex-row md:items-center md:justify-between md:px-7 md:py-4">
              <p className="text-[15px] leading-relaxed text-muted">
                <span className="font-semibold text-fg">Seen a {label} question that is not here?</span> Add it and help
                the next candidate.
              </p>
              <Link
                href="/interview-questions/share"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_10px_30px_-10px_rgb(var(--c-accent)/0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Send className="h-4 w-4" aria-hidden /> Share a question
              </Link>
            </div>
          </WowReveal>
        </div>
      </div>
    </div>
  );
}
