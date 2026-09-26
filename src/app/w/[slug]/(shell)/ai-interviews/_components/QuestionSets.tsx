"use client";

import { mergeEditedLines, parseQuestionnaire, questionTexts, serializeQuestionnaire } from "@/lib/ai-interview/questionnaire";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileCode2, Plus, Search, Trash2, X } from "lucide-react";
import type { QuestionItem, QuestionSets as Sets } from "@/lib/ai-interview/console-server";
import { BACKEND_LANGUAGES, DSA_LANGUAGE_LABELS, DSA_LANGUAGES } from "@/lib/interview/stack";
import { plural } from "@/lib/workspace/display";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Btn, Field, inputCls, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { deleteQuestionAction, saveQuestionAction, setQuestionServerAction } from "../actions";

const MonacoFileEditor = dynamic(() => import("@/components/MonacoFileEditor"), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-lg border border-border bg-bg animate-pulse" />,
});

type Filter = "all" | "team" | "frontend" | "backend" | "dsa" | "conversation";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "team", label: "Team" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "dsa", label: "Algorithms" },
  { id: "conversation", label: "Conversation" },
];
const KIND_NAME: Record<string, string> = { frontend: "Frontend", backend: "Backend", dsa: "Algorithms", conversation: "Conversation" };

/** "Frontend, React" (or just "Frontend" when the stack adds nothing). */
function stackText(q: QuestionItem): string {
  const kind = KIND_NAME[q.kind] ?? q.kind;
  return q.label && q.label !== kind ? `${kind}, ${q.label}` : kind;
}

type Draft = {
  id?: string;
  title: string;
  description: string;
  kind: string;
  language: string;
  frameworkLabel: string;
  minutes: number;
  starterFilesJson: string;
  testsCode: string;
};

const EMPTY: Draft = {
  title: "",
  description: "",
  kind: "frontend",
  language: "",
  frameworkLabel: "React",
  minutes: 30,
  starterFilesJson: JSON.stringify({ "/App.js": "export default function App() {\n  return <h1>Hello</h1>;\n}\n" }, null, 2),
  testsCode: "",
};

function draftFrom(q: QuestionItem, copy: boolean): Draft {
  return {
    id: copy ? undefined : q.id,
    title: copy ? `${q.title} (team copy)`.slice(0, 80) : q.title,
    description: q.description,
    kind: q.kind,
    language: q.language ?? "",
    frameworkLabel: q.frameworkLabel ?? "",
    minutes: q.minutes,
    starterFilesJson: JSON.stringify(q.starterFiles, null, 2),
    // Conversation questions are edited here as plain lines; reference answers
    // are kept on save (see mergeEditedLines).
    testsCode: q.kind === "conversation" ? questionTexts(q.testsCode).join("\n") : q.testsCode,
  };
}

