"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  X,
  RotateCcw,
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
  easy: "text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
  hard: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
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
  const reduceMotion = useReducedMotion();

  // Active-filter chips (everything except the category rail, which is
  // always visible above) + one-tap reset back to the full catalog.
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (query.trim()) activeChips.push({ key: "q", label: `“${query.trim().slice(0, 24)}”`, clear: () => setQuery("") });
  if (difficulty !== "all") activeChips.push({ key: "d", label: difficulty, clear: () => setDifficulty("all") });
  if (kind !== "all") activeChips.push({ key: "k", label: kind === "single" ? "single" : "multi-step", clear: () => setKind("all") });
  if (category === "algorithms" && langFilter !== "all") activeChips.push({ key: "l", label: LANG_LABEL[langFilter] ?? langFilter, clear: () => setLangFilter("all") });
  if (category === "ui" && fwFilter !== "all") activeChips.push({ key: "f", label: FRAMEWORK_LABEL[fwFilter as (typeof FRAMEWORKS)[number]] ?? fwFilter, clear: () => setFwFilter("all") });
  if (hideSolved) activeChips.push({ key: "h", label: "hiding solved", clear: () => setHideSolved(false) });
  const clearAllFilters = () => {
    setQuery("");
    setDifficulty("all");
    setKind("all");
    setLangFilter("all");
    setFwFilter("all");
    setHideSolved(false);
    setCategory("all");
  };

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Category rails — the primary way the catalog is split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-7" role="tablist" aria-label="Challenge category">
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

        {/* ── Mission-control deck ── */}
        <div className="mb-8 rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-4 backdrop-blur-sm dark:border-white/[0.07] sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, tag, or category…"
                  aria-label="Search challenges"
                  className="w-full rounded-full border border-black/[0.06] bg-[var(--wow-stage)] py-3 pl-11 pr-10 text-sm text-[var(--wow-fg)] outline-none transition placeholder:text-muted/60 focus:border-[#8b93ff]/60 focus:shadow-[0_0_30px_-10px_rgba(139,147,255,0.5)] dark:border-white/[0.07]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-[var(--wow-fg)] dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Grid/List Toggle Switcher */}
              <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/[0.06] bg-[var(--wow-stage)] p-1 dark:border-white/[0.07]" role="tablist" aria-label="Layout">
                {(["grid", "list"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === m}
                    onClick={() => handleViewModeChange(m)}
                    className={`relative grid h-8 w-8 place-items-center rounded-full transition ${viewMode === m ? "text-white" : "text-muted hover:text-[var(--wow-fg)]"}`}
                    title={m === "grid" ? "Grid view" : "List view"}
                  >
                    {viewMode === m && (
                      <motion.span
                        layoutId="cl-view-pill"
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3]"
                      />
                    )}
                    <span className="relative">{m === "grid" ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}</span>
                  </button>
                ))}
              </div>

              <span className="ml-auto font-mono text-xs tabular-nums text-muted">
                {category === "all"
                  ? `${visible.length} ${visible.length === 1 ? "challenge" : "challenges"}`
                  : `Showing ${displayed.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - ${Math.min(currentPage * itemsPerPage, visible.length)} of ${visible.length}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.07]">
              <DifficultySeg value={difficulty} onChange={setDifficulty} />
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
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideSolved}
                  onClick={() => setHideSolved((v) => !v)}
                  className="ml-auto inline-flex items-center gap-2 text-xs font-bold text-muted transition hover:text-[var(--wow-fg)]"
                >
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${hideSolved ? "bg-emerald-500" : "bg-black/15 dark:bg-white/15"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${hideSolved ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                  Hide solved
                </button>
              )}
            </div>

            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-black/[0.06] pt-3 dark:border-white/[0.07]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted/70">Active</span>
                <AnimatePresence>
                  {activeChips.map((chip) => (
                    <motion.button
                      key={chip.key}
                      type="button"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
                      onClick={chip.clear}
                      title={`Clear ${chip.label}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#8b93ff]/40 bg-[#8b93ff]/10 px-2.5 py-1 text-[11px] font-bold text-[#8b93ff] transition hover:bg-[#8b93ff]/20"
                    >
                      {chip.label}
                      <X className="h-3 w-3" />
                    </motion.button>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition hover:text-rose-500"
                >
                  <RotateCcw className="h-3 w-3" /> Reset all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Challenge list container */}
        {visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 bg-[var(--wow-card)] p-16 text-center backdrop-blur-sm dark:border-white/15">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#8b93ff]/30 bg-[#8b93ff]/10">
              <Target className="h-6 w-6 text-[#8b93ff]" />
            </div>
            <h2 className="wow-font-display text-2xl text-[var(--wow-fg)]">NOTHING ON THIS FREQUENCY.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              No challenges match those filters. Widen the net and try again.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:scale-105"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset all filters
            </button>
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
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#8b93ff]/30 bg-[#8b93ff]/10">
                        <Icon className="h-4 w-4 text-[#8b93ff]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="wow-font-display flex items-center gap-2 text-2xl leading-tight text-[var(--wow-fg)]">
                          {meta.label.toUpperCase()}
                          <span className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-muted dark:bg-white/[0.07]">
                            {group.length}
                          </span>
                        </h2>
                        <p className="truncate text-xs text-muted">{meta.blurb}</p>
                      </div>
                    </div>
                    {group.length > preview.length && (
                      <button
                        type="button"
                        onClick={() => setCategory(meta.key)}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.06] px-3 py-1.5 text-xs font-bold text-muted transition hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)] dark:border-white/[0.07]"
                      >
                        View all {group.length}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {viewMode === "grid" ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {preview.map((c, i) => (
                          <MotionLi key={c.id} index={i}>
                            <ChallengeCard item={c} />
                          </MotionLi>
                        ))}
                      </AnimatePresence>
                    </ul>
                  ) : (
                    <ul className="space-y-3">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {preview.map((c, i) => (
                          <MotionLi key={c.id} index={i}>
                            <ChallengeListRow item={c} />
                          </MotionLi>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayed.map((c, i) => (
                <MotionLi key={c.id} index={i}>
                  <ChallengeCard item={c} />
                </MotionLi>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          /* LIST VIEW */
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayed.map((c, i) => (
                <MotionLi key={c.id} index={i}>
                  <ChallengeListRow item={c} />
                </MotionLi>
              ))}
            </AnimatePresence>
          </ul>
        )}

        {/* Numbered Pagination Section */}
        {category !== "all" && totalPages > 1 && (
          <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] px-5 py-4 backdrop-blur-sm dark:border-white/[0.07] sm:flex-row">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted tabular-nums">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, visible.length)} of {visible.length} challenges
            </span>

            <div className="flex items-center gap-1.5">
              {/* Prev Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="grid h-9 w-9 place-items-center rounded-full border border-black/[0.06] text-[var(--wow-fg)] transition hover:border-[#8b93ff]/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.07]"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                // Standard visual logic: show first, last, and pages close to active
                const isNearActive = Math.abs(currentPage - pageNum) <= 1;
                const isEdge = pageNum === 1 || pageNum === totalPages;

                if (!isNearActive && !isEdge) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="select-none px-1 font-mono text-xs text-muted">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    aria-current={currentPage === pageNum ? "page" : undefined}
                    className={`h-9 w-9 rounded-full font-mono text-xs font-bold tabular-nums transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3] text-white shadow-[0_0_20px_-6px_rgba(139,147,255,0.7)]"
                        : "border border-black/[0.06] text-muted hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)] dark:border-white/[0.07]"
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
                className="grid h-9 w-9 place-items-center rounded-full border border-black/[0.06] text-[var(--wow-fg)] transition hover:border-[#8b93ff]/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.07]"
                aria-label="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CATEGORY RAIL COMPONENT ───
   Launch rails with a sliding active indicator (shared layoutId): the
   selected rail fills with an indigo→magenta wash and glows. */
/* ─── ANIMATED LIST ITEM ───
   Layout-animated so filtering/pagination reshuffles glide; entrance
   rises once per mount; exit shrinks out. All disabled for reduced motion. */
function MotionLi({ index, children }: { index: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, delay: reduceMotion ? 0 : (index % 9) * 0.04, ease: "easeOut" }}
    >
      {children}
    </motion.li>
  );
}

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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300 cursor-pointer ${
        active
          ? "border-transparent text-white shadow-[0_12px_40px_-12px_rgba(139,147,255,0.6)]"
          : "border-black/[0.06] bg-[var(--wow-card)] hover:-translate-y-0.5 hover:border-[#8b93ff]/40 dark:border-white/[0.07]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="cl-rail-fill"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 bg-gradient-to-r from-[#5b5ff0] via-[#8b5cf6] to-[#d63ba8]"
        />
      )}
      <span
        className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
          active
            ? "border-white/30 bg-white/15 text-white"
            : "border-black/[0.06] bg-[var(--wow-stage)] text-muted group-hover:text-[var(--wow-fg)] dark:border-white/[0.07]"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative min-w-0">
        <span className={`flex items-center gap-2 text-sm font-extrabold leading-tight ${active ? "text-white" : "text-[var(--wow-fg)]"}`}>
          <span className="truncate">{label}</span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
              active ? "bg-black/25 text-white" : "bg-black/[0.05] text-muted dark:bg-white/[0.07]"
            }`}
          >
            {count}
          </span>
        </span>
        <span className={`mt-0.5 block truncate text-[11px] ${active ? "text-white/70" : "text-muted"}`}>{hint}</span>
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
    iconBox: "bg-sky-500/10 border-sky-500/25 text-sky-800 dark:text-sky-400",
    eyebrow: "text-sky-800 dark:text-sky-400",
    hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    glow: "bg-sky-500/10",
  },
  ui: {
    label: "UI · Frontend",
    icon: LayoutTemplate,
    iconBox: "bg-violet-500/10 border-violet-500/25 text-violet-800 dark:text-violet-400",
    eyebrow: "text-violet-800 dark:text-violet-400",
    hoverBorder: "hover:border-violet-500/40 dark:hover:border-violet-500/30",
    glow: "bg-violet-500/10",
  },
  js: {
    label: "JavaScript",
    icon: Braces,
    iconBox: "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-400",
    eyebrow: "text-amber-800 dark:text-amber-400",
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 shrink-0">
        <CheckCircle2 className="w-3 h-3" />
        Solved
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 shrink-0">
        <Flame className="w-3 h-3" />
        In progress
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-bold uppercase tracking-wider text-rose-500/80 shrink-0">
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
      className={`group relative flex flex-col h-full rounded-2xl border p-5 overflow-hidden backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
        isPassed
          ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.07] border-emerald-500/40 dark:border-emerald-500/25 hover:border-emerald-500/60 hover:shadow-[0_18px_50px_-20px_rgba(16,185,129,0.5)]"
          : c.featured
            ? "bg-[var(--wow-card)] border-[#8b93ff]/40 hover:border-[#8b93ff]/60 dark:border-[#8b93ff]/25 dark:hover:border-[#8b93ff]/45 hover:shadow-[0_18px_50px_-20px_rgba(139,147,255,0.5)]"
            : `bg-[var(--wow-card)] border-black/[0.06] dark:border-white/[0.07] ${t.hoverBorder} hover:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)]`
      }`}
    >
      {/* Sheen sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      {/* Corner glow — emerald once solved, type-tinted otherwise */}
      <div
        className={`absolute -top-14 -right-14 w-36 h-36 rounded-full ${isPassed ? "bg-emerald-500/10" : t.glow} blur-3xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
        aria-hidden
      />

      {/* Diagonal "Solved" ribbon across the top-right corner */}
      {isPassed && (
        <div className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden pointer-events-none z-10" aria-hidden>
          <div className="absolute top-[16px] right-[-38px] w-[140px] rotate-45 bg-emerald-500 py-[3px] text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            Solved
          </div>
        </div>
      )}

      {/* Header: type icon tile · staff pick · status (ribbon replaces the
          pills once solved) */}
      <div className="relative flex items-start justify-between gap-3 mb-3.5">
        <div className={`w-10 h-10 rounded-xl border grid place-items-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${t.iconBox}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isPassed && (
          <div className="flex items-center gap-2">
            {c.featured && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[11px] font-bold uppercase tracking-wider text-accent"
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

      <div className={`relative text-[11px] font-bold uppercase tracking-[0.18em] mb-1 ${t.eyebrow}`}>
        {t.label}
      </div>
      <h3 className={`relative font-extrabold text-[15px] leading-snug line-clamp-2 ${isPassed ? "text-[var(--wow-fg)]/60" : "text-[var(--wow-fg)]"}`}>
        {c.title}
      </h3>

      {c.tags.length > 0 && (
        <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
          {c.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-md bg-black/[0.04] border border-black/[0.06] text-[11px] text-muted group-hover:text-[var(--wow-fg)]/70 transition-colors dark:bg-white/[0.05] dark:border-white/[0.07]"
            >
              #{tag}
            </span>
          ))}
          {c.tags.length > 3 && (
            <span className="font-mono text-[11px] tabular-nums text-muted/60">+{c.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer meta: difficulty · time · steps */}
      <div className="relative mt-auto pt-4 flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${
            difficultyChip[c.difficulty]
          }`}
        >
          {c.difficulty}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted/60 tabular-nums">
          <Clock className="w-3 h-3" />
          {c.estimatedMinutes}m
        </span>
        {isMulti && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#8b93ff]/30 bg-[#8b93ff]/10 text-[11px] font-bold uppercase tracking-wider text-[#8b93ff]">
            <Layers className="w-2.5 h-2.5" />
            {c.stepCount}
          </span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-[var(--wow-fg)] group-hover:translate-x-0.5 transition ml-auto" />
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
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 hover:translate-x-1 ${
        isPassed
          ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.07] border-emerald-500/40 dark:border-emerald-500/25 hover:border-emerald-500/60"
          : c.featured
            ? "bg-[var(--wow-card)] hover:bg-[var(--wow-stage)] border-[#8b93ff]/40 hover:border-[#8b93ff]/60 dark:border-[#8b93ff]/25 dark:hover:border-[#8b93ff]/45 "
            : `bg-[var(--wow-card)] hover:bg-[var(--wow-stage)] border-black/[0.06] dark:border-white/[0.07] ${t.hoverBorder}`
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Type icon tile */}
        <div className={`w-9 h-9 rounded-lg border grid place-items-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${t.iconBox}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${t.eyebrow}`}>
            {t.label}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <h3 className={`font-extrabold text-sm sm:text-base truncate ${isPassed ? "text-[var(--wow-fg)]/60" : "text-[var(--wow-fg)]"}`}>
              {c.title}
            </h3>
            {c.featured && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ffe600]/10 border border-[#ffe600]/30 text-[11px] font-bold uppercase tracking-wider text-[#9a8200] dark:text-[#ffe600] shrink-0">
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
            className="hidden md:inline px-1.5 py-0.5 rounded-md bg-black/[0.04] border border-black/[0.06] text-[11px] text-muted dark:bg-white/[0.05] dark:border-white/[0.07]"
          >
            #{tag}
          </span>
        ))}

        {isMulti && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#8b93ff]/25 bg-[#8b93ff]/[0.07] text-[11px] font-bold uppercase tracking-wider text-[#8b93ff] shrink-0">
            <Layers className="w-2.5 h-2.5" />
            {c.stepCount} steps
          </div>
        )}

        <div className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold uppercase tracking-widest shrink-0 ${difficultyChip[c.difficulty]}`}>
          {c.difficulty}
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-muted/60 tabular-nums shrink-0">
          <Clock className="w-3 h-3" />
          {c.estimatedMinutes}m
        </div>

        <StatusBadge status={c.userStatus} />
        <ArrowRight className="hidden h-3.5 w-3.5 text-muted/30 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--wow-fg)] sm:block" />
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
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-3 pr-2 transition ${
        active
          ? "border-[#8b93ff]/50 bg-[#8b93ff]/10"
          : "border-black/[0.06] bg-[var(--wow-stage)] dark:border-white/[0.07]"
      }`}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted/70">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer bg-transparent text-[12px] font-bold text-[var(--wow-fg)] outline-none"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="bg-white text-black dark:bg-[#131625] dark:text-white">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ─── DIFFICULTY SEGMENTED CONTROL ───
   Each option lights up in its own difficulty color when active. */
