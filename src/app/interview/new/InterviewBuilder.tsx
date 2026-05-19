"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Play,
  Trophy,
  X,
  Sparkles,
  Search,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export type ChallengeOption = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  category: string | null;
};

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500 dark:text-emerald-400",
  medium: "text-amber-500 dark:text-amber-400",
  hard: "text-rose-500 dark:text-rose-400",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  hard: "bg-rose-500/10 border-rose-500/20",
};

export default function InterviewBuilder({ challenges }: { challenges: ChallengeOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Allow the dashboard to deep-link with preset type/role
  // (e.g. /interview/new?type=live&role=interviewer)
  const initialType: "mock" | "live" =
    searchParams?.get("type") === "live" ? "live" : "mock";
  const initialRole: "interviewer" | "candidate" =
    searchParams?.get("role") === "candidate" ? "candidate" : "interviewer";

  const [title, setTitle] = useState("Interview Session");
  const [candidateName, setCandidateName] = useState("");
  const [type, setType] = useState<"mock" | "live">(initialType);
  const [creatorRole, setCreatorRole] = useState<"interviewer" | "candidate">(initialRole);
  const [selected, setSelected] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [creating, setCreating] = useState(false);

  // New Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  const selectedChallenges = useMemo(
    () => selected.map((id) => challenges.find((c) => c.id === id)!).filter(Boolean),
    [selected, challenges]
  );

  const totalEstimate = selectedChallenges.reduce((sum, c) => sum + c.estimatedMinutes, 0);

  // Filter available challenges dynamically
  const filteredAvailable = useMemo(() => {
    return challenges.filter((c) => {
      const isSelected = selected.includes(c.id);
      if (isSelected) return false;

      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDifficulty = filterDifficulty === "all" || c.difficulty === filterDifficulty;

      return matchesSearch && matchesDifficulty;
    });
  }, [challenges, selected, searchQuery, filterDifficulty]);

  const availableCount = challenges.filter((c) => !selected.includes(c.id)).length;

  function add(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function remove(id: string) {
    setSelected((prev) => prev.filter((x) => x !== id));
  }
  function moveUp(id: string) {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const out = [...prev];
      [out[idx - 1], out[idx]] = [out[idx], out[idx - 1]];
      return out;
    });
  }
  function moveDown(id: string) {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const out = [...prev];
      [out[idx], out[idx + 1]] = [out[idx + 1], out[idx]];
      return out;
    });
  }

  async function handleStart() {
    if (selected.length === 0) {
      toast.error("Pick at least one challenge.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Interview Session",
          candidateName: candidateName.trim() || null,
          type,
          challengeIds: selected,
          totalSec: minutes * 60,
          creatorRole,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      router.push(`/interview/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to create session", { description: msg });
      setCreating(false);
    }
  }

  return (
    <div className="min-h-[85vh] bg-bg relative overflow-hidden text-fg selection:bg-accent/30 selection:text-accent font-sans flex flex-col justify-center py-6 md:py-10">
      
      {/* Immersive Atmospheric Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-10 dark:opacity-20 bg-accent/10 transition-colors" />
        <div className="absolute bottom-0 left-0 w-[65vw] h-[65vw] rounded-full blur-[150px] opacity-10 dark:opacity-25 bg-violet-500/10 transition-colors" />
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 relative z-10 space-y-5">
        
        {/* Breadcrumb Exit link */}
        <div className="flex items-center justify-between">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-muted hover:text-fg transition-colors group"
          >
            <div className="p-1 rounded-full bg-surface border border-border group-hover:border-border-strong group-hover:bg-panel transition-all">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-muted" />
            </div>
            Back to Sessions
          </Link>
        </div>

        {/* Main Builder Box */}
        <div className="border border-border bg-surface/20 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-98 duration-500">
          
          {/* Header Bar */}
          <div className="border-b border-border bg-surface/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-sm shrink-0">
                <Trophy className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg tracking-tight leading-none">New Interview Session</h2>
                <p className="text-[10px] text-muted mt-1.5">Compose a multi-challenge code arena with live observer capabilities.</p>
              </div>
            </div>
          </div>

          {/* Form and queue panels split */}
          <div className="divide-y divide-border bg-surface/5">
            
            {/* TOP SEGMENT: Form Fields */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              
              {/* Box 1: Title & Time limit (Span 7) */}
              <div className="md:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  
                  {/* Session Title */}
                  <div className="sm:col-span-8">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5">
                      Session Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Assessment"
                      className="w-full px-3 py-2 rounded-xl bg-surface/50 border border-border focus:border-accent/40 focus:bg-panel text-xs text-fg placeholder:text-muted/50 outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Time limit */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5">
                      Limit (Min)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={240}
                        step={5}
                        value={minutes}
                        onChange={(e) => setMinutes(Math.max(5, Math.min(240, Number(e.target.value) || 30)))}
                        className="w-full px-3 py-2 rounded-xl bg-surface/50 border border-border focus:border-accent/40 focus:bg-panel text-xs text-fg outline-none transition-all shadow-sm tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Candidate Name Input */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5">
                    Candidate Name <span className="text-muted/40 font-normal">(Optional)</span>
                  </label>
                  <input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-xl bg-surface/50 border border-border focus:border-accent/40 focus:bg-panel text-xs text-fg placeholder:text-muted/50 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Box 2: Roles and Types Selector Options (Span 5) */}
              <div className="md:col-span-5 space-y-4">
                
                {/* Role Switcher */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5">
                    Your Session Role
                  </label>
                  <div className="flex gap-2 bg-surface/40 p-1 border border-border rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreatorRole("interviewer")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        creatorRole === "interviewer"
                          ? "bg-accent text-bg shadow-sm font-extrabold"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      Interviewer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatorRole("candidate")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        creatorRole === "candidate"
                          ? "bg-accent text-bg shadow-sm font-extrabold"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      Candidate
                    </button>
                  </div>
                </div>

                {/* Classifier Switcher */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5">
                    Interview Type Classifier
                  </label>
                  <div className="flex gap-2 bg-surface/40 p-1 border border-border rounded-xl">
                    <button
                      type="button"
                      onClick={() => setType("mock")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        type === "mock"
                          ? "bg-indigo-500/25 border border-indigo-500/40 text-indigo-500 dark:text-indigo-400 font-extrabold"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      Mock Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("live")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        type === "live"
                          ? "bg-emerald-500/25 border border-emerald-500/40 text-emerald-500 dark:text-emerald-400 font-extrabold"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      Live / Actual
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SEGMENT: Multi-Challenge Selection Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              
              {/* LEFT COLUMN: Challenges Search + Selection Pool */}
              <div className="p-5 space-y-4">
                
                {/* Available Challenges Pool Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Available Challenges</span>
                  <span className="text-[10px] text-muted/50 font-mono">{availableCount} Pool</span>
                </div>

                {/* Filter and Search Controls Row */}
                <div className="space-y-2">
                  
                  {/* Compact Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted/50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title, category, concepts..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-surface/30 border border-border focus:border-accent/30 text-xs text-fg placeholder:text-muted/40 outline-none transition-all"
                    />
                  </div>

                  {/* Difficulty Tag Filter Bar */}
                  <div className="flex items-center gap-1.5 py-1 overflow-x-auto scrollbar-none">
                    {[
                      { id: "all", label: "All Levels" },
                      { id: "easy", label: "Easy", activeColor: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500" },
                      { id: "medium", label: "Medium", activeColor: "bg-amber-500/10 border border-amber-500/30 text-amber-500" },
                      { id: "hard", label: "Hard", activeColor: "bg-rose-500/10 border border-rose-500/30 text-rose-500" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setFilterDifficulty(btn.id)}
                        className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider border transition-all shrink-0 ${
                          filterDifficulty === btn.id
                            ? btn.activeColor || "bg-accent/15 border border-accent/30 text-accent font-extrabold"
                            : "bg-transparent border-border hover:border-border-strong text-muted"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable list pool */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-border">
                  {filteredAvailable.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface/30 p-8 text-center text-xs text-muted/70">
                      No matching challenges found.
                    </div>
                  ) : (
                    filteredAvailable.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl border border-border bg-surface/30 shadow-sm transition-all duration-300 hover:border-border-strong hover:bg-surface hover:-translate-y-0.5 flex items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border leading-none ${difficultyBg[c.difficulty]} ${difficultyColor[c.difficulty]}`}>
                              {c.difficulty}
                            </span>
                            {c.category && (
                              <span className="text-[9px] font-semibold text-muted/60 uppercase tracking-wider">{c.category}</span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-fg/90 group-hover:text-fg truncate">{c.title}</h3>
                        </div>

                        {/* Add button trigger */}
                        <button
                          type="button"
                          onClick={() => add(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-surface hover:bg-panel border border-border hover:border-border-strong text-[10px] font-bold text-fg group-hover:text-accent transition flex items-center gap-1 shrink-0 shadow-sm"
                        >
                          <Plus className="w-3 h-3 text-muted group-hover:text-accent" />
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Selection Arena Queue */}
              <div className="p-5 space-y-4">
                
                {/* Active Selection Pool Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Your Sequence Queue</span>
                  {selectedChallenges.length > 0 && (
                    <span className="text-[10px] text-muted/60 font-mono tracking-wider">
                      ~{totalEstimate}m Recommended
                    </span>
                  )}
                </div>

                {/* Queue empty state */}
                {selectedChallenges.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center flex flex-col items-center justify-center gap-2">
                    <BookOpen className="w-7 h-7 text-muted/40" />
                    <div>
                      <div className="text-xs font-bold text-fg/80">Queue is Empty</div>
                      <div className="text-[10px] text-muted mt-0.5">Select stages from the left to build the interview timeline.</div>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-border">
                    {selectedChallenges.map((c, idx) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl border border-accent/20 bg-accent/[0.03] shadow-sm transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-accent tabular-nums w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-xs font-bold text-fg truncate">{c.title}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-muted/60">
                              <span className={`font-semibold capitalize ${difficultyColor[c.difficulty]}`}>
                                {c.difficulty}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {c.estimatedMinutes}m
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Order manipulation controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveUp(c.id)}
                            disabled={idx === 0}
                            className="p-1 rounded bg-surface border border-border text-muted hover:text-fg hover:border-border-strong disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(c.id)}
                            disabled={idx === selectedChallenges.length - 1}
                            className="p-1 rounded bg-surface border border-border text-muted hover:text-fg hover:border-border-strong disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="h-5 w-[1px] bg-border mx-0.5" />
                          
                          <button
                            type="button"
                            onClick={() => remove(c.id)}
                            className="p-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition shadow-sm"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER BAR: CTA & Recommended Duration indicator */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface/10">
              
              {/* Warnings and alerts */}
              <div className="text-xs text-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span>
                  Allocated clock: <span className="text-fg font-black tabular-nums">{minutes}m</span>.
                </span>
                {totalEstimate > minutes && (
                  <span className="text-rose-500 font-medium inline-flex items-center gap-0.5 ml-1 animate-pulse">
                    ⚠️ Very tight limit for ~{totalEstimate}m of expected challenges
                  </span>
                )}
              </div>

              {/* Start Session Trigger Button */}
              <button
                onClick={handleStart}
                disabled={selected.length === 0 || creating}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(var(--accent-rgb),0.25)] shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {creating ? "Launching Arena..." : "Start session"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
