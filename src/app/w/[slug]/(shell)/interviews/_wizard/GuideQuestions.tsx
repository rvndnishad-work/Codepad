"use client";

/**
 * Interviewer guides for the wizard: the same questions for everyone or a
 * separate set per candidate, each built from a library questionnaire,
 * public bank questions, or both.
 *
 * GuideSets sits in the step; QuestionSources is the picker in the right
 * sidebar and adds to whichever set is selected ("target").
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Check, Clock, Copy, ExternalLink, Globe2, Library, Loader2, Plus, Search, Users, X } from "lucide-react";
import type { GuideOption, PublicCategory } from "@/lib/interview/wizard-server";
import {
  MAX_BANK,
  candidateKey,
  firstName,
  setSize,
  sharedSet,
  usesOwnSets,
  type BankPick,
  type QuestionSet,
  type WizardState,
} from "@/lib/interview/wizard";
import { searchPublicAction } from "../../library/actions";
import { Avatar, Btn, inputCls } from "../../candidates/_components/ui";
import { CheckDot, Chip, Segmented, spring } from "./parts";

type Patch = (p: Partial<WizardState>) => void;
/** "all" is the shared set; otherwise a candidateKey. */
export type GuideTarget = string;
export const ALL = "all";

export function currentSet(state: WizardState, target: GuideTarget): QuestionSet {
  if (target === ALL || !usesOwnSets(state)) return sharedSet(state);
  return state.sets?.[target] ?? sharedSet(state);
}

export function writeSet(state: WizardState, patch: Patch, target: GuideTarget, next: QuestionSet) {
  if (target === ALL || !usesOwnSets(state)) return patch({ guideId: next.guideId, bank: next.bank });
  patch({ sets: { ...(state.sets ?? {}), [target]: next } });
}

/** Label for where the sidebar adds questions. */
export function targetLabel(state: WizardState, target: GuideTarget): string {
  if (target === ALL || !usesOwnSets(state)) return state.candidates.length > 1 ? "Everyone" : state.candidates[0]?.name ?? "This interview";
  return state.candidates.find((c) => candidateKey(c) === target)?.name ?? "Everyone";
}

/* ───────────────────────── In the step ───────────────────────── */

