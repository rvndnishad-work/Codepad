"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Flame,
  Layers,
  Star,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  Binary,
  Braces,
  LayoutTemplate,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export type ChallengeListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  category: string | null;
  /** Sandpack/judging template ("harness", "test-ts", "react", …) — drives the
   *  Algorithms / UI / JavaScript category split. */
  template: string;
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

/** Multi-language harness languages — used to derive the Language filter from
 *  each challenge's tags. */
const LANGS = ["python", "javascript", "typescript", "go", "java", "cpp", "rust"] as const;
const LANG_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JS",
  typescript: "TS",
  go: "Go",
  java: "Java",
  cpp: "C++",
  rust: "Rust",
};

type CategoryKey = "all" | "algorithms" | "ui" | "js";

/** The three top-level shelves of the catalog. Order here is the display
 *  order of the shelves on the "All" tab. */
const CATEGORY_META: {
  key: Exclude<CategoryKey, "all">;
  label: string;
  icon: LucideIcon;
  tabHint: string;
  blurb: string;
}[] = [
  {
    key: "algorithms",
    label: "Algorithms",
    icon: Binary,
    tabHint: "Solve in any language",
    blurb: "Classic DSA problems — solve in Python, JavaScript, TypeScript, Go, Java, C++ or Rust.",
  },
  {
    key: "ui",
    label: "UI & Frontend",
    icon: LayoutTemplate,
    tabHint: "React · Vue · Angular · HTML",
    blurb: "Build working components against a live preview in your framework of choice.",
  },
  {
    key: "js",
    label: "JavaScript",
    icon: Braces,
    tabHint: "JS/TS utilities · unit tests",
    blurb: "Language-level JavaScript & TypeScript exercises graded by hidden unit tests.",
  },
];

/** Classify a challenge from its judging template — mirrors challengeSurface()
 *  in lib/templates: "harness" is the multi-language algorithm judge, the
 *  test-runner / console templates are JS questions, everything else renders
 *  a UI. Template is authoritative; tags are just decoration. */
function challengeCategory(c: ChallengeListItem): Exclude<CategoryKey, "all"> {
  const t = c.template;
  if (t === "harness") return "algorithms";
  if (/^test-/.test(t) || ["python", "go", "java", "cpp", "rust", "node", "ts-node"].includes(t)) return "js";
  return "ui";
}

/** UI-framework facets, derived from template + tags so the Framework filter
 *  lights up automatically as Vue/Angular/Solid/Svelte challenges are added. */
const FRAMEWORKS = ["react", "vue", "angular", "solid", "svelte", "html"] as const;
const FRAMEWORK_LABEL: Record<(typeof FRAMEWORKS)[number], string> = {
  react: "React",
  vue: "Vue",
  angular: "Angular",
  solid: "SolidJS",
  svelte: "Svelte",
  html: "HTML/CSS",
};

function challengeFrameworks(c: ChallengeListItem): string[] {
  const tags = c.tags.map((t) => t.toLowerCase());
  const out = new Set<string>();
  for (const f of FRAMEWORKS) {
    if (tags.includes(f) || c.template.startsWith(f)) out.add(f);
  }
  if (c.template === "static" || tags.includes("html") || tags.includes("css")) out.add("html");
  return [...out];
}

