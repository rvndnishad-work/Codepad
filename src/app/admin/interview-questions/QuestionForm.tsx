"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, X, Save, AlertTriangle, FlaskConical, Layers } from "lucide-react";
import { saveQuestion } from "./actions";
import { DIFFICULTIES, ROUNDS, EXPERIENCE_LEVELS, TECHNOLOGIES } from "@/lib/interview-questions/shared";
import MarkdownField from "./editor/MarkdownField";
import JsonField, { validateJson } from "./editor/JsonField";
import ExamplesEditor, { parseExamples, serializeExamples, type ExampleItem } from "./editor/ExamplesEditor";

export type QuestionInitial = {
  id?: string;
  /** Public slug — present in edit mode, used for the "view live" link. */
  slug?: string;
  title: string;
  description: string;
  answer: string;
  companyId: string;
  technology: string;
  role: string;
  difficulty: string;
  round: string;
  experienceLevel: string;
  tags: string;
  yearsAsked: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  /** Raw JSON array of runnable examples: [{ label, tech, code }]. */
  examplesData: string;
  /** Raw JSON map of per-framework bundles: { react|vue|angular: { answer, files } }. */
  frameworksData: string;
};

const EMPTY: QuestionInitial = {
  title: "", description: "", answer: "", companyId: "", technology: "", role: "",
  difficulty: "medium", round: "", experienceLevel: "", tags: "", yearsAsked: "",
  status: "draft", seoTitle: "", seoDescription: "", examplesData: "", frameworksData: "",
};

const field = "w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:border-accent/50";
const label = "text-[10px] font-black uppercase tracking-widest text-muted mb-1.5 block";
const card = "rounded-2xl border border-border bg-bg/40 p-4 space-y-4";
const cardTitle = "text-[10px] font-black uppercase tracking-[0.2em] text-muted";

const DIFFICULTY_ACTIVE: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  hard: "bg-rose-500/15 text-rose-500 border-rose-500/40",
};

const STATUS_ACTIVE: Record<string, string> = {
  draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
  published: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  archived: "bg-rose-500/15 text-rose-500 border-rose-500/40",
};

