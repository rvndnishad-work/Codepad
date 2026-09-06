"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import {
  Play,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Monitor,
  Terminal,
  Users,
  Clock,
  TrendingUp,
  Code,
  Zap,
  Check,
  History,
  Layers,
  Snowflake,
  Flame,
  Swords,
} from "lucide-react";
import DeleteSessionButton from "./DeleteSessionButton";
import StackWizard from "./StackWizard";
import AIPracticeLauncher from "./AIPracticeLauncher";
import CountUp from "@/components/scroll/CountUp";
import WowReveal from "@/components/wow/WowReveal";

gsap.registerPlugin(ScrollTrigger);

const CollidingPlanets3D = dynamic(() => import("../candidate/interview/_wow/CollidingPlanets3D"), { ssr: false });

type PracticeSession = {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: Date;
  verdict: string | null;
  notes: string | null;
  rubric: {
    ratings: string;
    notes: string | null;
  } | null;
};

type Props = {
  userId: string;
  userName: string | null;
  arenaSettings: {
    showMockToDeveloper: boolean;
    showScheduleToDeveloper: boolean;
    showMockToRecruiter: boolean;
    showScheduleToRecruiter: boolean;
  };
  myPracticeSessions: PracticeSession[];
};

function readinessTier(index: number, completed: number): string {
  if (completed === 0) return "No sessions yet";
  if (index >= 85) return "Interview ready";
  if (index >= 70) return "Almost there";
  if (index >= 50) return "Making progress";
  if (index >= 30) return "Warming up";
  return "Just started";
}

/** The three training modes, rendered as challenger rows (not boxes). */
const MODES = [
  {
    id: "mock",
    n: "01",
    title: "Mock interview",
    desc: "A realistic interview with a timer and automatic scoring — just like the real thing.",
    chips: ["Timed", "Auto-scored"],
    icon: Monitor,
    href: "/interview/new?type=mock&role=candidate",
    num: "text-purple-500/30 group-hover:text-purple-500",
    tile: "border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-400",
    wash: "from-purple-500/[0.12]",
    ring: "hover:border-purple-500/40",
    shadow: "hover:shadow-[0_18px_50px_-20px_rgba(168,85,247,0.45)]",
    enter: "group-hover:bg-purple-500 group-hover:border-purple-500",
    gate: true,
  },
  {
    id: "challenges",
    n: "02",
    title: "Coding challenges",
    desc: "Short problems on data structures, algorithms, and frameworks. Filter by topic and difficulty.",
    chips: ["Self-paced", "All stacks"],
    icon: Terminal,
    href: "/candidate/challenges",
    num: "text-emerald-500/30 group-hover:text-emerald-500",
    tile: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    wash: "from-emerald-500/[0.12]",
    ring: "hover:border-emerald-500/40",
    shadow: "hover:shadow-[0_18px_50px_-20px_rgba(16,185,129,0.45)]",
    enter: "group-hover:bg-emerald-500 group-hover:border-emerald-500",
    gate: false,
  },
  {
    id: "playgrounds",
    n: "03",
    title: "Playgrounds",
    desc: "An empty editor with zero setup. Think through a problem alone or invite a friend to join.",
    chips: ["Blank canvas", "Solo or friends"],
    icon: Users,
    href: "/playgrounds",
    num: "text-sky-500/30 group-hover:text-sky-500",
    tile: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    wash: "from-sky-500/[0.12]",
    ring: "hover:border-sky-500/40",
    shadow: "hover:shadow-[0_18px_50px_-20px_rgba(14,165,233,0.45)]",
    enter: "group-hover:bg-sky-500 group-hover:border-sky-500",
    gate: false,
  },
];

