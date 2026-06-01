"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Beaker,
  Search,
  Sparkles,
  Send,
  RefreshCw,
  Clock,
  ChevronRight,
  History,
  Share2,
  Check,
  Users,
  Play,
  Terminal,
  Award,
  RotateCcw,
} from "lucide-react";

import type { Scenario, Exemplar, Attempt } from "./types";
import { DIFFICULTY_STYLES } from "./types";
import ScoreCard from "./ScoreCard";
import ExemplarsList from "./ExemplarsList";
import CommunityList from "./CommunityList";
import PlaygroundMode from "./PlaygroundMode";
import CreateScenarioModal from "./CreateScenarioModal";
import ShareModal from "./ShareModal";
import PromptEditor from "./PromptEditor";
import { useDraft } from "./useDraft";

type Mode = "landing" | "challenges" | "playground";

interface Props {
  userId: string | null;
  scenarios: Scenario[];
  exemplars: Exemplar[];
  initialAttempts: Attempt[];
  initialUpvotedIds: string[];
}

/**
 * Prompt Lab — top-level client shell.
 *
 * Two modes:
 *   1. Practice — scenario library + per-scenario runner (graded by Gemini
 *      against a 6-dim rubric). Shows exemplars and community shares
 *      alongside the editor.
 *   2. Playground — free-form prompt that actually runs against Gemini
 *      and streams the response back.
 *
 * Mode + active scenario live here; runner UI is a sub-render of practice
 * mode rather than a separate component to keep submission state close.
 */
export default function PromptLabClient({
  userId,
  scenarios: initialScenarios,
  exemplars: allExemplars,
  initialAttempts,
  initialUpvotedIds,
}: Props) {
  // `mode` starts null so SSR and the first client render agree (no hydration
  // mismatch). An effect resolves the persisted mode right after mount, and we
  // render a skeleton until then — this avoids the old "flash of landing before
  // snapping to the saved mode" on refresh.
  const [mode, setMode] = useState<Mode | null>(null);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set(initialUpvotedIds));
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<string | undefined>(undefined);
  const [shareTarget, setShareTarget] = useState<Attempt | null>(null);

  // Restore last-used mode from localStorage so a refresh keeps you where you were.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("promptLabMode") : null;
    setMode(saved === "challenges" || saved === "playground" ? (saved as Mode) : "landing");
  }, []);
  useEffect(() => {
    if (mode && typeof window !== "undefined") localStorage.setItem("promptLabMode", mode);
  }, [mode]);

  return (
    <div className="min-h-screen bg-bg text-fg py-10 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-6 rounded-3xl border border-border bg-surface/40 backdrop-blur-2xl shadow-sm overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-purple-500/5 opacity-50 pointer-events-none group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center text-indigo-400">
                <Sparkles className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fg to-muted">
                Prompt Arena
              </h1>
              <p className="text-sm text-muted mt-1 font-medium">
                Master prompt engineering against scenarios or experiment freely.
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-4">
            {mode && mode !== "landing" && (
              <button
                onClick={() => setMode("landing")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-sm font-semibold text-muted hover:text-fg transition-all hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" /> Switch Mode
              </button>
            )}
            <div className="h-8 w-px bg-border hidden sm:block" />
            <Link
              href="/interview"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-sm font-semibold text-muted hover:text-fg transition-all hover:scale-105 active:scale-95"
            >
              Exit
            </Link>
          </div>
        </header>

        {mode === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 rounded-3xl border border-border bg-surface/50 animate-pulse" />
            <div className="h-72 rounded-3xl border border-border bg-surface/50 animate-pulse" />
          </div>
        ) : mode === "landing" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <button
              onClick={() => setMode("challenges")}
              className="group relative flex flex-col items-start p-8 sm:p-10 rounded-3xl border border-border bg-surface hover:border-indigo-500/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Beaker className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-fg mb-3 group-hover:text-indigo-400 transition-colors">Challenges</h2>
              <p className="text-base text-muted leading-relaxed">
                Test your skills against scored scenarios. Follow specific constraints, formats, and objectives to achieve the highest rubric score.
              </p>
            </button>
            <button
              onClick={() => setMode("playground")}
              className="group relative flex flex-col items-start p-8 sm:p-10 rounded-3xl border border-border bg-surface hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 overflow-hidden text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Play className="w-8 h-8 ml-1" />
              </div>
              <h2 className="text-3xl font-bold text-fg mb-3 group-hover:text-purple-400 transition-colors">Playground</h2>
              <p className="text-base text-muted leading-relaxed">
                Experiment freely. Run any prompt against the latest Gemini models, tweak the system instructions, and iterate without grading constraints.
              </p>
            </button>
          </div>
        ) : mode === "challenges" ? (
          activeScenario ? (
            <PracticeRunner
              scenario={activeScenario}
              userId={userId}
              attempts={attempts}
              exemplars={allExemplars.filter((e) => e.scenarioId === activeScenario.id)}
              upvotedIds={upvotedIds}
              setUpvotedIds={setUpvotedIds}
              onBack={() => setActiveScenario(null)}
              onAttemptSubmitted={(a) => setAttempts((prev) => [a, ...prev])}
              onShareClick={(a) => setShareTarget(a)}
            />
          ) : (
            <PracticeLobby
              scenarios={scenarios}
              attempts={attempts}
              userId={userId}
              onSelect={(s) => setActiveScenario(s)}
              onCreateClick={() => setShowCreateModal(true)}
            />
          )
        ) : (
          <PlaygroundMode
            onPromote={(promptText) => {
              setCreatePrefill(promptText);
              setShowCreateModal(true);
            }}
          />
        )}
      </div>

      {showCreateModal ? (
        <CreateScenarioModal
          initialDescription={createPrefill}
          onClose={() => {
            setShowCreateModal(false);
            setCreatePrefill(undefined);
          }}
          onCreated={(s) => {
            setScenarios((prev) => [s, ...prev]);
            setActiveScenario(s);
            // If promoted from the playground, jump into the new scenario runner.
            setMode("challenges");
            setCreatePrefill(undefined);
          }}
        />
      ) : null}

      {shareTarget ? (
        <ShareModal
          attemptId={shareTarget.id}
          scenarioTitle={shareTarget.scenarioTitle}
          defaultTitle={shareTarget.shareTitle ?? ""}
          onClose={() => setShareTarget(null)}
          onShared={(updated) => {
            setAttempts((prev) =>
              prev.map((a) =>
                a.id === shareTarget.id
                  ? { ...a, shared: true, shareTitle: updated.shareTitle, shareNote: updated.shareNote }
                  : a,
              ),
            );
          }}
        />
      ) : null}
    </div>
  );
}



