import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { validatePageAccess } from "@/lib/settings";
import ChallengeList from "../../challenges/ChallengeList";
import TracksCarousel from "../../challenges/TracksCarousel";
import RelativeTime from "@/components/RelativeTime";
import WowReveal from "@/components/wow/WowReveal";
import RogueHero from "./_wow/RogueHero";
import FieldLogMarquee from "./_wow/FieldLogMarquee";
import OrbitDivider from "./_wow/OrbitDivider";
import {
  Clock,
  Layers,
  Play,
  Sparkles,
  Flame,
  ChevronRight,
  CheckCircle2,
  XCircle,
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
  { key: "algorithms", label: "Algorithms", icon: Binary, bar: "bg-sky-500", chip: "text-sky-800 dark:text-sky-400 bg-sky-500/10 border-sky-500/25" },
  { key: "ui", label: "UI & Frontend", icon: LayoutTemplate, bar: "bg-violet-500", chip: "text-violet-800 dark:text-violet-400 bg-violet-500/10 border-violet-500/25" },
  { key: "js", label: "JavaScript", icon: Braces, bar: "bg-amber-500", chip: "text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-500/25" },
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
    easy: "text-emerald-800 dark:text-emerald-400",
    medium: "text-amber-800 dark:text-amber-400",
    hard: "text-rose-700 dark:text-rose-400",
  };

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] pb-32 text-[var(--wow-fg)] transition-colors">
      {/* ── Rogue hero ── */}
      <RogueHero
        firstName={firstName}
        todayLabel={todayLabel}
        checkedIn={checkedInToday}
        streak={streak}
        daily={daily ? {
          slug: daily.slug,
          title: daily.title,
          difficulty: daily.difficulty,
          minutes: daily.estimatedMinutes,
          steps: daily.stepCount,
          solved: dailySolved,
        } : null}
        nextUnsolved={nextUnsolved ? { slug: nextUnsolved.slug, title: nextUnsolved.title } : null}
        total={items.length}
        solvedCount={solvedCount}
      />

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-12">
        {/* ── 1. Today's briefing: streak + progress ─────────────────── */}
        <section className="space-y-5">
          <OrbitDivider label="Today's briefing" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          {/* Streak & check-ins */}
          <WowReveal className="lg:col-span-4">
          <div className="flex h-full flex-col rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-6 backdrop-blur-sm dark:border-white/[0.07]">
            <span className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Daily streak</span>
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${streak > 0 ? "border-orange-500/30 bg-orange-500/10 text-orange-500" : "border-black/[0.06] bg-[var(--wow-stage)] text-muted/40 dark:border-white/[0.07]"}`}>
                <Flame className={`h-6 w-6 ${streak > 0 ? "fill-current" : ""}`} />
              </div>
              <div>
                <div className="font-mono text-2xl font-black leading-none text-[var(--wow-fg)] tabular-nums">
                  {streak}
                  <span className="ml-1.5 text-sm font-bold text-muted">day{streak === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {checkedInToday
                    ? "You've practiced today — nice."
                    : streak > 0
                      ? "Solve anything today to extend it."
                      : "Start one today to begin a streak."}
                </div>
              </div>
            </div>

            {/* Last-7-days check-in strip (today highlighted) */}
            <div className="mt-auto flex items-center justify-between gap-1 pt-5">
              {last7.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${d.isToday ? "text-[#8b93ff]" : "text-muted/60"}`}>{d.letter}</span>
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-lg border text-[11px] font-black ${
                      d.active
                        ? "border-orange-500/35 bg-orange-500/10 text-orange-500"
                        : d.isToday
                          ? "border-dashed border-[#8b93ff]/50 text-muted/40"
                          : "border-black/[0.06] text-muted/30 dark:border-white/[0.07]"
                    }`}
                  >
                    {d.active ? "✓" : "·"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </WowReveal>

          {/* Solved progress (ring + difficulty split) */}
          <WowReveal delay={0.08} className="lg:col-span-8">
          <div className="flex h-full flex-col items-center gap-6 rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-6 backdrop-blur-sm dark:border-white/[0.07] sm:flex-row">
            <div className="relative shrink-0 grid place-items-center">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" className="stroke-black/10 dark:stroke-white/10" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none" stroke="#8b93ff"
                  strokeWidth="9"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - Math.max(0.02, solvedPct))}
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 6px rgba(139,147,255,0.4))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-black leading-none text-[var(--wow-fg)] tabular-nums">{solvedCount}</span>
                <span className="mt-0.5 text-[11px] font-bold text-muted">/ {items.length} solved</span>
              </div>
            </div>
            <div className="w-full min-w-0 flex-1 space-y-3">
              {byDifficulty.map((d) => (
                <div key={d.key}>
                  <div className="mb-1 flex justify-between text-[11px] font-bold">
                    <span className={`uppercase tracking-wider ${difficultyTextColor[d.key]}`}>{d.key}</span>
                    <span className="font-mono tabular-nums text-muted">
                      <span className="text-[var(--wow-fg)]">{d.solved}</span> / {d.total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full ${difficultyBarColor[d.key]}`}
                      style={{ width: d.total > 0 ? `${Math.round((d.solved / d.total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </WowReveal>
        </div>
        </section>

        {/* ── 2. Progress by category ─────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {byKind.map((k, i) => {
            const Icon = k.icon;
            const pct = k.total > 0 ? Math.round((k.solved / k.total) * 100) : 0;
            return (
              <WowReveal key={k.key} delay={i * 0.07} className="h-full">
              <Link
                href="/challenges"
                className="group flex h-full flex-col rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#8b93ff]/40 hover:shadow-[0_18px_50px_-20px_rgba(139,147,255,0.45)] dark:border-white/[0.07]"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-black uppercase tracking-wider ${k.chip}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {k.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted/40 transition group-hover:translate-x-0.5 group-hover:text-[var(--wow-fg)]" />
                </div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-mono text-lg font-black tabular-nums text-[var(--wow-fg)]">
                    {k.solved}
                    <span className="text-xs font-bold text-muted"> / {k.total}</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold tabular-nums text-muted">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
                  <div className={`h-full rounded-full ${k.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </Link>
              </WowReveal>
            );
          })}
        </section>

        {/* ── 3. Continue where you left off ──────────────────────────── */}
        {continueCards.length > 0 && (
          <section className="space-y-5">
            <OrbitDivider label={`Continue · ${continueCards.length} in progress`} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {continueCards.map((c, i) => (
                <WowReveal key={c.slug} delay={i * 0.07} className="h-full">
                <Link
                  href={`/challenges/${c.slug}/attempt${c.isMulti ? `?step=${c.resumeStep}` : ""}`}
                  className="group relative rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-5 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm overflow-hidden h-full hover:-translate-y-1 hover:border-[#8b93ff]/40 hover:shadow-[0_18px_50px_-20px_rgba(139,147,255,0.45)] dark:border-white/[0.07]"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b93ff]/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-lg bg-[#8b93ff]/10 border border-[#8b93ff]/25 flex items-center justify-center text-[#8b93ff] shrink-0 group-hover:scale-105 transition-transform">
                        <Play className="w-3 h-3 fill-current translate-x-px" />
                      </div>

                      {c.isMulti ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8b93ff]/10 border border-[#8b93ff]/25 text-[11px] font-black uppercase tracking-wider text-[#8b93ff] font-mono">
                          <Layers className="w-2.5 h-2.5" />
                          {c.total} Steps
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--wow-stage)] text-[11px] font-bold uppercase tracking-wider text-muted font-mono">
                          Single round
                        </span>
                      )}

                      <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-[var(--wow-stage)] text-muted font-mono tracking-wider ml-auto">
                        {c.difficulty}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-[var(--wow-fg)] text-sm leading-snug line-clamp-2 group-hover:text-[#8b93ff] transition-colors">
                      {c.title}
                    </h3>
                  </div>

                  {c.isMulti ? (
                    <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.07] relative z-10">
                      <div className="flex items-center justify-between text-[11px] text-muted font-mono font-bold mb-2">
                        <span className="uppercase tracking-wider">Solved steps</span>
                        <span className="text-[var(--wow-fg)] font-black tabular-nums">{c.passed} / {c.total}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#8b93ff] to-[#22d3ee] rounded-full transition-all duration-500"
                          style={{ width: `${(c.passed / c.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.07] relative z-10 flex items-center justify-between text-[11px] text-muted font-mono font-bold">
                      <span className="uppercase tracking-widest">Resume</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#8b93ff] transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </Link>
                </WowReveal>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Recent activity ──────────────────────────────────────── */}
        {recentAttempts.length > 0 && (
          <section className="space-y-5">
            <OrbitDivider label="Recent activity" />
            <WowReveal>
            <ul className="rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] backdrop-blur-sm divide-y divide-black/[0.06] dark:divide-white/[0.06] dark:border-white/[0.07] overflow-hidden">
              {recentAttempts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/challenges/${a.challenge.slug}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--wow-stage)]"
                  >
                    {a.status === "passed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : a.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-rose-500/70 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-amber-500 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[var(--wow-fg)] truncate">{a.challenge.title}</span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted/70 shrink-0">
                      {a.status.replace("_", " ")}
                    </span>
                    {a.durationSec != null && (
                      <span className="hidden sm:inline text-[11px] text-muted font-mono tabular-nums shrink-0">
                        {Math.floor(a.durationSec / 60)}m {a.durationSec % 60}s
                      </span>
                    )}
                    <span className="text-[11px] text-muted/60 ml-auto shrink-0">
                      <RelativeTime iso={a.startedAt.toISOString()} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            </WowReveal>
          </section>
        )}

        {/* ── 5. Staff picks ──────────────────────────────────────────── */}
        {featuredChallenges.length > 0 && (
          <section className="space-y-5">
            <OrbitDivider label="Staff picks" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {featuredChallenges.map((c, i) => {
                const isMulti = c._count.steps > 1;
                const teaserText = c.description
                  .replace(/^\s*#{1,6}\s.*$/gm, "")
                  .replace(/[*_`>]+/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 120) + "…";

                return (
                  <WowReveal key={c.id} delay={i * 0.07} className="h-full">
                  <Link
                    href={`/challenges/${c.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 bg-[var(--wow-card)] border border-black/[0.06] dark:border-white/[0.07] backdrop-blur-sm hover:border-[#ffe600]/50 hover:shadow-[0_18px_50px_-20px_rgba(255,230,0,0.3)] h-full"
                  >
                    <div
                      className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ffe600]/[0.07] blur-3xl pointer-events-none"
                      aria-hidden
                    />

                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="relative flex items-center gap-2.5 mb-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffe600]/10 border border-[#ffe600]/30 text-[11px] font-black uppercase tracking-widest text-[#9a8200] dark:text-[#ffe600] font-mono">
                            <Sparkles className="w-2.5 h-2.5" />
                            {c.difficulty}
                          </span>
                          {isMulti && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--wow-stage)] text-[11px] font-bold uppercase tracking-wider text-muted font-mono">
                              <Layers className="w-2.5 h-2.5" />
                              {c._count.steps} Steps
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-muted/70 font-mono tracking-wide tabular-nums">
                            <Clock className="w-3 h-3 text-muted/50" />
                            {c.estimatedMinutes}m
                          </span>
                        </div>

                        <h3 className="relative font-extrabold text-[var(--wow-fg)] text-base tracking-tight leading-snug line-clamp-2 mb-2 group-hover:text-[#9a8200] dark:group-hover:text-[#ffe600] transition-colors">
                          {c.title}
                        </h3>

                        <p className="relative text-xs text-muted leading-relaxed line-clamp-3 mb-6 font-sans">
                          {teaserText}
                        </p>
                      </div>
                    </div>

                    <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-[11px] font-black tracking-widest uppercase w-fit transition group-hover:scale-105 mt-auto">
                      <Play className="w-3 h-3 fill-current translate-x-px" />
                      Start challenge
                    </div>
                  </Link>
                  </WowReveal>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Field log: signals from real practice ── */}
        <section className="space-y-5">
          <OrbitDivider label="Field log" />
          <FieldLogMarquee />
        </section>

        {/* ── 6. Career tracks ────────────────────────────────────────── */}
        <section className="space-y-5 pt-2">
          <OrbitDivider label="Career tracks" />
          <TracksCarousel items={items} signedIn={!!userId} />
        </section>

        {/* ── 7. Full catalog ─────────────────────────────────────────── */}
        <section id="catalog" className="scroll-mt-24 space-y-5 pt-4">
          <OrbitDivider label={`Full catalog · ${items.length} available`} />

          <div className="rounded-3xl border border-black/[0.06] bg-[var(--wow-card)] p-4 backdrop-blur-sm transition-all duration-300 dark:border-white/[0.07] sm:p-6">
            <ChallengeList items={items} signedIn={!!userId} />
          </div>
        </section>
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
