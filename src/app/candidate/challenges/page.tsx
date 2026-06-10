import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { validatePageAccess } from "@/lib/settings";
import ChallengeList from "../../challenges/ChallengeList";
import TracksCarousel from "../../challenges/TracksCarousel";
import {
  Clock,
  Layers,
  Play,
  Sparkles,
  Target,
  Trophy,
  Flame,
  Award,
  ChevronRight,
  Bookmark,
  Zap,
  TrendingUp,
  Activity,
  Gauge,
  Terminal,
} from "lucide-react";

export const metadata = {
  title: "Candidate Challenges Engine — Interviewpad",
  description: "Bespoke developer prep cockpit for mastering core algorithms and React architectures.",
};

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

  // Fetch active enrollments for ContinueStrip
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

  // Compute total stats
  let totalMinutes = 0;
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;
  for (const c of items) {
    totalMinutes += c.estimatedMinutes;
    if (c.difficulty === "easy") easyCount++;
    else if (c.difficulty === "medium") mediumCount++;
    else if (c.difficulty === "hard") hardCount++;
  }
  const totalHours = Math.max(1, Math.round(totalMinutes / 60));
  const solvedCount = Object.values(attemptsByChallenge).filter((v) => v === "passed").length;
  const passRate = items.length > 0 ? Math.round((solvedCount / items.length) * 100) : 0;

  // Real-time custom competency scores based on user attempts
  const competencyDSA = Math.min(100, 20 + solvedCount * 12);
  const competencySyntax = Math.min(100, 35 + solvedCount * 8);
  const competencySchema = Math.min(100, 15 + solvedCount * 14);
  const competencyRuntime = Math.min(100, 40 + solvedCount * 7);

  // Static mock streak array to build a beautiful visual checklist widget
  const streakDays = [
    { day: "M", active: true, label: "Mon" },
    { day: "T", active: true, label: "Tue" },
    { day: "W", active: true, label: "Wed" },
    { day: "T", active: true, label: "Thu" },
    { day: "F", active: true, label: "Fri" },
    { day: "S", active: false, label: "Sat" },
    { day: "S", active: false, label: "Sun" },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#07080c] text-fg font-sans py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Dynamic tech-grid background layers */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,230,0,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,230,0,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-accent/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[450px] h-[450px] rounded-full bg-emerald-500/3 blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-6xl space-y-12 relative z-10">

        {/* 1. FUTURISTIC COCKPIT FLIGHT DECK HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border dark:border-transparent bg-white dark:bg-[#0f111c] p-6 md:p-8 lg:p-10 shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--accent-glow)_0%,transparent_50%)] opacity-30 pointer-events-none" />
          
          <div className="flex flex-col gap-8 relative z-10">
            {/* Header branding strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 dark:border-border/10 pb-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent">
                  <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                    challenges core cockpit
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg leading-tight">
                  Developer Flight Deck, <span className="bg-gradient-to-r from-accent via-amber-400 to-orange-400 bg-clip-text text-transparent">{firstName}</span>.
                </h1>
                <p className="text-sm text-muted max-w-2xl leading-relaxed">
                  Calibrate algorithmic performance, design reliable architectures, and construct type-safe solutions inside a proctored, high-fidelity developer flight deck.
                </p>
              </div>

              {/* High-Tech Badge Holder */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#161826] p-3 rounded-2xl border border-border/30 dark:border-transparent shrink-0">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                  <Award className="w-5.5 h-5.5" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-muted">Diagnostic Calibration</div>
                  <div className="text-xs font-black text-fg mt-0.5">Level 2 Engineer</div>
                </div>
              </div>
            </div>

            {/* Premium Modular Telemetry Grid (Diagnostics & Streak) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Dial Panel - 35% */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50/40 dark:from-transparent dark:bg-[#151726] border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none text-center relative overflow-hidden transition-all duration-300">
                <div className="relative flex items-center justify-center">
                  {/* SVG Radial Calibration Dial */}
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      className="stroke-slate-200 dark:stroke-[#202334]"
                      strokeWidth="9"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      className="stroke-accent"
                      strokeWidth="9"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - Math.max(5, passRate) / 100)}
                      strokeLinecap="round"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.45))",
                        transition: "stroke-dashoffset 1s ease-in-out",
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black font-mono text-fg">{passRate}%</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-muted/80 mt-0.5">solved rate</span>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-sm font-bold text-fg">Overall Calibration</h3>
                  <p className="text-[10px] text-muted max-w-[180px] leading-relaxed">
                    Weighted performance indexing from solved modules.
                  </p>
                </div>
              </div>

              {/* Skill telemetry panel - 45% */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50/40 dark:from-transparent dark:bg-[#151726] border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none flex flex-col justify-between transition-all duration-300">
                <div className="space-y-4 w-full">
                  <div className="flex items-center gap-2 border-b border-border/20 dark:border-border/10 pb-2">
                    <Activity className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-fg">Skill Dimensions Telemetry</span>
                  </div>
                  
                  {/* Dimension Bars */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-muted">
                        <span>DSA STRATEGY</span>
                        <span className="font-mono text-fg">{competencyDSA}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full shadow-[0_0_6px_rgba(var(--accent-rgb),0.3)] transition-all duration-700"
                          style={{ width: `${competencyDSA}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-muted">
                        <span>SYNTAX PRECISION</span>
                        <span className="font-mono text-fg">{competencySyntax}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full shadow-[0_0_6px_rgba(var(--accent-rgb),0.3)] transition-all duration-700"
                          style={{ width: `${competencySyntax}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-muted">
                        <span>SCHEMA DESIGN & DEPTH</span>
                        <span className="font-mono text-fg">{competencySchema}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full shadow-[0_0_6px_rgba(var(--accent-rgb),0.3)] transition-all duration-700"
                          style={{ width: `${competencySchema}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-muted">
                        <span>RUNTIME PERFORMANCE</span>
                        <span className="font-mono text-fg">{competencyRuntime}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#202334] overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full shadow-[0_0_6px_rgba(var(--accent-rgb),0.3)] transition-all duration-700"
                          style={{ width: `${competencyRuntime}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Streak Panel - 20% */}
              <div className="lg:col-span-3 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50/40 dark:from-transparent dark:bg-[#151726] border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none relative overflow-hidden transition-all duration-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted">Code Streak</span>
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="w-4 h-4 fill-current animate-pulse" />
                      <span className="text-xs font-black font-mono">5 Days</span>
                    </div>
                  </div>
                  <h3 className="font-black text-fg text-sm">Consistent Progress</h3>
                  <p className="text-[10px] text-muted leading-relaxed">
                    Keep coding daily to retain schema indexing muscle memory.
                  </p>
                </div>

                {/* Calendar strip alignment widget */}
                <div className="mt-4 pt-3 border-t border-border/20 dark:border-border/10 flex items-center justify-between gap-1">
                  {streakDays.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-[8px] font-bold text-muted/60">{d.day}</span>
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black tracking-tighter ${
                          d.active
                            ? "bg-orange-500/10 border border-orange-500/35 text-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.15)]"
                            : "bg-slate-200/50 dark:bg-[#202334] text-muted/30"
                        }`}
                        title={d.label}
                      >
                        {d.active ? "✓" : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick HUD Metrics Strip - Standardized Padding & Margins */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-6 border-t border-border/40 dark:border-transparent">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131522] border border-border/40 dark:border-transparent flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted">Curated Challenges</span>
                <span className="text-2xl font-black font-mono text-fg mt-2">{items.length}+</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131522] border border-border/40 dark:border-transparent flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted">Pillar Difficulty</span>
                <span className="text-[11px] font-bold text-fg mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-emerald-500 font-mono">E: {easyCount}</span>
                  <span className="text-amber-500 font-mono">M: {mediumCount}</span>
                  <span className="text-rose-500 font-mono">H: {hardCount}</span>
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131522] border border-border/40 dark:border-transparent flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted">Practice Hours</span>
                <span className="text-2xl font-black font-mono text-fg mt-2">{totalHours}h+</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131522] border border-border/40 dark:border-transparent flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted">Completion Badge</span>
                <span className="text-xs font-black text-emerald-500 mt-2 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg w-fit">
                  <Trophy className="w-3.5 h-3.5" />
                  Calibrated
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CONTINUE PRACTICE CONTROL ROOM */}
        {continueCards.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Active Missions Sector
              </h2>
              <span className="text-[10px] text-muted font-mono tracking-wider bg-white dark:bg-[#0f111c] border border-border/40 dark:border-transparent px-3 py-1 rounded-full shadow-sm">
                {continueCards.length} Active Slots
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
                          Single Round
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
                        <span className="uppercase tracking-wider">Attempted Steps</span>
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
                      <span className="uppercase tracking-widest">RESUME ARENA</span>
                      <ChevronRight className="w-3.5 h-3.5 text-accent transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3. STAFF COMMENDATION RECOMMENDATIONS (Curations) */}
        {featuredChallenges.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                Staff Recommendations
              </h2>
              <span className="text-[10px] text-muted font-mono tracking-wider bg-white dark:bg-[#0f111c] border border-border/40 dark:border-transparent px-3 py-1 rounded-full shadow-sm">
                Curated Picks
              </span>
            </div>

            {/* Curations Grid - Force Equal Heights (Flexbox layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {featuredChallenges.map((c) => {
                const isMulti = c._count.steps > 1;
                const teaserText = c.description
                  .replace(/^\s*#{1,6}\s.*$/gm, "")
                  .replace(/[*_`>]+/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 120) + "…";

                // Dynamic styles and pastel highlights matching difficulty levels to elevate light and dark theme contrast
                const cardStyleMap: Record<string, string> = {
                  easy: "bg-gradient-to-br from-emerald-50/15 via-white to-white hover:bg-emerald-50/35 dark:from-transparent dark:bg-[#14182b] hover:dark:bg-[#181d35] border border-emerald-100/60 dark:border-transparent shadow-[0_4px_20px_rgba(16,185,129,0.015)] shadow-emerald-500/5 hover:shadow-emerald-500/10",
                  medium: "bg-gradient-to-br from-amber-50/15 via-white to-white hover:bg-amber-50/35 dark:from-transparent dark:bg-[#14182b] hover:dark:bg-[#181d35] border border-amber-100/60 dark:border-transparent shadow-[0_4px_20px_rgba(245,158,11,0.015)] shadow-amber-500/5 hover:shadow-amber-500/10",
                  hard: "bg-gradient-to-br from-rose-50/15 via-white to-white hover:bg-rose-50/35 dark:from-transparent dark:bg-[#14182b] hover:dark:bg-[#181d35] border border-rose-100/60 dark:border-transparent shadow-[0_4px_20px_rgba(244,63,94,0.015)] shadow-rose-500/5 hover:shadow-rose-500/10",
                };
                const cardClass = cardStyleMap[c.difficulty as "easy" | "medium" | "hard"] || "bg-white border border-border dark:border-transparent";

                return (
                  <Link
                    key={c.id}
                    href={`/challenges/${c.slug}`}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-0.5 ${cardClass}`}
                  >
                    <div
                      className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/5 blur-3xl pointer-events-none"
                      aria-hidden
                    />

                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Upper card meta bar */}
                        <div className="relative flex items-center gap-2.5 mb-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-[9px] font-black uppercase tracking-widest text-accent font-mono">
                            <Sparkles className="w-2.5 h-2.5 animate-pulse" />
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

                        {/* Title & snippet */}
                        <h3 className="relative font-extrabold text-fg text-base tracking-tight leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                          {c.title}
                        </h3>

                        <p className="relative text-xs text-muted leading-relaxed line-clamp-3 mb-6 font-sans">
                          {teaserText}
                        </p>
                      </div>
                    </div>

                    {/* Quick launcher action button aligned neatly at the bottom */}
                    <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-bg text-[11px] font-black tracking-widest uppercase w-fit group-hover:bg-accent-soft transition-colors shadow shadow-accent/25 mt-auto">
                      <Play className="w-3 h-3 fill-current translate-x-0.5" />
                      Engage Arena
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. DEVELOPER CAREER TRACK MASTERCLASS COCKPIT */}
        <div className="pt-2">
          <TracksCarousel items={items} signedIn={!!userId} />
        </div>

        {/* 5. STANDARD PRACTICE GRID - Wrapped in beautiful dashboard block */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between border-b border-border/40 dark:border-border/10 pb-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
              <Award className="w-3.5 h-3.5" />
              Practice Grid Database
            </h2>
            <span className="text-[10px] text-muted font-mono tracking-wider bg-white dark:bg-[#0f111c] border border-border/40 dark:border-transparent px-3 py-1 rounded-full shadow-sm">
              {items.length} Challenges available
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
