"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, ChevronDown, Plus, Trash2 } from "lucide-react";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import { techLabel } from "@/lib/interview-questions/shared";
import { MAX_QUESTIONS, type QuestionItem } from "@/lib/ai-interview/questionnaire";
import type { PublicCategory, PublicRow, Questionnaire } from "@/lib/library/library-server";
import { plural } from "@/lib/workspace/display";
import { Btn, Dialog, Field, inputCls } from "../candidates/_components/ui";
import PublicBrowser, { DifficultyChip, type Page } from "./PublicBrowser";
import { publicItemsAction, saveQuestionnaireAction } from "./actions";

type Row = QuestionItem & { key: number };

let nextKey = 1;
const withKeys = (items: QuestionItem[]): Row[] => items.map((i) => ({ ...i, key: nextKey++ }));

/**
 * Write or edit a questionnaire: a brief for the candidate plus an ordered
 * list of questions, each with an optional reference answer that only the
 * grader and the team see.
 */
export default function QuestionnaireEditor({
  slug,
  initial,
  categories,
  rounds,
  bankTotal,
  firstPage,
  canManage,
  onBack,
  onSaved,
  toast,
}: {
  slug: string;
  initial: Questionnaire | null;
  categories: PublicCategory[];
  rounds: string[];
  bankTotal: number;
  firstPage: Page;
  canManage: boolean;
  onBack: () => void;
  onSaved: (id: string, created: boolean) => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [brief, setBrief] = useState(initial?.brief ?? "");
  const [roleArea, setRoleArea] = useState(initial?.roleArea ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes ?? 20);
  const [rows, setRows] = useState<Row[]>(() => withKeys(initial?.items.length ? initial.items : [{ q: "" }]));
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(() => new Set());
  const [picking, setPicking] = useState(false);
  const [saving, start] = useTransition();

  const filled = rows.filter((r) => r.q.trim());
  const update = (key: number, patch: Partial<QuestionItem>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const toggleAnswer = (key: number) =>
    setOpenAnswers((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  function addPicked(picked: PublicRow[], answers: Map<string, QuestionItem>) {
    const have = new Set(rows.map((r) => r.src).filter(Boolean));
    const fresh = picked.filter((p) => !have.has(p.slug)).map((p) => answers.get(p.slug) ?? { q: p.title, src: p.slug, tech: p.technology ?? undefined, difficulty: p.difficulty });
    setRows((rs) => [...rs.filter((r) => r.q.trim() || r.a), ...withKeys(fresh)]);
    setPicking(false);
    toast(`${plural(fresh.length, "question")} added`);
  }

  function save() {
    start(async () => {
      const r = await saveQuestionnaireAction(slug, {
        id: initial?.id,
        title,
        brief,
        roleArea,
        minutes,
        items: rows.map(({ key: _key, ...item }) => item),
      });
      if (!r.ok) return toast(r.error, "error");
      onSaved(r.id, !initial);
    });
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="w-4 h-4" aria-hidden /> All questionnaires
        </button>
        <span className="flex-1" />
        <Btn onClick={onBack}>Cancel</Btn>
        <Btn variant="primary" disabled={!canManage || saving || !title.trim() || !brief.trim() || !filled.length} onClick={save}>
          {saving ? "Saving" : initial ? "Save changes" : "Save questionnaire"}
        </Btn>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">{initial ? "Edit questionnaire" : "New questionnaire"}</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_200px_140px]">
          <Field label="Name">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="React fundamentals" className={inputCls} />
          </Field>
          <Field label="Role area (optional)">
            <input value={roleArea} onChange={(e) => setRoleArea(e.target.value)} maxLength={60} placeholder="Frontend" className={inputCls} />
          </Field>
          <Field label="Time">
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={inputCls}>
              {[...new Set([10, 15, 20, 30, 45, 60, minutes])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Brief for the candidate" hint="Candidates see this before they start. Keep it to two or three sentences.">
          <textarea
            rows={3}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={2000}
            placeholder="A short conversation about how you build React apps. Answer in your own words; there is no code to write."
            className={`${inputCls} h-auto py-2`}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <h3 className="text-base font-semibold text-fg">Questions</h3>
            <p className="text-[13px] text-muted">Asked in this order. Reference answers guide the grader and your interviewers; candidates never see them.</p>
          </div>
          <span className="text-[13px] text-subtle">
            {filled.length} of {MAX_QUESTIONS}
          </span>
        </div>

        <ol className="flex flex-col gap-2.5">
          {rows.map((r, i) => {
            const answerOpen = openAnswers.has(r.key) || (!r.src && !!r.a);
            return (
              <li key={r.key} className="rounded-xl border border-border bg-surface p-3.5 flex gap-3">
                <span className="w-7 h-7 rounded-lg bg-elevated text-[13px] font-semibold text-fg inline-flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <textarea
                    rows={1}
                    value={r.q}
                    onChange={(e) => update(r.key, { q: e.target.value })}
                    maxLength={600}
                    aria-label={`Question ${i + 1}`}
                    placeholder="Ask something open-ended, for example: Walk me through how you would debug a slow page."
                    className={`${inputCls} h-auto min-h-9 py-2 resize-y`}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                    {r.src ? (
                      <span className="inline-flex items-center gap-1.5">
                        {r.tech && <TopicLogo slug={r.tech} size={13} />}
                        From public questions{r.tech ? `, ${techLabel(r.tech)}` : ""}
                        <DifficultyChip value={r.difficulty} />
                      </span>
                    ) : (
                      <span>Your question</span>
                    )}
                    <button type="button" onClick={() => toggleAnswer(r.key)} aria-expanded={answerOpen} className="inline-flex items-center gap-1 text-secondary-soft hover:underline">
                      {r.a ? "Reference answer" : "Add a reference answer"}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${answerOpen ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                  </div>
                  {answerOpen && (
                    <textarea
                      rows={5}
                      value={r.a ?? ""}
                      onChange={(e) => update(r.key, { a: e.target.value })}
                      maxLength={4000}
                      aria-label={`Reference answer for question ${i + 1}`}
                      placeholder="What a strong answer covers. The grader uses it as a guide, not a script."
                      className={`${inputCls} h-auto py-2 text-[13px]`}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)} icon={ArrowUp} />
                  <IconButton label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} icon={ArrowDown} />
                  <IconButton label="Remove question" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} icon={Trash2} />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Btn icon={Plus} disabled={rows.length >= MAX_QUESTIONS} onClick={() => setRows((rs) => [...rs, ...withKeys([{ q: "" }])])}>
            Add your own question
          </Btn>
          <Btn icon={BookOpen} disabled={rows.length >= MAX_QUESTIONS} onClick={() => setPicking(true)}>
            Add from public questions
          </Btn>
        </div>
      </section>

      {picking && (
        <PickDialog
          slug={slug}
          categories={categories}
          rounds={rounds}
          bankTotal={bankTotal}
          firstPage={firstPage}
          inQuestionnaire={new Set(rows.map((r) => r.src).filter(Boolean) as string[])}
          initialTech={mostCommon(rows.map((r) => r.tech))}
          room={MAX_QUESTIONS - filled.length}
          onClose={() => setPicking(false)}
          onAdd={addPicked}
        />
      )}
    </div>
  );
}

function mostCommon(values: (string | undefined)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function IconButton({ label, onClick, icon: Icon, disabled }: { label: string; onClick: () => void; icon: typeof Plus; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="w-7 h-7 rounded-md inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30 disabled:pointer-events-none">
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}

function PickDialog({
  slug,
  categories,
  rounds,
  bankTotal,
  firstPage,
  inQuestionnaire,
  initialTech,
  room,
  onClose,
  onAdd,
}: {
  slug: string;
  categories: PublicCategory[];
  rounds: string[];
  bankTotal: number;
  firstPage: Page;
  inQuestionnaire: Set<string>;
  initialTech: string | null;
  room: number;
  onClose: () => void;
  /** `answers` is keyed by bank slug. */
  onAdd: (rows: PublicRow[], answers: Map<string, QuestionItem>) => void;
}) {
  const [selected, setSelected] = useState<Map<string, PublicRow>>(() => new Map());
  const [adding, start] = useTransition();
  const toggle = (row: PublicRow) =>
    setSelected((m) => {
      const n = new Map(m);
      if (n.has(row.id)) n.delete(row.id);
      else if (n.size < room) n.set(row.id, row);
      return n;
    });

  function add() {
    start(async () => {
      // Fetch answers so each question brings its reference answer along.
      const r = await publicItemsAction(slug, [...selected.keys()]);
      const answers = new Map<string, QuestionItem>();
      if (r.ok) for (const it of r.items) if (it.src) answers.set(it.src, it);
      onAdd([...selected.values()], answers);
    });
  }

  return (
    <Dialog
      title="Add from public questions"
      onClose={onClose}
      width={1080}
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">{selected.size ? `${plural(selected.size, "question")} picked` : `Pick up to ${room}`}</span>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!selected.size || adding} onClick={add}>
            {adding ? "Adding" : selected.size ? `Add ${plural(selected.size, "question")}` : "Add questions"}
          </Btn>
        </>
      }
    >
      <PublicBrowser
        slug={slug}
        categories={categories}
        rounds={rounds}
        bankTotal={bankTotal}
        firstPage={firstPage}
        selected={selected}
        onToggle={toggle}
        disabledIds={inQuestionnaire}
        initialTech={initialTech}
        compact
      />
    </Dialog>
  );
}
