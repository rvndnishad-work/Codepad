"use client";

import { BarChart2, Sparkles } from "lucide-react";
import { type Attempt, parseRubric, RUBRIC_LABELS } from "./types";

interface Props {
  attempt: Attempt;
}

/**
 * Compact rubric breakdown shown next to the editor after a submission scores.
 * No marketing copy — just the numbers and the feedback.
 */
export default function ScoreCard({ attempt }: Props) {
  const rubric = parseRubric(attempt.rubricScores);
  const score = attempt.score ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Overall</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-black tabular-nums text-fg">{score}</span>
            <span className="text-sm text-muted">/100</span>
          </div>
        </div>
        <div className="text-right text-[11px] text-muted space-y-1">
          <div className="inline-flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="w-3 h-3" />
            {attempt.graderType === "ai" ? "Gemini" : "Local rules"}
          </div>
          <div className="tabular-nums">{attempt.tokenEstimate} tokens</div>
          {attempt.durationSec ? (
            <div className="tabular-nums">{Math.round(attempt.durationSec / 60)}m written</div>
          ) : null}
        </div>
      </header>

      <section className="space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" />
          Rubric breakdown
        </h4>
        <div className="space-y-2.5">
          {RUBRIC_LABELS.map(({ key, label }) => {
            const val = rubric[key];
            const tone = val >= 75 ? "bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-rose-500";
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">{label}</span>
                  <span className="font-mono font-semibold tabular-nums text-fg">{val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-panel overflow-hidden">
                  <div className={`h-full ${tone} transition-all duration-500`} style={{ width: `${val}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {attempt.feedback ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Feedback</h4>
          <div className="p-3 rounded-lg bg-panel/40 border border-border text-xs text-fg leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto">
            {attempt.feedback}
          </div>
        </section>
      ) : null}
    </div>
  );
}
