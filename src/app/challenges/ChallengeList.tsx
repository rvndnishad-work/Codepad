"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Search,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Flame,
} from "lucide-react";

export type ChallengeListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  category: string | null;
  estimatedMinutes: number;
  userStatus: "passed" | "failed" | "in_progress" | null;
};

const DIFFICULTIES: { key: "all" | "easy" | "medium" | "hard"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

export default function ChallengeList({
  items,
  signedIn,
}: {
  items: ChallengeListItem[];
  signedIn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const t of i.tags) set.add(t);
    return Array.from(set).sort();
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      if (selectedTag && !c.tags.includes(selectedTag)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        (c.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, difficulty, selectedTag]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, tag, or category…"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none placeholder:text-muted transition-all duration-200"
            />
          </div>
          <span className="text-xs text-muted font-mono ml-auto tabular-nums">
            {visible.length} {visible.length === 1 ? "challenge" : "challenges"}
          </span>
        </div>

        {/* Difficulty filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDifficulty(d.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                difficulty === d.key
                  ? "bg-accent text-bg border-accent shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)]"
                  : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong hover:bg-elevated"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition"
              >
                #{selectedTag} ✕
              </button>
            )}
            {!selectedTag &&
              allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border bg-surface/50 text-muted hover:text-fg hover:border-border-strong transition"
                >
                  #{t}
                </button>
              ))}
          </div>
        )}

        {/* List */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center mb-5">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <h2 className="font-black text-fg text-lg">No matching challenges</h2>
            <p className="text-muted text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              Try clearing your filters or search query.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/challenges/${c.slug}`}
                  className="group relative flex items-center gap-5 w-full rounded-xl bg-surface border border-border hover:border-border-strong p-4 sm:p-5 transition-all duration-200 hover:bg-elevated overflow-hidden"
                >
                  {/* Status indicator */}
                  <div className="shrink-0">
                    {c.userStatus === "passed" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : c.userStatus === "failed" ? (
                      <XCircle className="w-6 h-6 text-rose-500/60" />
                    ) : c.userStatus === "in_progress" ? (
                      <Flame className="w-6 h-6 text-amber-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted/30" />
                    )}
                  </div>

                  {/* Title + Category */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate transition-colors">
                      {c.title}
                    </h3>
                    {c.category && (
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] mt-0.5 text-muted/60">
                        {c.category}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {c.tags.length > 0 && (
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-muted group-hover:text-fg/60 group-hover:border-border-strong transition-colors"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Difficulty badge */}
                  <div
                    className={`shrink-0 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
                      difficultyBg[c.difficulty]
                    } ${difficultyColor[c.difficulty]}`}
                  >
                    {c.difficulty}
                  </div>

                  {/* Time estimate */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-xs text-muted/60">
                    <Clock className="w-3 h-3" />
                    <span className="tabular-nums">{c.estimatedMinutes}m</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