const DIFF_SEG: Record<DiffKey, { dot: string; active: string }> = {
  all: { dot: "bg-muted", active: "bg-white text-black shadow" },
  easy: { dot: "bg-emerald-500", active: "bg-emerald-500 text-white shadow-[0_0_18px_-4px_rgba(16,185,129,0.8)]" },
  medium: { dot: "bg-amber-500", active: "bg-amber-500 text-white shadow-[0_0_18px_-4px_rgba(245,158,11,0.8)]" },
  hard: { dot: "bg-rose-500", active: "bg-rose-500 text-white shadow-[0_0_18px_-4px_rgba(244,63,94,0.8)]" },
};

function DifficultySeg({
  value,
  onChange,
}: {
  value: DiffKey;
  onChange: (next: DiffKey) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[var(--wow-stage)] p-1 dark:border-white/[0.07]" role="tablist" aria-label="Difficulty">
      <span className="hidden px-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted/70 sm:inline">
        Difficulty
      </span>
      {DIFFICULTIES.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
            value === o.key ? DIFF_SEG[o.key].active : "text-muted hover:text-[var(--wow-fg)] hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${value === o.key && o.key !== "all" ? "bg-white" : DIFF_SEG[o.key].dot}`} />
          {o.label}
        </button>
      ))}
    </div>
  );
}
