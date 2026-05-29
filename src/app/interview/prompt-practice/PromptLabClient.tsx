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

type Mode = "practice" | "playground";

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
  const [mode, setMode] = useState<Mode>("practice");
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set(initialUpvotedIds));
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<Attempt | null>(null);

  // Restore last-used mode from localStorage so a refresh keeps you where you were.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("promptLabMode") : null;
    if (saved === "practice" || saved === "playground") setMode(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("promptLabMode", mode);
  }, [mode]);

  return (
    <div className="min-h-screen bg-bg text-fg py-10 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Beaker className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-fg">Prompt Lab</h1>
              <p className="text-xs text-muted">
                Practice prompt engineering against scored scenarios, or experiment freely against Gemini.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} onChange={setMode} />
            <Link
              href="/interview"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-bg hover:bg-panel text-xs font-semibold text-muted hover:text-fg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Link>
          </div>
        </header>

        {mode === "practice" ? (
          activeScenario ? (
            <PracticeRunner
              scenario={activeScenario}
              userId={userId}
              attempts={attempts}
              exemplars={allExemplars.filter((e) => e.scenarioId === activeScenario.id)}
              upvotedIds={upvotedIds}
              onBack={() => setActiveScenario(null)}
              onAttemptSubmitted={(a) => setAttempts((prev) => [a, ...prev])}
              onShareClick={(a) => setShareTarget(a)}
              onUpvoteToggle={async (attemptId, nextUpvoted) => {
                // Optimistic update
                setUpvotedIds((prev) => {
                  const next = new Set(prev);
                  if (nextUpvoted) next.add(attemptId);
                  else next.delete(attemptId);
                  return next;
                });
                setAttempts((prev) =>
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
                  // Reconcile with server count in case of race.
                  setAttempts((prev) =>
                    prev.map((a) => (a.id === attemptId ? { ...a, shareUpvotes: data.count } : a)),
                  );
                } catch (err) {
                  // Revert optimistic update
                  setUpvotedIds((prev) => {
                    const next = new Set(prev);
                    if (nextUpvoted) next.delete(attemptId);
                    else next.add(attemptId);
                    return next;
                  });
                  toast.error("Couldn't update vote", {
                    description: err instanceof Error ? err.message : String(err),
                  });
                }
              }}
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
          <PlaygroundMode />
        )}
      </div>

      {showCreateModal ? (
        <CreateScenarioModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(s) => {
            setScenarios((prev) => [s, ...prev]);
            setActiveScenario(s);
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

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Lab mode" className="inline-flex items-center gap-1 bg-panel/40 border border-border rounded-lg p-0.5">
      {(["practice", "playground"] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
            mode === m ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          {m}
        </button>
      ))}
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
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border bg-panel/20">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/60" />
          <input
            type="text"
            placeholder="Search scenarios…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-bg border border-border text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-bg border border-border text-xs text-muted focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-bg border border-border text-xs text-muted focus:outline-none focus:border-indigo-500"
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
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
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
                className="group text-left rounded-xl border border-border bg-surface p-5 hover:border-indigo-500/40 hover:bg-panel/20 transition-colors flex flex-col"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${
                      DIFFICULTY_STYLES[s.difficulty] ?? DIFFICULTY_STYLES.intermediate
                    }`}
                  >
                    {s.difficulty}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-panel border border-border text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {s.category.replace("-", " ")}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-fg mt-3 group-hover:text-indigo-400 transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs text-muted mt-1.5 leading-relaxed line-clamp-3 flex-1">
                  {s.description}
                </p>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {s.estimatedMinutes} min
                  </span>
                  {stats ? (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-emerald-400">
                      Best {stats.best}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
                      Start <ChevronRight className="w-3 h-3" />
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
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-muted" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Recent attempts</h3>
            <span className="text-[11px] text-muted/70">{attempts.length} total</span>
          </div>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-panel/30">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <th className="text-left px-4 py-2.5">Scenario</th>
                  <th className="text-left px-4 py-2.5">Difficulty</th>
                  <th className="text-right px-4 py-2.5 tabular-nums">Score</th>
                  <th className="text-right px-4 py-2.5 tabular-nums">Tokens</th>
                  <th className="text-left px-4 py-2.5">When</th>
                  <th className="text-left px-4 py-2.5">Shared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.slice(0, 10).map((a) => {
                  const score = a.score ?? 0;
                  const tone =
                    score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
                  return (
                    <tr key={a.id} className="hover:bg-panel/20 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-fg">{a.scenarioTitle}</td>
                      <td className="px-4 py-2.5 text-xs text-muted capitalize">{a.scenarioDifficulty}</td>
                      <td className={`px-4 py-2.5 text-right font-mono tabular-nums font-semibold ${tone}`}>
                        {a.score ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted">
                        {a.tokenEstimate}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {a.shared ? (
                          <span className="inline-flex items-center gap-1 text-indigo-400">
                            <Check className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted/60">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
  onBack,
  onAttemptSubmitted,
  onShareClick,
  onUpvoteToggle,
}: {
  scenario: Scenario;
  userId: string | null;
  attempts: Attempt[];
  exemplars: Exemplar[];
  upvotedIds: Set<string>;
  onBack: () => void;
  onAttemptSubmitted: (a: Attempt) => void;
  onShareClick: (a: Attempt) => void;
  onUpvoteToggle: (attemptId: string, nextUpvoted: boolean) => void;
}) {
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<Attempt | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [activeTab, setActiveTab] = useState<"exemplars" | "community">("exemplars");

  // Per-scenario draft autosave so a refresh / accidental nav doesn't wipe
  // 20 minutes of careful prompt-writing.
  const draft = useDraft(`prompt-lab:draft:${scenario.id}`, promptText, setPromptText);

  // Reset session-local state when the scenario changes. The draft hook
  // handles re-hydration for the new scenario id automatically.
  useEffect(() => {
    setLatest(null);
    setStartedAt(Date.now());
  }, [scenario.id]);

  // Community list = shared attempts on this scenario by *other* users.
  const community = useMemo(
    () => attempts.filter((a) => a.shared && a.scenarioId === scenario.id),
    [attempts, scenario.id],
  );

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
          userId,
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
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-bg hover:bg-panel text-xs font-semibold text-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All scenarios
        </button>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${
              DIFFICULTY_STYLES[scenario.difficulty] ?? DIFFICULTY_STYLES.intermediate
            }`}
          >
            {scenario.difficulty}
          </span>
          <span className="text-fg font-semibold">{scenario.title}</span>
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="w-3 h-3" /> {scenario.estimatedMinutes} min
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* LEFT — brief + exemplars + community */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Brief</h2>
              <p className="mt-1.5 text-sm text-fg leading-relaxed whitespace-pre-wrap">
                {scenario.description}
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">Objective</h3>
              <p className="mt-1.5 text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">
                {scenario.objective}
              </p>
            </div>
          </div>

          {/* Exemplars / Community tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1 border-b border-border">
              <TabButton active={activeTab === "exemplars"} onClick={() => setActiveTab("exemplars")}>
                <Sparkles className="w-3.5 h-3.5" />
                Exemplars
                <Count value={exemplars.length} />
              </TabButton>
              <TabButton active={activeTab === "community"} onClick={() => setActiveTab("community")}>
                <Users className="w-3.5 h-3.5" />
                Community
                <Count value={community.length} />
              </TabButton>
            </div>
            {activeTab === "exemplars" ? (
              <ExemplarsList exemplars={exemplars} onLoadIntoEditor={setPromptText} />
            ) : (
              <CommunityList
                prompts={community}
                upvotedIds={upvotedIds}
                currentUserId={userId}
                onLoadIntoEditor={setPromptText}
                onUpvoteToggle={onUpvoteToggle}
              />
            )}
          </div>
        </div>

        {/* RIGHT — editor or scorecard */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {latest ? (
            <>
              <ScoreCard attempt={latest} />
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-panel/20 p-3">
                <div className="text-xs text-muted">Want a higher score?</div>
                <div className="flex items-center gap-2">
                  {userId ? (
                    <button
                      onClick={() => onShareClick(latest)}
                      disabled={latest.shared}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-bg hover:bg-panel text-xs font-semibold text-muted hover:text-fg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {latest.shared ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Shared
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </>
                      )}
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      setLatest(null);
                      setStartedAt(Date.now());
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try again
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your prompt</h2>
                <span className="text-[11px] font-mono tabular-nums text-muted">
                  {charCount} chars · ~{tokenEstimate} tokens
                </span>
              </div>
              <PromptEditor
                value={promptText}
                onChange={setPromptText}
                disabled={submitting}
                minRows={18}
                placeholder="Write your prompt. Be specific about the role, format, and constraints. Address edge cases."
              />
              <div className="flex items-center justify-between text-[11px] text-muted">
                {ownAttemptsOnScenario.length > 0 ? (
                  <span>
                    {ownAttemptsOnScenario.length} previous attempt
                    {ownAttemptsOnScenario.length === 1 ? "" : "s"} on this scenario
                  </span>
                ) : (
                  <span>First attempt</span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || charCount === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {submitting ? "Grading…" : "Submit & score"}
                </button>
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
        active ? "border-indigo-500 text-indigo-400" : "border-transparent text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

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
