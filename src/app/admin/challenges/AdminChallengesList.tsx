"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Layers,
  Sparkles,
  Trophy,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminChallengeRow from "./AdminChallengeRow";
import ChallengesBulkTable, { BulkHeaderCheckbox } from "./ChallengesBulkTable";

type AdminChallengeListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string | null;
  published: boolean;
  premium: boolean;
  estimatedMinutes: number;
  updatedAt: string;
  attempts: number;
};

type SortKey = "title" | "difficulty" | "category" | "attempts" | "published" | "premium" | "updatedAt";
type SortOrder = "asc" | "desc";

export default function AdminChallengesList({ rows }: { rows: AdminChallengeListItem[] }) {
  const [query, setQuery] = useState("");
  const [monetization, setMonetization] = useState<"all" | "premium" | "free">("all");
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, monetization, difficulty, status]);

  // Dynamic metrics HUD calculations
  const totalCount = rows.length;
  const publishedCount = rows.filter((r) => r.published).length;
  const draftCount = totalCount - publishedCount;

  const premiumCount = rows.filter((r) => r.premium).length;
  const freeCount = totalCount - premiumCount;
  const premiumPercentage = totalCount > 0 ? Math.round((premiumCount / totalCount) * 100) : 0;

  const totalAttempts = rows.reduce((sum, r) => sum + r.attempts, 0);
  const averageAttempts = totalCount > 0 ? Math.round(totalAttempts / totalCount) : 0;

  const easyCount = rows.filter((r) => r.difficulty === "easy").length;
  const mediumCount = rows.filter((r) => r.difficulty === "medium").length;
  const hardCount = rows.filter((r) => r.difficulty === "hard").length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    
    // 1. Filter
    const filtered = rows.filter((c) => {
      // Search term
      if (q && !c.title.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q) && !(c.category?.toLowerCase() || "").includes(q)) {
        return false;
      }
      // Monetization
      if (monetization === "premium" && !c.premium) return false;
      if (monetization === "free" && c.premium) return false;
      // Difficulty
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      // Status
      if (status === "published" && !c.published) return false;
      if (status === "draft" && c.published) return false;

      return true;
    });

    // 2. Sort
    const difficultyWeight = { easy: 1, medium: 2, hard: 3 };

    return filtered.sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      // Custom weights for specific fields
      if (sortKey === "difficulty") {
        valA = difficultyWeight[a.difficulty as "easy" | "medium" | "hard"] || 0;
        valB = difficultyWeight[b.difficulty as "easy" | "medium" | "hard"] || 0;
      }

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, monetization, difficulty, status, sortKey, sortOrder]);

  // Paginated selection calculation
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    return filteredAndSorted.slice((activePage - 1) * pageSize, activePage * pageSize);
  }, [filteredAndSorted, activePage, pageSize]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => {
    const active = sortKey === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 hover:text-fg transition font-bold uppercase tracking-wider text-[10px] ${
          active ? "text-accent" : "text-muted"
        }`}
      >
        {label}
        {active ? (
          sortOrder === "asc" ? (
            <ArrowUp className="w-3 h-3 text-accent" />
          ) : (
            <ArrowDown className="w-3 h-3 text-accent" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted/40" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Telemetry stats strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total & Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131522] border border-slate-100 dark:border-transparent flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-muted text-[10px] font-black uppercase tracking-wider">
              <span>Catalog size</span>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black font-mono text-fg mt-2 tabular-nums">{totalCount}</div>
          </div>
          <div className="text-[10px] font-bold text-muted flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-border/10">
            <span className="text-emerald-500 font-mono">{publishedCount} Published</span>
            <span className="text-muted/40">•</span>
            <span className="text-amber-500 font-mono">{draftCount} Drafts</span>
          </div>
        </div>

        {/* Card 2: Monetization ratio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131522] border border-slate-100 dark:border-transparent flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-muted text-[10px] font-black uppercase tracking-wider">
              <span>Monetization Mix</span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black font-mono text-fg mt-2 tabular-nums">
              {premiumCount} <span className="text-xs font-bold text-muted">Premium</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100 dark:border-border/10">
            <div className="flex justify-between text-[9px] font-bold text-muted">
              <span>PREMIUM RATIO</span>
              <span className="font-mono text-accent">{premiumPercentage}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-[#202334] overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${premiumPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Engagements */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131522] border border-slate-100 dark:border-transparent flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-muted text-[10px] font-black uppercase tracking-wider">
              <span>Platform Engagements</span>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black font-mono text-fg mt-2 tabular-nums">{totalAttempts}</div>
          </div>
          <div className="text-[10px] font-bold text-muted mt-4 pt-3 border-t border-slate-100 dark:border-border/10 flex items-center justify-between">
            <span>Avg attempts / challenge</span>
            <span className="font-mono text-fg">{averageAttempts}</span>
          </div>
        </div>

        {/* Card 4: Difficulties */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131522] border border-slate-100 dark:border-transparent flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-muted text-[10px] font-black uppercase tracking-wider">
              <span>Difficulty Spread</span>
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black font-mono text-fg mt-2 tabular-nums">
              {hardCount} <span className="text-xs font-bold text-rose-500">Hard</span>
            </div>
          </div>
          <div className="text-[10px] font-bold text-muted mt-4 pt-3 border-t border-slate-100 dark:border-border/10 flex justify-between gap-1 flex-wrap font-mono">
            <span className="text-emerald-500">E: {easyCount}</span>
            <span className="text-amber-500">M: {mediumCount}</span>
            <span className="text-rose-500">H: {hardCount}</span>
          </div>
        </div>
      </div>

      {/* Advanced Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search challenge titles, tags, slugs, categories…"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#131625] border border-slate-200 dark:border-transparent focus:border-accent/40 focus:bg-slate-50 dark:focus:bg-[#1b1f32] text-sm text-fg outline-none placeholder:text-muted/60 transition-all duration-200"
              />
            </div>

            {/* Monetization Select Gutter */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-[#131625] border border-slate-200 dark:border-transparent p-1 shadow-sm">
              <span className="px-2 text-[9px] font-black uppercase tracking-wider text-muted/60">Tier</span>
              {(["all", "premium", "free"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonetization(m)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition uppercase ${
                    monetization === m
                      ? "bg-accent text-bg"
                      : "text-muted hover:text-fg hover:bg-slate-100 dark:hover:bg-black/20"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Difficulty Select Gutter */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-[#131625] border border-slate-200 dark:border-transparent p-1 shadow-sm">
              <span className="px-2 text-[9px] font-black uppercase tracking-wider text-muted/60">Diff</span>
              {(["all", "easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition uppercase ${
                    difficulty === d
                      ? "bg-accent text-bg"
                      : "text-muted hover:text-fg hover:bg-slate-100 dark:hover:bg-black/20"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Status Select Gutter */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-[#131625] border border-slate-200 dark:border-transparent p-1 shadow-sm">
              <span className="px-2 text-[9px] font-black uppercase tracking-wider text-muted/60">Status</span>
              {(["all", "published", "draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition uppercase ${
                    status === s
                      ? "bg-accent text-bg"
                      : "text-muted hover:text-fg hover:bg-slate-100 dark:hover:bg-black/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-muted font-mono whitespace-nowrap self-end tabular-nums">
            Found {totalItems} challenges
          </span>
        </div>
      </div>

      {/* Database grid panel bulk table wrapper */}
      <ChallengesBulkTable>
        <div className="rounded-2xl border border-slate-200 dark:border-[#1d2035] bg-white dark:bg-[#0c0d15] overflow-hidden shadow-sm transition-all duration-300">
          <div className="hidden lg:grid lg:grid-cols-[40px_3fr_1.2fr_1.2fr_1fr_1.2fr_1.2fr_2.5fr] lg:items-center lg:px-6 lg:py-4 bg-slate-50/60 dark:bg-[#121422] text-[10px] uppercase tracking-[0.15em] text-muted border-b border-slate-100 dark:border-border/10 font-bold select-none">
            <div className="flex items-center justify-center">
              <BulkHeaderCheckbox ids={paginatedRows.map((r) => r.id)} />
            </div>
            <div>
              <SortHeader label="Title" field="title" />
            </div>
            <div>
              <SortHeader label="Difficulty" field="difficulty" />
            </div>
            <div>
              <SortHeader label="Category" field="category" />
            </div>
            <div>
              <SortHeader label="Attempts" field="attempts" />
            </div>
            <div>
              <SortHeader label="Monetization" field="premium" />
            </div>
            <div>
              <SortHeader label="Status" field="published" />
            </div>
            <div className="text-right">Actions</div>
          </div>
          
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-[#0c0d15]">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#131625] border border-slate-100 dark:border-border/10 flex items-center justify-center mb-4 text-muted/50 shadow-sm animate-pulse">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-fg text-sm">No matches found</h3>
              <p className="text-xs text-muted mt-1 max-w-[280px]">
                We couldn't find any challenges matching your active filters. Try updating your keywords or options.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setMonetization("all");
                  setDifficulty("all");
                  setStatus("all");
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#131625] text-fg hover:bg-slate-200 dark:hover:bg-[#1b1f32] text-xs font-bold transition shadow-sm border border-slate-200/50 dark:border-transparent"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#1c1e30]">
              {paginatedRows.map((c) => (
                <AdminChallengeRow
                  key={c.id}
                  challenge={{
                    id: c.id,
                    slug: c.slug,
                    title: c.title,
                    difficulty: c.difficulty,
                    category: c.category,
                    published: c.published,
                    premium: c.premium,
                    attempts: c.attempts,
                  }}
                />
              ))}
            </div>
          )}

          {/* Dynamic pagination strip */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/40 dark:bg-[#121422]/50 border-t border-slate-100 dark:border-border/10 select-none">
              <div className="flex items-center gap-2 text-xs text-muted font-bold font-mono">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-border/20 bg-white dark:bg-[#131625] text-fg outline-none focus:border-accent/40 cursor-pointer font-bold font-mono text-xs"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>entries</span>
              </div>

              <div className="text-xs font-bold text-muted font-mono">
                Showing <span className="text-fg font-black">{(activePage - 1) * pageSize + 1}</span> to{" "}
                <span className="text-fg font-black">
                  {Math.min(activePage * pageSize, totalItems)}
                </span>{" "}
                of <span className="text-fg font-black">{totalItems}</span> challenges
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-border/20 bg-white dark:bg-[#131625] hover:bg-slate-100 dark:hover:bg-black/20 text-muted hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  const isCurrent = page === activePage;

                  // Render ellipses range if many pages exist
                  if (
                    totalPages > 6 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - activePage) > 1
                  ) {
                    if (page === 2 && activePage > 3) {
                      return (
                        <span key="ell-1" className="px-1 text-xs font-bold text-muted select-none">
                          ...
                        </span>
                      );
                    }
                    if (page === totalPages - 1 && activePage < totalPages - 2) {
                      return (
                        <span key="ell-2" className="px-1 text-xs font-bold text-muted select-none">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center ${
                        isCurrent
                          ? "bg-accent text-bg shadow-sm"
                          : "hover:bg-slate-100 dark:hover:bg-black/20 text-muted hover:text-fg"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={activePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-border/20 bg-white dark:bg-[#131625] hover:bg-slate-100 dark:hover:bg-black/20 text-muted hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </ChallengesBulkTable>
    </div>
  );
}