export default function CandidateCockpitClient({
  userId,
  userName,
  arenaSettings,
  myPracticeSessions,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(5);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aiPracticeOpen, setAiPracticeOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  const firstName = userName?.split(" ")[0] ?? "there";

  // Freeze the planets offscreen / while scrolling / on reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
      return;
    }
    const el = root.current?.querySelector("[data-planets]");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0.02 });
    obs.observe(el);
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setScrolling(false), 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  // GSAP entrance + backdrop parallax (skipped for reduced motion).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".ci-line", { yPercent: 115, duration: 1.05, stagger: 0.12 })
        .from(".ci-fade", { y: 24, opacity: 0, duration: 0.85, stagger: 0.08 }, "-=0.6")
        .from(".ci-3d", { opacity: 0, scale: 1.05, duration: 1.6 }, 0);
      gsap.to(".ci-bg", {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const completed = myPracticeSessions.filter((s) => s.status === "completed");
    return {
      total: myPracticeSessions.length,
      completed: completed.length,
      passed: myPracticeSessions.filter((s) => s.verdict === "success").length,
    };
  }, [myPracticeSessions]);

  const passRate = stats.completed > 0 ? Math.round((stats.passed / stats.completed) * 100) : 0;

  // Average skill scores from graded sessions (scale 1–5).
  const skills = useMemo(() => {
    let code = 0, comm = 0, solve = 0, n = 0;
    for (const s of myPracticeSessions) {
      if (!s.rubric) continue;
      try {
        const ratings = JSON.parse(s.rubric.ratings) as Record<string, number>;
        if (ratings.CodeQuality !== undefined) code += ratings.CodeQuality;
        if (ratings.Communication !== undefined) comm += ratings.Communication;
        if (ratings.ProblemSolving !== undefined) solve += ratings.ProblemSolving;
        n++;
      } catch {
        /* skip malformed rubric */
      }
    }
    if (n === 0) return { code: 0, comm: 0, solve: 0, count: 0 };
    return { code: code / n, comm: comm / n, solve: solve / n, count: n };
  }, [myPracticeSessions]);

  // Readiness score: 50% pass rate + 35% average skill + 15% experience.
  const readinessIndex = useMemo(() => {
    if (stats.completed === 0) return 0;
    const avg = (skills.code + skills.comm + skills.solve) / 3;
    return Math.round(passRate * 0.5 + ((avg / 5) * 100) * 0.35 + Math.min(100, (stats.completed / 8) * 100) * 0.15);
  }, [stats.completed, passRate, skills]);

  const visibleSessions = myPracticeSessions.slice(0, visibleCount);

  return (
    <div ref={root} className="min-h-screen bg-[var(--wow-bg)] text-[var(--wow-fg)] transition-colors">
      {/* ── Collision hero ── */}
      <section data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#07070e] text-white">
        <div aria-hidden className="ci-bg pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-180px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#8b93ff]/15 blur-[130px]" />
          <div className="wow-grid-bg absolute inset-0 opacity-70" />
        </div>
        <div aria-hidden data-planets className="ci-3d absolute inset-0 transform-gpu will-change-transform">
          <CollidingPlanets3D paused={paused || scrolling} />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#07070e]/60 via-transparent to-[#07070e]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_58%_48%_at_50%_42%,rgba(7,7,14,0.82),transparent_70%)]" />

        {/* planet captions */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-5 z-10 hidden items-center justify-between px-8 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35 md:flex">
          <span className="flex items-center gap-1.5"><Snowflake className="h-3 w-3 text-sky-300" /> Ice // stay calm</span>
          <span className="flex items-center gap-1.5">Bring heat <Flame className="h-3 w-3 text-orange-400" /> // fire</span>
        </div>

        <div className="relative z-20 mx-auto max-w-4xl px-4 pb-16 pt-24 text-center md:pt-32">
          <p className="ci-fade inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Practice arena
          </p>

          <h1 className="wow-font-display mt-6 text-6xl leading-[0.92] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] md:text-8xl">
            <span className="block overflow-hidden pb-1"><span className="ci-line block">TRAIN FOR</span></span>
            <span className="block overflow-hidden pb-2"><span className="ci-line wow-gradient-text block pb-2">THE REAL THING.</span></span>
          </h1>

          <p className="ci-fade mx-auto mt-5 max-w-xl text-balance text-[15px] font-medium leading-relaxed text-white/70 md:text-base">
            {firstName !== "there" ? `${firstName}, pick ` : "Pick "}a workout below — timed mock
            interviews with automatic scoring, coding challenges, or a blank
            playground. Your progress is tracked underneath.
          </p>

          <div className="ci-fade mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[13px] font-black uppercase tracking-wider text-black shadow-[0_6px_24px_-8px_rgba(255,255,255,0.5)] transition hover:scale-105 active:scale-95"
            >
              <Layers className="h-4 w-4" />
              Start practicing
            </button>
            <button
              onClick={() => setAiPracticeOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-7 py-3 text-[13px] font-black uppercase tracking-wider text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/[0.1] active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-[#ffe600]" />
              AI mock interview
            </button>
          </div>

          <div className="ci-fade mt-8 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55 sm:gap-10">
            <span><strong className="wow-font-display text-xl normal-case tabular-nums tracking-normal text-white"><CountUp value={stats.total} /></strong> Sessions</span>
            <span><strong className="wow-font-display text-xl normal-case tabular-nums tracking-normal text-white"><CountUp value={stats.completed} /></strong> Completed</span>
            <span><strong className="wow-font-display text-xl normal-case tabular-nums tracking-normal text-[#7ef0c1]">{passRate}%</strong> Pass rate</span>
          </div>
        </div>
      </section>

      {/* ── Choose your training ── */}
      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-32 pt-14">
        <section>
          <WowReveal>
            <div className="mb-6">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#22d3ee]">
                <Swords className="h-3.5 w-3.5" /> Three ways to train
              </p>
              <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">
                CHOOSE YOUR FIGHTER.
              </h2>
            </div>
          </WowReveal>
          <div className="flex flex-col gap-3">
            {MODES.filter((m) => !m.gate || arenaSettings.showMockToDeveloper).map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              >
                <Link
                  href={m.href}
                  className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 dark:border-white/[0.07] sm:gap-5 sm:p-5 ${m.ring} ${m.shadow}`}
                >
                  <span aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${m.wash} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <span className={`wow-font-display relative hidden text-4xl tabular-nums transition-colors sm:block ${m.num}`}>{m.n}</span>
                  <span className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${m.tile}`}>
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-lg font-extrabold tracking-tight text-[var(--wow-fg)]">{m.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">{m.desc}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {m.chips.map((c) => (
                        <span key={c} className="rounded-md border border-black/[0.06] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted dark:border-white/10">{c}</span>
                      ))}
                    </span>
                  </span>
                  <span className="relative flex shrink-0 items-center gap-2.5">
                    <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors group-hover:text-[var(--wow-fg)] md:block">Enter</span>
                    <span className={`grid h-11 w-11 place-items-center rounded-full border border-black/10 text-muted transition-all duration-300 group-hover:text-white dark:border-white/15 ${m.enter}`}>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Progress ── */}
        <section>
          <WowReveal>
            <div className="mb-6">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#8b93ff]">
                <TrendingUp className="h-3.5 w-3.5" /> Season record
              </p>
              <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">
                YOUR FORM CARD.
              </h2>
            </div>
          </WowReveal>
          <WowReveal>
            <div className="relative overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-[var(--wow-card)] backdrop-blur-sm dark:border-white/[0.07]">
              <div aria-hidden className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#8b93ff]/10 blur-3xl" />
              <div className="relative flex items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.07]">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted">
                  Candidate form card // season 2026
                </p>
                <span className="inline-flex items-center rounded-full border border-[#8b93ff]/30 bg-[#8b93ff]/10 px-3 py-1 text-xs font-bold text-[#8b93ff]">
                  {readinessTier(readinessIndex, stats.completed)}
                </span>
              </div>

              <div className="relative grid gap-8 p-6 md:grid-cols-[auto_auto_1fr] md:items-center md:gap-10 md:p-8">
                {/* identity */}
                <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] font-mono text-2xl font-black text-white shadow-lg">
                    {(firstName?.[0] ?? "?").toUpperCase()}
                  </span>
                  <span>
                    <span className="block max-w-[140px] truncate text-lg font-extrabold leading-tight text-[var(--wow-fg)]">{firstName}</span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted tabular-nums">
                      {stats.total} session{stats.total === 1 ? "" : "s"}
                    </span>
                  </span>
                </div>

                {/* overall */}
                <div className="md:border-x md:border-black/[0.06] md:px-10 md:dark:border-white/[0.07]">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">Overall</p>
                  <p className="wow-font-display text-7xl tabular-nums leading-none text-[var(--wow-fg)] md:text-8xl">
                    {stats.completed === 0 ? "—" : <><CountUp value={readinessIndex} /><span className="text-3xl text-muted md:text-4xl">%</span></>}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {stats.completed === 0
                      ? "No sessions yet — your card fills in after your first graded session."
                      : "Readiness across everything below."}
                  </p>
                </div>

                {/* attributes */}
                <div className="space-y-4">
                  {[
                    { label: "Code quality", icon: Code, value: skills.code, bar: "from-purple-500 to-indigo-500", text: "text-purple-600 dark:text-purple-400" },
                    { label: "Problem solving", icon: Zap, value: skills.solve, bar: "from-emerald-500 to-teal-500", text: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Communication", icon: Users, value: skills.comm, bar: "from-sky-500 to-blue-500", text: "text-sky-600 dark:text-sky-400" },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm font-bold text-[var(--wow-fg)]">
                        <span className="flex items-center gap-1.5">
                          <s.icon className={`h-4 w-4 ${s.text}`} />
                          {s.label}
                        </span>
                        <span className={`font-mono font-black tabular-nums ${s.text}`}>
                          {skills.count > 0 ? s.value.toFixed(1) : "—"} / 5.0
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${skills.count > 0 ? (s.value / 5) * 100 : 0}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          className={`h-full rounded-full bg-gradient-to-r ${s.bar}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-black/[0.06] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted dark:border-white/[0.07]">
                <span>Pass <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">{passRate}%</strong></span>
                <span>Done <strong className="tabular-nums text-[var(--wow-fg)]">{stats.completed}</strong></span>
                <span>Total <strong className="tabular-nums text-[var(--wow-fg)]">{stats.total}</strong></span>
                <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal">
                  {stats.completed === 0 ? (
                    <Link href="/interview/new?type=mock&role=candidate" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 font-sans text-[11px] font-black uppercase tracking-wider text-black transition hover:scale-105">
                      <Play className="h-3 w-3 fill-current" /> Start your first session
                    </Link>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Updated after every session
                    </>
                  )}
                </span>
              </div>
            </div>
          </WowReveal>
        </section>

        {/* ── Session history ── */}
        <section>
          <WowReveal>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ffb64d]">
                  <History className="h-3.5 w-3.5" /> History
                </p>
                <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">
                  YOUR PAST SESSIONS.
                </h2>
              </div>
              <span className="rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] px-3 py-1 font-mono text-[11px] font-bold text-muted">
                {myPracticeSessions.length} total
              </span>
            </div>
          </WowReveal>

          <WowReveal delay={0.05}>
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] backdrop-blur-sm dark:border-white/[0.07]">
              {myPracticeSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-black/[0.06] bg-[var(--wow-stage)] text-muted dark:border-white/[0.07]">
                    <Code className="h-6 w-6" />
                  </div>
                  <div className="max-w-xs space-y-1.5">
                    <h3 className="text-sm font-extrabold text-[var(--wow-fg)]">No sessions yet</h3>
                    <p className="text-xs leading-relaxed text-muted">
                      Run your first mock interview or solve a challenge — your history will show up here.
                    </p>
                  </div>
                  <Link
                    href="/interview/new?type=mock&role=candidate"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black transition hover:scale-105 active:scale-95"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Start a mock interview
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col">
                  <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {visibleSessions.map((session) => {
                      const isScheduled = session.status === "scheduled";
                      const isInProgress = session.status === "in_progress";
                      const isCompleted = session.status === "completed";
                      const statusColor = isScheduled
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : isInProgress
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                      const statusText = isScheduled ? "Scheduled" : isInProgress ? "In progress" : "Completed";
                      const href = `/interview/${session.id}`;
                      return (
                        <li
                          key={session.id}
                          className="flex flex-col justify-between gap-4 px-5 py-5 transition-colors hover:bg-[var(--wow-stage)] sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <Link href={href} className="block truncate text-base font-extrabold text-[var(--wow-fg)] transition-colors hover:text-[#8b93ff]">
                              {session.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-muted">
                              <span className="flex items-center gap-1.5 font-mono">
                                <Clock className="h-3.5 w-3.5 text-muted/50" />
                                {new Date(session.createdAt).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {session.verdict && (
                                <span
                                  className={`text-xs font-bold uppercase tracking-wider ${
                                    session.verdict === "success"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : session.verdict === "failed"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {session.verdict === "success" ? "Passed" : session.verdict === "failed" ? "Failed" : "Needs review"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusColor} ${isInProgress ? "animate-pulse" : ""}`}>
                              {statusText}
                            </span>
                            <Link
                              href={href}
                              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                                isCompleted
                                  ? "border border-black/[0.06] text-[var(--wow-fg)] hover:border-[#8b93ff]/50 hover:text-[#8b93ff] dark:border-white/10"
                                  : "bg-[#8b93ff] text-white hover:brightness-110"
                              }`}
                            >
                              {isCompleted ? "Review" : isInProgress ? "Continue" : "Start"}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                            <DeleteSessionButton sessionId={session.id} size="default" />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {myPracticeSessions.length > visibleCount && (
                    <div className="flex justify-center border-t border-black/[0.06] bg-[var(--wow-stage)]/50 p-4 dark:border-white/[0.06]">
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 5)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-[var(--wow-card)] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[var(--wow-fg)] transition-all hover:border-[#8b93ff]/50 hover:text-[#8b93ff] active:scale-95 dark:border-white/10"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </WowReveal>
        </section>
      </main>

      <StackWizard open={wizardOpen} onClose={() => setWizardOpen(false)} type="mock" creatorRole="candidate" />
      <AIPracticeLauncher open={aiPracticeOpen} onClose={() => setAiPracticeOpen(false)} />
    </div>
  );
}
