"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  Bot,
  Bug,
  Clock,
  ChevronRight,
  Zap,
  ShieldAlert,
  Award,
  Target,
} from "lucide-react";

import ChallengeRunner from "./ChallengeRunner";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  DIFFICULTY_STYLES,
  LANGUAGE_LABELS,
} from "./types";
import type { AttemptSummary, Challenge } from "./types";

type Mode = "landing" | "browse";

interface Props {
  userId: string | null;
  challenges: Challenge[];
  attemptSummaries: AttemptSummary[];
}

export default function ReviewLabClient({ userId, challenges, attemptSummaries }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [active, setActive] = useState<Challenge | null>(null);
  const [huntMode, setHuntMode] = useState(false);
  const [stats, setStats] = useState(() => {
    const m = new Map<string, AttemptSummary>();
    for (const s of attemptSummaries) m.set(s.challengeId, s);
    return m;
  });

  // Persist last mode so a refresh keeps the user where they were.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("reviewLabMode") : null;
    setMode(saved === "browse" ? "browse" : "landing");
  }, []);
  useEffect(() => {
    if (mode && typeof window !== "undefined") localStorage.setItem("reviewLabMode", mode);
  }, [mode]);

  function handleGraded(challengeId: string, score: number) {
    setStats((prev) => {
      const next = new Map(prev);
      const cur = next.get(challengeId) ?? { challengeId, best: 0, count: 0 };
      next.set(challengeId, {
        challengeId,
        best: Math.max(cur.best, score),
        count: cur.count + 1,
      });
      return next;
    });
  }

  function openChallenge(c: Challenge, hunt: boolean) {
    setHuntMode(hunt);
    setActive(c);
  }

  return (
    <div className="min-h-screen bg-bg text-fg py-10 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {mode === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 rounded-3xl border border-border bg-surface/50 animate-pulse" />
            <div className="h-72 rounded-3xl border border-border bg-surface/50 animate-pulse" />
          </div>
        ) : active ? (
          <ChallengeRunner
            challenge={active}
            userId={userId}
            huntMode={huntMode}
            onBack={() => setActive(null)}
            onGraded={handleGraded}
          />
        ) : mode === "landing" ? (
          <Landing onEnter={() => setMode("browse")} challengeCount={challenges.length} />
        ) : (
          <Lobby
            challenges={challenges}
            stats={stats}
            onOpen={openChallenge}
            onBack={() => setMode("landing")}
          />
        )}
      </div>
    </div>
  );
}

// ── Landing ────────────────────────────────────────────────────────────────

function Landing({ onEnter, challengeCount }: { onEnter: () => void; challengeCount: number }) {
  return (
    <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-b from-surface/80 via-surface/40 to-bg p-8 sm:p-14 text-center shadow-xl backdrop-blur-2xl">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(123,132,150,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(123,132,150,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest shadow-inner">
            <Bot className="w-4 h-4" />
            AI-Readiness Skill
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-fg via-rose-500 via-[45%] to-indigo-600 dark:via-rose-400 dark:to-indigo-400">
            Review the AI&apos;s Code
          </h1>
          <p className="text-base sm:text-lg text-muted/90 max-w-2xl mx-auto leading-relaxed font-medium">
            AI writes confident code — and confidently wrong code. Each challenge shows you a
            plausible AI-generated answer with planted flaws: hallucinated APIs, subtle logic
            bugs, and security holes. Your job is to find them all before shipping.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              Start reviewing <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted font-semibold">{challengeCount} challenges · JS · TS · Python · SQL</span>
          </div>
        </div>
      </div>

      {/* What you'll hunt for */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">What you&apos;ll hunt for</h3>
          <p className="text-sm text-muted font-medium max-w-lg mx-auto">
            The same failure modes real AI assistants produce every day.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <div
                key={cat}
                className={`rounded-2xl border p-4 text-center space-y-2 ${meta.className}`}
              >
                <div className="text-2xl">{meta.emoji}</div>
                <div className="text-xs font-bold">{meta.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two modes explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-7 rounded-3xl border border-border bg-surface/40">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
            <Bug className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-fg mb-2">Standard review</h4>
          <p className="text-sm text-muted leading-relaxed">
            Take your time. Read the code like a careful reviewer, flag each issue with its
            category, and get a deterministic score plus a full answer key explaining every flaw.
          </p>
        </div>
        <div className="p-7 rounded-3xl border border-border bg-surface/40">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-fg mb-2">Hallucination Hunt</h4>
          <p className="text-sm text-muted leading-relaxed">
            Beat the clock. Same code, but timed — find as many planted issues as you can before
            it runs out, then climb the leaderboard for the fastest, most accurate hunt.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────

function Lobby({
  challenges,
  stats,
  onOpen,
  onBack,
}: {
  challenges: Challenge[];
  stats: Map<string, AttemptSummary>;
  onOpen: (c: Challenge, hunt: boolean) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const languages = useMemo(
    () => Array.from(new Set(challenges.map((c) => c.language))),
    [challenges],
  );

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      if (language !== "all" && c.language !== language) return false;
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.prompt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [challenges, search, language, difficulty]);

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-panel text-xs font-bold text-muted hover:text-fg transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-border bg-surface/60 backdrop-blur-md shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
          <input
            type="text"
            placeholder="Search challenges…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-border text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-bg border border-border text-sm font-medium text-muted hover:text-fg focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="all">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l] ?? l}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-bg border border-border text-sm font-medium text-muted hover:text-fg focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-panel/20 p-10 text-center">
          <p className="text-xs text-muted">No challenges match those filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const stat = stats.get(c.id);
            return (
              <div
                key={c.id}
                className="group relative rounded-2xl border border-border bg-surface p-6 hover:border-indigo-500/40 transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                      DIFFICULTY_STYLES[c.difficulty] ?? DIFFICULTY_STYLES.intermediate
                    }`}
                  >
                    {c.difficulty}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-panel/50 border border-border text-[10px] font-bold uppercase tracking-wider text-muted">
                    {LANGUAGE_LABELS[c.language] ?? c.language}
                  </span>
                </div>

                <h3 className="relative text-base font-bold text-fg group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {c.title}
                </h3>
                <p className="relative text-sm text-muted mt-2.5 leading-relaxed line-clamp-3 flex-1">
                  {c.prompt}
                </p>

                <div className="relative mt-5 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 opacity-70" /> {c.findingCount} planted
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 opacity-70" /> {c.estimatedMinutes} min
                  </span>
                  {stat ? (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                      <Award className="w-3 h-3" /> {stat.best}
                    </span>
                  ) : null}
                </div>

                <div className="relative mt-4 flex items-center gap-2">
                  <button
                    onClick={() => onOpen(c, false)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all active:scale-95"
                  >
                    <Target className="w-3.5 h-3.5" /> Review
                  </button>
                  <button
                    onClick={() => onOpen(c, true)}
                    title={`Timed hunt — ${c.timeLimitSec}s`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-500 transition-all active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" /> Hunt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