export function GuideSets({
  state,
  patch,
  guides,
  target,
  onTarget,
  onBrowse,
  optional,
}: {
  state: WizardState;
  patch: Patch;
  guides: GuideOption[];
  target: GuideTarget;
  onTarget: (t: GuideTarget) => void;
  onBrowse: () => void;
  optional: boolean;
}) {
  const reduce = useReducedMotion();
  const canSplit = !state.noCandidate && state.candidates.length > 1;
  const own = usesOwnSets(state);

  const setMode = (per: boolean) => {
    if (!per) {
      patch({ perCandidate: false });
      onTarget(ALL);
      return;
    }
    // Start every person from the shared set, keeping any set made before.
    const base = sharedSet(state);
    const sets = { ...(state.sets ?? {}) };
    for (const c of state.candidates) sets[candidateKey(c)] ??= { guideId: base.guideId, bank: [...base.bank] };
    patch({ perCandidate: true, sets });
    onTarget(candidateKey(state.candidates[0]));
  };

  const copyToAll = (from: QuestionSet) => {
    const sets = { ...(state.sets ?? {}) };
    for (const c of state.candidates) sets[candidateKey(c)] = { guideId: from.guideId, bank: [...from.bank] };
    patch({ sets });
  };

  const rows = own
    ? state.candidates.map((c) => ({ key: candidateKey(c), name: c.name, set: state.sets?.[candidateKey(c)] ?? sharedSet(state) }))
    : [{ key: ALL, name: canSplit ? "Everyone" : state.candidates[0]?.name ?? "This interview", set: sharedSet(state) }];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-fg">{optional ? "Questions for the interviewer (optional)" : "Questions for the interviewer"}</h3>
          <p className="text-[13px] text-muted">Pick a questionnaire or public questions on the right. Interviewers see them in the room, the candidate never does.</p>
        </div>
        <div className="flex items-center gap-2">
          {canSplit && (
            <Segmented
              id="guide-mode"
              value={own ? "own" : "same"}
              onChange={(v) => setMode(v === "own")}
              options={[
                { id: "same", label: "Same for everyone" },
                { id: "own", label: "Different per candidate" },
              ]}
            />
          )}
          <Btn size="md" icon={Library} onClick={onBrowse} className="lg:hidden">
            Browse
          </Btn>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const active = own ? target === r.key : true;
            const guide = guides.find((g) => g.id === r.set.guideId) ?? null;
            const n = setSize(r.set, guides);
            const write = (next: QuestionSet) => writeSet(state, patch, r.key, next);
            return (
              <motion.li
                key={r.key}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={spring}
                onClick={() => own && onTarget(r.key)}
                className={`rounded-xl border bg-surface transition-colors ${own ? "cursor-pointer" : ""} ${active && own ? "border-secondary/70 ring-2 ring-secondary/15" : "border-border hover:border-border-strong"}`}
              >
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  {own ? <Avatar name={r.name} size={28} /> : <span className="w-7 h-7 rounded-full bg-panel text-muted flex items-center justify-center"><Users className="w-3.5 h-3.5" aria-hidden /></span>}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold text-fg truncate">{r.name}</span>
                    <span className="block text-xs text-subtle">{n === 0 ? "No questions yet" : n === 1 ? "1 question" : `${n} questions`}</span>
                  </span>
                  {own && active && <Chip tone="indigo">Adding here</Chip>}
                  {own && n > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToAll(r.set);
                      }}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted hover:text-fg hover:bg-panel"
                      title={`Give everyone the questions of ${firstName(r.name)}`}
                    >
                      <Copy className="w-3 h-3" aria-hidden /> Copy to all
                    </button>
                  )}
                </div>
                <div className="px-4 pb-3 flex flex-col gap-1.5">
                  {guide ? (
                    <div className="flex items-center gap-2.5 rounded-lg bg-bg border border-border px-3 py-2">
                      <BookOpen className="w-4 h-4 text-secondary-soft shrink-0" aria-hidden />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-fg truncate">{guide.title}</span>
                        <span className="block text-xs text-subtle">
                          Questionnaire, {guide.questions.length} questions, {guide.minutes} min
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${guide.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          write({ ...r.set, guideId: null });
                        }}
                        className="w-7 h-7 rounded-md text-subtle hover:text-fg hover:bg-panel flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null}
                  {r.set.bank.length > 0 && (
                    <ol className="flex flex-col gap-1">
                      <AnimatePresence initial={false}>
                        {r.set.bank.map((b, i) => (
                          <motion.li
                            key={b.id}
                            layout={!reduce}
                            initial={reduce ? false : { opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={reduce ? undefined : { opacity: 0, x: 12 }}
                            transition={spring}
                            className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-panel/60"
                          >
                            <span className="text-xs text-subtle tabular-nums w-5 text-right shrink-0">{i + 1}.</span>
                            <span className="flex-1 min-w-0 text-[13px] text-fg truncate" title={b.title}>
                              {b.title}
                            </span>
                            {b.tech && <span className="hidden sm:inline text-xs text-subtle">{b.tech}</span>}
                            <button
                              type="button"
                              aria-label={`Remove ${b.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                write({ ...r.set, bank: r.set.bank.filter((x) => x.id !== b.id) });
                              }}
                              className="w-6 h-6 rounded-md text-subtle hover:text-fg hover:bg-panel flex items-center justify-center opacity-60 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ol>
                  )}
                  {!guide && r.set.bank.length === 0 && (
                    <p className="text-[13px] text-muted px-1 py-1.5">
                      {own && !active ? "Select this card, then pick questions on the right." : "Pick a questionnaire or public questions on the right."}
                    </p>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ───────────────────────── In the sidebar ───────────────────────── */

type PublicRow = { id: string; slug: string; title: string; summary: string | null; difficulty: string; technology: string | null; round: string | null };

export function QuestionSources({
  slug,
  state,
  patch,
  guides,
  categories,
  target,
  onTarget,
}: {
  slug: string;
  state: WizardState;
  patch: Patch;
  guides: GuideOption[];
  categories: PublicCategory[];
  target: GuideTarget;
  onTarget: (t: GuideTarget) => void;
}) {
  const [tab, setTab] = useState<"library" | "public">(guides.length ? "library" : "public");
  const set = currentSet(state, target);
  const own = usesOwnSets(state);
  const write = (next: QuestionSet) => writeSet(state, patch, own ? target : ALL, next);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-surface border-b border-border p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-subtle shrink-0">Adding to</span>
          {own ? (
            <select value={target} onChange={(e) => onTarget(e.target.value)} aria-label="Adding to" className={`${inputCls} h-8`}>
              {state.candidates.map((c) => (
                <option key={candidateKey(c)} value={candidateKey(c)}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-medium text-fg truncate">{targetLabel(state, target)}</span>
          )}
        </div>
        <Segmented
          id="q-source"
          value={tab}
          onChange={setTab}
          options={[
            { id: "library", label: <><Library className="w-3.5 h-3.5" aria-hidden /> Questionnaires</> },
            { id: "public", label: <><Globe2 className="w-3.5 h-3.5" aria-hidden /> Public questions</> },
          ]}
        />
      </div>
      {tab === "library" ? (
        <LibraryList slug={slug} guides={guides} value={set.guideId} onChange={(guideId) => write({ ...set, guideId })} />
      ) : (
        <PublicList slug={slug} categories={categories} picked={set.bank} onChange={(bank) => write({ ...set, bank })} />
      )}
    </div>
  );
}

function LibraryList({ slug, guides, value, onChange }: { slug: string; guides: GuideOption[]; value: string | null; onChange: (id: string | null) => void }) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = guides.filter((g) => !needle || [g.title, g.roleArea ?? "", g.brief].some((v) => v.toLowerCase().includes(needle)));

  if (guides.length === 0) {
    return (
      <div className="px-6 py-10 text-center flex flex-col items-center gap-2">
        <BookOpen className="w-6 h-6 text-subtle" aria-hidden />
        <p className="text-[14px] font-medium text-fg">No questionnaires yet</p>
        <p className="text-[13px] text-muted">Use Public questions, or build a questionnaire in the Question library.</p>
        <a href={`/w/${slug}/library`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-secondary-soft hover:underline">
          Open Question library <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <label className="relative">
        <span className="sr-only">Search questionnaires</span>
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questionnaires" className={`${inputCls} pl-8`} />
      </label>
      <div role="radiogroup" aria-label="Questionnaire" className="flex flex-col gap-1.5">
        {shown.map((g) => {
          const on = value === g.id;
          return (
            <div key={g.id} className={`rounded-xl border transition-colors ${on ? "border-secondary/60 bg-secondary/[0.06]" : "border-border hover:border-border-strong"}`}>
              <button type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? null : g.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-fg truncate">{g.title}</span>
                  <span className="flex items-center gap-2 text-xs text-subtle mt-0.5">
                    <span>{g.questions.length} questions</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden />
                      {g.minutes} min
                    </span>
                    {g.roleArea && <span className="truncate">{g.roleArea}</span>}
                  </span>
                </span>
                <CheckDot on={on} size={18} />
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.ol
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduce ? undefined : { opacity: 0, height: 0 }}
                    className="overflow-hidden px-3 pb-3 flex flex-col gap-1.5"
                  >
                    {g.questions.map((qq, i) => (
                      <li key={i} className="flex gap-2 text-[12px] text-muted">
                        <span className="text-subtle tabular-nums w-4 shrink-0 text-right">{i + 1}.</span>
                        <span className="min-w-0">{qq}</span>
                      </li>
                    ))}
                  </motion.ol>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {shown.length === 0 && <p className="text-[13px] text-muted px-1 py-4">No questionnaire matches.</p>}
      </div>
    </div>
  );
}

const DIFFS = ["all", "easy", "medium", "hard"] as const;

function PublicList({ slug, categories, picked, onChange }: { slug: string; categories: PublicCategory[]; picked: BankPick[]; onChange: (b: BankPick[]) => void }) {
  const [tech, setTech] = useState("");
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PublicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const seq = useRef(0);
  const full = picked.length >= MAX_BANK;
  const has = new Set(picked.map((p) => p.id));

  const load = (nextPage: number) => {
    const my = ++seq.current;
    start(async () => {
      const res = await searchPublicAction(slug, { tech: tech || null, difficulty: diff === "all" ? null : diff, q: q.trim() || null, page: nextPage });
      if (my !== seq.current) return;
      if (!res.ok) return setError(res.error);
      setError("");
      setTotal(res.total);
      setPage(res.page);
      setRows((prev) => (nextPage === 1 ? res.rows : [...prev, ...res.rows]));
    });
  };

  // Search as the filters change, a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tech, diff, q]);

  const toggle = (r: PublicRow) => {
    if (has.has(r.id)) onChange(picked.filter((p) => p.id !== r.id));
    else if (!full) onChange([...picked, { id: r.id, title: r.title, tech: categories.find((c) => c.slug === r.technology)?.label ?? r.technology, difficulty: r.difficulty }]);
  };

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Search public questions</span>
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search public questions" className={`${inputCls} pl-8`} />
        </label>
        <select value={tech} onChange={(e) => setTech(e.target.value)} aria-label="Topic" className={`${inputCls.replace("w-full", "w-[132px]")} pr-7`}>
          <option value="">All topics</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label} ({c.count})
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Segmented id="bank-diff" size="sm" value={diff} onChange={setDiff} options={DIFFS.map((d) => ({ id: d, label: d === "all" ? "Any level" : d[0].toUpperCase() + d.slice(1) }))} />
        <span className="text-xs text-subtle tabular-nums whitespace-nowrap">
          {picked.length} of {MAX_BANK} added
        </span>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <ul aria-label="Public questions" className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const on = has.has(r.id);
          return (
            <li key={r.id} className={`rounded-xl border px-3 py-2.5 flex gap-3 transition-colors ${on ? "border-secondary/60 bg-secondary/[0.06]" : "border-border"}`}>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-fg">{r.title}</span>
                {r.summary && <span className="block text-xs text-muted mt-0.5 line-clamp-2">{r.summary}</span>}
                <span className="flex items-center gap-2 mt-1 text-xs text-subtle">
                  {r.technology && <span>{categories.find((c) => c.slug === r.technology)?.label ?? r.technology}</span>}
                  <span className="capitalize">{r.difficulty}</span>
                  <a href={`/interview-question/${r.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-fg inline-flex items-center gap-0.5">
                    View <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                </span>
              </span>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => toggle(r)}
                disabled={!on && full}
                aria-pressed={on}
                aria-label={on ? `Remove ${r.title}` : `Add ${r.title}`}
                className={`self-start shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                  on ? "border-secondary bg-secondary text-bg" : "border-border text-fg hover:bg-panel"
                }`}
              >
                {on ? <Check className="w-3 h-3" aria-hidden /> : <Plus className="w-3 h-3" aria-hidden />}
                {on ? "Added" : "Add"}
              </motion.button>
            </li>
          );
        })}
      </ul>
      {pending && (
        <p className="flex items-center justify-center gap-2 py-3 text-[13px] text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> Loading
        </p>
      )}
      {!pending && rows.length === 0 && !error && <p className="text-[13px] text-muted text-center py-8">No public question matches.</p>}
      {!pending && rows.length < total && (
        <Btn onClick={() => load(page + 1)} className="self-center">
          Show more ({total - rows.length} left)
        </Btn>
      )}
    </div>
  );
}
