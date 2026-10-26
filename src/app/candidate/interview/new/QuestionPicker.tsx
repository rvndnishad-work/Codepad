"use client";

/**
 * The questions step: the public library on the left (talk-through
 * questions, system design and coding problems), and the interview's
 * running order on the right, where picks can be moved or removed.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Code2, ExternalLink, Loader2, MessageSquareText, Network, Plus, Search, Shuffle, Sparkles, X } from "lucide-react";
import { MAX_CODING, MAX_PICKS, pickKey, type MockPick, type MockRole, type PickKind } from "@/lib/mock-interview/roles";
import { cap, DiffDot, fmtMinutes, inputCls, Segmented, spring } from "./parts";

export type LibraryFilters = {
  topics: { slug: string; label: string; count: number }[];
  categories: { id: string; label: string; count: number }[];
  designCount: number;
};

type Row = MockPick & { slug: string; summary: string | null };

export const KIND_META: Record<PickKind, { label: string; short: string; Icon: typeof Code2; tint: string }> = {
  question: { label: "Questions", short: "Question", Icon: MessageSquareText, tint: "text-sky-700 dark:text-sky-300 bg-sky-500/10 ring-sky-500/25" },
  design: { label: "System design", short: "Design", Icon: Network, tint: "text-violet-700 dark:text-violet-300 bg-violet-500/10 ring-violet-500/25" },
  coding: { label: "Coding problems", short: "Coding", Icon: Code2, tint: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-500/25" },
};

const LEAD: Record<PickKind, (mode: "ai" | "peer") => string> = {
  question: (m) => (m === "ai" ? "Spoken questions. The AI reads each one out and listens to your answer." : "Talk-through questions. The interviewer reads them from a private guide with reference answers."),
  design: (m) => (m === "ai" ? "Open design prompts. Talk the AI through your approach and trade-offs." : "Open design prompts for a whiteboard discussion."),
  coding: (m) => (m === "ai" ? "Solve these in an editor while the AI watches and asks about your code." : "Solved in the shared editor while the interviewer watches."),
};

const DIFFS = ["all", "easy", "medium", "hard"] as const;

export default function QuestionPicker({
  mode,
  role,
  filters,
  picks,
  onChange,
  onSuggest,
  suggesting,
  minutes,
}: {
  mode: "ai" | "peer";
  role: MockRole;
  filters: LibraryFilters;
  picks: MockPick[];
  onChange: (p: MockPick[]) => void;
  onSuggest: () => void;
  suggesting: boolean;
  /** Estimated length of the interview as it stands. */
  minutes: number;
}) {
  const reduce = useReducedMotion();
  const [source, setSource] = useState<PickKind>("question");
  const has = new Set(picks.map(pickKey));
  const codingCount = picks.filter((p) => p.kind === "coding").length;
  const full = picks.length >= MAX_PICKS;

  const toggle = (r: MockPick) => {
    const k = pickKey(r);
    if (has.has(k)) onChange(picks.filter((p) => pickKey(p) !== k));
    else if (!full && !(r.kind === "coding" && codingCount >= MAX_CODING)) {
      const { kind, id, title, topic, difficulty, minutes } = r;
      onChange([...picks, { kind, id, title, topic, difficulty, minutes }]);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
      <section aria-label="Public question library" className="min-w-0 rounded-xl border border-border bg-surface flex flex-col">
        <div className="p-3 flex flex-col gap-2.5 border-b border-border">
          <Segmented
            id="mock-source"
            label="Question type"
            value={source}
            onChange={setSource}
            options={(["question", "design", "coding"] as PickKind[]).map((k) => {
              const M = KIND_META[k];
              return {
                id: k,
                label: (
                  <>
                    <M.Icon className="w-3.5 h-3.5" aria-hidden />
                    <span className="hidden sm:inline">{M.label}</span>
                    <span className="sm:hidden">{M.short}</span>
                  </>
                ),
              };
            })}
          />
          <p className="text-[13px] text-muted px-0.5">{LEAD[source](mode)}</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={source}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <LibraryList source={source} role={role} filters={filters} has={has} onToggle={toggle} full={full} codingFull={codingCount >= MAX_CODING} />
          </motion.div>
        </AnimatePresence>
      </section>

      <RunningOrder picks={picks} onChange={onChange} onSuggest={onSuggest} suggesting={suggesting} role={role} mode={mode} minutes={minutes} />
    </div>
  );
}

function LibraryList({
  source,
  role,
  filters,
  has,
  onToggle,
  full,
  codingFull,
}: {
  source: PickKind;
  role: MockRole;
  filters: LibraryFilters;
  has: Set<string>;
  onToggle: (r: MockPick) => void;
  full: boolean;
  codingFull: boolean;
}) {
  // Topic chips: the role's own topics first, then the rest of the bank.
  const chips =
    source === "coding"
      ? [...filters.categories].sort((a, b) => Number(role.coding.includes(b.id)) - Number(role.coding.includes(a.id))).map((c) => ({ id: c.id, label: c.label, mine: role.coding.includes(c.id) }))
      : source === "question"
        ? [
            ...role.techs.flatMap((t) => filters.topics.filter((x) => x.slug === t)),
            ...filters.topics.filter((x) => !role.techs.includes(x.slug)),
          ].map((t) => ({ id: t.slug, label: t.label, mine: role.techs.includes(t.slug) }))
        : [];
  const defaultTopic = source === "question" ? (chips.find((c) => c.mine)?.id ?? "") : source === "coding" ? (chips.find((c) => c.mine)?.id ?? "") : "";

  const [topic, setTopic] = useState(defaultTopic);
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const load = async (nextPage: number) => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const sp = new URLSearchParams({ source, page: String(nextPage) });
      if (topic) sp.set("topic", topic);
      if (diff !== "all") sp.set("difficulty", diff);
      if (q.trim()) sp.set("q", q.trim());
      const res = await fetch(`/api/mock-interview/library?${sp}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load questions.");
      const data = (await res.json()) as { rows: Row[]; total: number; page: number };
      if (my !== seq.current) return;
      setError("");
      setTotal(data.total);
      setPage(data.page);
      setRows((prev) => (nextPage === 1 ? data.rows : [...prev, ...data.rows]));
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : "Could not load questions.");
    } finally {
      if (my === seq.current) setLoading(false);
    }
  };

  // Search as the filters change, a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, diff, q]);

  const viewHref = (r: Row) => (r.kind === "coding" ? `/challenges/${r.slug}` : `/interview-question/${r.slug}`);

  return (
    <div className="p-3 flex flex-col gap-2.5">
      <label className="relative">
        <span className="sr-only">Search the library</span>
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={source === "coding" ? "Search coding problems" : "Search by title or tag"} className={`${inputCls} pl-8`} />
      </label>

      {chips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5" role="radiogroup" aria-label="Topic">
          {[{ id: "", label: "All topics", mine: false }, ...chips].map((c) => {
            const on = topic === c.id;
            return (
              <button
                key={c.id || "all"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTopic(c.id)}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[12px] font-medium transition-colors ${
                  on ? "border-accent bg-accent text-accent-ink" : c.mine ? "border-accent/40 text-fg hover:bg-panel" : "border-border text-muted hover:text-fg hover:bg-panel"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Segmented id={`diff-${source}`} label="Difficulty" size="sm" value={diff} onChange={setDiff} options={DIFFS.map((d) => ({ id: d, label: d === "all" ? "Any level" : cap(d) }))} />
        <span className="text-xs text-subtle tabular-nums whitespace-nowrap">{loading && rows.length === 0 ? "" : `${total} found`}</span>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <ul aria-label="Library results" className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto -mx-1 px-1">
        {rows.map((r) => {
          const on = has.has(pickKey(r));
          const blocked = !on && (full || (r.kind === "coding" && codingFull));
          return (
            <li key={r.id} className={`rounded-xl border px-3 py-2.5 flex gap-3 transition-colors ${on ? "border-accent/60 bg-accent/[0.06]" : "border-border hover:border-border-strong"}`}>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-fg leading-snug">{r.title}</span>
                {r.summary && r.summary !== r.title && <span className="block text-xs text-muted mt-0.5 line-clamp-2">{r.summary}</span>}
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-subtle">
                  <span className="inline-flex items-center gap-1">
                    <DiffDot d={r.difficulty} />
                    {cap(r.difficulty)}
                  </span>
                  {r.topic && <span>{r.topic}</span>}
                  <span className="tabular-nums">{fmtMinutes(r.minutes)}</span>
                  <a href={viewHref(r)} target="_blank" rel="noopener noreferrer" className="hover:text-fg inline-flex items-center gap-0.5">
                    Preview <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                </span>
              </span>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => onToggle(r)}
                disabled={blocked}
                aria-pressed={on}
                aria-label={on ? `Remove ${r.title}` : `Add ${r.title}`}
                title={blocked ? (r.kind === "coding" && codingFull ? `Up to ${MAX_CODING} coding problems` : `Up to ${MAX_PICKS} questions`) : undefined}
                className={`self-start shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                  on ? "border-accent bg-accent text-accent-ink" : "border-border text-fg hover:bg-panel"
                }`}
              >
                {on ? <Check className="w-3 h-3" aria-hidden /> : <Plus className="w-3 h-3" aria-hidden />}
                {on ? "Added" : "Add"}
              </motion.button>
            </li>
          );
        })}
        {loading && (
          <li className="flex items-center justify-center gap-2 py-4 text-[13px] text-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> Loading
          </li>
        )}
        {!loading && rows.length === 0 && !error && <li className="text-[13px] text-muted text-center py-10">Nothing matches. Try another topic or clear the search.</li>}
      </ul>
      {!loading && rows.length < total && (
        <button type="button" onClick={() => load(page + 1)} className="self-center h-8 px-3 rounded-lg border border-border text-[13px] text-fg hover:bg-panel">
          Show more ({total - rows.length} left)
        </button>
      )}
    </div>
  );
}

function RunningOrder({
  picks,
  onChange,
  onSuggest,
  suggesting,
  role,
  mode,
  minutes,
}: {
  picks: MockPick[];
  onChange: (p: MockPick[]) => void;
  onSuggest: () => void;
  suggesting: boolean;
  role: MockRole;
  mode: "ai" | "peer";
  minutes: number;
}) {
  const reduce = useReducedMotion();
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= picks.length) return;
    const next = picks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <section aria-label="Running order" className="min-w-0 rounded-xl border border-border bg-surface flex flex-col xl:sticky xl:top-20">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-fg">Running order</h3>
          <p className="text-xs text-muted tabular-nums">
            {picks.length} of {MAX_PICKS}
            {picks.length > 0 && `, about ${fmtMinutes(minutes)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={suggesting}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border-strong text-[13px] font-medium text-fg hover:bg-panel disabled:opacity-50"
        >
          {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : picks.length ? <Shuffle className="w-3.5 h-3.5" aria-hidden /> : <Sparkles className="w-3.5 h-3.5 text-accent" aria-hidden />}
          {picks.length ? "Suggest another set" : "Suggest a set"}
        </button>
      </header>

      {picks.length === 0 ? (
        <div className="px-6 py-12 text-center flex flex-col items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-panel border border-border flex items-center justify-center text-muted">
            <Sparkles className="w-5 h-5" aria-hidden />
          </span>
          <p className="text-[14px] font-medium text-fg">Nothing picked yet</p>
          <p className="text-[13px] text-muted max-w-[300px]">
            Add questions from the library, or let us suggest a balanced set for a {role.label.toLowerCase()}.
          </p>
        </div>
      ) : (
        <ol className="p-2 flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {picks.map((p, i) => {
              const M = KIND_META[p.kind];
              return (
                <motion.li
                  key={pickKey(p)}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: 12 }}
                  transition={spring}
                  className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg/40 px-2.5 py-2"
                >
                  <span className="w-6 h-6 rounded-full bg-panel border border-border text-[11px] font-semibold text-muted flex items-center justify-center tabular-nums shrink-0">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-fg truncate" title={p.title}>
                      {p.title}
                    </span>
                    <span className="flex items-center gap-2 mt-0.5 text-xs text-subtle">
                      <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded ring-1 ring-inset ${M.tint}`}>
                        <M.Icon className="w-3 h-3" aria-hidden />
                        {M.short}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <DiffDot d={p.difficulty} />
                        {cap(p.difficulty)}
                      </span>
                      <span className="tabular-nums">{fmtMinutes(p.minutes)}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <IconBtn label={`Move ${p.title} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn label={`Move ${p.title} down`} onClick={() => move(i, 1)} disabled={i === picks.length - 1}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn label={`Remove ${p.title}`} onClick={() => onChange(picks.filter((x) => pickKey(x) !== pickKey(p)))}>
                      <X className="w-3.5 h-3.5" />
                    </IconBtn>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
      {picks.length > 0 && (
        <p className="px-4 pb-3 text-xs text-muted">
          {mode === "ai"
            ? "The AI asks these in this order. Questions next to each other become one spoken round; each coding problem is its own round."
            : "The interviewer sees the questions in this order, with reference answers. Coding problems open in the shared editor."}
        </p>
      )}
    </section>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-md inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