export default function QuestionSets({ slug, sets, canManage, initialOpen }: { slug: string; sets: Sets; canManage: boolean; initialOpen: string | null }) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOpen && sets.items.some((i) => i.id === initialOpen) ? initialOpen : null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return sets.items
      .filter((i) => (filter === "all" ? true : filter === "team" ? i.custom : i.kind === filter))
      .filter((i) => !t || `${i.title} ${i.label} ${i.description}`.toLowerCase().includes(t));
  }, [sets.items, filter, q]);
  const open = openId ? sets.items.find((i) => i.id === openId) ?? null : null;
  const teamCount = sets.items.filter((i) => i.custom).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5 max-w-full overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`h-8 px-3 rounded-[7px] text-[13px] font-medium whitespace-nowrap ${filter === f.id ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
              >
                {f.label}
                {f.id === "team" && <span className="ml-1.5 text-xs text-subtle tabular-nums">{teamCount}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <label className="relative flex-1 sm:w-56">
              <span className="sr-only">Search questions</span>
              <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className={`${inputCls} pl-8`} />
            </label>
            {canManage && (
              <Btn
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setOpenId(null);
                  setDraft({ ...EMPTY });
                }}
              >
                New question
              </Btn>
            )}
          </div>
        </div>

        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {list.map((i) => {
            const on = i.id === openId || (draft?.id && draft.id === i.id);
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setOpenId(i.id);
                  }}
                  className={`w-full flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 text-left transition-colors ${on ? "bg-panel" : "hover:bg-panel/60"}`}
                >
                  <FileCode2 className="w-4 h-4 text-muted shrink-0" aria-hidden />
                  <span className="flex-1 min-w-[200px] flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-fg">{i.title}</span>
                    <span className="text-xs text-subtle">
                      {stackText(i)}, {i.minutes} min
                    </span>
                  </span>
                  <span className={`h-6 px-2 rounded-md text-xs inline-flex items-center ${i.custom ? "bg-secondary/15 text-secondary-soft" : "bg-panel text-muted"}`}>
                    {i.custom ? "Team" : "Built in"}
                  </span>
                  <span className="w-24 text-right text-xs text-subtle tabular-nums">{i.uses ? `Used ${plural(i.uses, "time")}` : "Not used yet"}</span>
                </button>
              </li>
            );
          })}
          {!list.length && <li className="px-4 py-8 text-center text-[13px] text-muted">No questions match.</li>}
        </ul>
        <p className="text-xs text-subtle">
          New screenings pick a built-in question for each stack automatically. Team questions show up first when you swap a round.
        </p>
      </div>

      {(draft || open) && (
        <aside className="w-full lg:w-[460px] shrink-0 lg:sticky lg:top-4 rounded-xl border border-border bg-surface flex flex-col max-h-none lg:max-h-[calc(100vh-2rem)] overflow-y-auto">
          {draft ? (
            <Editor
              key={draft.id ?? "new"}
              slug={slug}
              draft={draft}
              sets={sets}
              onClose={() => setDraft(null)}
              onSaved={(id, created) => {
                toast(created ? "Question added" : "Question saved");
                setDraft(null);
                setOpenId(id);
                router.refresh();
              }}
              toast={toast}
            />
          ) : (
            open && (
              <Viewer
                key={open.id}
                q={open}
                canManage={canManage}
                onClose={() => setOpenId(null)}
                onEdit={() => setDraft(draftFrom(open, false))}
                onCopy={() => setDraft(draftFrom(open, true))}
                onDeleted={() => {
                  toast("Question deleted");
                  setOpenId(null);
                  router.refresh();
                }}
                slug={slug}
                toast={toast}
              />
            )
          )}
        </aside>
      )}
      {toasts}
    </div>
  );
}

function PanelHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
      <h2 className="text-base font-semibold text-fg truncate">{title}</h2>
      <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function Viewer({
  q,
  canManage,
  onClose,
  onEdit,
  onCopy,
  onDeleted,
  slug,
  toast,
}: {
  q: QuestionItem;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDeleted: () => void;
  slug: string;
  toast: (t: string, tone?: "ok" | "error") => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const files = Object.keys(q.starterFiles);
  return (
    <>
      <PanelHead title={q.title} onClose={onClose} />
      <div className="px-5 py-4 flex flex-col gap-4">
        <p className="text-xs text-subtle">
          {q.custom ? "Team question" : "Built in"}, {stackText(q)}, {q.minutes} min, {q.uses ? `used ${plural(q.uses, "time")}` : "not used yet"}
        </p>
        <div className="text-sm text-muted leading-relaxed">
          <MarkdownRenderer content={q.description} />
        </div>
        {q.kind === "conversation" ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-subtle">Questions the interviewer asks (candidates do not see this list)</span>
            <ol className="list-decimal pl-5 flex flex-col gap-1 text-sm text-muted">
              {questionTexts(q.testsCode).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          </div>
        ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">Starter files</span>
          <ul className="flex flex-wrap gap-1.5">
            {files.map((f) => (
              <li key={f} className="h-7 px-2 rounded-md bg-panel text-xs font-mono text-muted inline-flex items-center">
                {f.replace(/^\//, "")}
              </li>
            ))}
            {!files.length && <li className="text-[13px] text-subtle">None</li>}
          </ul>
        </div>
        )}
        {canManage && (
          <div className="flex flex-wrap gap-2 pt-1">
            {q.custom ? (
              <>
                <Btn variant="primary" onClick={onEdit}>
                  Edit
                </Btn>
                <Btn icon={Copy} onClick={onCopy}>
                  Duplicate
                </Btn>
                <Btn variant="quiet" icon={Trash2} className="ml-auto text-danger hover:text-danger" onClick={() => setConfirm(true)}>
                  Delete
                </Btn>
              </>
            ) : (
              <Btn icon={Copy} onClick={onCopy}>
                Copy to team questions to edit
              </Btn>
            )}
          </div>
        )}
      </div>
      {confirm && (
        <ConfirmDialog
          title="Delete this question?"
          body={q.uses ? `It was used ${plural(q.uses, "time")}. Screenings already sent keep their own copy of the starter code.` : "It has not been used in a screening yet."}
          confirmLabel="Delete question"
          danger
          busy={pending}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            start(async () => {
              const r = await deleteQuestionAction(slug, q.id);
              setConfirm(false);
              if (!r.ok) return toast(r.error, "error");
              onDeleted();
            })
          }
        />
      )}
    </>
  );
}

function Editor({
  slug,
  draft: initial,
  sets,
  onClose,
  onSaved,
  toast,
}: {
  slug: string;
  draft: Draft;
  sets: Sets;
  onClose: () => void;
  onSaved: (id: string, created: boolean) => void;
  toast: (t: string, tone?: "ok" | "error") => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [pending, start] = useTransition();
  const [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const convo = d.kind === "conversation";
  const langs = d.kind === "backend" ? BACKEND_LANGUAGES.map((b) => ({ id: b.id, label: b.label })) : DSA_LANGUAGES.map((l) => ({ id: l, label: DSA_LANGUAGE_LABELS[l] ?? l }));
  const bound = d.id ? sets.items.find((i) => i.id === d.id)?.boundServerIds ?? [] : [];

  function save() {
    start(async () => {
      const r = await saveQuestionAction(slug, {
        id: d.id,
        title: d.title,
        description: d.description,
        kind: d.kind,
        language: d.kind === "frontend" || convo ? undefined : d.language,
        frameworkLabel: d.frameworkLabel,
        estimatedMinutes: d.minutes,
        starterFilesJson: d.starterFilesJson,
        testsCode: convo
          ? serializeQuestionnaire(mergeEditedLines(d.testsCode, parseQuestionnaire(sets.items.find((i) => i.id === d.id)?.testsCode)))
          : d.testsCode,
      });
      if (!r.ok) return toast(r.error, "error");
      onSaved(r.id, !d.id);
    });
  }

  return (
    <>
      <PanelHead title={d.id ? "Edit question" : "New question"} onClose={onClose} />
      <div className="px-5 py-4 flex flex-col gap-4">
        <Field label="Title">
          <input value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={80} className={inputCls} placeholder="Paginated todo list" />
        </Field>
        <Field
          label={convo ? "Brief for the candidate" : "Task for the candidate"}
          hint={convo ? "Shown before the conversation starts, e.g. the role and a scenario. The AI interviewer reads this too." : "The AI interviewer reads this too."}
        >
          <textarea rows={4} value={d.description} onChange={(e) => set("description", e.target.value)} className={`${inputCls} h-auto py-2`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <select
              value={d.kind}
              onChange={(e) => {
                const kind = e.target.value;
                setD((x) => ({
                  ...x,
                  kind,
                  language: kind === "frontend" || kind === "conversation" ? "" : x.language || (kind === "backend" ? "node" : "python"),
                  frameworkLabel: kind === "conversation" && x.kind !== "conversation" ? "" : x.frameworkLabel,
                  testsCode: kind === "conversation" && x.kind !== "conversation" ? "" : x.testsCode,
                }));
              }}
              className={inputCls}
            >
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="dsa">Algorithms</option>
              <option value="conversation">Conversation (no code)</option>
            </select>
          </Field>
          <Field label="Time">
            <select value={d.minutes} onChange={(e) => set("minutes", Number(e.target.value))} className={inputCls}>
              {[10, 15, 20, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </Field>
          {d.kind !== "frontend" && !convo && (
            <Field label="Language">
              <select value={d.language} onChange={(e) => set("language", e.target.value)} className={inputCls}>
                {langs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={convo ? "Role area (optional)" : d.kind === "frontend" ? "Framework" : "Framework focus"}>
            <input
              value={d.frameworkLabel}
              onChange={(e) => set("frameworkLabel", e.target.value)}
              className={inputCls}
              placeholder={convo ? "Sales" : d.kind === "frontend" ? "React" : "Express"}
            />
          </Field>
        </div>
        {convo ? (
          <Field
            label="Questions to ask"
            hint="One per line, in order. The interviewer asks them one at a time and follows up. Candidates never see this list. To add reference answers or pick public questions, use the Question library."
          >
            <textarea
              rows={7}
              value={d.testsCode}
              onChange={(e) => set("testsCode", e.target.value)}
              className={`${inputCls} h-auto py-2`}
              placeholder={"Tell me about a deal you lost and what you learned.\nHow do you plan your week when the pipeline is thin?\nA customer asks for a discount you cannot give. What do you say?"}
            />
          </Field>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-subtle">Starter files</span>
            <MonacoFileEditor value={d.starterFilesJson} onChange={(v) => set("starterFilesJson", v)} emptyHint="No starter files yet. Add one with +." height={300} />
          </div>
        )}
        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="self-start text-[13px] text-secondary-soft hover:underline">
          {advanced ? "Hide advanced" : convo ? "Advanced: external tools" : "Advanced: grading hints and external tools"}
        </button>
        {advanced && (
          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            {!convo && (
              <Field label="Grading hints or tests (optional)" hint="Given to the AI grader. Candidates never see it.">
                <textarea rows={4} value={d.testsCode} onChange={(e) => set("testsCode", e.target.value)} className={`${inputCls} h-auto py-2 font-mono text-[12.5px]`} />
              </Field>
            )}
            <ServerBindings slug={slug} questionId={d.id} bound={bound} sets={sets} toast={toast} />
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={pending || !d.title.trim() || !d.description.trim() || (convo && !d.testsCode.trim())} onClick={save}>
          {pending ? "Saving" : d.id ? "Save changes" : "Add question"}
        </Btn>
      </div>
    </>
  );
}

function ServerBindings({
  slug,
  questionId,
  bound,
  sets,
  toast,
}: {
  slug: string;
  questionId?: string;
  bound: string[];
  sets: Sets;
  toast: (t: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [on, setOn] = useState<string[]>(bound);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-subtle">External MCP servers the interviewer may call</span>
      {!sets.allowExternalMcp && <p className="text-[13px] text-warning">External tools are turned off for this workspace, so these have no effect until an admin turns them on.</p>}
      {!questionId ? (
        <p className="text-[13px] text-subtle">Save the question first, then choose servers.</p>
      ) : !sets.servers.length ? (
        <p className="text-[13px] text-subtle">No servers are turned on. Add one under External MCP.</p>
      ) : (
        sets.servers.map((s) => (
          <label key={s.id} className="flex items-center gap-2.5 text-sm text-fg">
            <input
              type="checkbox"
              disabled={pending}
              checked={on.includes(s.id)}
              onChange={(e) => {
                const want = e.target.checked;
                setOn((a) => (want ? [...a, s.id] : a.filter((x) => x !== s.id)));
                start(async () => {
                  const r = await setQuestionServerAction(slug, questionId, s.id, want);
                  if (!r.ok) {
                    setOn((a) => (want ? a.filter((x) => x !== s.id) : [...a, s.id]));
                    return toast(r.error, "error");
                  }
                  router.refresh();
                });
              }}
              className="w-4 h-4 accent-secondary"
            />
            {s.name}
          </label>
        ))
      )}
    </div>
  );
}
