"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  Brain,
  Sparkles,
  Copy,
  X,
  Search,
  ArrowLeft,
  Send,
  RefreshCw,
  BarChart2,
  Trophy,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Scenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  difficulty: string;
  category: string;
  estimatedMinutes: number;
}

interface Attempt {
  id: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null; // JSON string
  feedback: string | null;
  graderType: string | null;
  durationSec: number | null;
  createdAt: string;
  scenarioTitle: string;
  scenarioCategory: string;
  scenarioDifficulty: string;
}

interface RubricScores {
  clarity: number;
  specificity: number;
  efficiency: number;
  context: number;
  constraints: number;
  edgeCases: number;
}

interface Props {
  scenarios: Scenario[];
  initialAttempts: Attempt[];
  userId: string | null;
}

export default function PromptPracticeClient({
  scenarios,
  initialAttempts,
  userId,
}: Props) {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<Attempt | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  
  // Lobby filters
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Review Modal state
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  // Set timer when entering a challenge
  useEffect(() => {
    if (activeScenario) {
      setStartTime(Date.now());
      setPromptText("");
      setLatestAttempt(null);
    } else {
      setStartTime(null);
    }
  }, [activeScenario]);

  // Compute metrics
  const charCount = promptText.length;
  const wordCount = promptText.split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.ceil(charCount / 4.0);

  // Filtering scenarios
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchDiff = difficultyFilter === "all" || s.difficulty === difficultyFilter;
      const matchCat = categoryFilter === "all" || s.category === categoryFilter;
      const matchSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDiff && matchCat && matchSearch;
    });
  }, [scenarios, difficultyFilter, categoryFilter, searchTerm]);

  // General stats
  const stats = useMemo(() => {
    const gradedAttempts = attempts.filter((a) => a.score !== null);
    const avgScore =
      gradedAttempts.length > 0
        ? Math.round(gradedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedAttempts.length)
        : 0;
    
    // Find best scoring category
    const categories: Record<string, { sum: number; count: number }> = {};
    gradedAttempts.forEach((a) => {
      if (!categories[a.scenarioCategory]) {
        categories[a.scenarioCategory] = { sum: 0, count: 0 };
      }
      categories[a.scenarioCategory].sum += a.score || 0;
      categories[a.scenarioCategory].count += 1;
    });

    let bestCat = "None";
    let highestAvg = 0;
    Object.entries(categories).forEach(([cat, data]) => {
      const avg = data.sum / data.count;
      if (avg > highestAvg) {
        highestAvg = avg;
        bestCat = cat.replace("-", " ");
      }
    });

    return {
      total: attempts.length,
      avg: avgScore,
      bestCategory: bestCat,
    };
  }, [attempts]);

  const handleSelectScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
  };

  const handleBackToLobby = () => {
    if (promptText.trim() && !latestAttempt) {
      if (!confirm("Are you sure you want to exit? Your progress will not be saved.")) {
        return;
      }
    }
    setActiveScenario(null);
    setLatestAttempt(null);
    setPromptText("");
  };

  const handleSubmitPrompt = async () => {
    if (!promptText.trim()) {
      toast.error("Prompt cannot be empty.");
      return;
    }
    if (!activeScenario) return;

    setSubmitting(true);
    const durationSec = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

    try {
      const res = await fetch("/api/prompt-challenges/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          promptText,
          userId,
          durationSec,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Prompt graded successfully!");
      if (data.attempt) {
        setLatestAttempt(data.attempt);
        // Prepend to local attempts list
        setAttempts([data.attempt, ...attempts]);
      }
    } catch (err) {
      toast.error("Failed to evaluate prompt", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Difficulty badge coloring
  const getDifficultyStyles = (diff: string) => {
    switch (diff) {
      case "beginner":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "advanced":
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      default:
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-sans py-12 px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glowing effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/3 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-6xl relative z-10 space-y-8">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">AI Prompt engineering arena</div>
              <h1 className="text-xl font-bold tracking-tight text-fg mt-0.5">Self-Serve Practice Arena</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/interview"
              className="inline-flex items-center gap-1 px-4 py-2 bg-panel/60 border border-border hover:border-accent/40 rounded-xl text-xs font-semibold text-muted hover:text-fg transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </div>

        {/* LOBBY SECTION */}
        {!activeScenario ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Command card intro */}
            <div className="rounded-3xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 p-8 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-soft)_0%,transparent_40%)] opacity-[0.05] pointer-events-none" />
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest font-mono">Platform Sandbox Mode</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-fg">
                  Master the art of prompt writing.
                </h2>
                <p className="text-xs md:text-sm text-muted leading-relaxed max-w-xl">
                  Write highly technical, boundary-pushing prompts. Evaluate them in milliseconds on a **6-dimension rubric** (Clarity, Specificity, Token Efficiency, Persona Context, Constraints, and Edge Cases) graded with Gemini AI feedback reports.
                </p>
              </div>
            </div>

            {/* STATS HUDS */}
            {stats.total > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between hover:bg-panel/10 transition">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Completed Attempts</span>
                    <h2 className="text-2xl font-black text-fg font-mono leading-none">{stats.total}</h2>
                    <p className="text-[10px] text-muted">rounds completed by you</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between hover:bg-panel/10 transition">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Average Prompt Grade</span>
                    <h2 className="text-2xl font-black text-emerald-400 font-mono leading-none">{stats.avg}%</h2>
                    <p className="text-[10px] text-muted">out of 100 maximum points</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between hover:bg-panel/10 transition">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Strengths Category</span>
                    <h2 className="text-lg font-black text-indigo-400 capitalize truncate max-w-[200px] leading-none mt-1">{stats.bestCategory}</h2>
                    <p className="text-[10px] text-muted">highest scored category</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Brain className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH AND FILTERS */}
            <div className="flex flex-wrap gap-3 items-center bg-panel/15 border border-border/40 rounded-xl p-3">
              <div className="flex-1 min-w-[240px] relative">
                <input
                  type="text"
                  placeholder="Search practice scenarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                />
                <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-2 py-1.5 bg-bg border border-border rounded-md text-xs text-muted focus:outline-none"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 bg-bg border border-border rounded-md text-xs text-muted focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="code-generation">Code Generation</option>
                <option value="debugging">Debugging</option>
                <option value="api-design">API Design</option>
                <option value="data-analysis">Data Analysis</option>
                <option value="system-design">System Design</option>
                <option value="documentation">Creative / Docs</option>
              </select>

              <span className="text-[10px] text-muted/65 ml-auto font-mono">
                Showing {filteredScenarios.length} scenarios
              </span>
            </div>

            {/* SCENARIO GRID */}
            {filteredScenarios.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
                <div className="inline-flex p-3 rounded-full bg-panel text-muted/40">
                  <Brain className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-semibold text-fg">No scenarios match your search filters</h4>
                <p className="text-[11px] text-muted">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredScenarios.map((s) => {
                  const diffClass = getDifficultyStyles(s.difficulty);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectScenario(s)}
                      className="group flex flex-col bg-surface border border-border hover:border-indigo-500/40 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden relative"
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${diffClass}`}>
                          {s.difficulty}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-panel border border-border text-muted uppercase tracking-wider">
                          {s.category.replace("-", " ")}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-fg group-hover:text-indigo-400 mt-4 transition-colors">
                        {s.title}
                      </h3>

                      <p className="text-[11px] text-muted mt-2 leading-relaxed line-clamp-3 flex-1">
                        {s.description}
                      </p>

                      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted shrink-0">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted/65" /> Est. {s.estimatedMinutes} mins
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-indigo-400 font-bold group-hover:translate-x-1 transition-transform">
                          Practice <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PRACTICE HISTORY SECTION */}
            {attempts.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Your Practice Arena History</h3>
                  <p className="text-xs text-muted/75 mt-0.5">Review your previous performance grades and feedback recommendations.</p>
                </div>

                <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-panel/30 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted select-none">
                          <th className="px-4 py-3">Scenario</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Difficulty</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Tokens</th>
                          <th className="px-4 py-3">Grader</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {attempts.map((a) => {
                          const score = a.score ?? 0;
                          let scoreColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
                          if (score >= 75) scoreColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                          else if (score >= 50) scoreColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                          
                          return (
                            <tr key={a.id} className="hover:bg-panel/10 text-xs transition-colors group">
                              <td className="px-4 py-3 font-semibold text-fg group-hover:text-indigo-400 transition-colors">
                                {a.scenarioTitle}
                              </td>
                              <td className="px-4 py-3 text-muted capitalize">
                                {a.scenarioCategory.replace("-", " ")}
                              </td>
                              <td className="px-4 py-3 text-muted capitalize">
                                {a.scenarioDifficulty}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${scoreColor}`}>
                                  {a.score !== null ? `${a.score}%` : "Ungraded"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-muted">
                                {a.tokenEstimate}
                              </td>
                              <td className="px-4 py-3 text-muted">
                                {a.graderType === "ai" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                                    <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Gemini AI
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted">Rules-Engine</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted">
                                {new Date(a.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedAttempt(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/25 text-[11px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE INTERACTIVE RUNNER SECTION */
          <div className="animate-in fade-in duration-300">
            {/* Header detail block */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleBackToLobby}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-panel/30 hover:bg-panel rounded-xl text-xs font-semibold text-muted hover:text-fg transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Library
              </button>
              <div className="h-4 w-[1px] bg-border mx-1" />
              <div className="text-xs text-muted">
                Active Scenario: <span className="font-semibold text-fg">{activeScenario.title}</span>
              </div>
            </div>

            {/* Runner Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* LEFT: Scenario descriptions */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-6 flex flex-col h-full shadow-lg">
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-4 mb-4">
                    <div className="space-y-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getDifficultyStyles(activeScenario.difficulty)}`}>
                        {activeScenario.difficulty}
                      </span>
                      <h2 className="text-base font-bold text-fg/90 mt-1.5">{activeScenario.title}</h2>
                      <p className="text-[10px] text-muted font-semibold uppercase tracking-widest">{activeScenario.category.replace("-", " ")}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted bg-panel border border-border px-2.5 py-1 rounded-xl shadow-inner">
                      <Clock className="w-3.5 h-3.5 text-muted/80" />
                      <span>{activeScenario.estimatedMinutes} min</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-5 overflow-y-auto pr-1 scrollbar-thin">
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-fg/80">Scenario Context</h3>
                      <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{activeScenario.description}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-panel border border-border space-y-2.5 shadow-inner">
                      <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                        <Brain className="w-4 h-4 text-indigo-400" />
                        <span>Practice Objective</span>
                      </div>
                      <p className="text-xs text-fg/90 leading-relaxed whitespace-pre-wrap">{activeScenario.objective}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Console Editor or Latest Submission scorecard */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                {latestAttempt ? (
                  /* SCORECARD RESULTS PAGE */
                  (() => {
                    const rubric = latestAttempt.rubricScores
                      ? (typeof latestAttempt.rubricScores === "string"
                          ? JSON.parse(latestAttempt.rubricScores)
                          : latestAttempt.rubricScores)
                      : { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 };
                    
                    return (
                      <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-6 space-y-6 flex flex-col h-full shadow-lg animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center text-indigo-400 font-black text-lg shadow-inner">
                              {latestAttempt.score}%
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-fg/90 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                                Grading Completed!
                              </h3>
                              <p className="text-[10px] text-muted">
                                Scored using <span className="font-semibold text-fg/75">{latestAttempt.graderType === "ai" ? "Gemini AI" : "Local Rules"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setLatestAttempt(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-border hover:border-accent bg-panel hover:bg-surface text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-muted" /> Try Again
                            </button>
                            <button
                              onClick={handleBackToLobby}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold uppercase tracking-widest text-white transition flex items-center gap-1.5"
                            >
                              Lobby
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                          {/* Rubric scores */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-fg/80 flex items-center gap-1.5">
                              <BarChart2 className="w-4 h-4 text-indigo-400" />
                              Rubric Breakdown
                            </h4>

                            <div className="space-y-3">
                              {[
                                { key: "clarity", label: "Clarity & Structure" },
                                { key: "specificity", label: "Technical Specificity" },
                                { key: "efficiency", label: "Token Efficiency" },
                                { key: "context", label: "Persona & Context" },
                                { key: "constraints", label: "Constraints Enforcement" },
                                { key: "edgeCases", label: "Edge-Case Mitigation" },
                              ].map((item) => {
                                const val = Number(rubric[item.key as keyof RubricScores] || 0);
                                let barColor = "bg-indigo-500";
                                if (val < 50) barColor = "bg-rose-500";
                                else if (val < 75) barColor = "bg-amber-500";

                                return (
                                  <div key={item.key} className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span className="text-muted">{item.label}</span>
                                      <span className="text-fg/85">{val}/100</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-panel border border-border rounded-full overflow-hidden shadow-inner">
                                      <div
                                        style={{ width: `${val}%` }}
                                        className={`h-full ${barColor} rounded-full transition-all duration-1000`}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Written Feedback summary */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-fg/80">AI Evaluator Summary</h4>
                            <div className="p-4 rounded-xl bg-panel border border-border shadow-inner max-h-[260px] overflow-y-auto prose prose-invert text-xs leading-relaxed scrollbar-thin text-muted whitespace-pre-wrap">
                              {latestAttempt.feedback || "No feedback comments available."}
                            </div>
                          </div>
                        </div>

                        {/* Submitted Prompt */}
                        <div className="border-t border-border pt-4 shrink-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Submitted Prompt</h4>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(latestAttempt.promptText);
                                toast.success("Prompt copied to clipboard!");
                              }}
                              className="text-[10px] text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy Prompt
                            </button>
                          </div>
                          <pre className="p-3 bg-panel border border-border rounded-xl text-[10px] font-mono whitespace-pre-wrap overflow-x-auto text-fg/75 max-h-[120px] shadow-inner leading-relaxed select-text">
                            {latestAttempt.promptText}
                          </pre>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* CONSOLE WRITE WRITING SCREEN */
                  <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-6 flex flex-col h-full shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-fg/80">Prompt Engineering Console</span>
                      <span className="text-[10px] text-muted font-mono tracking-widest bg-panel px-2.5 py-0.5 rounded border border-border shadow-inner">
                        Practice Active
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col relative min-h-[320px]">
                      <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="Write your detailed, structured prompt here... Set a role, add clear instructions, provide context, outline constraints, and address potential edge cases to maximize your grade!"
                        disabled={submitting}
                        className="flex-1 w-full p-4 rounded-xl bg-panel border border-border focus:border-accent/40 focus:bg-surface text-xs text-fg placeholder:text-muted/65 outline-none resize-none transition-all shadow-inner leading-relaxed"
                      />
                    </div>

                    {/* Metadata counters */}
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
                        onClick={handleSubmitPrompt}
                        disabled={submitting || charCount === 0}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:brightness-110 hover:shadow-lg hover:shadow-indigo-500/10 text-[10px] font-black uppercase tracking-widest text-white transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(99,102,241,0.2)] active:scale-95 transform shrink-0 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            AI Assessing Prompt...
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
          </div>
        )}

      </div>

      {/* DETAILED ATTEMPT REVIEW MODAL */}
      {selectedAttempt && (() => {
        const rubric = selectedAttempt.rubricScores
          ? (typeof selectedAttempt.rubricScores === "string"
              ? JSON.parse(selectedAttempt.rubricScores)
              : selectedAttempt.rubricScores)
          : { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 };
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel/30">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <div>
                    <h2 className="text-base font-semibold text-fg">Prompt Evaluation Review</h2>
                    <p className="text-[10px] text-muted mt-0.5">
                      Scenario: <span className="text-fg font-medium">{selectedAttempt.scenarioTitle}</span> &bull; Mode: <span className="text-fg font-medium">Developer Self-Serve Practice</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Score Summary Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left: Overall score */}
                  <div className="bg-panel/20 border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" /> {selectedAttempt.graderType === "ai" ? "Gemini AI" : "Rules Engine"}
                    </div>
                    
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Overall Score</span>
                    <div className="relative flex items-center justify-center my-2">
                      <div className="text-4xl font-extrabold text-indigo-500">{selectedAttempt.score ?? 0}</div>
                      <div className="text-xs text-muted/60 self-end mb-1">/100</div>
                    </div>
                    <span className="text-[10px] text-muted mt-1">
                      {selectedAttempt.durationSec ? `${Math.round(selectedAttempt.durationSec / 60)}m taken` : "Untimed"} &bull; {selectedAttempt.tokenEstimate} tokens
                    </span>
                  </div>

                  {/* Right: Dimension rubric breakdowns */}
                  <div className="md:col-span-2 bg-panel/10 border border-border/40 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-fg tracking-wide">6-Dimension Rubric Evaluation</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries({
                        Clarity: rubric.clarity,
                        Specificity: rubric.specificity,
                        Efficiency: rubric.efficiency,
                        Context: rubric.context,
                        Constraints: rubric.constraints,
                        "Edge Cases": rubric.edgeCases
                      }).map(([key, val]) => {
                        const score = Number(val || 0);
                        let barColor = "bg-rose-500";
                        if (score >= 75) barColor = "bg-emerald-500";
                        else if (score >= 50) barColor = "bg-amber-500";
                        
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted font-medium">{key}</span>
                              <span className="text-fg font-semibold">{score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* AI Feedback */}
                {selectedAttempt.feedback && (
                  <div className="bg-indigo-500/[0.03] border border-indigo-500/20 rounded-xl p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Evaluator Feedback Insights
                    </h3>
                    <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedAttempt.feedback}
                    </p>
                  </div>
                )}

                {/* Submitted Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-fg">Your Submitted Prompt</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAttempt.promptText);
                        toast.success("Prompt copied to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-fg hover:bg-panel px-2 py-1 rounded border border-border/40 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy Prompt
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-fg leading-relaxed bg-bg border border-border rounded-lg p-4 max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text selection:bg-indigo-500/25">
                    {selectedAttempt.promptText}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end bg-panel/30 border-t border-border px-6 py-4">
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="px-4 py-2 bg-accent hover:bg-accent-soft text-bg rounded-md text-xs font-semibold tracking-wider transition-colors"
                >
                  Close Review
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
