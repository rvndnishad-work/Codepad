"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Send,
  RefreshCw,
  Timer,
  Zap,
  Terminal,
  Bot,
  Trophy,
  RotateCcw,
} from "lucide-react";

import CodeViewer from "./CodeViewer";
import Leaderboard from "./Leaderboard";
import {
  CATEGORY_META,
  DIFFICULTY_STYLES,
  LANGUAGE_LABELS,
} from "./types";
import type { Challenge, GradeResponse, Mark, ReviewCategory } from "./types";

type Phase = "reviewing" | "revealed";

export default function ChallengeRunner({
  challenge,
  userId,
  huntMode,
  onBack,
  onGraded,
}: {
  challenge: Challenge;
  userId: string | null;
  huntMode: boolean;
  onBack: () => void;
  onGraded: (challengeId: string, score: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("reviewing");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [remaining, setRemaining] = useState(challenge.timeLimitSec);
  const [lbRefresh, setLbRefresh] = useState(0);

  const setMark = useCallback((line: number, category: ReviewCategory | null) => {
    setMarks((prev) => {
      const without = prev.filter((m) => m.line !== line);
      return category ? [...without, { line, category }] : without;
    });
  }, []);

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submitting || phase === "revealed") return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/review-challenges/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            challengeId: challenge.id,
            marks,
            durationSec: Math.round((Date.now() - startedAt) / 1000),
            mode: huntMode ? "hunt" : "standard",
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setResult(data as GradeResponse);
        setPhase("revealed");
        onGraded(challenge.id, data.score);
        if (huntMode) setLbRefresh((n) => n + 1);
        toast[auto ? "message" : "success"](
          auto ? "Time! Scoring your review…" : `Scored ${data.score}/100`,
          { description: `Found ${data.foundCount} of ${data.totalFindings} planted issues.` },
        );
      } catch (err) {
        toast.error("Couldn't grade your review", {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [challenge.id, marks, startedAt, huntMode, submitting, phase, onGraded],
  );

  // Countdown for hunt mode. Auto-submit at zero.
  const autoFired = useRef(false);
  useEffect(() => {
    if (!huntMode || phase === "revealed") return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!autoFired.current) {
            autoFired.current = true;
            doSubmit(true);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [huntMode, phase, doSubmit]);

  const timePct = Math.max(0, (remaining / challenge.timeLimitSec) * 100);
  const timeLow = remaining <= 15;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-surface/50 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-bg hover:bg-panel text-muted hover:text-fg transition-colors"
            aria-label="Back to challenges"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-fg">{challenge.title}</span>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted font-medium">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                  DIFFICULTY_STYLES[challenge.difficulty] ?? DIFFICULTY_STYLES.intermediate
                }`}
              >
                {challenge.difficulty}
              </span>
              <span>&bull;</span>
              <span>{LANGUAGE_LABELS[challenge.language] ?? challenge.language}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {challenge.estimatedMinutes} min
              </span>
            </div>
          </div>
        </div>

        {huntMode && phase === "reviewing" && (
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold tabular-nums transition-colors ${
                timeLow
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-500 animate-pulse"
                  : "border-border bg-bg text-fg"
              }`}
            >
              <Timer className="w-4 h-4" />
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </div>
          </div>
        )}
      </div>

      {huntMode && phase === "reviewing" && (
        <div className="h-1 w-full bg-panel rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              timeLow ? "bg-rose-500" : "bg-indigo-500"
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT — the AI's answer */}
        <div className="w-full lg:flex-1 space-y-4 min-w-0">
          {/* The prompt the fictional AI answered */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-3 bg-panel/30 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
                The prompt the AI was given
              </h2>
            </div>
            <p className="px-5 py-4 text-sm text-fg leading-relaxed">{challenge.prompt}</p>
          </div>

          {/* The code */}
          <div className="flex items-center gap-2 px-1">
            <Terminal className="w-4 h-4 text-muted" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted">
              The AI&apos;s answer — click a line to flag it
            </span>
          </div>
          <CodeViewer
            code={challenge.code}
            language={challenge.language}
            marks={marks}
            onMark={setMark}
            reveal={phase === "revealed" ? result?.reveal ?? null : null}
            falsePositiveLines={result?.falsePositiveMarks.map((m) => m.line) ?? []}
            disabled={submitting}
          />
        </div>

        {/* RIGHT — controls / scorecard */}
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4 lg:sticky lg:top-6">
          {phase === "reviewing" ? (
            <ReviewingPanel
              marks={marks}
              findingCount={challenge.findingCount}
              huntMode={huntMode}
              submitting={submitting}
              onSubmit={() => doSubmit(false)}
              onClearAll={() => setMarks([])}
            />
          ) : (
            result && (
              <RevealPanel
                result={result}
                huntMode={huntMode}
                onRetry={() => {
                  setMarks([]);
                  setResult(null);
                  setPhase("reviewing");
                  setRemaining(challenge.timeLimitSec);
                  autoFired.current = false;
                }}
                onBack={onBack}
              />
            )
          )}

          {huntMode && userId && <Leaderboard challengeId={challenge.id} refreshKey={lbRefresh} />}
        </div>
      </div>
    </div>
  );
}

// ── Reviewing panel — list of the reviewer's marks + submit ────────────────

function ReviewingPanel({
  marks,
  findingCount,
  huntMode,
  submitting,
  onSubmit,
  onClearAll,
}: {
  marks: Mark[];
  findingCount: number;
  huntMode: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onClearAll: () => void;
}) {
  const sorted = useMemo(() => [...marks].sort((a, b) => a.line - b.line), [marks]);
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted">
          Your findings
        </h3>
        <span className="text-xs font-mono text-muted bg-panel px-2 py-0.5 rounded-md">
          {marks.length} flagged
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        This code has <span className="font-bold text-fg">{findingCount}</span> planted
        {findingCount === 1 ? " issue" : " issues"}. Flag every line you think is wrong and
        pick the category — wrong guesses cost points, so choose carefully.
      </p>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-panel/20 p-6 text-center">
          <p className="text-xs text-muted">No lines flagged yet. Click any code line to start.</p>
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-64 overflow-auto">
          {sorted.map((m) => {
            const meta = CATEGORY_META[m.category];
            return (
              <li
                key={m.line}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${meta.className}`}
              >
                <span className="font-mono text-muted/80">L{m.line}</span>
                <span>{meta.emoji}</span>
                <span className="flex-1 truncate">{meta.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        {marks.length > 0 && (
          <button
            onClick={onClearAll}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-xs font-semibold text-muted hover:text-fg transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : huntMode ? (
            <Zap className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {submitting ? "Scoring…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}

// ── Reveal panel — score + the full answer key ─────────────────────────────

function RevealPanel({
  result,
  huntMode,
  onRetry,
  onBack,
}: {
  result: GradeResponse;
  huntMode: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const tone =
    result.score >= 75
      ? "text-emerald-400"
      : result.score >= 50
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-muted">
          {huntMode ? <Trophy className="w-4 h-4 text-amber-500" /> : null}
          <span className="text-xs font-bold uppercase tracking-widest">
            {huntMode ? "Hunt result" : "Review score"}
          </span>
        </div>
        <div className={`text-5xl font-extrabold font-mono tabular-nums ${tone}`}>
          {result.score}
          <span className="text-xl text-muted">/100</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Found" value={`${result.foundCount}/${result.totalFindings}`} tone="emerald" />
          <Stat label="Partial" value={String(result.partialCount)} tone="amber" />
          <Stat label="Wrong flags" value={String(result.falsePositives)} tone="rose" />
        </div>
      </div>

      {/* Answer key */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Answer key</h3>
        <ul className="space-y-2.5 max-h-[46vh] overflow-auto pr-1">
          {result.reveal.map((f) => {
            const meta = CATEGORY_META[f.category];
            const icon = f.status === "hit" ? "✅" : f.status === "partial" ? "🟡" : "❌";
            return (
              <li key={f.id} className="rounded-xl border border-border bg-bg/50 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-fg">{f.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 mb-1.5 text-[11px]">
                      <span className="font-mono text-muted/80">
                        L{f.lineStart}
                        {f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ""}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold ${meta.className}`}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{f.explanation}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-sm font-semibold text-muted hover:text-fg transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> All challenges
        </button>
        <button
          onClick={onRetry}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-rose-400";
  return (
    <div className="rounded-xl bg-bg/60 border border-border/50 py-2">
      <div className={`text-lg font-mono font-bold tabular-nums ${toneClass}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</div>
    </div>
  );
}
