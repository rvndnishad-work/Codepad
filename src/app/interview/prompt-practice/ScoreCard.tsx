"use client";

import { BarChart2, Sparkles, Target, Zap, Bot, MessageSquare } from "lucide-react";
import { type Attempt, parseRubric, RUBRIC_LABELS } from "./types";

interface Props {
  attempt: Attempt;
}

export default function ScoreCard({ attempt }: Props) {
  const rubric = parseRubric(attempt.rubricScores);
  const score = attempt.score ?? 0;
  
  // Calculate stroke-dashoffset for the circular progress (circumference = 2 * pi * r)
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const scoreTone = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  const scoreBg = score >= 75 ? "stroke-emerald-400" : score >= 50 ? "stroke-amber-400" : "stroke-rose-400";

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-8 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700" />
      
      <header className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
            <Target className="w-4 h-4" /> Overall Score
          </div>
          <div className="text-sm text-muted/80 max-w-xs text-center sm:text-left mt-2">
            This prompt was evaluated across six dimensions by our AI grader.
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel/50 border border-border text-xs text-muted font-medium">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              {attempt.graderType === "ai" ? "Gemini 1.5 Pro" : "Local rules"}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel/50 border border-border text-xs text-muted font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {attempt.tokenEstimate} tokens
            </div>
          </div>
        </div>

        {/* Circular Progress Indicator */}
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-panel fill-none"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className={`fill-none ${scoreBg} transition-all duration-1000 ease-out`}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={`text-4xl font-black tabular-nums ${scoreTone}`}>{score}</span>
          </div>
        </div>
      </header>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <section className="relative space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          Dimension Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {RUBRIC_LABELS.map(({ key, label }) => {
            const val = rubric[key];
            const tone = val >= 75 ? "bg-emerald-400" : val >= 50 ? "bg-amber-400" : "bg-rose-400";
            return (
              <div key={key} className="space-y-2 p-3 rounded-2xl bg-panel/30 border border-border/50 hover:bg-panel/50 transition-colors">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-fg/90">{label}</span>
                  <span className="font-mono tabular-nums text-muted">{val}/100</span>
                </div>
                <div className="h-2 rounded-full bg-bg overflow-hidden border border-border/50">
                  <div className={`h-full ${tone} transition-all duration-1000 ease-out`} style={{ width: `${val}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {attempt.feedback ? (
        <section className="relative space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            AI Feedback
          </h4>
          <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-sm text-fg/90 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {attempt.feedback}
          </div>
        </section>
      ) : null}
    </div>
  );
}