/** How many cards each shelf shows on the "All" tab before "View all". */
const SHELF_SIZE = 6;

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
  const [category, setCategory] = useState<CategoryKey>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [fwFilter, setFwFilter] = useState<string>("all");
  const [hideSolved, setHideSolved] = useState(false);
  
  // Pagination & Layout states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Beautiful 3x3 layout or tidy 9 rows

  // Load view mode preference on mount to avoid Next.js hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("ipad.challenges.viewMode");
    if (saved === "grid" || saved === "list") {
      setViewMode(saved);
    }
  }, []);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("ipad.challenges.viewMode", mode);
  };

  // Only surface Language/Framework options that actually exist in their
  // category, so the filters never show a choice that yields zero results.
  const availableLangs = useMemo(() => {
    const present = new Set<string>();
    for (const c of items) {
      if (challengeCategory(c) !== "algorithms") continue;
      for (const t of c.tags) {
        const lt = t.toLowerCase();
        if ((LANGS as readonly string[]).includes(lt)) present.add(lt);
      }
    }
    return LANGS.filter((l) => present.has(l));
  }, [items]);

  const availableFrameworks = useMemo(() => {
    const present = new Set<string>();
    for (const c of items) {
      if (challengeCategory(c) !== "ui") continue;
      for (const f of challengeFrameworks(c)) present.add(f);
    }
    return FRAMEWORKS.filter((f) => present.has(f));
  }, [items]);

  // Everything except the category split — used both for the per-tab counts
  // (so the tabs reflect the active search/difficulty filters) and as the
  // base of the visible list.
  const baseVisible = useMemo(() => {
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

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = { all: baseVisible.length, algorithms: 0, ui: 0, js: 0 };
    for (const c of baseVisible) counts[challengeCategory(c)] += 1;
    return counts;
  }, [baseVisible]);

  const visible = useMemo(() => {
    return baseVisible.filter((c) => {
      if (category !== "all" && challengeCategory(c) !== category) return false;
      // Sub-filters only apply inside their own tab.
      if (category === "algorithms" && langFilter !== "all" && !c.tags.some((t) => t.toLowerCase() === langFilter)) return false;
      if (category === "ui" && fwFilter !== "all" && !challengeFrameworks(c).includes(fwFilter)) return false;
      return true;
    });
  }, [baseVisible, category, langFilter, fwFilter]);

  // Reset page limit whenever search parameters change to prevent getting stuck on empty pages
  useEffect(() => {
    setCurrentPage(1);
  }, [query, difficulty, kind, category, langFilter, fwFilter, hideSolved]);

  // Each category has its own sub-filter; clear them when the tab changes so
  // a stale Python/React selection can't silently empty another tab.
  useEffect(() => {
    setLangFilter("all");
    setFwFilter("all");
  }, [category]);

  const displayed = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return visible.slice(startIdx, startIdx + itemsPerPage);
  }, [visible, currentPage]);

  const totalPages = Math.ceil(visible.length / itemsPerPage);

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Category tabs — the primary way the catalog is split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-7">
          <CategoryTab
            icon={Layers}
            label="All"
            hint="The full catalog"
            count={categoryCounts.all}
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {CATEGORY_META.map((m) => (
            <CategoryTab
              key={m.key}
              icon={m.icon}
              label={m.label}
              hint={m.tabHint}
              count={categoryCounts[m.key]}
              active={category === m.key}
              onClick={() => setCategory(m.key)}
            />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, tag, or category…"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface dark:bg-[#131625] border border-border dark:border-transparent focus:border-accent/40 dark:focus:border-accent/40 focus:bg-elevated dark:focus:bg-[#1b1f32] text-sm text-fg outline-none placeholder:text-muted transition-all duration-200"
              />
            </div>
            
            {/* Grid/List Toggle Switcher */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-surface dark:bg-[#131625] border border-border dark:border-transparent p-1">
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-accent text-bg"
                    : "text-muted hover:text-fg hover:bg-elevated"
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-accent text-bg"
                    : "text-muted hover:text-fg hover:bg-elevated"
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-muted font-mono ml-auto tabular-nums">
              {category === "all"
                ? `${visible.length} ${visible.length === 1 ? "challenge" : "challenges"}`
                : `Showing ${displayed.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - ${Math.min(currentPage * itemsPerPage, visible.length)} of ${visible.length} ${visible.length === 1 ? "challenge" : "challenges"}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pillbar
              label="Difficulty"
              options={DIFFICULTIES}
              value={difficulty}
              onChange={setDifficulty}
            />
            {category === "algorithms" && availableLangs.length > 1 && (
              <FilterSelect
                label="Language"
                options={[
                  { key: "all", label: "All languages" },
                  ...availableLangs.map((l) => ({ key: l, label: LANG_LABEL[l] })),
                ]}
                value={langFilter}
                onChange={setLangFilter}
              />
            )}
            {category === "ui" && availableFrameworks.length > 1 && (
              <FilterSelect
                label="Framework"
                options={[
                  { key: "all", label: "All frameworks" },
                  ...availableFrameworks.map((f) => ({ key: f, label: FRAMEWORK_LABEL[f] })),
                ]}
                value={fwFilter}
                onChange={setFwFilter}
              />
            )}
            <FilterSelect
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

        {/* Challenge list container */}
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
        ) : category === "all" ? (
          /* ALL TAB — one labeled shelf per category, separation at a glance */
          <div className="space-y-12">
            {CATEGORY_META.map((meta) => {
              const group = visible.filter((c) => challengeCategory(c) === meta.key);
              if (group.length === 0) return null;
              const preview = group.slice(0, SHELF_SIZE);
              const Icon = meta.icon;
              return (
                <section key={meta.key}>
                  <div className="flex items-end justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 grid place-items-center shrink-0">
                        <Icon className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-black text-fg text-lg leading-tight flex items-center gap-2">
                          {meta.label}
                          <span className="text-[10px] font-black text-muted bg-surface border border-border rounded-full px-2 py-0.5 tabular-nums">
                            {group.length}
                          </span>
                        </h2>
                        <p className="text-xs text-muted truncate">{meta.blurb}</p>
                      </div>
                    </div>
                    {group.length > preview.length && (
                      <button
                        type="button"
                        onClick={() => setCategory(meta.key)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-elevated hover:border-border-strong text-xs font-bold text-muted hover:text-fg transition cursor-pointer whitespace-nowrap"
                      >
                        View all {group.length}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {viewMode === "grid" ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {preview.map((c) => (
                        <li key={c.id}>
                          <ChallengeCard item={c} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-3">
                      {preview.map((c) => (
                        <li key={c.id}>
                          <ChallengeListRow item={c} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((c) => (
              <li key={c.id}>
                <ChallengeCard item={c} />
              </li>
            ))}
          </ul>
        ) : (
          /* LIST VIEW */
          <ul className="space-y-3">
            {displayed.map((c) => (
              <li key={c.id}>
                <ChallengeListRow item={c} />
              </li>
            ))}
          </ul>
        )}

        {/* Numbered Pagination Section */}
        {category !== "all" && totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 pt-8">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, visible.length)} of {visible.length} challenges
            </span>

            <div className="flex items-center gap-1.5">
              {/* Prev Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-surface border border-border hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed hover:bg-elevated transition cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-fg" />
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                // Standard visual logic: show first, last, and pages close to active
                const isNearActive = Math.abs(currentPage - pageNum) <= 1;
                const isEdge = pageNum === 1 || pageNum === totalPages;
                
                if (!isNearActive && !isEdge) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-muted text-xs font-mono select-none">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-accent text-bg"
                        : "bg-surface border border-border hover:border-border-strong text-muted hover:text-fg hover:bg-elevated"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-surface border border-border hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed hover:bg-elevated transition cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-fg" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CATEGORY TAB COMPONENT ─── */
function CategoryTab({
  icon: Icon,
  label,
  hint,
  count,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 cursor-pointer ${
        active
          ? "border-accent/50 bg-accent/10 shadow-[0_0_20px_rgba(var(--accent-rgb),0.08)]"
          : "border-border dark:border-transparent bg-surface dark:bg-[#131625] hover:bg-elevated hover:dark:bg-[#1b1f32] hover:border-border-strong"
      }`}
    >
      <span
        className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 border transition ${
          active
            ? "bg-accent text-bg border-accent"
            : "bg-bg/40 border-border text-muted group-hover:text-fg"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-black leading-tight text-fg">
          <span className="truncate">{label}</span>
          <span
            className={`shrink-0 text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full border ${
              active
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-bg/40 text-muted border-border"
            }`}
          >
            {count}
          </span>
        </span>
        <span className="block text-[10px] text-muted truncate mt-0.5">{hint}</span>
      </span>
    </button>
  );
}

/* ─── PER-TYPE CARD IDENTITY ───
   Same sky/violet/amber identity as the catalog tabs & detail page, so a
   card's type is recognisable before reading a word. */
const KIND_CARD: Record<
  Exclude<CategoryKey, "all">,
  { label: string; icon: LucideIcon; iconBox: string; eyebrow: string; hoverBorder: string; glow: string }
> = {
  algorithms: {
    label: "Algorithm",
    icon: Binary,
    iconBox: "bg-sky-500/10 border-sky-500/25 text-sky-500",
    eyebrow: "text-sky-500",
    hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    glow: "bg-sky-500/10",
  },
  ui: {
    label: "UI · Frontend",
    icon: LayoutTemplate,
    iconBox: "bg-violet-500/10 border-violet-500/25 text-violet-500",
    eyebrow: "text-violet-500",
    hoverBorder: "hover:border-violet-500/40 dark:hover:border-violet-500/30",
    glow: "bg-violet-500/10",
  },
  js: {
    label: "JavaScript",
    icon: Braces,
    iconBox: "bg-amber-500/10 border-amber-500/25 text-amber-500",
    eyebrow: "text-amber-500",
    hoverBorder: "hover:border-amber-500/40 dark:hover:border-amber-500/30",
    glow: "bg-amber-500/10",
  },
};

/** Labeled status pill — a solved challenge should be obvious from across
 *  the room, not a 16px icon. Untouched challenges get no pill at all so
 *  the unsolved ones read as the "to do" list. */
function StatusBadge({ status }: { status: ChallengeListItem["userStatus"] }) {
  if (status === "passed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider text-emerald-500 shrink-0">
        <CheckCircle2 className="w-3 h-3" />
        Solved
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider text-amber-500 shrink-0">
        <Flame className="w-3 h-3" />
        In progress
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[9px] font-black uppercase tracking-wider text-rose-500/80 shrink-0">
        <XCircle className="w-3 h-3" />
        Attempted
      </span>
    );
  }
  return null;
}

/* ─── GRID CARD COMPONENT ─── */
function ChallengeCard({ item: c }: { item: ChallengeListItem }) {
  const isMulti = c.stepCount > 1;
  const isPassed = c.userStatus === "passed";
  const t = KIND_CARD[challengeCategory(c)];
  const Icon = t.icon;
  return (
    <Link
      href={`/challenges/${c.slug}`}
      className={`group relative flex flex-col h-full rounded-2xl border p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        isPassed
          ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/40 dark:border-emerald-500/25 hover:border-emerald-500/60"
          : c.featured
            ? "bg-surface dark:bg-[#131625] border-accent/40 hover:border-accent/60 dark:border-accent/20 dark:hover:border-accent/40"
            : `bg-surface dark:bg-[#131625] border-border dark:border-transparent ${t.hoverBorder}`
      }`}
    >
      {/* Corner glow — emerald once solved, type-tinted otherwise */}
      <div
        className={`absolute -top-14 -right-14 w-36 h-36 rounded-full ${isPassed ? "bg-emerald-500/10" : t.glow} blur-3xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
        aria-hidden
      />

      {/* Diagonal "Solved" ribbon across the top-right corner */}
      {isPassed && (
        <div className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden pointer-events-none z-10" aria-hidden>
          <div className="absolute top-[16px] right-[-38px] w-[140px] rotate-45 bg-emerald-500 py-[3px] text-center text-[8px] font-black uppercase tracking-[0.2em] text-white shadow-[0_2px_8px_rgba(16,185,129,0.45)]">
            Solved
          </div>
        </div>
      )}

      {/* Header: type icon tile · staff pick · status (ribbon replaces the
          pills once solved) */}
      <div className="relative flex items-start justify-between gap-3 mb-3.5">
        <div className={`w-10 h-10 rounded-xl border grid place-items-center shrink-0 ${t.iconBox}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isPassed && (
          <div className="flex items-center gap-2">
            {c.featured && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[9px] font-black uppercase tracking-wider text-accent"
                aria-label="Staff pick"
              >
                <Star className="w-2.5 h-2.5 fill-current" />
                Pick
              </span>
            )}
            <StatusBadge status={c.userStatus} />
          </div>
        )}
      </div>

      <div className={`relative text-[9px] font-black uppercase tracking-[0.18em] mb-1 ${t.eyebrow}`}>
        {t.label}
      </div>
      <h3 className={`relative font-black text-[15px] leading-snug line-clamp-2 ${isPassed ? "text-fg/70" : "text-fg"}`}>
        {c.title}
      </h3>

      {c.tags.length > 0 && (
        <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
          {c.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-bg/40 border border-border text-[10px] text-muted group-hover:text-fg/70 transition-colors"
            >
              #{tag}
            </span>
          ))}
          {c.tags.length > 3 && (
            <span className="text-[10px] text-muted/60">+{c.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer meta: difficulty · time · steps */}
      <div className="relative mt-auto pt-4 flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
            difficultyChip[c.difficulty]
          }`}
        >
          {c.difficulty}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted/60 tabular-nums">
          <Clock className="w-3 h-3" />
          {c.estimatedMinutes}m
        </span>
        {isMulti && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/30 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-accent">
            <Layers className="w-2.5 h-2.5" />
            {c.stepCount}
          </span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 transition ml-auto" />
      </div>
    </Link>
  );
}

/* ─── LIST ROW COMPONENT ─── */
function ChallengeListRow({ item: c }: { item: ChallengeListItem }) {
  const isMulti = c.stepCount > 1;
  const isPassed = c.userStatus === "passed";
  const t = KIND_CARD[challengeCategory(c)];
  const Icon = t.icon;
  return (
    <Link
      href={`/challenges/${c.slug}`}
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-300 ${
        isPassed
          ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/40 dark:border-emerald-500/25 hover:border-emerald-500/60"
          : c.featured
            ? "bg-surface dark:bg-[#131625] hover:bg-elevated hover:dark:bg-[#1b1f32] border-accent/40 hover:border-accent/60 dark:border-accent/20 dark:hover:border-accent/40 shadow-[0_2px_12px_rgba(var(--accent-rgb),0.02)]"
            : `bg-surface dark:bg-[#131625] hover:bg-elevated hover:dark:bg-[#1b1f32] border-border dark:border-transparent ${t.hoverBorder}`
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Type icon tile */}
        <div className={`w-9 h-9 rounded-lg border grid place-items-center shrink-0 ${t.iconBox}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className={`text-[8px] font-black uppercase tracking-[0.18em] ${t.eyebrow}`}>
            {t.label}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <h3 className={`font-extrabold text-sm sm:text-base truncate ${isPassed ? "text-fg/70" : "text-fg"}`}>
              {c.title}
            </h3>
            {c.featured && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[8px] font-black uppercase tracking-wider text-accent shrink-0">
                <Star className="w-2 h-2 fill-current" />
                Staff Pick
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        {c.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="hidden md:inline px-1.5 py-0.5 rounded bg-bg/40 border border-border text-[9px] text-muted"
          >
            #{tag}
          </span>
        ))}

        {isMulti && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-accent/25 bg-accent/5 text-[9px] font-bold uppercase tracking-wider text-accent shrink-0">
            <Layers className="w-2.5 h-2.5" />
            {c.stepCount} steps
          </div>
        )}

        <div className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-widest shrink-0 ${difficultyChip[c.difficulty]}`}>
          {c.difficulty}
        </div>

        <div className="inline-flex items-center gap-1 text-[9px] font-bold text-muted/60 tabular-nums shrink-0">
          <Clock className="w-3 h-3" />
          {c.estimatedMinutes}m
        </div>

        <StatusBadge status={c.userStatus} />
      </div>
    </Link>
  );
}

/* ─── COMPACT DROPDOWN FILTER ─── */
function FilterSelect<T extends string>({
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
  const active = value !== "all";
  return (
    <label
      className={`inline-flex items-center gap-2 rounded-xl border pl-3 pr-2 py-2 cursor-pointer transition ${
        active
          ? "border-accent/40 bg-accent/10"
          : "border-border dark:border-transparent bg-surface dark:bg-[#131625]"
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/60">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-transparent text-[12px] font-bold text-fg outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="bg-surface text-fg">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ─── PILLBAR HELPERS ─── */
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
    <div className="inline-flex items-center gap-1 rounded-xl bg-surface dark:bg-[#131625] border border-border dark:border-transparent p-1">
      <span className="px-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted/60">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
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
