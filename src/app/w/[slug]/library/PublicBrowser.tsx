"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import { plural } from "@/lib/workspace/display";
import type { PublicCategory, PublicRow } from "@/lib/library/library-server";
import { inputCls } from "../candidates/_components/ui";

const selectCls = `${inputCls.replace("w-full", "")} w-auto`;
import { publicAnswerAction, searchPublicAction } from "./actions";

const PAGE_SIZE = 25;
const DIFFICULTIES = [
  { id: "", label: "Any" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
] as const;

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

/**
 * Browse the public interview question bank by category, difficulty, round and
 * text, and tick questions to copy into a questionnaire. Answers load when a
 * row is opened.
 */
export default function PublicBrowser({
  slug,
  categories,
  rounds,
  bankTotal,
  firstPage,
  selected,
  onToggle,
  disabledIds,
  compact = false,
  initialTech,
}: {
  slug: string;
  categories: PublicCategory[];
  rounds: string[];
  bankTotal: number;
  firstPage: Page;
  selected: Map<string, PublicRow>;
  onToggle: (row: PublicRow) => void;
  /** Rows already in the questionnaire being edited, keyed by bank slug. */
  disabledIds?: Set<string>;
  compact?: boolean;
  /** Category to open on, when it differs from the one the first page was loaded for. */
  initialTech?: string | null;
}) {
  const [tech, setTech] = useState<string | null>(initialTech ?? firstPage.tech);
  const [difficulty, setDifficulty] = useState("");
  const [round, setRound] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Page>(firstPage);
  const [loading, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  function load(next: { tech?: string | null; difficulty?: string; round?: string; q?: string; page?: number }) {
    const query = { tech, difficulty, round, q, page: 1, ...next };
    start(async () => {
      const r = await searchPublicAction(slug, query);
      if (!r.ok) return setError(r.error);
      setError(null);
      setData({ rows: r.rows, total: r.total, page: r.page, tech: query.tech ?? null });
    });
  }

  useEffect(() => {
    if (initialTech && initialTech !== firstPage.tech) load({ tech: initialTech });
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
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const from = data.total ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(data.total, data.page * PAGE_SIZE);

  return (
    <div className={`flex gap-5 items-start ${compact ? "flex-col md:flex-row" : ""}`}>
      {/* Categories */}
      <nav aria-label="Categories" className={`${compact ? "hidden md:flex" : "hidden lg:flex"} flex-col w-56 shrink-0 sticky top-4 rounded-xl border border-border bg-surface py-2 max-h-[75vh] overflow-y-auto`}>
        <CategoryButton on={tech === null} onClick={() => pickTech(null)} label="All categories" count={bankTotal} />
        {categories.map((c) => (
          <CategoryButton key={c.slug} on={tech === c.slug} onClick={() => pickTech(c.slug)} label={c.label} count={c.count} logo={c.slug} />
        ))}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions or tags" aria-label="Search questions" className={`${inputCls} pl-8`} />
          </div>
          <select
            aria-label="Category"
            value={tech ?? ""}
            onChange={(e) => pickTech(e.target.value || null)}
            className={`${selectCls} ${compact ? "md:hidden" : "lg:hidden"}`}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
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
                className={`px-2.5 rounded-md text-[13px] ${difficulty === d.id ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
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
        </div>

        <div className="flex items-center justify-between gap-3 text-[13px] text-muted" aria-live="polite">
          <span>
            {loading ? "Loading" : data.total ? `${from} to ${to} of ${plural(data.total, "question")}` : "No questions match"}
            {selected.size > 0 && <span className="text-fg font-medium">, {selected.size} picked</span>}
          </span>
          {pages > 1 && (
            <span className="inline-flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={data.page <= 1 || loading} onClick={() => load({ page: data.page - 1 })} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-panel">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-1">
                Page {data.page} of {pages}
              </span>
              <button type="button" aria-label="Next page" disabled={data.page >= pages || loading} onClick={() => load({ page: data.page + 1 })} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-panel">
                <ChevronRight className="w-4 h-4" />
              </button>
            </span>
          )}
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}

        <ul className={`flex flex-col rounded-xl border border-border bg-surface divide-y divide-border transition-opacity ${loading ? "opacity-60" : ""}`}>
          {data.rows.map((r) => (
            <PublicRowItem key={r.id} slug={slug} row={r} checked={selected.has(r.id)} already={disabledIds?.has(r.slug) ?? false} onToggle={() => onToggle(r)} />
          ))}
          {!data.rows.length && !loading && <li className="px-4 py-10 text-center text-[13px] text-subtle">No public questions match these filters.</li>}
        </ul>
      </div>
    </div>
  );
}

function CategoryButton({ on, onClick, label, count, logo }: { on: boolean; onClick: () => void; label: string; count: number; logo?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`mx-2 h-9 px-2.5 rounded-lg flex items-center gap-2 text-[13px] text-left ${on ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg hover:bg-panel/60"}`}
    >
      {logo ? <TopicLogo slug={logo} size={15} /> : <span className="w-[15px]" aria-hidden />}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-subtle tabular-nums">{count}</span>
    </button>
  );
}

function PublicRowItem({ slug, row, checked, already, onToggle }: { slug: string; row: PublicRow; checked: boolean; already: boolean; onToggle: () => void }) {
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
    <li className={checked ? "bg-secondary/[0.06]" : ""}>
      <div className="flex items-start gap-3 px-3.5 py-3">
        <label className="pt-0.5 shrink-0">
          <span className="sr-only">{already ? "Already in this questionnaire" : `Pick ${row.title}`}</span>
          <input type="checkbox" checked={checked || already} disabled={already} onChange={onToggle} className="w-4 h-4 accent-secondary cursor-pointer disabled:cursor-default" />
        </label>
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
        <div className="px-3.5 pb-4 pl-10 flex flex-col gap-2">
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