/** Comma string ⇄ chips. */
function splitCsv(s: string): string[] {
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

function ChipInput({
  values,
  onChange,
  placeholder,
  numeric = false,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  numeric?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const parts = splitCsv(draft).filter((p) => !numeric || !isNaN(parseInt(p, 10)));
    const next = [...values];
    for (const p of parts) {
      const v = numeric ? String(parseInt(p, 10)) : p;
      if (!next.includes(v)) next.push(v);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-border bg-bg px-2 py-1.5 focus-within:border-accent/50 transition-colors">
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-elevated text-xs font-bold">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-500 transition"
              title={`Remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && commit()}
          placeholder={values.length ? "" : placeholder}
          inputMode={numeric ? "numeric" : "text"}
          className="flex-1 min-w-[80px] bg-transparent text-sm py-0.5 px-1 focus:outline-none"
        />
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
  activeClasses,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  activeClasses: Record<string, string>;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition ${
            value === o.value
              ? activeClasses[o.value] ?? "bg-accent/15 text-accent border-accent/40"
              : "border-border text-muted hover:text-fg hover:border-border-strong"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function QuestionForm({
  companies,
  initial,
}: {
  companies: { id: string; name: string }[];
  initial?: QuestionInitial;
}) {
  const router = useRouter();
  const init = initial ?? EMPTY;

  const [f, setF] = useState(init);
  const [tags, setTags] = useState<string[]>(() => splitCsv(init.tags));
  const [years, setYears] = useState<string[]>(() => splitCsv(init.yearsAsked));
  const [examples, setExamples] = useState<ExampleItem[]>(() => parseExamples(init.examplesData));
  const [frameworks, setFrameworks] = useState(init.frameworksData);
  const [showFrameworks, setShowFrameworks] = useState(() => Boolean(init.frameworksData.trim()));

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof QuestionInitial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const setV = (k: keyof QuestionInitial) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  // ── Dirty tracking ────────────────────────────────────────────────────────
  const snapshot = () => JSON.stringify({ f, tags, years, examples, frameworks });
  const initialSnapshot = useRef<string>("");
  if (initialSnapshot.current === "") initialSnapshot.current = snapshot();
  const dirty = snapshot() !== initialSnapshot.current;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const submitRef = useRef<() => void>(() => {});

  function submit() {
    if (pending) return;
    if (!f.title.trim()) return setError("Title is required.");
    const ex = serializeExamples(examples);
    if (ex.error) return setError(ex.error);
    const fwError = validateJson(frameworks, "object");
    if (fwError) return setError(`Framework bundles: ${fwError}`);
    setError(null);
    start(async () => {
      try {
        await saveQuestion({
          id: f.id,
          title: f.title,
          description: f.description,
          answer: f.answer,
          companyId: f.companyId || undefined,
          technology: f.technology || undefined,
          role: f.role || undefined,
          difficulty: f.difficulty,
          round: f.round || undefined,
          experienceLevel: f.experienceLevel || undefined,
          tags,
          yearsAsked: years.map((y) => parseInt(y, 10)).filter((n) => !isNaN(n)),
          status: f.status,
          seoTitle: f.seoTitle || undefined,
          seoDescription: f.seoDescription || undefined,
          examplesData: ex.value,
          frameworksData: frameworks,
        });
        initialSnapshot.current = snapshot(); // saved — no beforeunload nag on redirect
        router.push("/admin/interview-questions");
        router.refresh();
      } catch (err) {
        setError((err as Error).message || "Failed to save.");
      }
    });
  }
  submitRef.current = submit;

  // Ctrl/Cmd+S saves from anywhere in the form.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const seoTitleLen = f.seoTitle.length;
  const seoDescLen = f.seoDescription.length;
  const isMachineCoding = f.technology === "machine-coding";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      {/* Action bar */}
      <div className="sticky top-2 z-20 flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border bg-surface/90 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dirty ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className="text-xs font-bold text-muted truncate">
            {dirty ? "Unsaved changes" : "All changes saved"}
            <span className="hidden sm:inline text-muted/60"> · Ctrl+S to save</span>
          </span>
        </div>
        {f.slug && (
          <Link
            href={`/interview-question/${f.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-fg hover:border-accent/40 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">View live</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-fg transition"
        >
          Cancel
        </button>
        <button
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft disabled:opacity-60 transition"
        >
          <Save className="w-3.5 h-3.5" />
          {pending ? "Saving…" : f.id ? "Save" : "Create"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr),320px] gap-5 items-start">
        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">
          <div className={card}>
            <input
              value={f.title}
              onChange={set("title")}
              placeholder="Question title — e.g. Explain the virtual DOM…"
              className="w-full bg-transparent text-xl font-extrabold tracking-tight placeholder:text-muted/50 focus:outline-none"
            />
            <MarkdownField
              label="Question body"
              value={f.description}
              onChange={setV("description")}
              placeholder="The prompt shown to candidates. Optional — the title alone can carry short questions."
              minHeight={110}
              maxHeight={340}
            />
          </div>

          <MarkdownField
            label="Answer"
            value={f.answer}
            onChange={setV("answer")}
            placeholder={"**TL;DR.** One-paragraph takeaway…\n\nFollowed by the full explanation, diagrams, tables and code."}
            minHeight={360}
            maxHeight={720}
            defaultMode={f.answer ? "split" : "write"}
            hint="Gold-standard answers: TL;DR → explanation with SVG diagram → comparison table → interview tip. Preview matches the public page."
          />

          <section className={card}>
            <div className="flex items-center justify-between">
              <h3 className={cardTitle}>
                <FlaskConical className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
                Runnable examples
                {examples.length > 0 && <span className="ml-2 text-accent">{examples.length}</span>}
              </h3>
              <p className="text-[10px] text-muted">Interactive playgrounds under the answer.</p>
            </div>
            <ExamplesEditor items={examples} onChange={setExamples} />
          </section>

          <section className={card}>
            <div className="flex items-center justify-between">
              <h3 className={cardTitle}>
                <Layers className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
                Framework bundles
              </h3>
              {!showFrameworks && (
                <button
                  type="button"
                  onClick={() => setShowFrameworks(true)}
                  className="text-[10px] font-black uppercase tracking-wider text-accent hover:underline"
                >
                  Add bundles
                </button>
              )}
            </div>
            {showFrameworks ? (
              <>
                <p className="text-[10px] text-muted -mt-2">
                  Machine-coding only: <code className="text-accent">{'{ react: { answer, files }, vue: …, angular: … }'}</code> swaps the tutorial and runnable solution per framework. The plain answer above stays the React default for SSR/SEO.
                </p>
                <JsonField value={frameworks} onChange={setFrameworks} kind="object" minHeight={160} maxHeight={520} />
              </>
            ) : (
              <p className="text-[10px] text-muted -mt-2">
                {isMachineCoding
                  ? "No per-framework bundles yet — machine-coding questions usually ship React, Vue and Angular variants."
                  : "Not set. Only used by machine-coding questions."}
              </p>
            )}
          </section>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-[4.5rem]">
          <div className={card}>
            <h3 className={cardTitle}>Publish</h3>
            <Segmented
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived", label: "Archived" },
              ]}
              value={f.status}
              onChange={(v) => setF((p) => ({ ...p, status: v }))}
              activeClasses={STATUS_ACTIVE}
            />
          </div>

          <div className={card}>
            <h3 className={cardTitle}>Classification</h3>
            <div>
              <label className={label}>Technology</label>
              <select value={f.technology} onChange={set("technology")} className={field}>
                <option value="">— None —</option>
                {TECHNOLOGIES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Difficulty</label>
              <Segmented
                options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
                value={f.difficulty}
                onChange={(v) => setF((p) => ({ ...p, difficulty: v }))}
                activeClasses={DIFFICULTY_ACTIVE}
              />
            </div>
            <div>
              <label className={label}>Company</label>
              <select value={f.companyId} onChange={set("companyId")} className={field}>
                <option value="">— None —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Round</label>
                <select value={f.round} onChange={set("round")} className={field}>
                  <option value="">— None —</option>
                  {ROUNDS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Experience</label>
                <select value={f.experienceLevel} onChange={set("experienceLevel")} className={field}>
                  <option value="">— Any —</option>
                  {EXPERIENCE_LEVELS.map((e) => <option key={e.slug} value={e.slug}>{e.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Role</label>
              <input value={f.role} onChange={set("role")} className={field} placeholder="Frontend Engineer" />
            </div>
          </div>

          <div className={card}>
            <h3 className={cardTitle}>Tags & years</h3>
            <div>
              <label className={label}>Tags</label>
              <ChipInput values={tags} onChange={setTags} placeholder="react, hooks, … (Enter adds)" />
            </div>
            <div>
              <label className={label}>Years asked</label>
              <ChipInput values={years} onChange={setYears} placeholder="2024 (Enter adds)" numeric />
            </div>
          </div>

          <div className={card}>
            <h3 className={cardTitle}>SEO overrides</h3>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={label + " mb-0"}>Title</label>
                <span className={`text-[10px] tabular-nums ${seoTitleLen > 60 ? "text-amber-500" : "text-muted"}`}>{seoTitleLen}/60</span>
              </div>
              <input value={f.seoTitle} onChange={set("seoTitle")} className={field} placeholder="Defaults to the question title" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={label + " mb-0"}>Description</label>
                <span className={`text-[10px] tabular-nums ${seoDescLen > 160 ? "text-amber-500" : "text-muted"}`}>{seoDescLen}/160</span>
              </div>
              <textarea value={f.seoDescription} onChange={set("seoDescription")} rows={3} className={field} placeholder="Defaults to the question body" />
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