// ──────────────────────────────────────────────────────────────────────────
// Practice lobby — scenario library + history
// ──────────────────────────────────────────────────────────────────────────

function PracticeLobby({
  scenarios,
  attempts,
  userId,
  onSelect,
  onCreateClick,
}: {
  scenarios: Scenario[];
  attempts: Attempt[];
  userId: string | null;
  onSelect: (s: Scenario) => void;
  onCreateClick: () => void;
}) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    return scenarios.filter((s) => {
      if (difficulty !== "all" && s.difficulty !== difficulty) return false;
      if (category !== "all" && s.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [scenarios, search, difficulty, category]);

  // Per-scenario stats: best score + attempt count
  const statsByScenario = useMemo(() => {
    const m = new Map<string, { best: number; count: number }>();
    for (const a of attempts) {
      if (!a.scenarioId) continue;
      const prev = m.get(a.scenarioId) ?? { best: 0, count: 0 };
      m.set(a.scenarioId, {
        best: Math.max(prev.best, a.score ?? 0),
        count: prev.count + 1,
      });
    }
    return m;
  }, [attempts]);

  return (
    <div className="space-y-10">
      {/* Hero section for featured scenario */}
      {filtered.length > 0 && search === "" && category === "all" && difficulty === "all" && (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8 group hover:border-indigo-500/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute -right-32 -top-32 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-700" />
          
          <div className="relative flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> Featured Scenario
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">{filtered[0].title}</h2>
            <p className="text-muted leading-relaxed max-w-2xl text-base">{filtered[0].description}</p>
            <div className="flex items-center gap-6 pt-2">
              <button onClick={() => onSelect(filtered[0])} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20">
                Start Challenge <ChevronRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-4 text-sm text-muted font-medium">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400/70" /> {filtered[0].estimatedMinutes} min</span>
                <span className="flex items-center gap-1.5 capitalize"><Award className="w-4 h-4 text-emerald-400/70" /> {filtered[0].difficulty}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-border bg-surface/60 backdrop-blur-md shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
          <input
            type="text"
            placeholder="Search scenarios…"
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-bg border border-border text-sm font-medium text-muted hover:text-fg focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="all">All categories</option>
          <option value="code-generation">Code generation</option>
          <option value="debugging">Debugging</option>
          <option value="api-design">API design</option>
          <option value="data-analysis">Data analysis</option>
          <option value="system-design">System design</option>
          <option value="documentation">Documentation</option>
        </select>
        <button
          onClick={onCreateClick}
          className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          New scenario
        </button>
      </div>

      {/* Scenario grid */}
      {filtered.length === 0 ? (
        <EmptyCard message="No scenarios match those filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const stats = statsByScenario.get(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className="group relative text-left rounded-2xl border border-border bg-surface p-6 hover:border-indigo-500/40 hover:bg-surface/80 transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                      DIFFICULTY_STYLES[s.difficulty] ?? DIFFICULTY_STYLES.intermediate
                    }`}
                  >
                    {s.difficulty}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-panel/50 border border-border text-[10px] font-bold uppercase tracking-wider text-muted">
                    {s.category.replace("-", " ")}
                  </span>
                </div>

                <h3 className="relative text-base font-bold text-fg group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {s.title}
                </h3>
                <p className="relative text-sm text-muted mt-2.5 leading-relaxed line-clamp-3 flex-1 group-hover:text-muted/90 transition-colors">
                  {s.description}
                </p>

                <div className="relative mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted font-medium">
                  <span className="inline-flex items-center gap-1.5 group-hover:text-fg transition-colors">
                    <Clock className="w-3.5 h-3.5 opacity-70" /> {s.estimatedMinutes} min
                  </span>
                  {stats ? (
                    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                      Best {stats.best}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                      Start <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Recent attempts */}
      {userId && attempts.length > 0 ? (
        <section className="space-y-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center text-muted">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">Your Recent Attempts</h3>
                <p className="text-xs text-muted">{attempts.length} total attempts across all scenarios</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attempts.slice(0, 6).map((a) => {
              const score = a.score ?? 0;
              const toneClass = score >= 75 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : score >= 50 ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-rose-400 bg-rose-400/10 border-rose-400/20";
              const progressColor = score >= 75 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
              return (
                <div key={a.id} className="group rounded-2xl border border-border bg-surface p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-sm text-fg line-clamp-1 flex-1">{a.scenarioTitle}</h4>
                      {a.shared ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full shrink-0">
                          <Share2 className="w-3 h-3" /> Shared
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-xs text-muted">
                      <span className="capitalize">{a.scenarioDifficulty}</span>
                      <span>&bull;</span>
                      <span className="font-mono">{a.tokenEstimate} tokens</span>
                      <span>&bull;</span>
                      <span>{new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="space-y-2 mt-auto pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">Score</span>
                      <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-md border ${toneClass}`}>
                        {a.score ?? "—"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-panel rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressColor} transition-all duration-1000`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Practice runner — write a prompt for an active scenario, get scored
// ──────────────────────────────────────────────────────────────────────────

function PracticeRunner({
  scenario,
  userId,
  attempts,
  exemplars,
  upvotedIds,
  setUpvotedIds,
  onBack,
  onAttemptSubmitted,
  onShareClick,
}: {
  scenario: Scenario;
  userId: string | null;
  attempts: Attempt[];
  exemplars: Exemplar[];
  upvotedIds: Set<string>;
  setUpvotedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onBack: () => void;
  onAttemptSubmitted: (a: Attempt) => void;
  onShareClick: (a: Attempt) => void;
}) {
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<Attempt | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [activeTab, setActiveTab] = useState<"exemplars" | "community">("exemplars");

  // Community list = shared attempts on this scenario by *other* users.
  // Fetched from the server (the page's own-attempts feed is self-scoped and
  // can never include another developer's prompt).
  const [community, setCommunity] = useState<Attempt[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  // Per-scenario draft autosave so a refresh / accidental nav doesn't wipe
  // 20 minutes of careful prompt-writing.
  const draft = useDraft(`prompt-lab:draft:${scenario.id}`, promptText, setPromptText);

  // Reset session-local state when the scenario changes. The draft hook
  // handles re-hydration for the new scenario id automatically.
  useEffect(() => {
    setLatest(null);
    setStartedAt(Date.now());
  }, [scenario.id]);

  // Load the community feed for this scenario.
  useEffect(() => {
    let cancelled = false;
    setCommunityLoading(true);
    fetch(`/api/prompt-attempts?scenarioId=${encodeURIComponent(scenario.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        setCommunity(Array.isArray(data.attempts) ? data.attempts : []);
        // Merge the server's view of which prompts this user already upvoted
        // into the shared set so the toggle paints correctly.
        if (Array.isArray(data.upvotedIds) && data.upvotedIds.length > 0) {
          setUpvotedIds((prev) => new Set([...prev, ...data.upvotedIds]));
        }
      })
      .catch(() => {
        if (!cancelled) setCommunity([]);
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scenario.id, setUpvotedIds]);

  // Toggle an upvote on a community prompt. Optimistically updates both the
  // shared upvoted-set and the local community count, reconciles against the
  // server count, and reverts on failure.
  async function handleUpvoteToggle(attemptId: string, nextUpvoted: boolean) {
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (nextUpvoted) next.add(attemptId);
      else next.delete(attemptId);
      return next;
    });
    setCommunity((prev) =>
      prev.map((a) =>
        a.id === attemptId
          ? { ...a, shareUpvotes: (a.shareUpvotes ?? 0) + (nextUpvoted ? 1 : -1) }
          : a,
      ),
    );
    try {
      const res = await fetch(`/api/prompt-attempts/${attemptId}/upvote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ upvoted: nextUpvoted }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Reconcile with the authoritative server count in case of a race.
      setCommunity((prev) =>
        prev.map((a) => (a.id === attemptId ? { ...a, shareUpvotes: data.count } : a)),
      );
    } catch (err) {
      // Revert both optimistic updates.
      setUpvotedIds((prev) => {
        const next = new Set(prev);
        if (nextUpvoted) next.delete(attemptId);
        else next.add(attemptId);
        return next;
      });
      setCommunity((prev) =>
        prev.map((a) =>
          a.id === attemptId
            ? { ...a, shareUpvotes: (a.shareUpvotes ?? 0) + (nextUpvoted ? -1 : 1) }
            : a,
        ),
      );
      toast.error("Couldn't update vote", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // The current user's latest attempt on this scenario, used to decide if
  // the "Share this prompt" button is offered after scoring.
  const ownAttemptsOnScenario = useMemo(
    () => attempts.filter((a) => a.scenarioId === scenario.id),
    [attempts, scenario.id],
  );

  const charCount = promptText.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  async function handleSubmit() {
    if (!promptText.trim()) {
      toast.error("Prompt is empty.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/prompt-challenges/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          promptText,
          durationSec: Math.round((Date.now() - startedAt) / 1000),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const a: Attempt = {
        id: data.attempt.id,
        promptText: data.attempt.promptText,
        charCount: data.attempt.charCount,
        tokenEstimate: data.attempt.tokenEstimate,
        score: data.attempt.score,
        rubricScores: data.attempt.rubricScores,
        feedback: data.attempt.feedback,
        graderType: data.attempt.graderType,
        durationSec: data.attempt.durationSec,
        createdAt: data.attempt.createdAt,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        scenarioCategory: scenario.category,
        scenarioDifficulty: scenario.difficulty,
      };
      setLatest(a);
      onAttemptSubmitted(a);
      // Clear the saved draft once an attempt successfully scores — the
      // submission is already persisted server-side, so the localStorage
      // copy is just clutter at this point.
      draft.clear();
      toast.success(`Scored ${a.score ?? "—"}/100`);
    } catch (err) {
      toast.error("Couldn't grade prompt", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-surface/50 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-bg hover:bg-panel text-muted hover:text-fg transition-colors group"
            aria-label="Back to scenarios"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-fg">{scenario.title}</span>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted font-medium">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border uppercase tracking-wider ${DIFFICULTY_STYLES[scenario.difficulty] ?? DIFFICULTY_STYLES.intermediate}`}>
                {scenario.difficulty}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scenario.estimatedMinutes} min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start h-full">
        {/* LEFT — brief + exemplars + community */}
        <div className="w-full lg:w-5/12 xl:w-1/3 space-y-6 flex-shrink-0">
          <div className="rounded-3xl border border-border bg-surface overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 bg-panel/30 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Scenario Brief</h2>
              </div>
              <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap font-medium">
                {scenario.description}
              </p>
            </div>
            <div className="p-6 bg-surface">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Check className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400/80">Objective</h3>
              </div>
              <p className="text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">
                {scenario.objective}
              </p>
            </div>
          </div>

          {/* Exemplars / Community tabs */}
          <div className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-2 p-1 bg-panel/50 rounded-xl">
              <button
                onClick={() => setActiveTab("exemplars")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === "exemplars" ? "bg-surface text-indigo-400 shadow-sm" : "text-muted hover:text-fg"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Exemplars
                <Count value={exemplars.length} />
              </button>
              <button
                onClick={() => setActiveTab("community")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === "community" ? "bg-surface text-indigo-400 shadow-sm" : "text-muted hover:text-fg"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Community
                <Count value={community.length} />
              </button>
            </div>
            <div className="min-h-[300px]">
              {activeTab === "exemplars" ? (
                <ExemplarsList exemplars={exemplars} onLoadIntoEditor={setPromptText} />
              ) : communityLoading ? (
                <div className="flex items-center justify-center py-16 text-muted">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-xs">Loading community prompts…</span>
                </div>
              ) : (
                <CommunityList
                  prompts={community}
                  upvotedIds={upvotedIds}
                  currentUserId={userId}
                  onLoadIntoEditor={setPromptText}
                  onUpvoteToggle={handleUpvoteToggle}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — editor or scorecard */}
        <div className="flex-1 w-full flex flex-col space-y-6 lg:sticky lg:top-6 min-h-[600px]">
          {latest ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ScoreCard
                attempt={latest}
                compareTo={ownAttemptsOnScenario.find((a) => a.id !== latest.id) ?? null}
              />
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-surface/80 backdrop-blur-md shadow-sm">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-fg">Want a higher score?</span>
                  <span className="text-xs text-muted">Regrade the same prompt, or refine and try again.</span>
                </div>
                <div className="flex items-center gap-3">
                  {userId ? (
                    <button
                      onClick={() => onShareClick(latest)}
                      disabled={latest.shared || submitting}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-sm font-semibold text-muted hover:text-fg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
                    >
                      {latest.shared ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" /> Shared
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" /> Share
                        </>
                      )}
                    </button>
                  ) : null}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    title="Re-score the same prompt (AI grading can vary run to run)"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-sm font-semibold text-muted hover:text-fg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
                  >
                    <RotateCcw className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
                    {submitting ? "Regrading…" : "Regrade"}
                  </button>
                  <button
                    onClick={() => {
                      setLatest(null);
                      setStartedAt(Date.now());
                    }}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4" /> Try again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 rounded-3xl border border-border bg-surface p-1 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="flex-1 rounded-[1.4rem] bg-bg flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Your Prompt Editor</h2>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono font-medium text-muted/80 bg-surface px-3 py-1 rounded-full border border-border">
                    <span>{charCount} chars</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-fg/80">~{tokenEstimate} tokens</span>
                  </div>
                </div>
                <div className="flex-1 p-6 relative">
                  <PromptEditor
                    value={promptText}
                    onChange={setPromptText}
                    disabled={submitting}
                    minRows={20}
                    placeholder="Write your prompt. Be specific about the role, format, and constraints. Address edge cases."
                  />
                  {submitting && (
                    <div className="absolute inset-0 bg-bg/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-[1.4rem]">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-sm font-bold text-fg animate-pulse">Grading against rubric...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-panel/30">
                  <div className="text-xs font-medium text-muted">
                    {ownAttemptsOnScenario.length > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        {ownAttemptsOnScenario.length} previous attempt{ownAttemptsOnScenario.length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span>First attempt on this scenario</span>
                    )}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || charCount === 0}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/25 active:scale-95 group"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    {submitting ? "Grading…" : "Submit & Score"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tiny shared bits
// ──────────────────────────────────────────────────────────────────────────



function Count({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-panel/60 text-[10px] font-mono tabular-nums text-muted/80">
      {value}
    </span>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-panel/20 p-10 text-center">
      <p className="text-xs text-muted">{message}</p>
    </div>
  );
}
