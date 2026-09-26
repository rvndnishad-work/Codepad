"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardPaste,
  Copy,
  GripVertical,
  Lock,
  MoreHorizontal,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import { techLabel } from "@/lib/interview-questions/shared";
import { MAX_ANSWER_CHARS, MAX_QUESTION_CHARS, MAX_QUESTIONS, type QuestionItem } from "@/lib/ai-interview/questionnaire";
import type { PublicCategory, PublicRow, Questionnaire } from "@/lib/library/library-server";
import { pace, parsePastedQuestions, questionnaireStats } from "@/lib/library/questionnaire-view";
import { plural } from "@/lib/workspace/display";
import { Btn, Dialog, Field, Menu, MenuItem, inputCls } from "../candidates/_components/ui";
import { ConfirmDialog } from "../candidates/_components/dialogs";
import PublicBrowser, { DifficultyChip, type Page } from "./PublicBrowser";
import { CoverageBar } from "./Questionnaires";
import { publicItemsAction, saveQuestionnaireAction } from "./actions";
import type { ToastFn } from "./LibraryClient";

type Row = QuestionItem & { key: number };

let nextKey = 1;
const withKeys = (items: QuestionItem[]): Row[] => items.map((i) => ({ ...i, key: nextKey++ }));
const TIMES = [10, 15, 20, 30, 45, 60, 90];

/** What is saved, for spotting unsaved changes. */
function snapshot(v: { title: string; brief: string; roleArea: string; minutes: number; rows: QuestionItem[] }) {
  return JSON.stringify({
    t: v.title.trim(),
    b: v.brief.trim(),
    r: v.roleArea.trim(),
    m: v.minutes,
    i: v.rows.filter((r) => r.q.trim()).map((r) => [r.q.trim(), r.a?.trim() ?? "", r.src ?? ""]),
  });
}

/**
 * Write or edit a questionnaire: a brief for the candidate plus an ordered
 * list of questions, each with an optional reference answer that only the
 * grader and the team see. A side column shows what is still missing, the
 * pace, and what the candidate will see.
 */
