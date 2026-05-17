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
  Layers,
  Star,
} from "lucide-react";

export type ChallengeListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  category: string | null;
  estimatedMinutes: number;
  /** 1 for a classic single-step challenge; >1 for a multi-step series
   *  (formerly Tracks). Drives the "X questions" pill on the card. */
  stepCount: number;
  /** Staff-pick — gets a star badge and is sorted to the top server-side. */
  featured: boolean;
  userStatus: "passed" | "failed" | "in_progress" | null;
};

type DiffKey = "all" | "easy" | "medium" | "hard";
type KindKey = "all" | "single" | "series";

const DIFFICULTIES: { key: DiffKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const KINDS: { key: KindKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "single", label: "Single" },
  { key: "series", label: "Multi-step" },
];

const difficultyChip: Record<string, string> = {
  easy: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  hard: "text-rose-500 bg-rose-500/10 border-rose-500/30",
};

export default function ChallengeList({
  items,
  signedIn,
}: {
  items: ChallengeListItem[];
  signedIn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DiffKey>("all");
  const [kind, setKind] = useState<KindKey>("all");
  const [hideSolved, setHideSolved] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      if (kind === "single" && c.stepCount > 1) return false;
      if (kind === "series" && c.stepCount <= 1) return false;
      if (hideSolved && c.userStatus === "passed") return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        (c.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, difficulty, kind, hideSolved]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex flex-wrap items-center gap-2">
            <Pillbar
              label="Difficulty"
              options={DIFFICULTIES}
              value={difficulty}
              onChange={setDifficulty}
            />
            <Pillbar
              label="Kind"
              options={KINDS}
              value={kind}
              onChange={setKind}
            />
            {signedIn && (
              <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSolved}
                  onChange={(e) => setHideSolved(e.target.checked)}
                  className="w-3.5 h-3.5 accent-accent"
                />
                Hide solved
              </label>
            )}
          </div>
        </div>

        {/* Grid */}
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
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((c) => (
              <li key={c.id}>
                <ChallengeCard item={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChallengeCard({ item: c }: { item: ChallengeListItem }) {
  const isMulti = c.stepCount > 1;
  return (
    <Link
      href={`/challenges/${c.slug}`}
      className={`group relative flex flex-col h-full rounded-2xl border bg-surface hover:bg-elevated p-5 transition-colors ${
        c.featured
          ? "border-accent/40 hover:border-accent/60"
          : "border-border hover:border-border-strong"
      }`}
    >
      {c.featured && (
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[9px] font-black uppercase tracking-wider text-accent"
          aria-label="Staff pick"
        >
          <Star className="w-2.5 h-2.5 fill-current" />
          Staff pick
        </span>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status dot */}
          {c.userStatus === "passed" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : c.userStatus === "failed" ? (
            <XCircle className="w-5 h-5 text-rose-500/60 shrink-0" />
          ) : c.userStatus === "in_progress" ? (
            <Flame className="w-5 h-5 text-amber-500 shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-muted/30 shrink-0" />
          )}
          <div
            className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
              difficultyChip[c.difficulty]
            }`}
          >
            {c.difficulty}
          </div>
          {isMulti && (
            <div className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/30 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-accent">
              <Layers className="w-2.5 h-2.5" />
              {c.stepCount}
            </div>
          )}
        </div>
        <div className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold text-muted/60 tabular-nums">
          <Clock className="w-3 h-3" />
          {c.estimatedMinutes}m
        </div>
      </div>

      <h3 className="font-black text-fg text-base leading-snug line-clamp-2 group-hover:text-fg mb-2">
        {c.title}
      </h3>

      {c.category && (
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60 mb-3">
          {c.category}
        </div>
      )}

      {c.tags.length > 0 && (
        <div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
          {c.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded bg-bg/40 border border-border text-[10px] text-muted group-hover:text-fg/70 transition-colors"
            >
              #{t}
            </span>
          ))}
          {c.tags.length > 3 && (
            <span className="text-[10px] text-muted/60">+{c.tags.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
}

function Pillbar<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-surface border border-border p-1">
      <span className="px-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted/60">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
            value === o.key
              ? "bg-accent text-bg"
              : "text-muted hover:text-fg hover:bg-elevated"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
