"use client";

import { useState, useEffect } from "react";
import { Clock, Brain, AlertCircle, CheckCircle, Sparkles, Send, RefreshCw, BarChart2 } from "lucide-react";
import { toast } from "sonner";

interface RubricBreakdown {
  clarity: number;
  specificity: number;
  efficiency: number;
  context: number;
  constraints: number;
  edgeCases: number;
}

interface Attempt {
  id: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null; // JSON RubricBreakdown
  feedback: string | null;
  graderType: string | null;
  durationSec: number | null;
}

interface Scenario {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  objective: string;
  description: string;
}

interface PromptChallengeRunnerProps {
  scenario: Scenario;
  sessionId: string;
  userId?: string | null;
  initialAttempt?: Attempt | null;
  interviewerView: boolean;
  onSuccessSubmit?: (attempt: any) => void;
}

export default function PromptChallengeRunner({
  scenario,
  sessionId,
  userId,
  initialAttempt,
  interviewerView,
  onSuccessSubmit,
}: PromptChallengeRunnerProps) {
  const [promptText, setPromptText] = useState(initialAttempt?.promptText || "");
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(initialAttempt || null);
  const [startTime] = useState<number>(Date.now());

  // Update when initialAttempt changes
  useEffect(() => {
    if (initialAttempt) {
      setAttempt(initialAttempt);
      setPromptText(initialAttempt.promptText);
    }
  }, [initialAttempt]);

  const charCount = promptText.length;
  const wordCount = promptText.split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.ceil(charCount / 4.0);

  // Difficulty styling
  const diffClass =
    scenario.difficulty === "beginner"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : scenario.difficulty === "advanced"
      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
      : "bg-amber-500/10 border-amber-500/20 text-amber-400";

  // Rubric mapping helper
  const parsedRubric = (): RubricBreakdown | null => {
    if (!attempt?.rubricScores) return null;
    try {
      return JSON.parse(attempt.rubricScores) as RubricBreakdown;
    } catch {
      return null;
    }
  };

  const rubric = parsedRubric();

  const handleSubmittingPrompt = async () => {
    if (!promptText.trim()) {
      toast.error("Prompt cannot be empty");
      return;
    }

    setSubmitting(true);
    const durationSec = Math.round((Date.now() - startTime) / 1000);

    try {
      const response = await fetch("/api/prompt-challenges/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          promptText,
          sessionId,
          userId,
          durationSec,
        }),
      });

      if (!response.ok) throw new Error("Grading failed");
      const data = await response.json();

      if (data.success && data.attempt) {
        setAttempt(data.attempt);
        toast.success("Prompt submitted and graded successfully!");
        if (onSuccessSubmit) onSuccessSubmit(data.attempt);
      } else {
        throw new Error(data.error || "Failed to parse grade");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit prompt for grading. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPrompt = () => {
    if (confirm("Are you sure you want to write a new prompt? Your current score will be reset.")) {
      setAttempt(null);
      setPromptText("");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-6xl mx-auto">
      {/* LEFT: Scenario Description Panel (Span 5) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-6 flex flex-col h-full shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4 mb-4">
            <div className="space-y-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${diffClass}`}>
                {scenario.difficulty}
              </span>
              <h2 className="text-base font-bold text-fg/90 mt-1.5">{scenario.title}</h2>
              <p className="text-[10px] text-muted font-semibold uppercase tracking-widest">{scenario.category}</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted bg-panel border border-border px-2.5 py-1 rounded-xl shadow-inner">
              <Clock className="w-3.5 h-3.5 text-muted/80" />
              <span>{scenario.estimatedMinutes} min</span>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto pr-1 scrollbar-thin">
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-fg/80">Scenario Context</h3>
              <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{scenario.description}</p>
            </div>

            <div className="p-4 rounded-xl bg-panel border border-border space-y-2.5 shadow-inner">
              <div className="flex items-center gap-1.5 text-accent text-xs font-bold uppercase tracking-widest">
                <Brain className="w-4 h-4 text-accent" />
                <span>Round Objective</span>
              </div>
              <p className="text-xs text-fg/90 leading-relaxed whitespace-pre-wrap">{scenario.objective}</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Editor or Score Panel (Span 7) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* VIEWING MODE: RECIPROCATES CANDIDATE PROGRESS OR SHOWS GRADES */}
        {attempt ? (
          /* RESULTS CARD SCREEN */
          <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-6 space-y-6 flex flex-col h-full shadow-lg animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-accent/20 bg-accent/5 flex items-center justify-center text-accent font-black text-lg shadow-inner">
                  {attempt.score}%
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fg/90 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-accent" />
                    Evaluation Complete
                  </h3>
                  <p className="text-[10px] text-muted">
                    Graded using <span className="font-semibold text-fg/75">{attempt.graderType === "ai" ? "Gemini AI" : "Local Grader"}</span>
                  </p>
                </div>
              </div>

              {!interviewerView && (
                <button
                  onClick={resetPrompt}
                  className="px-3.5 py-1.5 rounded-xl border border-border hover:border-border-strong bg-panel hover:bg-surface text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted" />
                  Try Again
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {/* Dimensions Breakdown Bars */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-fg/80 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-accent" />
                  Rubric Breakdown
                </h4>

                {rubric && (
                  <div className="space-y-3.5">
                    {[
                      { key: "clarity", label: "Clarity & Structure" },
                      { key: "specificity", label: "Technical Specificity" },
                      { key: "efficiency", label: "Token Efficiency" },
                      { key: "context", label: "Contextual Persona" },
                      { key: "constraints", label: "Constraint Specification" },
                      { key: "edgeCases", label: "Edge-Case Mitigation" },
                    ].map((item) => {
                      const val = rubric[item.key as keyof RubricBreakdown] || 0;
                      let barColor = "bg-accent";
                      if (val < 50) barColor = "bg-rose-500";
                      else if (val < 75) barColor = "bg-amber-500";

                      return (
                        <div key={item.key} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-muted/90">{item.label}</span>
                            <span className="text-fg/80">{val}/100</span>
                          </div>
                          <div className="h-2 w-full bg-panel border border-border rounded-full overflow-hidden shadow-inner">
                            <div
                              style={{ width: `${val}%` }}
                              className={`h-full ${barColor} rounded-full transition-all duration-1000`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Written Summary Markdown Panel */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-fg/80">Detailed Feedback</h4>
                <div className="p-4 rounded-xl bg-panel/75 border border-border shadow-inner max-h-[300px] overflow-y-auto prose prose-invert text-xs leading-relaxed scrollbar-thin text-muted">
                  <div className="whitespace-pre-wrap">{attempt.feedback || "No feedback summary generated."}</div>
                </div>
              </div>
            </div>

            {/* Submitted Prompt Preview */}
            <div className="border-t border-border pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Submitted Prompt</h4>
              <pre className="p-3.5 bg-panel border border-border rounded-xl text-[10px] font-mono whitespace-pre-wrap overflow-x-auto text-fg/75 shadow-inner leading-relaxed">
                {attempt.promptText}
              </pre>
            </div>
          </div>
        ) : interviewerView ? (
          /* INTERVIEWER STANDBY VIEW */
          <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full shadow-lg space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 animate-ping opacity-60 rounded-full" />
              <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/25 flex items-center justify-center text-accent shadow-inner relative">
                <Brain className="w-8 h-8 text-accent animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg/90">Candidate in Round</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-[280px]">
                The candidate is currently writing and optimizing their prompt. The results will populate here immediately upon submission.
              </p>
            </div>
          </div>
        ) : (
          /* CANDIDATE WRITING EDITOR SCREEN */
          <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-6 flex flex-col h-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-fg/80">Prompt Engineering Console</span>
              <span className="text-[10px] text-muted font-mono tracking-widest bg-panel px-2.5 py-0.5 rounded border border-border shadow-inner">
                Practice Console
              </span>
            </div>

            <div className="flex-1 flex flex-col relative min-h-[300px]">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Write your detailed, structured prompt here... Set a role, add clear instructions, provide context, outline constraints, and address potential edge cases to maximize your grade!"
                disabled={submitting}
                className="flex-1 w-full p-4 rounded-xl bg-panel border border-border focus:border-accent/40 focus:bg-surface text-xs text-fg placeholder:text-muted/65 outline-none resize-none transition-all shadow-inner leading-relaxed"
              />
            </div>

            {/* Metadata Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-4 shrink-0">
              <div className="flex items-center gap-4 text-[10px] font-mono text-muted bg-panel border border-border px-3.5 py-1.5 rounded-xl shadow-inner">
                <div className="flex items-center gap-1">
                  <span>Chars:</span>
                  <span className="font-bold text-fg/75">{charCount}</span>
                </div>
                <div className="h-3 w-[1px] bg-border" />
                <div className="flex items-center gap-1">
                  <span>Words:</span>
                  <span className="font-bold text-fg/75">{wordCount}</span>
                </div>
                <div className="h-3 w-[1px] bg-border" />
                <div className="flex items-center gap-1">
                  <span>Tokens:</span>
                  <span className="font-bold text-fg/75">~{tokenEstimate}</span>
                </div>
              </div>

              <button
                onClick={handleSubmittingPrompt}
                disabled={submitting || charCount === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:opacity-95 text-[10px] font-black uppercase tracking-widest text-white transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(139,92,246,0.2)] active:scale-95 transform shrink-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Assessing Prompt...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit & Evaluate
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
