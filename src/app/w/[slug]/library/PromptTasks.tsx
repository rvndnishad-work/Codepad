"use client";

/**
 * Prompt tasks in the Question library: the scenario catalogue (built in and
 * the team's own) and the graded attempts.
 */
import { useMemo, useState, useTransition } from "react";
import { Brain, Clock, Copy, Eye, MoreHorizontal, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { humanize, plural } from "@/lib/workspace/display";
import { Btn, Dialog, Field, Menu, MenuItem, fmtDate, inputCls, useToasts } from "../candidates/_components/ui";
import { ConfirmDialog } from "../candidates/_components/dialogs";
import { DIFFICULTY_TONE } from "./PublicBrowser";

export type PromptScenario = {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  expectedTraits: string;
  difficulty: string;
  category: string;
  estimatedMinutes: number;
  workspaceId: string | null;
  published: boolean;
};

export type PromptAttemptItem = {
  id: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null;
  feedback: string | null;
  graderType: string | null;
  sessionId: string | null;
  userId: string | null;
  durationSec: number | null;
  createdAt: string;
  scenarioTitle: string;
  scenarioCategory: string;
  scenarioDifficulty: string;
  /** Who wrote it: the session candidate, else the signed-in user. */
  candidateName: string | null;
};

const CATEGORIES = [
  ["code-generation", "Code generation"],
  ["debugging", "Debugging"],
  ["api-design", "API design"],
  ["data-analysis", "Data analysis"],
  ["system-design", "System design"],
  ["creative", "Writing and docs"],
] as const;
const LEVELS = [
  ["beginner", "Beginner", "easy"],
  ["intermediate", "Intermediate", "medium"],
  ["advanced", "Advanced", "hard"],
] as const;
const selectCls = `${inputCls.replace("w-full", "")} w-auto`;

const categoryLabel = (c: string) => CATEGORIES.find(([id]) => id === c)?.[1] ?? humanize(c);
const scoreTone = (s: number) => (s >= 75 ? "success" : s >= 50 ? "warning" : "danger");
const TONE_TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger" } as const;
const TONE_BG = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" } as const;

function LevelChip({ value }: { value: string }) {
  const tone = LEVELS.find(([id]) => id === value)?.[2];
  return (
    <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[12px] font-medium ${tone ? DIFFICULTY_TONE[tone] : "text-muted border-border"}`}>{humanize(value)}</span>
  );
}

type Traits = { keywords: string[]; format: string; constraints: string[] };
function parseTraits(raw: string): Traits {
  try {
    const t = JSON.parse(raw) as Partial<Traits>;
    return { keywords: Array.isArray(t.keywords) ? t.keywords : [], format: typeof t.format === "string" ? t.format : "", constraints: Array.isArray(t.constraints) ? t.constraints : [] };
  } catch {
    return { keywords: [], format: "", constraints: [] };
  }
}

export default function PromptTasks({
  workspace,
  canManage,
  promptScenarios,
  promptAttempts,
}: {
  workspace: { id: string; slug: string };
  canManage: boolean;
  promptScenarios: PromptScenario[];
  promptAttempts: PromptAttemptItem[];
}) {
  const [view, setView] = useState<"scenarios" | "attempts">("scenarios");
  const [scenarios, setScenarios] = useState<PromptScenario[]>(promptScenarios);
  const [toasts, toast] = useToasts();

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Prompt task views" className="self-start inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5">
        {(
          [
            ["scenarios", "Scenarios", scenarios.length],
            ["attempts", "Attempts", promptAttempts.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium transition ${view === id ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
          >
            {label}
            <span className={`text-xs tabular-nums ${view === id ? "text-secondary-soft" : "text-subtle"}`}>{n}</span>
          </button>
        ))}
      </div>
      {view === "scenarios" ? (
        <Scenarios workspaceId={workspace.id} canManage={canManage} scenarios={scenarios} setScenarios={setScenarios} toast={toast} />
      ) : (
        <Attempts attempts={promptAttempts} toast={toast} />
      )}
      {toasts}
    </div>
  );
}

/* ── Scenarios ──────────────────────────────────────────────────────────── */

function Scenarios({
  workspaceId,
  canManage,
  scenarios,
  setScenarios,
  toast,
}: {
  workspaceId: string;
  canManage: boolean;
  scenarios: PromptScenario[];
  setScenarios: React.Dispatch<React.SetStateAction<PromptScenario[]>>;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState<"all" | "team" | "builtin">("all");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<PromptScenario | "new" | null>(null);
  const [viewing, setViewing] = useState<PromptScenario | null>(null);
  const [deleting, setDeleting] = useState<PromptScenario | null>(null);
  const [busy, start] = useTransition();

  const team = scenarios.filter((s) => s.workspaceId).length;
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return scenarios.filter(
      (s) =>
        (owner === "all" || (owner === "team") === !!s.workspaceId) &&
        (!level || s.difficulty === level) &&
        (!category || s.category === category) &&
        (!term || s.title.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)),
    );
  }, [scenarios, q, owner, level, category]);

  function remove(s: PromptScenario) {
    start(async () => {
      const res = await fetch(`/api/prompt-challenges/${s.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return toast(data?.error ?? "Could not delete the scenario.", "error");
      }
      setScenarios((all) => all.filter((x) => x.id !== s.id));
      setDeleting(null);
      toast("Scenario deleted");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search scenarios" aria-label="Search scenarios" className={`${inputCls} pl-8`} />
        </div>
        <div role="radiogroup" aria-label="Owner" className="inline-flex h-9 rounded-lg border border-border bg-surface p-0.5">
          {(
            [
              ["all", "All", scenarios.length],
              ["team", "Your team", team],
              ["builtin", "Built in", scenarios.length - team],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={owner === id}
              onClick={() => setOwner(id)}
              className={`px-2.5 rounded-md text-[13px] inline-flex items-center gap-1.5 ${owner === id ? "bg-panel text-fg font-medium" : "text-muted hover:text-fg"}`}
            >
              {label}
              <span className="text-xs text-subtle tabular-nums">{n}</span>
            </button>
          ))}
        </div>
        <select aria-label="Level" value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
          <option value="">Any level</option>
          {LEVELS.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          <option value="">Any category</option>
          {CATEGORIES.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        {canManage && (
          <Btn variant="primary" size="md" icon={Plus} onClick={() => setEditing("new")}>
            New scenario
          </Btn>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center flex flex-col items-center gap-2">
          <Brain className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-sm font-medium text-fg">{scenarios.length ? "No scenarios match these filters" : "No prompt scenarios yet"}</p>
          <p className="text-[13px] text-muted max-w-sm">Write one for your team: describe the situation, what the prompt must achieve, and what a good prompt includes.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((s, i) => {
            const mine = !!s.workspaceId;
            return (
              <li
                key={s.id}
                className="group relative focus-within:z-20 min-w-0 flex flex-col rounded-xl border border-border bg-surface hover:border-border-strong hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition duration-200 animate-slide-up motion-reduce:animate-none motion-reduce:hover:translate-y-0"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-center gap-1.5 px-5 pt-5">
                  <LevelChip value={s.difficulty} />
                  <span className="inline-flex items-center h-5 px-1.5 rounded bg-panel text-[12px] text-muted">{categoryLabel(s.category)}</span>
                  <span className="flex-1" />
                  <span className={`text-xs ${mine ? "text-secondary-soft" : "text-subtle"}`}>{mine ? "Your team" : "Built in"}</span>
                </div>
                <h3 className="px-5 mt-3 text-[15px] font-semibold text-fg">
                  <button type="button" onClick={() => setViewing(s)} className="text-left hover:text-secondary-soft focus-visible:outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-secondary/60">
                    {s.title}
                  </button>
                </h3>
                <p className="px-5 mt-1.5 text-[13px] text-muted line-clamp-2">{s.description}</p>
                <div className="relative z-10 flex items-center gap-2 px-5 py-3 mt-4 border-t border-border">
                  <span className="inline-flex items-center gap-1 text-xs text-subtle flex-1">
                    <Clock className="w-3 h-3" aria-hidden /> About {s.estimatedMinutes} min
                  </span>
                  <Btn variant="quiet" icon={Eye} onClick={() => setViewing(s)}>
                    View
                  </Btn>
                  {mine && canManage && (
                    <Menu
                      align="right"
                      width={170}
                      label={`Actions for ${s.title}`}
                      trigger={(p) => (
                        <button type="button" {...p} aria-label={`More actions for ${s.title}`} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-panel">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem onClick={() => (close(), setEditing(s))}>
                            <Pencil className="w-3.5 h-3.5 text-muted" /> Edit
                          </MenuItem>
                          <MenuItem danger onClick={() => (close(), setDeleting(s))}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewing && (
        <ScenarioView
          scenario={viewing}
          canEdit={canManage && !!viewing.workspaceId}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}
      {editing && (
        <ScenarioForm
          workspaceId={workspaceId}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(s, created) => {
            setScenarios((all) => (created ? [s, ...all] : all.map((x) => (x.id === s.id ? { ...x, ...s } : x))));
            setEditing(null);
            toast(created ? "Scenario created" : "Changes saved");
          }}
          toast={toast}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.title}?`}
          body="Attempts already graded keep their scores. This cannot be undone."
          confirmLabel="Delete scenario"
          danger
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </div>
  );
}

function ScenarioView({ scenario: s, canEdit, onClose, onEdit }: { scenario: PromptScenario; canEdit: boolean; onClose: () => void; onEdit: () => void }) {
  const t = parseTraits(s.expectedTraits);
  return (
    <Dialog
      title={s.title}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn size="md" onClick={onClose}>
            Close
          </Btn>
          {canEdit && (
            <Btn size="md" variant="primary" icon={Pencil} onClick={onEdit}>
              Edit
            </Btn>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
          <LevelChip value={s.difficulty} />
          <span className="inline-flex items-center h-5 px-1.5 rounded bg-panel text-[12px] text-muted">{categoryLabel(s.category)}</span>
          <span>About {s.estimatedMinutes} min</span>
          <span aria-hidden>·</span>
          <span>{s.workspaceId ? "Your team" : "Built in"}</span>
        </div>
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-subtle">The situation</h3>
          <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">{s.description}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-subtle">What the prompt must achieve</h3>
          <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">{s.objective}</p>
        </section>
        {(t.keywords.length > 0 || t.format || t.constraints.length > 0) && (
          <section className="rounded-xl border border-border bg-bg/50 p-4 flex flex-col gap-3">
            <h3 className="text-xs font-medium text-subtle">What the grader looks for</h3>
            {t.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {t.keywords.map((k) => (
                  <span key={k} className="inline-flex items-center h-6 px-2 rounded-md bg-secondary/10 text-secondary-soft text-xs">
                    {k}
                  </span>
                ))}
              </div>
            )}
            {t.format && <p className="text-[13px] text-muted">Output format: {t.format}</p>}
            {t.constraints.length > 0 && (
              <ul className="list-disc pl-5 text-[13px] text-muted flex flex-col gap-0.5">
                {t.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Dialog>
  );
}

function ScenarioForm({
  workspaceId,
  initial,
  onClose,
  onSaved,
  toast,
}: {
  workspaceId: string;
  initial: PromptScenario | null;
  onClose: () => void;
  onSaved: (s: PromptScenario, created: boolean) => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const traits = parseTraits(initial?.expectedTraits ?? "{}");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [category, setCategory] = useState(initial?.category ?? "code-generation");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "intermediate");
  const [minutes, setMinutes] = useState(String(initial?.estimatedMinutes ?? 10));
  const [keywords, setKeywords] = useState(traits.keywords.join(", "));
  const [format, setFormat] = useState(traits.format);
  const [constraints, setConstraints] = useState(traits.constraints.join("\n"));
  const [busy, start] = useTransition();
  const ready = title.trim() && description.trim() && objective.trim();

  function submit() {
    if (!ready) return toast("Fill in the title, the situation and the goal.", "error");
    start(async () => {
      const body = {
        title: title.trim(),
        description: description.trim(),
        objective: objective.trim(),
        expectedTraits: {
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          format: format.trim(),
          constraints: constraints.split("\n").map((c) => c.trim()).filter(Boolean),
        },
        difficulty,
        category,
        estimatedMinutes: Math.min(120, Math.max(1, parseInt(minutes, 10) || 10)),
        ...(initial ? {} : { workspaceId }),
      };
      const res = await fetch(initial ? `/api/prompt-challenges/${initial.id}` : "/api/prompt-challenges", {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.scenario) return toast(data?.error ?? "Could not save the scenario.", "error");
      onSaved(data.scenario as PromptScenario, !initial);
    });
  }

  return (
    <Dialog
      title={initial ? "Edit prompt scenario" : "New prompt scenario"}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn size="md" onClick={onClose}>
            Cancel
          </Btn>
          <Btn size="md" variant="primary" disabled={busy || !ready} onClick={submit}>
            {busy ? "Saving" : initial ? "Save changes" : "Create scenario"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Write a prompt that generates an API spec" className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
              {LEVELS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Minutes">
            <input type="number" min={1} max={120} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="The situation" hint="The background the candidate needs. Markdown works.">
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-auto py-2 leading-relaxed`} />
        </Field>
        <Field label="What the prompt must achieve">
          <textarea rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} className={`${inputCls} h-auto py-2 leading-relaxed`} />
        </Field>
        <div className="rounded-xl border border-border bg-bg/40 p-4 flex flex-col gap-4">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
            <Sparkles className="w-3.5 h-3.5 text-secondary-soft" aria-hidden /> Grading hints <span className="text-subtle font-normal">optional</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Words a good prompt mentions" hint="Separate with commas.">
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="pagination, error states, TypeScript" className={inputCls} />
            </Field>
            <Field label="Output format">
              <input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="JSON" className={inputCls} />
            </Field>
          </div>
          <Field label="Things the prompt should rule out" hint="One per line.">
            <textarea rows={3} value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder={"No external styling libraries\nNo inline styles"} className={`${inputCls} h-auto py-2`} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

/* ── Attempts ───────────────────────────────────────────────────────────── */

function Attempts({ attempts, toast }: { attempts: PromptAttemptItem[]; toast: (text: string, tone?: "ok" | "error") => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<PromptAttemptItem | null>(null);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return attempts.filter((a) => !term || (a.candidateName ?? "practice").toLowerCase().includes(term) || a.scenarioTitle.toLowerCase().includes(term));
  }, [attempts, q]);
  const graded = attempts.filter((a) => a.score != null);
  const avg = graded.length ? Math.round(graded.reduce((n, a) => n + (a.score ?? 0), 0) / graded.length) : null;

  if (!attempts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center flex flex-col items-center gap-2">
        <Brain className="w-6 h-6 text-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg">No attempts yet</p>
        <p className="text-[13px] text-muted max-w-sm">When candidates finish a prompt task in an interview or a take home, their prompt and score show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidate or scenario" aria-label="Search attempts" className={`${inputCls} pl-8`} />
        </div>
        <span className="text-[13px] text-muted">
          {plural(attempts.length, "attempt")}
          {avg != null ? `, average ${avg}` : ""}
        </span>
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[720px]">
          <thead>
            <tr className="border-b border-border text-xs text-subtle">
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Scenario</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Length</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((a) => {
              const tone = a.score != null ? scoreTone(a.score) : null;
              return (
                <tr key={a.id} className="hover:bg-panel/40 transition-colors cursor-pointer" onClick={() => setOpen(a)}>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-fg">{a.candidateName ?? "Practice user"}</span>
                    <span className="text-xs text-subtle">{a.sessionId ? "Interview or take home" : "Practice"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-fg">{a.scenarioTitle}</span>
                    <span className="text-xs text-subtle">
                      {categoryLabel(a.scenarioCategory)}, {humanize(a.scenarioDifficulty).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tone ? (
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-7 text-right font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{a.score}</span>
                        <span className="w-16 h-1 rounded-full bg-panel" aria-hidden>
                          <span className={`block h-1 rounded-full ${TONE_BG[tone]}`} style={{ width: `${Math.max(3, a.score ?? 0)}%` }} />
                        </span>
                      </span>
                    ) : (
                      <span className="text-subtle">Not graded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums">{a.tokenEstimate.toLocaleString("en")} tokens</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(a.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Btn
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(a);
                      }}
                    >
                      Review
                    </Btn>
                  </td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No attempts match {q ? `"${q}"` : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {open && <AttemptView attempt={open} onClose={() => setOpen(null)} toast={toast} />}
    </div>
  );
}

const RUBRIC: [string, string][] = [
  ["clarity", "Clarity"],
  ["specificity", "Specificity"],
  ["efficiency", "Efficiency"],
  ["context", "Context"],
  ["constraints", "Constraints"],
  ["edgeCases", "Edge cases"],
];

function AttemptView({ attempt: a, onClose, toast }: { attempt: PromptAttemptItem; onClose: () => void; toast: (text: string, tone?: "ok" | "error") => void }) {
  let rubric: Record<string, number> = {};
  try {
    rubric = a.rubricScores ? (JSON.parse(a.rubricScores) as Record<string, number>) : {};
  } catch {
    rubric = {};
  }
  const tone = a.score != null ? scoreTone(a.score) : null;
  return (
    <Dialog title={`${a.candidateName ?? "Practice user"}, ${a.scenarioTitle}`} onClose={onClose} width={760}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div className="rounded-xl border border-border bg-bg/50 p-4 flex flex-col items-center justify-center text-center gap-1">
            <span className="text-xs text-subtle">Score</span>
            <span className={`text-4xl font-semibold tabular-nums ${tone ? TONE_TEXT[tone] : "text-subtle"}`}>{a.score ?? "None"}</span>
            <span className="text-xs text-subtle">
              {a.durationSec ? `${Math.max(1, Math.round(a.durationSec / 60))} min` : "Untimed"}, {a.graderType === "ai" ? "AI grader" : "rules grader"}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-bg/50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {RUBRIC.map(([key, label]) => {
              const v = Number(rubric[key] ?? 0);
              return (
                <div key={key} className="flex flex-col gap-1">
                  <span className="flex justify-between text-xs">
                    <span className="text-muted">{label}</span>
                    <span className="text-fg tabular-nums">{v}</span>
                  </span>
                  <span className="h-1.5 rounded-full bg-panel overflow-hidden" aria-hidden>
                    <span className={`block h-full rounded-full ${TONE_BG[scoreTone(v)]}`} style={{ width: `${v}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {a.feedback && (
          <section className="rounded-xl border border-secondary/25 bg-secondary/[0.05] p-4 flex flex-col gap-1.5">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-secondary-soft">
              <Sparkles className="w-3.5 h-3.5" aria-hidden /> Grader feedback
            </h3>
            <p className="text-[13px] text-muted leading-relaxed whitespace-pre-wrap">{a.feedback}</p>
          </section>
        )}
        <section className="flex flex-col gap-2">
          <div className="flex items-center">
            <h3 className="text-xs font-medium text-subtle flex-1">The prompt they wrote</h3>
            <Btn
              variant="quiet"
              icon={Copy}
              onClick={() => {
                navigator.clipboard?.writeText(a.promptText);
                toast("Prompt copied");
              }}
            >
              Copy
            </Btn>
          </div>
          <pre className="font-mono text-xs text-fg leading-relaxed bg-bg border border-border rounded-lg p-4 max-h-[260px] overflow-y-auto whitespace-pre-wrap">{a.promptText}</pre>
        </section>
      </div>
    </Dialog>
  );
}
