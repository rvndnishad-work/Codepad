"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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
  DIFFICULTY_ORDER,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
  LANGUAGE_META,
  LANGUAGE_ORDER,
} from "./types";
import type { AttemptSummary, Challenge } from "./types";

type Mode = "landing" | "pick" | "browse";

interface Props {
  userId: string | null;
  challenges: Challenge[];
  attemptSummaries: AttemptSummary[];
}

export default function ReviewLabClient({ userId, challenges, attemptSummaries }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [active, setActive] = useState<Challenge | null>(null);
  const [huntMode, setHuntMode] = useState(false);
  const [stats, setStats] = useState(() => {
    const m = new Map<string, AttemptSummary>();
    for (const s of attemptSummaries) m.set(s.challengeId, s);
    return m;
  });

  // Persist where the user was so a refresh keeps them there.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = localStorage.getItem("reviewLabMode");
    const savedLang = localStorage.getItem("reviewLabLang");
    if (savedMode === "browse" && savedLang) {
      setLanguage(savedLang);
      setMode("browse");
    } else if (savedMode === "pick") {
      setMode("pick");
    } else {
      setMode("landing");
    }
  }, []);
  useEffect(() => {
    if (mode && typeof window !== "undefined") localStorage.setItem("reviewLabMode", mode);
  }, [mode]);
  useEffect(() => {
    if (language && typeof window !== "undefined") localStorage.setItem("reviewLabLang", language);
  }, [language]);

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

  function pickLanguage(lang: string) {
    setLanguage(lang);
    setMode("browse");
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
          <Landing onEnter={() => setMode("pick")} challengeCount={challenges.length} />
        ) : mode === "pick" ? (
          <TechPicker
            challenges={challenges}
            stats={stats}
            onPick={pickLanguage}
            onBack={() => setMode("landing")}
          />
        ) : (
          <Lobby
            language={language ?? "javascript"}
            challenges={challenges}
            stats={stats}
            onOpen={openChallenge}
            onBack={() => setMode("pick")}
          />
        )}
      </div>
    </div>
  );
}

// ── Technology picker ───────────────────────────────────────────────────────

const DIFFICULTY_DOTS: Record<string, string> = {
  beginner: "bg-emerald-500",
  intermediate: "bg-amber-500",
  advanced: "bg-rose-500",
};

