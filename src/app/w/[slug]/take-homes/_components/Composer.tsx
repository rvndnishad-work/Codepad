"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Info, Mail, Plus, Search, Send, X } from "lucide-react";
import type { TemplateItem } from "@/lib/take-home/status";
import { parsePeople } from "@/lib/take-home/list";
import { plural } from "@/lib/workspace/display";
import { Avatar, Btn, Dialog, fmtDate, inputCls } from "../../candidates/_components/ui";
import { sendTakeHomeAction } from "../actions";

export type ComposerQuestion = { id: string; title: string; difficulty: string; category: string | null; minutes: number; own: boolean };
export type ComposerTemplate = { id: string; name: string; items: TemplateItem[] };
export type ComposerCandidate = { id: string; name: string; email: string; stage: string; openSince: string | null };

type Person = { key: string; id: string | null; name: string; email: string; openSince: string | null };

const MINUTE_STEPS = [15, 20, 30, 45, 60, 90, 120, 180, 240];
const DAY_STEPS = [3, 5, 7, 10, 14];
const selectCls = inputCls.replace("w-full", "");

function deadlineFrom(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

export default function Composer({
  slug,
  workspaceName,
  questions,
  templates,
  candidates,
  initialCandidateIds,
  initialTemplateId,
}: {
  slug: string;
  workspaceName: string;
  questions: ComposerQuestion[];
  templates: ComposerTemplate[];
  candidates: ComposerCandidate[];
  initialCandidateIds: string[];
  initialTemplateId: string | null;
}) {
  const base = `/w/${slug}/take-homes`;
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const firstTemplate = templates.find((t) => t.id === initialTemplateId) ?? null;
  const [templateId, setTemplateId] = useState<string | null>(firstTemplate?.id ?? null);
  const [items, setItems] = useState<TemplateItem[]>(firstTemplate?.items ?? []);
  const [title, setTitle] = useState(firstTemplate ? `${firstTemplate.name} take home` : "");
  const [titleTouched, setTitleTouched] = useState(!!firstTemplate);
  const [people, setPeople] = useState<Person[]>(() =>
    candidates
      .filter((c) => initialCandidateIds.includes(c.id))
      .map((c) => ({ key: c.id, id: c.id, name: c.name, email: c.email, openSince: c.openSince })),
  );
  const [days, setDays] = useState(7);
  const [saveAs, setSaveAs] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ created: number; emailed: number; skipped: string[] } | null>(null);

  const total = items.reduce((n, i) => n + i.minutes, 0);
  const autoTitle = items.length ? (byId.get(items[0].challengeId)?.title ?? "Take home") : "";
  const name = titleTouched ? title : title || autoTitle;
  const deadline = deadlineFrom(days);
  const template = templates.find((t) => t.id === templateId) ?? null;
  // A template edited before sending is sent as its own set, not as the template.
  const templateIntact = !!template && JSON.stringify(template.items) === JSON.stringify(items);
  const ready = items.length > 0 && people.length > 0 && name.trim().length > 0;

  function applyTemplate(t: ComposerTemplate) {
    setTemplateId(t.id);
    setItems(t.items);
    if (!titleTouched || !title) {
      setTitle(`${t.name} take home`);
      setTitleTouched(true);
    }
  }

  function toggleQuestion(q: ComposerQuestion) {
    setItems((list) => (list.some((i) => i.challengeId === q.id) ? list.filter((i) => i.challengeId !== q.id) : [...list, { challengeId: q.id, minutes: q.minutes }]));
  }

  function move(i: number, d: -1 | 1) {
    setItems((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await sendTakeHomeAction(slug, {
        title: name.trim(),
        items,
        candidateIds: people.filter((p) => p.id).map((p) => p.id!),
        newPeople: people.filter((p) => !p.id).map((p) => ({ name: p.name, email: p.email })),
        daysToExpire: days,
        templateId: templateIntact ? templateId : null,
        saveAsTemplate: !templateIntact && saveAs ? saveName.trim() || name.trim() : null,
      });
      if (!res.ok) return setError(res.error);
      setSent({ created: res.created, emailed: res.emailed, skipped: res.skipped });
    });
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto w-full flex flex-col items-center text-center gap-4 py-16 animate-scale-in motion-reduce:animate-none">
        <span className="w-14 h-14 rounded-2xl flex items-center justify-center bg-success/15 text-success ring-1 ring-inset ring-success/30 animate-pop-in motion-reduce:animate-none">
          <CheckCircle2 className="w-7 h-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Sent to {plural(sent.created, "candidate")}
        </h1>
        <p className="text-[15px] text-muted max-w-md">
          {sent.emailed === sent.created
            ? "Each candidate got their own link by email."
            : `${sent.emailed} of ${sent.created} emails went out. Copy the link from All take-homes for anyone whose email did not arrive.`}{" "}
          Their answers land in Review when they submit.
        </p>
        {sent.skipped.length > 0 && (
          <div className="w-full text-left rounded-xl border border-warning/35 bg-warning/[0.06] px-4 py-3">
            <p className="text-sm font-medium text-fg">{plural(sent.skipped.length, "person was", "people were")} skipped</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-muted">
              {sent.skipped.slice(0, 8).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <Btn size="md" href={`${base}/all?filter=not_started`}>
            See who has not started
          </Btn>
          <Btn
            size="md"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setSent(null);
              setPeople([]);
            }}
          >
            Send to more people
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href={base} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg w-fit">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Back to take home
      </Link>
      <div className="animate-fade-in motion-reduce:animate-none">
        <h1 className="text-[26px] font-semibold tracking-tight text-fg">New take home</h1>
        <p className="text-[15px] text-muted mt-1">Pick the questions, add candidates, and send. Each candidate gets their own link.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
          <Step n={1} title="Questions" aside={items.length ? `${total} min in total` : undefined}>
            {templates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-muted mr-1">Start from a template</span>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    aria-pressed={templateId === t.id && templateIntact}
                    className={`h-8 px-3 rounded-full border text-[13px] font-medium transition ${
                      templateId === t.id && templateIntact
                        ? "border-secondary bg-secondary/15 text-fg"
                        : "border-border bg-surface text-muted hover:text-fg hover:border-border-strong"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {items.length > 0 ? (
              <ol className="flex flex-col gap-2">
                {items.map((it, i) => {
                  const q = byId.get(it.challengeId);
                  return (
                    <li
                      key={it.challengeId}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-border bg-bg/60 px-3.5 py-3 animate-fade-in motion-reduce:animate-none"
                    >
                      <span className="w-6 h-6 shrink-0 rounded-md bg-panel text-xs text-muted flex items-center justify-center tabular-nums">{i + 1}</span>
                      <span className="flex-1 min-w-[160px]">
                        <span className="block text-sm font-medium text-fg">{q?.title ?? "Unknown question"}</span>
                        <span className="block text-[13px] text-subtle">
                          {[q?.category, q?.difficulty?.toLowerCase(), q?.own ? "your workspace" : null].filter(Boolean).join(", ")}
                        </span>
                      </span>
                      <label className="sr-only" htmlFor={`minutes-${it.challengeId}`}>
                        Minutes for {q?.title}
                      </label>
                      <select
                        id={`minutes-${it.challengeId}`}
                        value={it.minutes}
                        onChange={(e) => setItems((list) => list.map((x) => (x.challengeId === it.challengeId ? { ...x, minutes: Number(e.target.value) } : x)))}
                        className={`${selectCls} w-[92px]`}
                      >
                        {[...new Set([...MINUTE_STEPS, it.minutes])]
                          .sort((a, b) => a - b)
                          .map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                      </select>
                      <span className="flex gap-0.5">
                        <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDown className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn label={`Remove ${q?.title ?? "question"}`} onClick={() => setItems((list) => list.filter((x) => x.challengeId !== it.challengeId))}>
                          <X className="w-3.5 h-3.5" />
                        </IconBtn>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted">
                No questions yet. {templates.length ? "Start from a template or add questions." : "Add a coding question to begin."}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Btn icon={Plus} onClick={() => setPicking(true)}>
                Add questions
              </Btn>
              <span className="text-xs text-subtle">Coding challenges with tests, so every answer gets a score.</span>
            </div>
          </Step>

          <Step n={2} title="Candidates" aside={people.length ? `${people.length} selected` : undefined}>
            <PeoplePicker candidates={candidates} people={people} setPeople={setPeople} />
          </Step>

          <Step n={3} title="Deadline">
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-[170px] text-muted">Candidates can start until</span>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_STEPS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={days === d}
                      onClick={() => setDays(d)}
                      className={`h-8 px-3 rounded-lg border font-medium transition ${
                        days === d ? "border-secondary bg-secondary/15 text-fg" : "border-border bg-surface text-muted hover:text-fg"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
                <span className="text-fg" suppressHydrationWarning>
                  {fmtDate(deadline.toISOString())}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-[170px] text-muted">Once started, they have</span>
                <span className="text-fg">{items.length ? `${total} min, the sum of the question timers` : "The sum of the question timers"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-[170px] text-muted">Reminder</span>
                <span className="text-fg">Sent automatically 24 hours before the deadline to anyone who has not submitted</span>
              </div>
            </div>
          </Step>
        </div>

        <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-4">
          <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-subtle">Name</span>
              <input
                value={name}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleTouched(true);
                }}
                placeholder="Senior Frontend Engineer take home"
                maxLength={120}
                className={inputCls}
              />
              <span className="text-xs text-subtle">Candidates see this name in the email and on their page.</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Figure value={items.length} label={items.length === 1 ? "question" : "questions"} />
              <Figure value={total} label="minutes" />
              <Figure value={people.length} label={people.length === 1 ? "candidate" : "candidates"} />
            </div>
            {!templateIntact && items.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[13px] text-fg cursor-pointer">
                  <input type="checkbox" checked={saveAs} onChange={(e) => setSaveAs(e.target.checked)} className="w-4 h-4 accent-secondary" />
                  Save these questions as a template
                </label>
                {saveAs && (
                  <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={name || "Template name"} maxLength={120} className={inputCls} />
                )}
              </div>
            )}
            {templateIntact && template && <p className="text-xs text-subtle">Sent from the {template.name} template, so you can compare results later.</p>}
            {error && (
              <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
            <Btn variant="primary" size="md" icon={Send} disabled={!ready || pending} onClick={send} className="justify-center">
              {pending ? "Sending" : people.length ? `Send to ${plural(people.length, "candidate")}` : "Send"}
            </Btn>
            {!ready && (
              <p className="text-xs text-subtle -mt-2">
                {!items.length ? "Add at least one question." : !people.length ? "Add at least one candidate." : "Give the take home a name."}
              </p>
            )}
          </section>

          <EmailPreview
            workspaceName={workspaceName}
            name={people[0]?.name.split(/\s+/)[0] ?? "Alex"}
            to={people[0]?.name ?? null}
            title={name || "Your take home"}
            questions={items.length}
            deadline={deadline}
          />
        </aside>
      </div>

      {picking && (
        <QuestionPicker
          questions={questions}
          chosen={new Set(items.map((i) => i.challengeId))}
          onToggle={toggleQuestion}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: string; children: ReactNode }) {
  return (
    <section
      className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4 animate-slide-up motion-reduce:animate-none"
      style={{ animationDelay: `${(n - 1) * 60}ms`, animationFillMode: "backwards" }}
    >
      <header className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary-soft text-xs font-semibold flex items-center justify-center tabular-nums">{n}</span>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {aside && <span className="ml-auto text-[13px] text-muted tabular-nums">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-panel/70 py-2.5">
      <p className="text-xl font-semibold text-fg tabular-nums">{value}</p>
      <p className="text-xs text-subtle">{label}</p>
    </div>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30 disabled:pointer-events-none transition"
    >
      {children}
    </button>
  );
}

function PeoplePicker({
  candidates,
  people,
  setPeople,
}: {
  candidates: ComposerCandidate[];
  people: Person[];
  setPeople: (fn: (p: Person[]) => Person[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chosen = new Set(people.map((p) => p.email.toLowerCase()));
  const needle = q.trim().toLowerCase();
  const matches = needle
    ? candidates.filter((c) => !chosen.has(c.email.toLowerCase()) && (c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle))).slice(0, 8)
    : [];
  const typed = parsePeople(q).filter((p) => !chosen.has(p.email));

  function addCandidate(c: ComposerCandidate) {
    setPeople((list) => [...list, { key: c.id, id: c.id, name: c.name, email: c.email, openSince: c.openSince }]);
    setQ("");
    setCursor(0);
    inputRef.current?.focus();
  }

  function addTyped(raw: string): boolean {
    const found = parsePeople(raw);
    if (!found.length) return false;
    setPeople((list) => {
      const have = new Set(list.map((p) => p.email.toLowerCase()));
      const next = [...list];
      for (const f of found) {
        if (have.has(f.email)) continue;
        have.add(f.email);
        const known = candidates.find((c) => c.email.toLowerCase() === f.email);
        next.push(known ? { key: known.id, id: known.id, name: known.name, email: known.email, openSince: known.openSince } : { key: f.email, id: null, name: f.name, email: f.email, openSince: null });
      }
      return next.slice(0, 100);
    });
    setQ("");
    return true;
  }

  const busy = people.filter((p) => p.openSince);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
        <input
          ref={inputRef}
          value={q}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="take-home-people"
          aria-label="Search candidates, or paste emails"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setCursor(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,;\n]/.test(text) && addTyped(text)) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") (e.preventDefault(), setCursor((c) => Math.min(matches.length - 1, c + 1)));
            else if (e.key === "ArrowUp") (e.preventDefault(), setCursor((c) => Math.max(0, c - 1)));
            else if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              if (matches[cursor] && e.key === "Enter") return (e.preventDefault(), addCandidate(matches[cursor]));
              if (q.trim() && addTyped(q)) e.preventDefault();
            } else if (e.key === "Backspace" && !q && people.length) setPeople((list) => list.slice(0, -1));
          }}
          placeholder="Search candidates, or paste emails separated by commas"
          className={`${inputCls} pl-8 h-10`}
        />
        {open && (matches.length > 0 || typed.length > 0) && (
          <ul
            id="take-home-people"
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl border border-border-strong bg-elevated shadow-panel p-1 max-h-72 overflow-auto animate-fade-in"
          >
            {matches.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addCandidate(c)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left ${i === cursor ? "bg-panel" : "hover:bg-panel/70"}`}
                >
                  <Avatar name={c.name} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg truncate">{c.name}</span>
                    <span className="block text-xs text-subtle truncate">{c.email}</span>
                  </span>
                  {c.openSince && <span className="text-xs text-warning whitespace-nowrap">Has an open take home</span>}
                </button>
              </li>
            ))}
            {typed.length > 0 && matches.length === 0 && (
              <li role="option" aria-selected>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTyped(q)}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left bg-panel"
                >
                  <Plus className="w-4 h-4 text-muted" aria-hidden />
                  <span className="text-sm text-fg">
                    Add {typed.length === 1 ? typed[0].email : plural(typed.length, "email")} as a new candidate
                  </span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {people.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {people.map((p) => (
            <li
              key={p.key}
              className={`inline-flex items-center gap-2 h-8 pl-1 pr-1.5 rounded-full border text-[13px] animate-pop-in motion-reduce:animate-none ${
                p.openSince ? "border-warning/40 bg-warning/[0.06]" : "border-border bg-bg/60"
              }`}
            >
              <Avatar name={p.name} size={24} />
              <span className="text-fg max-w-[200px] truncate">{p.id ? p.name : p.email}</span>
              {!p.id && <span className="text-[11px] font-medium text-secondary-soft">New</span>}
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => setPeople((list) => list.filter((x) => x.key !== p.key))}
                className="w-5 h-5 rounded-full flex items-center justify-center text-subtle hover:text-fg hover:bg-panel"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy.length > 0 && (
        <p className="flex gap-2 text-[13px] text-muted">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden />
          <span>
            {busy.length === 1
              ? `${busy[0].name.split(/\s+/)[0]} still has an open take home sent ${fmtDate(busy[0].openSince)}, and will get a second, separate link.`
              : `${plural(busy.length, "person")} still have an open take home, and will get a second, separate link.`}
          </span>
        </p>
      )}
      <p className="text-xs text-subtle">New email addresses are added to Candidates when you send.</p>
    </div>
  );
}

export function QuestionPicker({
  questions,
  chosen,
  onToggle,
  onClose,
}: {
  questions: ComposerQuestion[];
  chosen: Set<string>;
  onToggle: (q: ComposerQuestion) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(questions.map((x) => x.category).filter((c): c is string => !!c))].sort(), [questions]);
  const needle = q.trim().toLowerCase();
  const list = questions.filter(
    (x) =>
      (level === "all" || x.difficulty.toLowerCase() === level) &&
      (category === "all" || x.category === category) &&
      (!needle || x.title.toLowerCase().includes(needle) || (x.category ?? "").toLowerCase().includes(needle)),
  );
  return (
    <Dialog
      title="Add questions"
      onClose={onClose}
      width={640}
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">{plural(chosen.size, "question")} chosen</span>
          <Btn size="md" variant="primary" onClick={onClose}>
            Done
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <label className="relative flex-1 min-w-[200px]">
            <span className="sr-only">Search questions</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className={`${inputCls} pl-8`} data-autofocus />
          </label>
          <label className="sr-only" htmlFor="picker-level">
            Difficulty
          </label>
          <select id="picker-level" value={level} onChange={(e) => setLevel(e.target.value)} className={`${selectCls} w-auto`}>
            <option value="all">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {categories.length > 1 && (
            <>
              <label className="sr-only" htmlFor="picker-category">
                Category
              </label>
              <select id="picker-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectCls} w-auto max-w-[180px]`}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <ul className="flex flex-col max-h-[52vh] overflow-auto -mx-1 px-1">
          {list.length === 0 && <li className="py-10 text-center text-[13px] text-muted">No questions match.</li>}
          {list.map((x) => {
            const on = chosen.has(x.id);
            return (
              <li key={x.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(x)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${on ? "bg-secondary/10" : "hover:bg-panel/70"}`}
                >
                  <span
                    aria-hidden
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${on ? "bg-secondary border-secondary text-bg" : "border-border-strong"}`}
                  >
                    {on && <CheckCircle2 className="w-3 h-3" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-fg truncate">{x.title}</span>
                    <span className="block text-xs text-subtle">
                      {[x.category, x.difficulty.toLowerCase(), `${x.minutes} min`, x.own ? "your workspace" : null].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

function EmailPreview({
  workspaceName,
  name,
  to,
  title,
  questions,
  deadline,
}: {
  workspaceName: string;
  name: string;
  to: string | null;
  title: string;
  questions: number;
  deadline: Date;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border text-[13px]">
        <Mail className="w-3.5 h-3.5 text-muted" aria-hidden />
        <span className="font-medium text-fg">Email preview</span>
        {to && <span className="ml-auto text-subtle truncate">To {to}</span>}
      </header>
      <div className="p-4 flex flex-col gap-3 text-[13px] leading-relaxed">
        <p className="text-xs text-subtle">
          Subject: Your take-home from {workspaceName}: {title}
        </p>
        <p className="text-[15px] font-semibold text-fg">Hi {name}, you have a take-home to complete.</p>
        <p className="text-muted">
          {workspaceName} has assigned you <span className="text-fg">{title}</span>, {plural(questions || 1, "question")} you work through in your browser, each with
          its own timer. No setup required.
        </p>
        <p className="text-muted" suppressHydrationWarning>
          Start by <span className="text-fg">{fmtDate(deadline.toISOString())}</span>.
        </p>
        <span className="self-start inline-flex items-center h-9 px-4 rounded-lg bg-secondary text-bg text-[13px] font-semibold">Start your take-home</span>
        <p className="text-xs text-subtle">Each timer starts only when the candidate opens that question.</p>
      </div>
    </section>
  );
}
