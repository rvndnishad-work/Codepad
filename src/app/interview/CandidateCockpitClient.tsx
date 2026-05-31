"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  CheckCircle2,
  Activity,
  Calendar,
  ShieldCheck,
  Layers,
  Monitor,
  Terminal,
  Users,
  Play,
  Code,
  Zap,
  History,
  Sparkles,
  Clock,
  ArrowRight,
  ChevronRight,
  Plus,
  KeyRound,
  TrendingUp,
  Award,
  BookOpen,
  Settings,
  Radar,
  Gamepad2,
  BadgeAlert,
  Flame,
  Check,
  Sliders,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import DeleteSessionButton from "./DeleteSessionButton";

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

export default function CandidateCockpitClient({
  userId,
  userName,
  arenaSettings,
  myPracticeSessions,
}: Props) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(5);

  const firstName = userName?.split(" ")[0] ?? "there";

  // Calculate high-fidelity stats
  const stats = {
    total: myPracticeSessions.length,
    completed: myPracticeSessions.filter((s) => s.status === "completed").length,
    inFlight: myPracticeSessions.filter((s) => s.status === "in_progress").length,
    scheduled: myPracticeSessions.filter((s) => s.status === "scheduled").length,
    passed: myPracticeSessions.filter((s) => s.verdict === "success").length,
  };

  const passRate = stats.completed > 0 ? Math.round((stats.passed / stats.completed) * 100) : 0;

  // Parse Rubric Ratings to calculate dynamic cognitive skill pillars
  let avgCodeQuality = 0;
  let avgCommunication = 0;
  let avgProblemSolving = 0;
  let ratedCount = 0;

  myPracticeSessions.forEach((s) => {
    if (s.rubric) {
      try {
        const ratings = JSON.parse(s.rubric.ratings) as Record<string, number>;
        if (ratings.CodeQuality !== undefined) avgCodeQuality += ratings.CodeQuality;
        if (ratings.Communication !== undefined) avgCommunication += ratings.Communication;
        if (ratings.ProblemSolving !== undefined) avgProblemSolving += ratings.ProblemSolving;
        ratedCount++;
      } catch (e) {
        // Safe fallback
      }
    }
  });

  if (ratedCount > 0) {
    avgCodeQuality = parseFloat((avgCodeQuality / ratedCount).toFixed(1));
    avgCommunication = parseFloat((avgCommunication / ratedCount).toFixed(1));
    avgProblemSolving = parseFloat((avgProblemSolving / ratedCount).toFixed(1));
  } else {
    // Default calibration baseline if no ratings yet
    avgCodeQuality = 3.0;
    avgCommunication = 3.0;
    avgProblemSolving = 3.0;
  }

  // Calculate a highly realistic and mathematically sound Readiness Index
  // Weighted: 50% Pass Rate + 35% Normalized Cognitive Average + 15% Practice Experience
  const completedSessions = stats.completed;
  const avgCognitiveScore = ratedCount > 0 ? (avgCodeQuality + avgCommunication + avgProblemSolving) / 3 : 3.0;
  const cognitiveNormalized = (avgCognitiveScore / 5.0) * 100;
  const experienceFactor = Math.min(100, (completedSessions / 8) * 100);

  let readinessIndex = 0;
  if (completedSessions > 0) {
    readinessIndex = Math.round(
      passRate * 0.5 + 
      cognitiveNormalized * 0.35 + 
      experienceFactor * 0.15
    );
  } else {
    readinessIndex = 0;
  }

  // progressive mock lists
  const visibleSessions = myPracticeSessions.slice(0, visibleCount);

  return (
    <div className="space-y-8 font-sans select-none animate-fade-in pb-16">
      
      {/* GLOWING COCKPIT HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 dark:border-white/[0.06] bg-panel/60 dark:bg-panel/40 p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.02] dark:bg-indigo-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-[300px] h-[300px] rounded-full bg-purple-500/[0.02] dark:bg-purple-500/5 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3.5 flex-1 col-span-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest font-mono">prep arena console</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-fg leading-tight">
              Welcome back to flight deck, <span className="bg-gradient-to-r from-indigo-600 via-accent to-purple-600 dark:from-indigo-400 dark:via-accent dark:to-purple-400 bg-clip-text text-transparent">{firstName}</span>.
            </h1>
            <p className="text-sm text-muted/95 max-w-xl leading-relaxed">
              Solve algorithmic modules, deploy custom playgrounds, or undergo proctored interview simulations. Your private training cockpit is fully calibrated.
            </p>
          </div>

          {/* Quick HUD Meter */}
          <div className="flex items-center gap-4 bg-surface/50 dark:bg-white/[0.02] border border-border/60 dark:border-white/[0.04] p-4.5 rounded-2xl shrink-0 backdrop-blur-md shadow-sm">
            <div className="relative w-16 h-16 rounded-full border-2 border-border dark:border-white/[0.06] flex items-center justify-center bg-bg/50 dark:bg-black/20">
              {/* Simple CSS ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent border-r-transparent animate-spin" 
                style={{ animationDuration: "12s" }}
              />
              <span className="text-sm font-mono font-black text-indigo-655 text-indigo-600 dark:text-indigo-400">{readinessIndex}%</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted font-mono block">readiness rating</span>
              <p className="text-xs text-fg font-bold">Calibration Active</p>
              <p className="text-[11px] text-muted leading-none">Based on completed rounds</p>
            </div>
          </div>
        </div>
      </div>

      {/* CORE ARENAS LAUNCHPAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LAUNCHPAD 1: SIMULATOR */}
        {arenaSettings.showMockToDeveloper && (
          <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 dark:border-purple-500/10 bg-purple-500/[0.01] dark:bg-purple-950/[0.03] hover:bg-purple-500/[0.03] dark:hover:bg-purple-950/[0.08] p-6 flex flex-col justify-between transition-all duration-300 hover:border-purple-500/40 dark:hover:border-purple-500/30 hover:shadow-[0_4px_20px_rgba(168,85,247,0.06)] dark:hover:shadow-[0_0_24px_-4px_rgba(168,85,247,0.15)] hover:scale-[1.01]">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/5 blur-[30px] pointer-events-none" />
            
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-inner">
                <Monitor className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-fg tracking-tight">Interview Simulator</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 font-mono">
                  AI Proctoring • 45m - 90m
                </span>
                <p className="text-xs text-muted/90 leading-relaxed pt-1.5">
                  Step into our full proctored interview simulation. Experience real algorithmic screenings with code assertions, timers, and automated evaluator scoring.
                </p>
              </div>
            </div>

            <Link
              href="/interview/new?type=mock&role=candidate"
              className="mt-6 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-500 dark:to-indigo-500 hover:brightness-110 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-purple-950/20"
            >
              Deploy Mock Interview
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* LAUNCHPAD 2: CHALLENGE GYM */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-500/[0.01] dark:bg-emerald-950/[0.03] hover:bg-emerald-500/[0.03] dark:hover:bg-emerald-950/[0.08] p-6 flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:shadow-[0_4px_20px_rgba(16,185,129,0.06)] dark:hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.15)] hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-[30px] pointer-events-none" />
          
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-fg tracking-tight">Algorithmic Gym</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-mono">
                Curated Bank • Self-Paced
              </span>
              <p className="text-xs text-muted/90 leading-relaxed pt-1.5">
                Target specific computer science concepts or UI frameworks. Standard library loaded with array structures, string algorithms, React widgets, and Jest suites.
              </p>
            </div>
          </div>

          <Link
            href="/candidate/challenges"
            className="mt-6 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 hover:brightness-110 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-950/20"
          >
            Enter Code Gym
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* LAUNCHPAD 3: COMBAT SANDBOX */}
        <div className="group relative overflow-hidden rounded-2xl border border-sky-500/20 dark:border-sky-500/10 bg-sky-500/[0.01] dark:bg-sky-950/[0.03] hover:bg-sky-500/[0.03] dark:hover:bg-sky-950/[0.08] p-6 flex flex-col justify-between transition-all duration-300 hover:border-sky-500/40 dark:hover:border-sky-500/30 hover:shadow-[0_4px_20px_rgba(14,165,233,0.06)] dark:hover:shadow-[0_0_24px_-4px_rgba(14,165,233,0.15)] hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-sky-500/5 blur-[30px] pointer-events-none" />
          
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-605 dark:text-sky-400 shrink-0 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-fg tracking-tight">Combat Sandbox</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 font-mono">
                Multiplayer Canvas • Free Build
              </span>
              <p className="text-xs text-muted/90 leading-relaxed pt-1.5">
                Mint a custom playground immediately. Practice with raw setups, code together with friends, or invite a peer coder for a zero-friction peer-review.
              </p>
            </div>
          </div>

          <Link
            href="/interview/new?type=mock&role=candidate"
            className="mt-6 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-500 dark:to-blue-500 hover:brightness-110 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-sky-950/20"
          >
            Create Custom Arena
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* OVERALL PERFORMANCE DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: READINESS WHEEL */}
        <div className="rounded-2xl border border-border dark:border-white/[0.06] bg-surface/30 dark:bg-white/[0.01] p-6 space-y-6 backdrop-blur-xl flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Readiness Index
            </h3>
            <p className="text-xs text-muted/90">Diagnostic prediction model calculated from completed mock missions.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative w-36 h-36 rounded-full border border-border dark:border-white/[0.04] bg-bg/50 dark:bg-black/10 flex items-center justify-center">
              {/* Glowing outer progress bar */}
              <div 
                className="absolute inset-2 rounded-full border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent border-r-transparent animate-pulse" 
                style={{ filter: "drop-shadow(0 0 8px var(--accent-glow))" }}
              />
              <div className="text-center space-y-0.5 relative z-10">
                <span className="text-4xl font-black text-fg font-mono">{readinessIndex}%</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted block font-mono">Calibrated</span>
              </div>
            </div>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {readinessIndex >= 85 
                  ? "Elite Level (Cleared)" 
                  : readinessIndex >= 70 
                    ? "Strong Competency" 
                    : readinessIndex >= 50 
                      ? "Combat Prepared" 
                      : readinessIndex >= 30 
                        ? "Telemetry Active" 
                        : "Diagnostic Calibration"}
              </span>
            </div>
          </div>

          <div className="border-t border-border dark:border-white/[0.04] pt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-muted font-mono block">Pass Rate</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{passRate}%</span>
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-muted font-mono block">Completed</span>
              <span className="text-lg font-black text-fg font-mono">{stats.completed}</span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: COGNITIVE PILLARS */}
        <div className="lg:col-span-2 rounded-2xl border border-border dark:border-white/[0.06] bg-surface/30 dark:bg-white/[0.01] p-6 space-y-6 backdrop-blur-xl flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Cognitive Skill Pillars
            </h3>
            <p className="text-xs text-muted/90">Averages extracted from historical evaluator rubrics. Scale: 1.0 to 5.0.</p>
          </div>

          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {/* Skill 1: Code Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-fg">
                <span className="flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Code Quality & Architecture
                </span>
                <span className="font-mono text-purple-650 dark:text-purple-400 font-black">{avgCodeQuality} / 5.0</span>
              </div>
              <div className="h-2.5 w-full bg-bg/50 dark:bg-white/[0.03] border border-border dark:border-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(avgCodeQuality / 5.0) * 100}%` }}
                />
              </div>
            </div>

            {/* Skill 2: Problem Solving */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-fg">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Algorithm & Problem Solving
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{avgProblemSolving} / 5.0</span>
              </div>
              <div className="h-2.5 w-full bg-bg/50 dark:bg-white/[0.03] border border-border dark:border-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(avgProblemSolving / 5.0) * 100}%` }}
                />
              </div>
            </div>

            {/* Skill 3: Communication */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-fg">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Process Communication
                </span>
                <span className="font-mono text-sky-600 dark:text-sky-400 font-black">{avgCommunication} / 5.0</span>
              </div>
              <div className="h-2.5 w-full bg-bg/50 dark:bg-white/[0.03] border border-border dark:border-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(avgCommunication / 5.0) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border dark:border-white/[0.04] pt-4 flex items-center justify-between text-xs text-muted/90">
            <span>Evaluated over {ratedCount} graded attempt{(ratedCount !== 1) && "s"}</span>
            <span className="flex items-center gap-1 font-mono uppercase text-[11px] text-indigo-650 dark:text-indigo-400">
              <Check className="w-3.5 h-3.5" /> telemetry fully calibrated
            </span>
          </div>
        </div>

      </div>

      {/* HISTORY TELEMETRY DECK */}
      <div className="rounded-2xl border border-border dark:border-white/[0.06] bg-panel/60 dark:bg-[#0c0d19]/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="px-5 py-4 border-b border-border/80 dark:border-white/[0.06] flex items-center justify-between bg-bg/30 dark:bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-fg">
              Historical Practice Missions
            </h3>
          </div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
            {myPracticeSessions.length} total attempts
          </span>
        </div>

        {myPracticeSessions.length === 0 ? (
          <div className="px-6 py-20 text-center flex flex-col items-center justify-center space-y-4 bg-bg/10 dark:bg-white/[0.01]">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted shadow-inner">
              <Code className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-[280px]">
              <h4 className="text-sm font-bold text-fg">Telemetry Log Empty</h4>
              <p className="text-xs text-muted/90 leading-relaxed">
                You haven't initiated any mock attempts yet. Solve a code challenge or launch a mock simulation deck to begin recording calibration metrics.
              </p>
            </div>
            <Link
              href="/interview/new?type=mock&role=candidate"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-widest hover:bg-accent-soft active:scale-95 transition-all shadow-md shadow-accent/15"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Deploy Simulator
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            <ul className="divide-y divide-border/50 dark:divide-white/[0.04]">
              {visibleSessions.map((session) => {
                const isScheduled = session.status === "scheduled";
                const isInProgress = session.status === "in_progress";
                const isCompleted = session.status === "completed";

                // Determine glow states
                let statusColor = "";
                let statusText = "";
                let borderHighlight = "";

                if (isScheduled) {
                  statusColor = "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10";
                  statusText = "Scheduled";
                  borderHighlight = "border-l-amber-500/40";
                } else if (isInProgress) {
                  statusColor = "text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/10 animate-pulse";
                  statusText = "In Flight";
                  borderHighlight = "border-l-sky-500/60";
                } else {
                  statusColor = "text-emerald-650 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
                  statusText = "Completed";
                  borderHighlight = "border-l-emerald-500/40";
                }

                const href = `/interview/${session.id}`;

                return (
                  <li
                    key={session.id}
                    className={`px-5 py-5 border-l-2 ${borderHighlight} flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface/40 dark:hover:bg-white/[0.01] transition-all group first:rounded-t-2xl last:rounded-b-2xl`}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <Link
                        href={href}
                        className="font-extrabold text-base text-fg group-hover:text-indigo-655 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors block truncate"
                      >
                        {session.title}
                      </Link>
                      
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-muted/95">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-muted/50" />
                          {new Date(session.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        {session.verdict && (
                          <>
                            <span className="text-border dark:text-white/10 font-mono">•</span>
                            <span
                              className={`font-bold uppercase tracking-wider text-xs ${
                                session.verdict === "success"
                                  ? "text-emerald-650 dark:text-emerald-400"
                                  : session.verdict === "failed"
                                  ? "text-rose-655 text-rose-600 dark:text-rose-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {session.verdict === "success"
                                ? "Passed"
                                : session.verdict === "failed"
                                ? "Failed"
                                : "Review Needed"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${statusColor}`}
                      >
                        {statusText}
                      </span>

                      <Link
                        href={href}
                        className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isCompleted
                            ? "bg-surface border border-border text-fg hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                            : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-bg"
                        }`}
                      >
                        {isCompleted ? "Revisit" : isInProgress ? "Resume" : "Engage"}
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      <DeleteSessionButton sessionId={session.id} size="default" />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Load More Controller */}
            {myPracticeSessions.length > visibleCount && (
              <div className="p-4 border-t border-border/50 dark:divide-white/[0.04] bg-bg/20 flex justify-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface text-xs font-black uppercase tracking-widest text-fg hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm active:scale-95 transition-all"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Load More attempts
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
