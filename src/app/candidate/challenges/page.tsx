import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { validatePageAccess } from "@/lib/settings";
import ChallengeList from "../../challenges/ChallengeList";
import TracksCarousel from "../../challenges/TracksCarousel";
import RelativeTime from "@/components/RelativeTime";
import {
  Clock,
  Layers,
  Play,
  Sparkles,
  Flame,
  Award,
  ChevronRight,
  Bookmark,
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  XCircle,
  History,
  Binary,
  Braces,
  LayoutTemplate,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "Your Challenges — Interviewpad",
  description: "Your personal practice dashboard: daily challenge, streak, and progress.",
};

// Same template-based classification as the catalog & detail pages.
type ChallengeKind = "algorithms" | "ui" | "js";
function challengeKind(template: string): ChallengeKind {
  if (template === "harness") return "algorithms";
  if (/^test-/.test(template) || ["python", "go", "java", "cpp", "rust", "node", "ts-node"].includes(template)) return "js";
  return "ui";
}

const KIND_META: { key: ChallengeKind; label: string; icon: LucideIcon; bar: string; chip: string }[] = [
  { key: "algorithms", label: "Algorithms", icon: Binary, bar: "bg-sky-500", chip: "text-sky-500 bg-sky-500/10 border-sky-500/25" },
  { key: "ui", label: "UI & Frontend", icon: LayoutTemplate, bar: "bg-violet-500", chip: "text-violet-500 bg-violet-500/10 border-violet-500/25" },
  { key: "js", label: "JavaScript", icon: Braces, bar: "bg-amber-500", chip: "text-amber-500 bg-amber-500/10 border-amber-500/25" },
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CandidateChallengesPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/challenges", session);
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? "Developer";
  const firstName = userName.split(" ")[0];

  // Fetch all public & published challenges
  const rows = await prisma.challenge.findMany({
    where: { published: true, visibility: "public" },
    orderBy: [
      { featured: "desc" },
      { difficulty: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      tags: true,
      category: true,
      template: true,
      estimatedMinutes: true,
      featured: true,
      _count: { select: { steps: true } },
    },
  });

  // Map user attempts (best status per challenge)
  let attemptsByChallenge: Record<string, "passed" | "failed" | "in_progress"> = {};
  if (userId) {
    const attempts = await prisma.challengeAttempt.findMany({
      where: { userId },
      select: { challengeId: true, status: true },
    });
    for (const a of attempts) {
      const status = a.status as "passed" | "failed" | "in_progress" | "abandoned";
      if (status === "abandoned") continue;
      const prev = attemptsByChallenge[a.challengeId];
      if (status === "passed" || !prev || (status === "failed" && prev === "in_progress")) {
        attemptsByChallenge[a.challengeId] = status;
      }
    }
  }

  const items = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    tags: parseTags(c.tags),
    category: c.category,
    template: c.template,
    estimatedMinutes: c.estimatedMinutes,
    stepCount: c._count.steps,
    featured: c.featured,
    userStatus: attemptsByChallenge[c.id] ?? null,
  }));

  // ── Daily check-ins & streak — real attempt history, not a mock ───────
  // A "check-in" is any attempt started that day. The streak counts back
  // from today (or yesterday, so it isn't broken before today's session).
  const attemptDates = userId
    ? await prisma.challengeAttempt.findMany({
        where: { userId },
        select: { startedAt: true },
        orderBy: { startedAt: "desc" },
        take: 730,
      })
    : [];
  const activeDays = new Set(attemptDates.map((a) => dateKey(a.startedAt)));
  const checkedInToday = activeDays.has(dateKey(new Date()));

  let streak = 0;
  {
    const cursor = new Date();
    if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (activeDays.has(dateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      letter: "SMTWTFS"[d.getDay()],
      active: activeDays.has(dateKey(d)),
      isToday: i === 6,
    };
  });

  // ── Today's challenge — deterministic daily rotation over the catalog ──
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const daily = items.length > 0 ? items[dayNumber % items.length] : null;
  const dailySolved = daily?.userStatus === "passed";
  // A follow-up suggestion when today's pick is already done.
  const nextUnsolved = items.find((i) => i.userStatus !== "passed" && i.id !== daily?.id) ?? null;

  // ── Progress: solved counts by difficulty & by category ───────────────
  const solvedCount = items.filter((i) => i.userStatus === "passed").length;
  const byDifficulty = (["easy", "medium", "hard"] as const).map((d) => ({
    key: d,
    solved: items.filter((i) => i.difficulty === d && i.userStatus === "passed").length,
    total: items.filter((i) => i.difficulty === d).length,
  }));
  const byKind = KIND_META.map((m) => {
    const inKind = items.filter((i) => challengeKind(i.template) === m.key);
    return {
      ...m,
      solved: inKind.filter((i) => i.userStatus === "passed").length,
      total: inKind.length,
    };
  });
  const solvedPct = items.length > 0 ? solvedCount / items.length : 0;

  // ── Recent activity — the user's latest real attempts ─────────────────
  const recentAttempts = userId
    ? await prisma.challengeAttempt.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          startedAt: true,
          durationSec: true,
          challenge: { select: { slug: true, title: true } },
        },
      })
    : [];

  // Fetch active enrollments for the "continue" cards
  const enrollments = userId
    ? await prisma.challengeEnrollment.findMany({
        where: { userId, status: "active" },
        orderBy: { lastVisitedAt: "desc" },
        take: 3,
        include: {
          challenge: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
              steps: { select: { id: true, position: true }, orderBy: { position: "asc" } },
            },
          },
        },
      })
    : [];

  const stepIds = enrollments.flatMap((e) => e.challenge.steps.map((s) => s.id));
  const passedAttempts =
    stepIds.length > 0
      ? await prisma.challengeAttempt.findMany({
          where: {
            userId: userId as string,
            stepId: { in: stepIds },
            status: "passed",
          },
          select: { stepId: true },
          distinct: ["stepId"],
        })
      : [];
  const passedSet = new Set(passedAttempts.map((a) => a.stepId));

  const continueCards = enrollments.map((e) => {
    const total = e.challenge.steps.length;
    const passed = e.challenge.steps.filter((s) => passedSet.has(s.id)).length;
    const nextIdx = e.challenge.steps.findIndex((s) => !passedSet.has(s.id));
    const resumeStep = nextIdx < 0 ? 0 : nextIdx;
    return {
      slug: e.challenge.slug,
      title: e.challenge.title,
      difficulty: e.challenge.difficulty,
      passed,
      total,
      resumeStep,
      isMulti: total > 1,
    };
  });

  // Fetch featured staff-picks
  const featuredChallenges = await prisma.challenge.findMany({
    where: { published: true, visibility: "public", featured: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      difficulty: true,
      estimatedMinutes: true,
      _count: { select: { steps: true } },
    },
  });

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const difficultyBarColor: Record<string, string> = {
    easy: "bg-emerald-500",
    medium: "bg-amber-500",
    hard: "bg-rose-500",
  };
  const difficultyTextColor: Record<string, string> = {
    easy: "text-emerald-500",
    medium: "text-amber-500",
    hard: "text-rose-500",
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#07080c] text-fg font-sans py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,230,0,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,230,0,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-accent/5 blur-[130px] pointer-events-none" />

      <div className="mx-auto max-w-6xl space-y-10 relative z-10">
        {/* ── 1. Greeting + today ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted mb-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {todayLabel}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-fg">
              Welcome back, <span className="text-accent">{firstName}</span>
            </h1>
          </div>
          {checkedInToday ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Checked in today
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold w-fit">
              <Flame className="w-3.5 h-3.5" />
              Solve one challenge to keep your streak
            </span>
          )}
        </div>

        {/* ── 2. Daily challenge · streak · progress ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Daily challenge */}
          <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-accent/30 bg-white dark:bg-[#0f111c] p-6 flex flex-col shadow-sm">
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 mb-4 relative">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-accent">
                <Sparkles className="w-3.5 h-3.5" />
                Today&apos;s challenge
              </span>
              {dailySolved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Solved
                </span>
              )}
            </div>

            {daily ? (
              <>
                <h2 className="text-xl font-black tracking-tight text-fg leading-snug relative">{daily.title}</h2>
                <div className="flex items-center gap-2 flex-wrap mt-3 relative">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider bg-surface border-border ${difficultyTextColor[daily.difficulty]}`}>
                    {daily.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface text-[10px] font-bold uppercase tracking-wider text-muted">
                    <Clock className="w-3 h-3" />
                    {daily.estimatedMinutes}m
                  </span>
                  {daily.stepCount > 1 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/30 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-accent">
                      <Layers className="w-3 h-3" />
                      {daily.stepCount} questions
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-5 flex items-center gap-3 relative">
                  {dailySolved && nextUnsolved ? (
                    <>
                      <Link
                        href={`/challenges/${nextUnsolved.slug}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold transition shadow-[0_0_16px_rgba(var(--accent-rgb),0.25)]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Try another: {nextUnsolved.title.length > 22 ? `${nextUnsolved.title.slice(0, 22)}…` : nextUnsolved.title}
                      </Link>
                      <span className="text-[11px] text-muted">Come back tomorrow for a new pick.</span>
                    </>
                  ) : (
                    <Link
                      href={`/challenges/${daily.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold transition shadow-[0_0_16px_rgba(var(--accent-rgb),0.25)]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {dailySolved ? "Solve it again" : "Solve today's challenge"}
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">No challenges published yet — check back soon.</p>
            )}
          </div>

          {/* Streak & check-ins */}
          <div className="lg:col-span-3 rounded-2xl border border-border dark:border-transparent bg-white dark:bg-[#0f111c] p-6 flex flex-col shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-4">Daily streak</span>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl grid place-items-center border ${streak > 0 ? "bg-orange-500/10 border-orange-500/30 text-orange-500" : "bg-surface border-border text-muted/40"}`}>
                <Flame className={`w-6 h-6 ${streak > 0 ? "fill-current" : ""}`} />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-fg leading-none">
                  {streak}
                  <span className="text-sm font-bold text-muted ml-1.5">day{streak === 1 ? "" : "s"}</span>
                </div>
                <div className="text-[10px] text-muted mt-1">
                  {checkedInToday
                    ? "You've practiced today — nice."
                    : streak > 0
                      ? "Solve anything today to extend it."
                      : "Start one today to begin a streak."}
                </div>
              </div>
            </div>

            {/* Last-7-days check-in strip (today highlighted) */}
            <div className="mt-auto pt-5 flex items-center justify-between gap-1">
              {last7.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className={`text-[8px] font-bold ${d.isToday ? "text-accent" : "text-muted/60"}`}>{d.letter}</span>
                  <div
                    className={`w-6 h-6 rounded-lg grid place-items-center text-[10px] font-black border ${
                      d.active
                        ? "bg-orange-500/10 border-orange-500/35 text-orange-500"
                        : d.isToday
                          ? "bg-surface border-accent/40 border-dashed text-muted/40"
                          : "bg-surface border-border text-muted/30"
                    }`}
                  >
                    {d.active ? "✓" : "·"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solved progress (LeetCode-style ring + difficulty split) */}
          <div className="lg:col-span-4 rounded-2xl border border-border dark:border-transparent bg-white dark:bg-[#0f111c] p-6 flex items-center gap-6 shadow-sm">
            <div className="relative shrink-0 grid place-items-center">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" className="stroke-slate-200 dark:stroke-[#202334]" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  className="stroke-accent"
                  strokeWidth="9"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - Math.max(0.02, solvedPct))}
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.4))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black font-mono text-fg leading-none">{solvedCount}</span>
                <span className="text-[9px] font-bold text-muted mt-0.5">/ {items.length} solved</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              {byDifficulty.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className={`uppercase tracking-wider ${difficultyTextColor[d.key]}`}>{d.key}</span>
                    <span className="font-mono text-muted">
                      <span className="text-fg">{d.solved}</span> / {d.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${difficultyBarColor[d.key]}`}
                      style={{ width: d.total > 0 ? `${Math.round((d.solved / d.total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. Progress by category ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {byKind.map((k) => {
            const Icon = k.icon;
            const pct = k.total > 0 ? Math.round((k.solved / k.total) * 100) : 0;
            return (
              <Link
                key={k.key}
                href="/challenges"
                className="group rounded-2xl border border-border dark:border-transparent bg-white dark:bg-[#0f111c] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${k.chip}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {k.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-fg group-hover:translate-x-0.5 transition" />
                </div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-lg font-black font-mono text-fg">
                    {k.solved}
                    <span className="text-xs font-bold text-muted"> / {k.total}</span>
                  </span>
                  <span className="text-[10px] font-bold text-muted font-mono">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                  <div className={`h-full rounded-full ${k.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── 4. Continue where you left off ──────────────────────────── */}
        {continueCards.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Continue where you left off
              </h2>
              <span className="text-[10px] text-muted font-mono tracking-wider bg-white dark:bg-[#0f111c] border border-border/40 dark:border-transparent px-3 py-1 rounded-full shadow-sm">
                {continueCards.length} in progress
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {continueCards.map((c) => (
                <Link
                  key={c.slug}
                  href={`/challenges/${c.slug}/attempt${c.isMulti ? `?step=${c.resumeStep}` : ""}`}
                  className="group relative rounded-2xl border border-slate-100 dark:border-transparent bg-white dark:bg-[#121526] hover:dark:bg-[#161a30] p-5 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 border border-accent/20 dark:border-transparent flex items-center justify-center text-accent shrink-0 group-hover:scale-105 transition-transform">
                        <Play className="w-3 h-3 text-accent fill-current translate-x-0.5" />
                      </div>

                      {c.isMulti ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[9px] font-black uppercase tracking-wider text-accent font-mono">
                          <Layers className="w-2.5 h-2.5" />
                          {c.total} Steps
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#202334] text-[9px] font-bold uppercase tracking-wider text-muted font-mono">
                          Single round
                        </span>
                      )}

                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1c1f32] text-muted font-mono tracking-wider ml-auto">
                        {c.difficulty}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-fg text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {c.title}
                    </h3>
                  </div>

                  {c.isMulti ? (
                    <div className="mt-6 pt-4 border-t border-border/40 dark:border-transparent relative z-10">
                      <div className="flex items-center justify-between text-[10px] text-muted font-mono font-bold mb-2">
                        <span className="uppercase tracking-wider">Solved steps</span>
                        <span className="text-fg font-black">{c.passed} / {c.total}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#202334] overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]"
                          style={{ width: `${(c.passed / c.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 pt-4 border-t border-border/40 dark:border-transparent relative z-10 flex items-center justify-between text-[10px] text-muted font-mono font-bold">
                      <span className="uppercase tracking-widest">Resume</span>
                      <ChevronRight className="w-3.5 h-3.5 text-accent transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Recent activity ──────────────────────────────────────── */}
        {recentAttempts.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Recent activity
              </h2>
            </div>
            <ul className="rounded-2xl border border-border dark:border-transparent bg-white dark:bg-[#0f111c] divide-y divide-border/40 dark:divide-border/10 shadow-sm overflow-hidden">
              {recentAttempts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/challenges/${a.challenge.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/50 transition"
                  >
                    {a.status === "passed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : a.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-rose-500/70 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-amber-500 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-fg truncate">{a.challenge.title}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted/70 shrink-0">
                      {a.status.replace("_", " ")}
                    </span>
                    {a.durationSec != null && (
                      <span className="hidden sm:inline text-[10px] text-muted font-mono tabular-nums shrink-0">
                        {Math.floor(a.durationSec / 60)}m {a.durationSec % 60}s
                      </span>
                    )}
                    <span className="text-[10px] text-muted/60 ml-auto shrink-0">
                      <RelativeTime iso={a.startedAt.toISOString()} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── 6. Staff picks ──────────────────────────────────────────── */}
        {featuredChallenges.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                Staff picks
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {featuredChallenges.map((c) => {
                const isMulti = c._count.steps > 1;
                const teaserText = c.description
                  .replace(/^\s*#{1,6}\s.*$/gm, "")
                  .replace(/[*_`>]+/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 120) + "…";

                return (
                  <Link
                    key={c.id}
                    href={`/challenges/${c.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-0.5 bg-white dark:bg-[#14182b] hover:dark:bg-[#181d35] border border-border dark:border-transparent"
                  >
                    <div
                      className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/5 blur-3xl pointer-events-none"
                      aria-hidden
                    />

                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="relative flex items-center gap-2.5 mb-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-[9px] font-black uppercase tracking-widest text-accent font-mono">
                            <Sparkles className="w-2.5 h-2.5" />
                            {c.difficulty}
                          </span>
                          {isMulti && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#202334] text-[9px] font-bold uppercase tracking-wider text-muted font-mono">
                              <Layers className="w-2.5 h-2.5" />
                              {c._count.steps} Steps
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-muted/70 font-mono tracking-wide">
                            <Clock className="w-3 h-3 text-muted/50" />
                            {c.estimatedMinutes}m
                          </span>
                        </div>

                        <h3 className="relative font-extrabold text-fg text-base tracking-tight leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                          {c.title}
                        </h3>

                        <p className="relative text-xs text-muted leading-relaxed line-clamp-3 mb-6 font-sans">
                          {teaserText}
                        </p>
                      </div>
                    </div>

                    <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-bg text-[11px] font-black tracking-widest uppercase w-fit group-hover:bg-accent-soft transition-colors shadow shadow-accent/25 mt-auto">
                      <Play className="w-3 h-3 fill-current translate-x-0.5" />
                      Start challenge
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 7. Career tracks ────────────────────────────────────────── */}
        <div className="pt-2">
          <TracksCarousel items={items} signedIn={!!userId} />
        </div>

        {/* ── 8. Full catalog ─────────────────────────────────────────── */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
              <Award className="w-3.5 h-3.5" />
              All challenges
            </h2>
            <span className="text-[10px] text-muted font-mono tracking-wider bg-white dark:bg-[#0f111c] border border-border/40 dark:border-transparent px-3 py-1 rounded-full shadow-sm">
              {items.length} available
            </span>
          </div>

          <div className="bg-slate-50/50 dark:bg-[#0c0d15] rounded-3xl p-4 sm:p-6 border border-border/40 dark:border-transparent transition-all duration-300">
            <ChallengeList items={items} signedIn={!!userId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}
