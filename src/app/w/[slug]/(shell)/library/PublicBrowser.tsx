"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, ExternalLink, LayoutTemplate, MonitorSmartphone, Network, Search, Server, Users, X } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import { plural } from "@/lib/workspace/display";
import { TEAM_CHALLENGES, type ChallengeCategory, type ChallengeRow, type PublicCategory, type PublicRow } from "@/lib/library/library-server";
import { inputCls } from "../candidates/_components/ui";
import { publicAnswerAction, searchChallengesAction, searchPublicAction } from "./actions";

const selectCls = `${inputCls.replace("w-full", "")} w-auto`;

const PAGE_SIZE = 25;
const DIFFICULTIES = [
  { id: "", label: "Any" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
] as const;

const DIFFICULTY_DOT: Record<string, string> = { easy: "bg-success", medium: "bg-warning", hard: "bg-danger" };

export const DIFFICULTY_TONE: Record<string, string> = {
  easy: "text-success bg-success/10 border-success/25",
  medium: "text-warning bg-warning/10 border-warning/25",
  hard: "text-danger bg-danger/10 border-danger/25",
};

export function DifficultyChip({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[12px] font-medium ${DIFFICULTY_TONE[value] ?? "text-muted border-border"}`}>
      {value[0].toUpperCase() + value.slice(1)}
    </span>
  );
}

export type Page = { rows: PublicRow[]; total: number; page: number; tech: string | null };

const EMPTY_PAGE: Page = { rows: [], total: 0, page: 1, tech: null };

/**
 * Browse the public interview question bank (mode "questions") or the coding
 * challenges (mode "challenges") by category, difficulty and text, and tick
 * rows to use them. Question answers load when a row is opened.
 */
export default function PublicBrowser({
  mode,
  slug,
  categories = [],
  rounds = [],
  bankTotal = 0,
  firstPage = EMPTY_PAGE,
  selected,
  onToggle,
  disabledIds,
  initialTech,
  challengeCategories = [],
  challengeTotal = 0,
  challengeSelected,
  onToggleChallenge,
}: {
  mode: Source;
  slug: string;
  categories?: PublicCategory[];
  rounds?: string[];
  bankTotal?: number;
  firstPage?: Page;
  selected?: Map<string, PublicRow>;
  /** Leave out to show questions read-only. */
  onToggle?: (row: PublicRow) => void;
  /** Rows already in the questionnaire being edited, keyed by bank slug. */
  disabledIds?: Set<string>;
  /** Category to open on, when it differs from the one the first page was loaded for. */
  initialTech?: string | null;
  challengeCategories?: ChallengeCategory[];
  challengeTotal?: number;
  challengeSelected?: Map<string, ChallengeRow>;
  /** Leave out to show challenges read-only. */
  onToggleChallenge?: (row: ChallengeRow) => void;
}) {
  const source = mode;
  const [tech, setTech] = useState<string | null>(initialTech ?? firstPage.tech);
  const [chCat, setChCat] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("");
  const [round, setRound] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Page>(firstPage);
  const [chData, setChData] = useState<ChallengePage | null>(null);
  const [loading, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const top = useRef<HTMLDivElement>(null);

  type Next = { tech?: string | null; cat?: string | null; difficulty?: string; round?: string; q?: string; page?: number };
  function load(next: Next) {
    start(async () => {
      if (source === "challenges") {
        const query = { category: chCat, difficulty, q, page: 1, ...("cat" in next ? { category: next.cat } : {}), ...pick(next, ["difficulty", "q", "page"]) };
        const r = await searchChallengesAction(slug, query);
        if (!r.ok) return setError(r.error);
        setError(null);
        setChData({ rows: r.rows, total: r.total, page: r.page });
      } else {
        const query = { tech, difficulty, round, q, page: 1, ...pick(next, ["tech", "difficulty", "round", "q", "page"]) };
        const r = await searchPublicAction(slug, query);
        if (!r.ok) return setError(r.error);
        setError(null);
        setData({ rows: r.rows, total: r.total, page: r.page, tech: query.tech ?? null });
      }
      // New page or category: bring the list back into view if it scrolled away.
      const el = top.current;
      const scroller = el?.closest("main");
      if (el && scroller && (next.page || "tech" in next || "cat" in next)) {
        const gap = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        if (gap < 96) scroller.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  useEffect(() => {
    if (source === "challenges") load({});
    else if (initialTech && initialTech !== firstPage.tech) load({ tech: initialTech });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced text search; filters apply at once.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => load({ q }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pickTech = (slugOrNull: string | null) => {
    setTech(slugOrNull);
    load({ tech: slugOrNull });
  };
  const pickChallenges = (cat: string | null) => {
    setChCat(cat);
    load({ cat });
  };

  const showingChallenges = source === "challenges";
  const view = showingChallenges ? (chData ?? { rows: [], total: 0, page: 1 }) : data;
  const pages = Math.max(1, Math.ceil(view.total / PAGE_SIZE));
  const from = view.total ? (view.page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(view.total, view.page * PAGE_SIZE);
  const picked = showingChallenges ? (challengeSelected?.size ?? 0) : (selected?.size ?? 0);
  const noun = showingChallenges ? "challenge" : "question";
  const firstLoad = showingChallenges && !chData;
  const filtered = !!(q || difficulty || round);

  return (
    <div ref={top} className="flex gap-5 items-start scroll-mt-24">
      {/* Categories */}
      <nav aria-label="Categories" className="hidden lg:flex flex-col w-60 shrink-0 sticky top-20 rounded-xl border border-border bg-surface py-2 max-h-[calc(100dvh-9rem)] overflow-y-auto">
        {showingChallenges ? (
          <>
            <CategoryButton on={chCat === null} onClick={() => pickChallenges(null)} label="All challenges" count={challengeTotal} icon={<Code2 className="w-[15px] h-[15px] text-subtle" aria-hidden />} />
            {challengeCategories.map((c) => (
              <CategoryButton key={c.id} on={chCat === c.id} onClick={() => pickChallenges(c.id)} label={c.label} count={c.count} icon={<ChallengeIcon id={c.id} />} />
            ))}
          </>
        ) : (
          <>
            <CategoryButton on={tech === null} onClick={() => pickTech(null)} label="All questions" count={bankTotal} icon={<BookOpen className="w-[15px] h-[15px] text-subtle" aria-hidden />} />
            {categories.map((c) => (
              <CategoryButton key={c.slug} on={tech === c.slug} onClick={() => pickTech(c.slug)} label={c.label} count={c.count} logo={c.slug} />
            ))}
          </>
        )}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={showingChallenges ? "Search challenges or tags" : "Search questions or tags"} aria-label={`Search ${noun}s`} className={`${inputCls} pl-8 pr-8`} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-subtle hover:text-fg">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showingChallenges ? (
            <select aria-label="Category" value={chCat ?? ""} onChange={(e) => pickChallenges(e.target.value || null)} className={`${selectCls} lg:hidden`}>
              <option value="">All challenges ({challengeTotal})</option>
              {challengeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          ) : (
            <select aria-label="Category" value={tech ?? ""} onChange={(e) => pickTech(e.target.value || null)} className={`${selectCls} lg:hidden`}>
              <option value="">All questions ({bankTotal})</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          )}
          <div role="radiogroup" aria-label="Difficulty" className="inline-flex h-9 rounded-lg border border-border bg-surface p-0.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={difficulty === d.id}
                onClick={() => {
                  setDifficulty(d.id);
                  load({ difficulty: d.id });
                }}
                className={`px-2.5 rounded-md text-[13px] transition ${difficulty === d.id ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg"}`}
              >
                {d.id && <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${DIFFICULTY_DOT[d.id]}`} />}
                {d.label}
              </button>
            ))}
          </div>
          {!showingChallenges && rounds.length > 0 && (
            <select
              aria-label="Round"
              value={round}
              onChange={(e) => {
                setRound(e.target.value);
                load({ round: e.target.value });
              }}
              className={selectCls}
            >
              <option value="">Any round</option>
              {rounds.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 text-[13px] text-muted min-h-8" aria-live="polite">
          <span>
            {loading || firstLoad ? "Loading" : view.total ? `${from} to ${to} of ${plural(view.total, noun)}` : `No ${noun}s match`}
            {picked > 0 && <span className="text-fg font-medium">, {picked} picked</span>}
          </span>
          {pages > 1 && <Pager page={view.page} pages={pages} loading={loading} onPage={(page) => load({ page })} />}
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}

        <ul className={`flex flex-col rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
          {firstLoad
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="px-4 py-4 flex flex-col gap-2" aria-hidden>
                  <span className="h-3.5 w-2/3 rounded bg-panel animate-pulse motion-reduce:animate-none" />
                  <span className="h-3 w-1/3 rounded bg-panel/70 animate-pulse motion-reduce:animate-none" />
                </li>
              ))
            : showingChallenges
              ? view.rows.map((r) => (
                  <ChallengeRowItem
                    key={r.id}
                    row={r as ChallengeRow}
                    checked={challengeSelected?.has(r.id) ?? false}
                    onToggle={onToggleChallenge ? () => onToggleChallenge(r as ChallengeRow) : undefined}
                  />
                ))
              : data.rows.map((r) => (
                  <PublicRowItem
                    key={r.id}
                    slug={slug}
                    row={r}
                    checked={selected?.has(r.id) ?? false}
                    already={disabledIds?.has(r.slug) ?? false}
                    onToggle={onToggle ? () => onToggle(r) : undefined}
                  />
                ))}
          {!firstLoad && !view.rows.length && !loading && (
            <li className="px-4 py-12 text-center flex flex-col items-center gap-2">
              <span className="text-[13px] text-muted">No {noun}s match these filters.</span>
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setDifficulty("");
                    setRound("");
                    load({ q: "", difficulty: "", round: "" });
                  }}
                  className="text-[13px] text-secondary-soft hover:underline"
                >
                  Clear filters
                </button>
              )}
            </li>
          )}
        </ul>
        {pages > 1 && view.rows.length > 8 && (
          <div className="flex justify-end">
            <Pager page={view.page} pages={pages} loading={loading} onPage={(page) => load({ page })} />
          </div>
        )}
      </div>
    </div>
  );
}