export default function QuestionnaireEditor({
  slug,
  initial,
  categories,
  rounds,
  bankTotal,
  firstPage,
  canManage,
  aiScreening,
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
  aiScreening: boolean;
  onBack: () => void;
  onSaved: (id: string) => void;
  toast: ToastFn;
}) {
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [brief, setBrief] = useState(initial?.brief ?? "");
  const [roleArea, setRoleArea] = useState(initial?.roleArea ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes ?? 20);
  const [rows, setRows] = useState<Row[]>(() => withKeys(initial?.items.length ? initial.items : [{ q: "" }]));
  const [baseline, setBaseline] = useState(() =>
    snapshot({ title: initial?.title ?? "", brief: initial?.brief ?? "", roleArea: initial?.roleArea ?? "", minutes: initial?.minutes ?? 20, rows: initial?.items ?? [] }),
  );
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(() => new Set());
  const [picking, setPicking] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [triedSave, setTriedSave] = useState(false);
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const [dragKey, setDragKey] = useState<number | null>(null);
  const [saving, start] = useTransition();

  const filled = rows.filter((r) => r.q.trim());
  const stats = questionnaireStats(rows);
  const advice = pace(stats.count, minutes);
  const dirty = snapshot({ title, brief, roleArea, minutes, rows }) !== baseline;
  const missing = [!title.trim() && "a name", !brief.trim() && "a brief", !filled.length && "one question"].filter(Boolean) as string[];
  const room = MAX_QUESTIONS - filled.length;

  const update = (key: number, patch: Partial<QuestionItem>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (from: number, to: number) =>
    setRows((rs) => {
      if (to < 0 || to >= rs.length || from === to) return rs;
      const next = [...rs];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  const toggleAnswer = (key: number) =>
    setOpenAnswers((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  function addBlank() {
    const [row] = withKeys([{ q: "" }]);
    setRows((rs) => [...rs, row]);
    setFocusKey(row.key);
  }

  function duplicateRow(i: number) {
    if (rows.length >= MAX_QUESTIONS) return;
    const { key: _key, ...item } = rows[i];
    const [copy] = withKeys([item]);
    setRows((rs) => [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)]);
    setFocusKey(copy.key);
  }

  function remove(i: number) {
    const row = rows[i];
    setRows((rs) => rs.filter((x) => x.key !== row.key));
    if (row.q.trim() || row.a) {
      toast("Question removed", "ok", () =>
        setRows((rs) => {
          if (rs.some((x) => x.key === row.key)) return rs;
          return [...rs.slice(0, i), row, ...rs.slice(i)];
        }),
      );
    }
  }

  function addPicked(picked: PublicRow[], answers: Map<string, QuestionItem>) {
    const have = new Set(rows.map((r) => r.src).filter(Boolean));
    const fresh = picked.filter((p) => !have.has(p.slug)).map((p) => answers.get(p.slug) ?? { q: p.title, src: p.slug, tech: p.technology ?? undefined, difficulty: p.difficulty });
    setRows((rs) => [...rs.filter((r) => r.q.trim() || r.a), ...withKeys(fresh)]);
    setPicking(false);
    toast(`${plural(fresh.length, "question")} added`);
  }

  function addPasted(questions: string[]) {
    const fresh = questions.slice(0, room).map((q) => ({ q }));
    setRows((rs) => [...rs.filter((r) => r.q.trim() || r.a), ...withKeys(fresh)]);
    setPasting(false);
    toast(questions.length > room ? `${plural(fresh.length, "question")} added. The rest did not fit in ${MAX_QUESTIONS}.` : `${plural(fresh.length, "question")} added`);
  }

  function save() {
    setTriedSave(true);
    if (missing.length || saving || !canManage) {
      if (missing.length) toast(`Add ${missing.join(", ")} before saving.`, "error");
      return;
    }
    start(async () => {
      const items = rows.map(({ key: _key, ...item }) => item);
      const r = await saveQuestionnaireAction(slug, { id: savedId, title, brief, roleArea, minutes, items });
      if (!r.ok) return toast(r.error, "error");
      setBaseline(snapshot({ title, brief, roleArea, minutes, rows }));
      setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.q.trim() || x.a) : rs));
      toast(savedId ? "Changes saved" : "Questionnaire saved");
      setSavedId(r.id);
      onSaved(r.id);
    });
  }

  // Save with Ctrl or Cmd + S; warn before closing the tab with unsaved work.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const back = () => (dirty ? setLeaving(true) : onBack());

  if (picking) {
    return (
      <PickView
        slug={slug}
        title={title.trim() || "this questionnaire"}
        categories={categories}
        rounds={rounds}
        bankTotal={bankTotal}
        firstPage={firstPage}
        inQuestionnaire={new Set(rows.map((r) => r.src).filter(Boolean) as string[])}
        initialTech={stats.techs[0] ?? null}
        room={room}
        onClose={() => setPicking(false)}
        onAdd={addPicked}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="sticky top-0 z-30 -mx-4 -mt-6 px-4 md:-mx-10 md:-mt-8 md:px-10 py-3 bg-bg/90 backdrop-blur border-b border-border flex flex-wrap items-center gap-3">
        <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Questionnaires
        </button>
        <span className="text-subtle" aria-hidden>
          /
        </span>
        <span className="text-[13px] text-fg font-medium truncate max-w-[36ch]">{title.trim() || (savedId ? "Untitled" : "New questionnaire")}</span>
        <SaveState dirty={dirty} saving={saving} saved={!!savedId} />
        <span className="flex-1" />
        {savedId && aiScreening && canManage && !dirty && (
          <Btn icon={Bot} href={`/w/${slug}/ai-interviews/new?add=${savedId}`} className="hidden md:inline-flex">
            Use in AI screening
          </Btn>
        )}
        <Btn onClick={back}>{dirty ? "Cancel" : "Done"}</Btn>
        <Btn variant="primary" disabled={!canManage || saving || (!dirty && !!savedId)} onClick={save} title="Ctrl or Cmd + S">
          {saving ? "Saving" : savedId ? "Save changes" : "Save questionnaire"}
        </Btn>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <div className="flex flex-col gap-6 min-w-0">
          {/* Details */}
          <section className="rounded-2xl border border-border bg-surface p-5 md:p-6 flex flex-col gap-4 animate-slide-up motion-reduce:animate-none">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              aria-label="Name"
              placeholder="Name this questionnaire, for example React fundamentals"
              autoFocus={!initial}
              className={`w-full bg-transparent text-xl md:text-2xl font-semibold tracking-tight text-fg placeholder:text-subtle placeholder:font-normal focus:outline-none border-b pb-2 transition-colors ${
                triedSave && !title.trim() ? "border-danger/60" : "border-transparent focus:border-secondary/60"
              }`}
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Field label="Role area (optional)" hint="Groups questionnaires in the library, for example Frontend or Sales.">
                <input value={roleArea} onChange={(e) => setRoleArea(e.target.value)} maxLength={60} placeholder="Frontend" className={inputCls} />
              </Field>
              <Field label="Time">
                <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={inputCls}>
                  {[...new Set([...TIMES, minutes])].sort((a, b) => a - b).map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center text-xs font-medium text-subtle">
                <span className="flex-1">Brief for the candidate</span>
                <span className="tabular-nums">{brief.length} / 2000</span>
              </span>
              <textarea
                rows={3}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                maxLength={2000}
                placeholder="A short conversation about how you build React apps. Answer in your own words; there is no code to write."
                className={`${inputCls} h-auto py-2 leading-relaxed ${triedSave && !brief.trim() ? "border-danger/60" : ""}`}
              />
              <span className="text-xs text-subtle">Candidates read this before they start. Two or three sentences is enough.</span>
            </label>
          </section>

          {/* Questions */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <h2 className="text-base font-semibold text-fg">
                  Questions <span className="text-subtle font-normal tabular-nums">{stats.count}</span>
                </h2>
                <p className="text-[13px] text-muted">Asked in this order. Drag to reorder, or press Alt with the arrow keys while typing.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn icon={ClipboardPaste} disabled={room <= 0} onClick={() => setPasting(true)}>
                  Paste a list
                </Btn>
                {bankTotal > 0 && (
                  <Btn icon={BookOpen} disabled={room <= 0} onClick={() => setPicking(true)}>
                    Add from the bank
                  </Btn>
                )}
              </div>
            </div>

            <ol className="flex flex-col gap-2.5">
              {rows.map((r, i) => (
                <QuestionRow
                  key={r.key}
                  row={r}
                  index={i}
                  total={rows.length}
                  answerOpen={openAnswers.has(r.key)}
                  focus={focusKey === r.key}
                  dragging={dragKey === r.key}
                  invalid={triedSave && !filled.length && i === 0}
                  onFocused={() => setFocusKey(null)}
                  onChange={(patch) => update(r.key, patch)}
                  onToggleAnswer={() => toggleAnswer(r.key)}
                  onMove={(to) => move(i, to)}
                  onDuplicate={() => duplicateRow(i)}
                  onRemove={() => remove(i)}
                  onDragStart={() => setDragKey(r.key)}
                  onDragEnter={() => {
                    if (dragKey == null || dragKey === r.key) return;
                    move(
                      rows.findIndex((x) => x.key === dragKey),
                      i,
                    );
                  }}
                  onDragEnd={() => setDragKey(null)}
                  onEnterLast={i === rows.length - 1 ? addBlank : undefined}
                />
              ))}
            </ol>

            <button
              type="button"
              onClick={addBlank}
              disabled={rows.length >= MAX_QUESTIONS}
              className="h-12 rounded-xl border border-dashed border-border-strong text-[13px] text-muted hover:text-fg hover:border-secondary/60 hover:bg-secondary/[0.04] inline-flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus className="w-4 h-4" aria-hidden /> Add a question
              <span className="hidden sm:inline text-subtle">or press Enter in the last one</span>
            </button>
          </section>
        </div>

        <Sidebar
          stats={stats}
          advice={advice}
          minutes={minutes}
          brief={brief}
          missing={missing}
          title={title}
          filled={filled.length}
        />
      </div>

      {pasting && <PasteDialog existing={rows.map((r) => r.q)} room={room} onCancel={() => setPasting(false)} onAdd={addPasted} />}
      {leaving && (
        <ConfirmDialog
          title="Leave without saving?"
          body="Your changes to this questionnaire will be lost."
          confirmLabel="Discard changes"
          danger
          onCancel={() => setLeaving(false)}
          onConfirm={() => {
            setLeaving(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}

function SaveState({ dirty, saving, saved }: { dirty: boolean; saving: boolean; saved: boolean }) {
  if (saving) return <span className="text-xs text-subtle">Saving</span>;
  if (dirty)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden /> Unsaved changes
      </span>
    );
  if (saved)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-subtle">
        <Check className="w-3 h-3 text-success" aria-hidden /> Saved
      </span>
    );
  return null;
}

function QuestionRow({
  row: r,
  index: i,
  total,
  answerOpen,
  focus,
  dragging,
  invalid,
  onFocused,
  onChange,
  onToggleAnswer,
  onMove,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onEnterLast,
}: {
  row: Row;
  index: number;
  total: number;
  answerOpen: boolean;
  focus: boolean;
  dragging: boolean;
  invalid: boolean;
  onFocused: () => void;
  onChange: (patch: Partial<QuestionItem>) => void;
  onToggleAnswer: () => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onEnterLast?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [armed, setArmed] = useState(false);

  // Grow with the text instead of scrolling inside a tiny box.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [r.q]);
  useEffect(() => {
    if (focus) {
      ref.current?.focus();
      onFocused();
    }
  }, [focus, onFocused]);

  return (
    <li
      draggable={armed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={() => {
        setArmed(false);
        onDragEnd();
      }}
      className={`group rounded-xl border bg-surface flex gap-2 p-3 pl-1.5 transition ${
        dragging ? "opacity-50 border-secondary/60 border-dashed" : invalid ? "border-danger/50" : "border-border hover:border-border-strong focus-within:border-secondary/40"
      }`}
    >
      <div className="flex items-center gap-0.5 shrink-0 self-start">
        <span
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          aria-hidden
          title="Drag to reorder"
          className="w-5 h-7 rounded-md flex items-center justify-center text-subtle cursor-grab active:cursor-grabbing hover:text-fg hover:bg-panel"
        >
          <GripVertical className="w-4 h-4" />
        </span>
        <span className="w-7 h-7 rounded-lg bg-elevated text-[13px] font-semibold text-fg inline-flex items-center justify-center tabular-nums">{i + 1}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={r.q}
          onChange={(e) => onChange({ q: e.target.value })}
          onKeyDown={(e) => {
            if (e.altKey && e.key === "ArrowUp") {
              e.preventDefault();
              onMove(i - 1);
            } else if (e.altKey && e.key === "ArrowDown") {
              e.preventDefault();
              onMove(i + 1);
            } else if (e.key === "Enter" && !e.shiftKey && onEnterLast && r.q.trim()) {
              e.preventDefault();
              onEnterLast();
            }
          }}
          maxLength={MAX_QUESTION_CHARS}
          aria-label={`Question ${i + 1}`}
          placeholder="Ask something open-ended, for example: Walk me through how you would debug a slow page."
          className="w-full resize-none overflow-hidden bg-transparent text-sm text-fg leading-relaxed placeholder:text-subtle focus:outline-none py-1"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
          {r.src ? (
            <span className="inline-flex items-center gap-1.5">
              {r.tech && <TopicLogo slug={r.tech} size={13} />}
              {r.tech ? techLabel(r.tech) : "Question bank"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <PenLine className="w-3 h-3" aria-hidden /> Your question
            </span>
          )}
          <DifficultyChip value={r.difficulty} />
          <button
            type="button"
            onClick={onToggleAnswer}
            aria-expanded={answerOpen}
            className={`inline-flex items-center gap-1 h-6 px-2 rounded-md transition ${r.a?.trim() ? "text-success bg-success/10 hover:bg-success/15" : "text-secondary-soft hover:bg-secondary/10"}`}
          >
            {r.a?.trim() ? <Check className="w-3 h-3" aria-hidden /> : <Plus className="w-3 h-3" aria-hidden />}
            {r.a?.trim() ? "Reference answer" : "Add a reference answer"}
            <ChevronDown className={`w-3 h-3 transition-transform ${answerOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {r.q.length > MAX_QUESTION_CHARS - 80 && (
            <span className="tabular-nums">
              {r.q.length} / {MAX_QUESTION_CHARS}
            </span>
          )}
        </div>
        {!answerOpen && r.a?.trim() && (
          <button type="button" onClick={onToggleAnswer} className="text-left text-[13px] text-subtle line-clamp-1 hover:text-muted">
            {r.a}
          </button>
        )}
        {answerOpen && (
          <div className="flex flex-col gap-1.5 animate-fade-in motion-reduce:animate-none">
            <textarea
              rows={5}
              value={r.a ?? ""}
              onChange={(e) => onChange({ a: e.target.value })}
              maxLength={MAX_ANSWER_CHARS}
              aria-label={`Reference answer for question ${i + 1}`}
              placeholder="What a strong answer covers. The grader uses it as a guide, not a script."
              className={`${inputCls} h-auto py-2 text-[13px] leading-relaxed`}
            />
            <span className="flex items-center gap-1.5 text-xs text-subtle">
              <Lock className="w-3 h-3" aria-hidden />
              <span className="flex-1">Hidden from candidates and from the AI interviewer.</span>
              <span className="tabular-nums">
                {(r.a ?? "").length} / {MAX_ANSWER_CHARS}
              </span>
            </span>
          </div>
        )}
      </div>
      <div className="flex items-start gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
        <IconButton label="Move up" disabled={i === 0} onClick={() => onMove(i - 1)} icon={ArrowUp} />
        <IconButton label="Move down" disabled={i === total - 1} onClick={() => onMove(i + 1)} icon={ArrowDown} />
        <Menu
          align="right"
          width={180}
          label={`Actions for question ${i + 1}`}
          trigger={(p) => (
            <button type="button" {...p} aria-label={`More actions for question ${i + 1}`} className="w-7 h-7 rounded-md inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem onClick={() => (close(), onDuplicate())}>
                <Copy className="w-3.5 h-3.5 text-muted" /> Duplicate
              </MenuItem>
              <MenuItem disabled={i === 0} onClick={() => (close(), onMove(0))}>
                <ArrowUp className="w-3.5 h-3.5 text-muted" /> Move to top
              </MenuItem>
              <MenuItem disabled={i === total - 1} onClick={() => (close(), onMove(total - 1))}>
                <ArrowDown className="w-3.5 h-3.5 text-muted" /> Move to bottom
              </MenuItem>
              <div className="h-px bg-border my-1 mx-1" />
              <MenuItem danger onClick={() => (close(), onRemove())}>
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </li>
  );
}

function Sidebar({
  stats,
  advice,
  minutes,
  brief,
  missing,
  title,
  filled,
}: {
  stats: ReturnType<typeof questionnaireStats>;
  advice: ReturnType<typeof pace>;
  minutes: number;
  brief: string;
  missing: string[];
  title: string;
  filled: number;
}) {
  const checks = [
    { ok: !!title.trim(), label: "Name" },
    { ok: !!brief.trim(), label: "Brief for the candidate" },
    { ok: filled > 0, label: "At least one question" },
    { ok: stats.count > 0 && stats.answered === stats.count, label: "Reference answers", optional: true },
  ];
  const adviceTone = advice?.tone === "tight" ? "text-warning" : advice?.tone === "loose" ? "text-muted" : "text-success";
  return (
    <aside className="lg:sticky lg:top-20 flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-fg tabular-nums">{stats.count}</span>
          <span className="text-sm text-muted">of {MAX_QUESTIONS} questions</span>
        </div>
        <CoverageBar answered={stats.answered} count={stats.count} />
        {advice && (
          <p className={`flex items-start gap-1.5 text-[13px] ${adviceTone}`}>
            {advice.tone === "tight" ? <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden /> : <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />}
            {advice.text}
          </p>
        )}
        {stats.techs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stats.techs.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-panel text-xs text-muted">
                <TopicLogo slug={t} size={12} /> {techLabel(t)}
              </span>
            ))}
          </div>
        )}
        <ul className="flex flex-col gap-2 pt-3 border-t border-border">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[13px]">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.ok ? "bg-success/15 text-success" : c.optional ? "bg-panel text-subtle" : "bg-warning/15 text-warning"}`}
                aria-hidden
              >
                {c.ok ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-current" />}
              </span>
              <span className={c.ok ? "text-muted" : "text-fg"}>{c.label}</span>
              {c.optional && !c.ok && <span className="text-xs text-subtle">optional</span>}
            </li>
          ))}
        </ul>
        {missing.length === 0 && <p className="text-xs text-success">Ready to save and use.</p>}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-2.5">
        <p className="text-xs font-medium text-subtle">What the candidate sees</p>
        <div className="rounded-xl bg-bg/60 border border-border p-3.5 flex flex-col gap-2">
          <p className={`text-[13px] leading-relaxed line-clamp-5 ${brief.trim() ? "text-fg" : "text-subtle italic"}`}>{brief.trim() || "Your brief shows here."}</p>
          <p className="text-xs text-subtle">
            {plural(stats.count, "question")} · about {minutes} min · spoken answers
          </p>
        </div>
        <p className="text-xs text-subtle leading-relaxed">The AI interviewer asks one question at a time and may follow up. Reference answers are never shown or read out.</p>
      </section>
    </aside>
  );
}

function PasteDialog({ existing, room, onCancel, onAdd }: { existing: string[]; room: number; onCancel: () => void; onAdd: (q: string[]) => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parsePastedQuestions(text, existing), [text, existing]);
  return (
    <Dialog
      title="Paste a list of questions"
      onClose={onCancel}
      width={600}
      footer={
        <>
          <Btn size="md" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn size="md" variant="primary" disabled={!parsed.length} onClick={() => onAdd(parsed)}>
            {parsed.length ? `Add ${plural(Math.min(parsed.length, room), "question")}` : "Add questions"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted">One question per line. Numbers and bullets are removed, and questions already in this questionnaire are skipped.</p>
        <textarea
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"1. Tell me about a project you are proud of.\n2. How do you decide what to test?\n3. Walk me through a bug that took you a long time to find."}
          className={`${inputCls} h-auto py-2 leading-relaxed font-mono text-[12.5px]`}
        />
        <p className="text-xs text-subtle" aria-live="polite">
          {parsed.length ? `${plural(parsed.length, "question")} found` : "Nothing to add yet"}
          {parsed.length > room ? `, only ${room} fit` : ""}
        </p>
      </div>
    </Dialog>
  );
}

function IconButton({ label, onClick, icon: Icon, disabled }: { label: string; onClick: () => void; icon: typeof Plus; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-md inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30 disabled:pointer-events-none"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}

/**
 * Full-width picker that replaces the editor form inside the workspace
 * content area. The editor stays mounted, so nothing typed is lost.
 */
function PickView({
  slug,
  title,
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
  title: string;
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

  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    root.current?.closest("main")?.scrollTo({ top: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog], [role=menu]")) close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    <div ref={root} className="flex flex-col gap-4">
      <div className="sticky top-0 z-30 -mx-4 -mt-6 px-4 md:-mx-10 md:-mt-8 md:px-10 py-3 bg-bg/90 backdrop-blur border-b border-border flex flex-wrap items-center gap-3">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back to {title}
        </button>
        <span className="flex-1" />
        <span className="text-[13px] text-muted tabular-nums">{selected.size ? `${selected.size} of ${room} picked` : `Pick up to ${room}`}</span>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!selected.size || adding} onClick={add}>
          {adding ? "Adding" : selected.size ? `Add ${plural(selected.size, "question")}` : "Add questions"}
        </Btn>
      </div>
      <header>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Add from the question bank</h1>
        <p className="text-sm text-muted mt-1">Picked questions go into {title} with their reference answers. Open a row to read its answer first.</p>
      </header>
      <PublicBrowser
        mode="questions"
        slug={slug}
        categories={categories}
        rounds={rounds}
        bankTotal={bankTotal}
        firstPage={firstPage}
        selected={selected}
        onToggle={toggle}
        disabledIds={inQuestionnaire}
        initialTech={initialTech}
      />
    </div>
  );
}
