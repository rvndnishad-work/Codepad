"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIFFICULTIES } from "@/lib/interview-questions/shared";
import { Building2, ListFilter, X, SlidersHorizontal, Search } from "lucide-react";

/** URL-driven filters for a technology page (search bar + difficulty chips + company/round selects). */
export default function TechFilters({
  tech,
  companies,
  rounds,
  current,
}: {
  tech: string;
  companies: { name: string; slug: string }[];
  rounds: string[];
  current: { difficulty: string; company: string; round: string; q: string };
}) {
  const router = useRouter();
  const [prevQ, setPrevQ] = useState(current.q);
  const [searchVal, setSearchVal] = useState(current.q);

  if (current.q !== prevQ) {
    setPrevQ(current.q);
    setSearchVal(current.q);
  }

  function navigate(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.difficulty) params.set("difficulty", merged.difficulty);
    if (merged.company) params.set("company", merged.company);
    if (merged.round) params.set("round", merged.round);
    if (merged.q) params.set("q", merged.q);
    const qs = params.toString();
    router.push(`/interview-questions/${tech}${qs ? `?${qs}` : ""}`);
  }

  // Handle local submit (e.g. Enter key or clicking Search button)
  const handleSearchSubmit = () => {
    navigate({ q: searchVal.trim() });
  };

  const hasFilters = current.difficulty || current.company || current.round || current.q;

  const getDifficultyClass = (d: string) => {
    const isActive = current.difficulty === d;
    if (!isActive) {
      return "border-[var(--wow-card-border)] text-muted bg-[var(--wow-stage)] hover:text-[var(--wow-fg)] hover:border-[#8b93ff]/50";
    }
    switch (d) {
      case "easy":
        return "border-emerald-500/50 text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]";
      case "hard":
        return "border-rose-500/50 text-rose-700 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/5 shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]";
      default:
        return "border-amber-500/50 text-amber-800 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]";
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Search Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-4 text-muted/65 pointer-events-none" />
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchSubmit();
          }}
          placeholder="Search questions by topic, keywords, tags..."
          className="w-full pl-10 pr-24 py-2.5 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-stage)] text-sm text-[var(--wow-fg)] focus:outline-none focus:border-[#8b93ff]/60 focus:shadow-[0_0_30px_-10px_rgba(139,147,255,0.5)] transition-all placeholder:text-muted/60"
        />
        {searchVal && (
          <button
            onClick={() => {
              setSearchVal("");
              navigate({ q: "" });
            }}
            className="absolute right-20 p-1 rounded-lg text-muted/50 hover:text-fg hover:bg-surface/50 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleSearchSubmit}
          className="absolute right-1.5 px-4 py-1.5 rounded-full bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition duration-200"
        >
          Search
        </button>
      </div>

      {/* Row 2: Filters & Clears */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 mt-1 border-t border-[var(--wow-card-border)]">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </div>

          {/* Difficulty chips */}
          <div className="flex items-center gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => navigate({ difficulty: current.difficulty === d ? "" : d })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide border transition-all duration-300 capitalize ${getDifficultyClass(
                  d
                )}`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Select containers */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {companies.length > 0 && (
              <div className="relative flex items-center">
                <Building2 className="w-3.5 h-3.5 absolute left-3 text-muted/60 pointer-events-none" />
                <select
                  value={current.company}
                  onChange={(e) => navigate({ company: e.target.value })}
                  className="pl-8 pr-4 py-1.5 rounded-full text-xs font-bold border border-[var(--wow-card-border)] bg-[var(--wow-stage)] text-[var(--wow-fg)] focus:outline-none focus:border-[#8b93ff]/60 transition-all appearance-none cursor-pointer min-w-[140px]"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rounds.length > 0 && (
              <div className="relative flex items-center">
                <ListFilter className="w-3.5 h-3.5 absolute left-3 text-muted/60 pointer-events-none" />
                <select
                  value={current.round}
                  onChange={(e) => navigate({ round: e.target.value })}
                  className="pl-8 pr-4 py-1.5 rounded-full text-xs font-bold border border-[var(--wow-card-border)] bg-[var(--wow-stage)] text-[var(--wow-fg)] focus:outline-none focus:border-[#8b93ff]/60 transition-all appearance-none cursor-pointer min-w-[140px]"
                >
                  <option value="">All Rounds</option>
                  {rounds.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right section: Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearchVal("");
              navigate({ difficulty: "", company: "", round: "", q: "" });
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-rose-500/20 text-rose-700 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all duration-300"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