type Source = "questions" | "challenges";
type ChallengePage = { rows: ChallengeRow[]; total: number; page: number };

function pick<T extends object, K extends keyof T>(o: T, keys: K[]): Partial<Pick<T, K>> {
  const out: Partial<Pick<T, K>> = {};
  for (const k of keys) if (k in o) out[k] = o[k];
  return out;
}

function ChallengeIcon({ id }: { id: string }) {
  const l = id.toLowerCase();
  const Icon = id === TEAM_CHALLENGES ? Users : /dsa|algo|data struct/.test(l) ? Network : /ui|design/.test(l) ? LayoutTemplate : /front/.test(l) ? MonitorSmartphone : /back|api|server/.test(l) ? Server : Code2;
  return <Icon className="w-[15px] h-[15px] text-subtle" aria-hidden />;
}

function Pager({ page, pages, loading, onPage }: { page: number; pages: number; loading: boolean; onPage: (p: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-muted">
      <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-panel">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-1">
        Page {page} of {pages}
      </span>
      <button type="button" aria-label="Next page" disabled={page >= pages || loading} onClick={() => onPage(page + 1)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-panel">
        <ChevronRight className="w-4 h-4" />
      </button>
    </span>
  );
}

function ChallengeRowItem({ row, checked, onToggle }: { row: ChallengeRow; checked: boolean; onToggle?: () => void }) {
  return (
    <li className={`relative transition-colors ${checked ? "bg-secondary/[0.07]" : "hover:bg-panel/40"}`}>
      {checked && <span aria-hidden className="absolute left-0 inset-y-0 w-0.5 bg-secondary" />}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {onToggle && (
          <label className="pt-0.5 shrink-0">
            <span className="sr-only">Pick {row.title}</span>
            <input type="checkbox" checked={checked} onChange={onToggle} className="w-4 h-4 accent-secondary cursor-pointer" />
          </label>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <button type="button" onClick={onToggle} disabled={!onToggle} className="text-left text-sm font-medium text-fg enabled:hover:text-secondary-soft disabled:cursor-default">
            {row.title}
          </button>
          {row.summary && <span className="text-[13px] text-muted line-clamp-2">{row.summary}</span>}
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
            <ChallengeIcon id={row.mine ? TEAM_CHALLENGES : row.category} />
            <span>{row.category}</span>
            <DifficultyChip value={row.difficulty} />
            <span>{row.minutes} min</span>
            {row.draft && <span className="inline-flex items-center h-5 px-1.5 rounded border border-border text-[12px] text-subtle">Draft</span>}
          </span>
        </div>
        <a href={`/challenges/${row.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-secondary-soft hover:bg-panel">
          Preview <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      </div>
    </li>
  );
}

function CategoryButton({ on, onClick, label, count, logo, icon }: { on: boolean; onClick: () => void; label: string; count: number; logo?: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`mx-2 h-9 px-2.5 rounded-lg flex items-center gap-2 text-[13px] text-left ${on ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg hover:bg-panel/60"}`}
    >
      {logo ? <TopicLogo slug={logo} size={15} /> : icon ?? <span className="w-[15px]" aria-hidden />}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-subtle tabular-nums">{count}</span>
    </button>
  );
}

function PublicRowItem({ slug, row, checked, already, onToggle }: { slug: string; row: PublicRow; checked: boolean; already: boolean; onToggle?: () => void }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<string | null | undefined>(undefined);
  const [loading, start] = useTransition();

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && answer === undefined) {
      start(async () => {
        const r = await publicAnswerAction(slug, row.id);
        setAnswer(r.ok ? r.answer ?? "" : null);
      });
    }
  }

  return (
    <li className={`relative transition-colors ${checked ? "bg-secondary/[0.07]" : open ? "bg-panel/30" : "hover:bg-panel/40"}`}>
      {checked && <span aria-hidden className="absolute left-0 inset-y-0 w-0.5 bg-secondary" />}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {onToggle && (
          <label className="pt-0.5 shrink-0">
            <span className="sr-only">{already ? "Already in this questionnaire" : `Pick ${row.title}`}</span>
            <input type="checkbox" checked={checked || already} disabled={already} onChange={onToggle} className="w-4 h-4 accent-secondary cursor-pointer disabled:cursor-default" />
          </label>
        )}
        <button type="button" onClick={toggleOpen} aria-expanded={open} className="flex-1 min-w-0 text-left flex flex-col gap-1 group">
          <span className="text-sm font-medium text-fg group-hover:text-secondary-soft">{row.title}</span>
          {row.summary && !open && <span className="text-[13px] text-muted line-clamp-1">{row.summary}</span>}
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
            {row.technology && <TopicLogo slug={row.technology} size={13} />}
            <DifficultyChip value={row.difficulty} />
            {row.round && <span>{row.round}</span>}
            {already && (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="w-3 h-3" aria-hidden /> In this questionnaire
              </span>
            )}
          </span>
        </button>
        <button type="button" onClick={toggleOpen} aria-label={open ? "Hide answer" : "Show answer"} className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-panel">
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className={`px-4 pb-4 flex flex-col gap-2 animate-fade-in motion-reduce:animate-none ${onToggle ? "pl-11" : ""}`}>
          {row.summary && <p className="text-[13px] text-muted">{row.summary}</p>}
          <div className="rounded-lg border border-border bg-bg/60 px-4 py-3 text-sm text-muted max-h-[360px] overflow-y-auto">
            <span className="block text-xs font-medium text-subtle mb-1.5">Reference answer</span>
            {loading || answer === undefined ? (
              <span className="text-[13px] text-subtle">Loading</span>
            ) : answer ? (
              <MarkdownRenderer content={answer} className="prose-sm text-[13.5px] leading-relaxed" />
            ) : (
              <span className="text-[13px] text-subtle">This question has no written answer.</span>
            )}
          </div>
          <a href={`/interview-question/${row.slug}`} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1 text-xs text-secondary-soft hover:underline">
            Open the public page <ExternalLink className="w-3 h-3" aria-hidden />
          </a>
        </div>
      )}
    </li>
  );
}
