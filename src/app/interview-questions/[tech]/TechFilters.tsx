"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { DIFFICULTY_BG } from "../_components/Difficulty";
import type { DifficultyKey } from "@/lib/interview-questions/topic-catalog";

/** Where the bar sticks: just under the floating nav pill (md and up). */
const BAR_TOP = 84;

type Current = { difficulty: string; company: string; round: string; q: string };

/**
 * URL-driven toolbar for a topic page: search, difficulty with counts, round
 * and company. Sticks under the site nav on md and up, and grows a band
 * behind the nav once stuck so rows never show between the two.
 */
export default function TechFilters({
  tech,
  label,
  companies,
  rounds,
  counts,
  current,
}: {
  tech: string;
  label: string;
  companies: { name: string; slug: string }[];
  rounds: string[];
  counts: { easy: number; medium: number; hard: number; total: number };
  current: Current;
}) {
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [prevQ, setPrevQ] = useState(current.q);
  const [searchVal, setSearchVal] = useState(current.q);

  if (current.q !== prevQ) {
    setPrevQ(current.q);
    setSearchVal(current.q);
  }

  useEffect(() => {
    const onScroll = () => {
      const bar = barRef.current;
      if (!bar) return;
      setStuck(window.matchMedia("(min-width: 768px)").matches && bar.getBoundingClientRect().top <= BAR_TOP + 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function navigate(next: Partial<Current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.difficulty) params.set("difficulty", merged.difficulty);
    if (merged.company) params.set("company", merged.company);
    if (merged.round) params.set("round", merged.round);
    if (merged.q) params.set("q", merged.q);
    const qs = params.toString();
    router.push(`/interview-questions/${tech}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const hasFilters = Boolean(current.difficulty || current.company || current.round || current.q);
  const segments: { id: "" | DifficultyKey; label: string; n: number }[] = [
    { id: "", label: "All", n: counts.total },
    { id: "easy", label: "Easy", n: counts.easy },
    { id: "medium", label: "Medium", n: counts.medium },
    { id: "hard", label: "Hard", n: counts.hard },
  ];

  const selectClass =
    "h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-surface pl-3.5 pr-9 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgb(var(--c-accent)/0.18)] motion-reduce:transition-none md:h-[42px] md:w-auto";

  return (
    <div
      ref={barRef}
      data-stuck={stuck}
      className="relative z-30 border-b border-border bg-bg/90 backdrop-blur-md md:sticky md:top-[84px]"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-full h-[84px] bg-bg/90 backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none ${
          stuck ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2.5 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-3 md:px-6 lg:flex-nowrap">
        <form
          role="search"
          className="flex min-w-0 flex-1 gap-2 md:basis-full lg:basis-auto"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: searchVal.trim() });
          }}
        >
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgb(var(--c-accent)/0.18)] motion-reduce:transition-none md:h-[42px] md:min-w-[220px]">
            <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            <span className="sr-only">Search {label} questions</span>
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={`Search ${label} questions`}
              enterKeyHint="search"
              className="h-full w-full min-w-0 bg-transparent text-[15px] text-fg placeholder:text-subtle focus:outline-none md:text-sm"
            />
            {searchVal && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchVal("");
                  navigate({ q: "" });
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-subtle hover:bg-panel hover:text-fg"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </label>
        </form>

        <div
          role="group"
          aria-label="Difficulty"
          className="flex h-11 shrink-0 gap-0.5 rounded-xl border border-border bg-surface p-1 md:h-[42px]"
        >
          {segments.map((s) => {
            const active = current.difficulty === s.id;
            return (
              <button
                key={s.id || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => navigate({ difficulty: s.id })}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-sm font-medium transition-colors motion-reduce:transition-none md:flex-none md:px-3.5 ${
                  active ? "bg-elevated text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-subtle hover:text-fg"
                }`}
              >
                {s.id && <span className={`hidden h-1.5 w-1.5 rounded-full md:block ${DIFFICULTY_BG[s.id]}`} aria-hidden />}
                {s.label}
                <span className="text-xs text-subtle">{s.n}</span>
              </button>
            );
          })}
        </div>

        {(rounds.length > 0 || companies.length > 0) && (
          <div className="flex gap-2 md:contents">
            {rounds.length > 0 && (
              <div className="relative flex-1 md:flex-none">
                <select
                  aria-label="Round"
                  value={current.round}
                  onChange={(e) => navigate({ round: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Any round</option>
                  {rounds.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            )}
            {companies.length > 0 && (
              <div className="relative flex-1 md:flex-none">
                <select
                  aria-label="Company"
                  value={current.company}
                  onChange={(e) => navigate({ company: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Any company</option>
                  {companies.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            )}
          </div>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchVal("");
              navigate({ difficulty: "", company: "", round: "", q: "" });
            }}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg px-2.5 text-sm text-subtle transition-colors hover:bg-panel hover:text-fg motion-reduce:transition-none md:h-[42px] md:self-auto"
          >
            <X className="h-4 w-4" aria-hidden /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