function TechPicker({
  challenges,
  stats,
  onPick,
  onBack,
}: {
  challenges: Challenge[];
  stats: Map<string, AttemptSummary>;
  onPick: (language: string) => void;
  onBack: () => void;
}) {
  const perLang = useMemo(() => {
    const m = new Map<
      string,
      { total: number; started: number; minutes: number; diff: Record<string, number> }
    >();
    for (const c of challenges) {
      const e =
        m.get(c.language) ??
        { total: 0, started: 0, minutes: 0, diff: { beginner: 0, intermediate: 0, advanced: 0 } };
      e.total += 1;
      e.minutes += c.estimatedMinutes;
      if (stats.has(c.id)) e.started += 1;
      e.diff[c.difficulty] = (e.diff[c.difficulty] ?? 0) + 1;
      m.set(c.language, e);
    }
    // Preferred order first, then any stragglers alphabetically.
    const present = Array.from(m.keys());
    const ordered = [
      ...LANGUAGE_ORDER.filter((l) => m.has(l)),
      ...present.filter((l) => !LANGUAGE_ORDER.includes(l)).sort(),
    ];
    return ordered.map((lang) => ({ lang, ...m.get(lang)! }));
  }, [challenges, stats]);

  const totalChallenges = challenges.length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-panel text-xs font-bold text-muted hover:text-fg transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-widest">
          <Target className="w-3.5 h-3.5" />
          Pick your stack
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fg via-fg to-muted">
          What do you review best?
        </h2>
        <p className="text-sm text-muted font-medium max-w-md mx-auto leading-relaxed">
          {totalChallenges} AI-written snippets are waiting for a careful reviewer —
          each track runs from beginner to advanced.
        </p>
      </div>

      {/* Language cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {perLang.map(({ lang, total, started, minutes, diff }) => {
          const meta = LANGUAGE_META[lang] ?? {
            label: LANGUAGE_LABELS[lang] ?? lang,
            monogram: (LANGUAGE_LABELS[lang] ?? lang).slice(0, 2).toUpperCase(),
            blurb: "",
            tileClass: "bg-indigo-600 text-white",
            glowClass: "bg-indigo-500/25",
            hoverClass: "hover:border-indigo-400/50 hover:shadow-indigo-500/15",
            accentText: "text-indigo-500 dark:text-indigo-400",
          };
          const hours = minutes >= 90 ? `${Math.round((minutes / 60) * 2) / 2} hrs` : `${minutes} min`;
          return (
            <button
              key={lang}
              onClick={() => onPick(lang)}
              className={`group relative text-left rounded-3xl border border-border bg-surface overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${meta.hoverClass}`}
            >
              {/* Atmosphere: corner glow + giant watermark monogram */}
              <div
                className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[90px] opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${meta.glowClass}`}
              />
              <span
                aria-hidden
                className="absolute -bottom-8 -right-2 text-[8rem] leading-none font-black tracking-tighter text-fg opacity-[0.045] group-hover:opacity-[0.08] transition-opacity duration-500 select-none pointer-events-none"
              >
                {meta.monogram}
              </span>

              <div className="relative space-y-5">
                {/* Logo tile + name */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-lg shadow-lg group-hover:scale-105 transition-transform duration-300 ${meta.tileClass}`}
                    >
                      {meta.monogram}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-fg tracking-tight">
                        {meta.label}
                      </h3>
                      <p className="text-xs text-muted font-medium mt-0.5">{meta.blurb}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full border border-border bg-bg/60 flex items-center justify-center text-muted group-hover:text-fg group-hover:border-border group-hover:translate-x-1 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Stats line */}
                <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <span className="text-fg font-bold">{total} challenges</span>
                  <span className="text-muted/40">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 opacity-70" /> ~{hours} of review
                  </span>
                  {started > 0 && (
                    <>
                      <span className="text-muted/40">·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                        <Award className="w-3 h-3" /> {started}/{total} attempted
                      </span>
                    </>
                  )}
                </div>

                {/* Segmented difficulty meter */}
                <div className="space-y-2">
                  <div className="flex h-1.5 w-full gap-1">
                    {(["beginner", "intermediate", "advanced"] as const).map((d) =>
                      diff[d] > 0 ? (
                        <div
                          key={d}
                          className={`h-full rounded-full ${DIFFICULTY_DOTS[d]}`}
                          style={{ width: `${(diff[d] / total) * 100}%` }}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {(["beginner", "intermediate", "advanced"] as const).map((d) =>
                      diff[d] > 0 ? (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOTS[d]}`} />
                          {diff[d]} {DIFFICULTY_LABELS[d]}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold pt-1 opacity-80 group-hover:opacity-100 transition-opacity ${meta.accentText}`}
                >
                  Start with the basics
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          );
        })}
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
  language,
  challenges,
  stats,
  onOpen,
  onBack,
}: {
  language: string;
  challenges: Challenge[];
  stats: Map<string, AttemptSummary>;
  onOpen: (c: Challenge, hunt: boolean) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");

  const meta = LANGUAGE_META[language];
  const label = LANGUAGE_LABELS[language] ?? language;

  // Only this technology's challenges, always sorted beginner → advanced.
  const forLanguage = useMemo(
    () =>
      challenges
        .filter((c) => c.language === language)
        .sort(
          (a, b) =>
            (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99) ||
            a.estimatedMinutes - b.estimatedMinutes ||
            a.title.localeCompare(b.title),
        ),
    [challenges, language],
  );

  const filtered = useMemo(() => {
    return forLanguage.filter((c) => {
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.prompt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [forLanguage, search, difficulty]);

  return (
    <div className="space-y-8">
      {/* Tech header + change */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black shadow-md ${
              meta?.tileClass ?? "bg-indigo-600 text-white"
            }`}
          >
            {meta?.monogram ?? label.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-fg tracking-tight">{label}</h2>
            <p className="text-xs text-muted font-medium">
              {forLanguage.length} challenges · beginner → advanced
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-panel text-xs font-bold text-muted hover:text-fg transition-all active:scale-95 shadow-sm self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Change technology
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-border bg-surface/60 backdrop-blur-md shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
          <input
            type="text"
            placeholder={`Search ${label} challenges…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-border text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>
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
