"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BarChart3, Layers, MoreHorizontal, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { TAKE_HOME_PASS, type TemplateItem } from "@/lib/take-home/status";
import { plural } from "@/lib/workspace/display";
import { Btn, Dialog, Field, Menu, MenuItem, inputCls, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { deleteTemplateAction, saveTemplateAction } from "../actions";
import { QuestionPicker, type ComposerQuestion } from "./Composer";

export type TemplateCard = {
  id: string;
  name: string;
  items: (TemplateItem & { title: string; missing: boolean })[];
  sent: number;
  finished: number;
  average: number | null;
};

const MINUTE_STEPS = [15, 20, 30, 45, 60, 90, 120, 180, 240];
const selectCls = inputCls.replace("w-full", "");

export default function Templates({
  slug,
  templates,
  questions,
  canCreate,
}: {
  slug: string;
  templates: TemplateCard[];
  questions: ComposerQuestion[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const base = `/w/${slug}/take-homes`;
  const [editing, setEditing] = useState<TemplateCard | "new" | null>(null);
  const [deleting, setDeleting] = useState<TemplateCard | null>(null);
  const [pending, start] = useTransition();
  const [toasts, toast] = useToasts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Templates are saved question sets. Send one in two clicks, or change it before sending.</p>
        {canCreate && (
          <Btn icon={Plus} onClick={() => setEditing("new")}>
            New template
          </Btn>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t, i) => {
          const minutes = t.items.reduce((n, x) => n + x.minutes, 0);
          return (
            <article
              key={t.id}
              className="group flex flex-col rounded-xl border border-border bg-surface hover:border-border-strong transition-colors animate-slide-up motion-reduce:animate-none"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
            >
              <header className="flex items-start gap-3 px-5 pt-5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-fg truncate">{t.name}</h3>
                  <p className="text-[13px] text-subtle">
                    {plural(t.items.length, "question")}, {minutes} min
                  </p>
                </div>
                {canCreate && (
                  <Menu
                    align="right"
                    width={180}
                    label={`Actions for ${t.name}`}
                    trigger={(p) => (
                      <button {...p} type="button" aria-label={`More actions for ${t.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem onClick={() => (close(), setEditing(t))}>
                          <Pencil className="w-3.5 h-3.5 text-muted" /> Edit
                        </MenuItem>
                        <MenuItem danger onClick={() => (close(), setDeleting(t))}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                )}
              </header>
              <ol className="flex flex-col gap-1.5 px-5 py-4">
                {t.items.map((x, n) => (
                  <li key={x.challengeId} className="flex items-center gap-2.5 text-[13px]">
                    <span className="w-5 h-5 shrink-0 rounded bg-panel text-[11px] text-muted flex items-center justify-center tabular-nums">{n + 1}</span>
                    <span className={`flex-1 truncate ${x.missing ? "text-danger" : "text-fg"}`}>{x.title}</span>
                    <span className="text-subtle tabular-nums">{x.minutes} min</span>
                  </li>
                ))}
              </ol>
              <dl className="grid grid-cols-3 border-t border-border mt-auto">
                <Stat label="sent" value={String(t.sent)} />
                <Stat label="finished" value={String(t.finished)} />
                <Stat label="average" value={t.average == null ? "None" : String(t.average)} warn={t.average != null && t.average < TAKE_HOME_PASS} />
              </dl>
              <footer className="flex flex-wrap gap-2 px-5 py-3.5 border-t border-border">
                {canCreate && (
                  <Btn variant="primary" icon={Send} href={`${base}/new?template=${t.id}`}>
                    Send
                  </Btn>
                )}
                {canCreate && (
                  <Btn icon={Pencil} onClick={() => setEditing(t)}>
                    Edit
                  </Btn>
                )}
                {t.finished > 0 && (
                  <Btn icon={BarChart3} href={`${base}/all?template=${t.id}`} className="ml-auto">
                    Compare results
                  </Btn>
                )}
              </footer>
            </article>
          );
        })}

        <div className="flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface/40 px-6 py-10 min-h-[240px]">
          <Layers className="w-6 h-6 text-subtle" aria-hidden />
          <p className="text-[15px] font-medium text-fg">{templates.length ? "Make another template" : "No templates yet"}</p>
          <p className="text-[13px] text-muted max-w-xs">
            Pick coding challenges, set the minutes for each, and save them. You can also tick Save as a template when you send a take home.
          </p>
          {canCreate && (
            <Btn icon={Plus} onClick={() => setEditing("new")} className="mt-2">
              New template
            </Btn>
          )}
        </div>
      </div>

      {editing && (
        <TemplateEditor
          initial={editing === "new" ? null : editing}
          questions={questions}
          busy={pending}
          onCancel={() => setEditing(null)}
          onSave={(input) =>
            start(async () => {
              const res = await saveTemplateAction(slug, input);
              if (!res.ok) return toast(res.error, "error");
              setEditing(null);
              toast(input.id ? "Template saved" : "Template created");
              router.refresh();
            })
          }
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body={
            deleting.sent
              ? `The ${plural(deleting.sent, "take home")} already sent from it keep their questions and results. You will no longer be able to compare them as a group.`
              : "It has not been sent to anyone yet."
          }
          confirmLabel="Delete template"
          danger
          busy={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            start(async () => {
              const res = await deleteTemplateAction(slug, deleting.id);
              if (!res.ok) return toast(res.error, "error");
              setDeleting(null);
              toast("Template deleted");
              router.refresh();
            })
          }
        />
      )}
      {toasts}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center py-3 border-l border-border first:border-l-0">
      <dd className={`text-[17px] font-semibold tabular-nums ${warn ? "text-warning" : "text-fg"}`}>{value}</dd>
      <dt className="text-xs text-subtle">{label}</dt>
    </div>
  );
}

function TemplateEditor({
  initial,
  questions,
  busy,
  onCancel,
  onSave,
}: {
  initial: TemplateCard | null;
  questions: ComposerQuestion[];
  busy: boolean;
  onCancel: () => void;
  onSave: (input: { id: string | null; name: string; items: TemplateItem[] }) => void;
}) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState<TemplateItem[]>(initial?.items.filter((x) => !x.missing).map(({ challengeId, minutes }) => ({ challengeId, minutes })) ?? []);
  const [picking, setPicking] = useState(false);
  const move = (i: number, d: -1 | 1) =>
    setItems((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  if (picking) {
    return (
      <QuestionPicker
        questions={questions}
        chosen={new Set(items.map((i) => i.challengeId))}
        onToggle={(q) =>
          setItems((list) => (list.some((i) => i.challengeId === q.id) ? list.filter((i) => i.challengeId !== q.id) : [...list, { challengeId: q.id, minutes: q.minutes }]))
        }
        onClose={() => setPicking(false)}
      />
    );
  }

  return (
    <Dialog
      title={initial ? `Edit ${initial.name}` : "New template"}
      onClose={onCancel}
      width={560}
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted tabular-nums">{items.reduce((n, i) => n + i.minutes, 0)} min in total</span>
          <Btn size="md" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn size="md" variant="primary" disabled={busy || !name.trim() || !items.length} onClick={() => onSave({ id: initial?.id ?? null, name, items })}>
            {busy ? "Saving" : initial ? "Save template" : "Create template"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" hint="Usually the role, like Senior Frontend Engineer.">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} placeholder="Senior Frontend Engineer" data-autofocus />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-subtle">Questions</span>
          {items.length === 0 && <p className="rounded-lg border border-dashed border-border-strong px-4 py-5 text-center text-[13px] text-muted">No questions yet.</p>}
          {items.map((it, i) => (
            <div key={it.challengeId} className="flex items-center gap-2 rounded-lg border border-border bg-bg/60 px-3 py-2">
              <span className="flex-1 min-w-0 text-[13px] text-fg truncate">{byId.get(it.challengeId)?.title ?? "Unknown question"}</span>
              <label className="sr-only" htmlFor={`tpl-min-${it.challengeId}`}>
                Minutes
              </label>
              <select
                id={`tpl-min-${it.challengeId}`}
                value={it.minutes}
                onChange={(e) => setItems((list) => list.map((x) => (x.challengeId === it.challengeId ? { ...x, minutes: Number(e.target.value) } : x)))}
                className={`${selectCls} w-[92px] h-8`}
              >
                {[...new Set([...MINUTE_STEPS, it.minutes])]
                  .sort((a, b) => a - b)
                  .map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
              </select>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-panel disabled:opacity-30">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Remove" onClick={() => setItems((list) => list.filter((x) => x.challengeId !== it.challengeId))} className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Btn icon={Plus} onClick={() => setPicking(true)} className="self-start">
            Add questions
          </Btn>
        </div>
      </div>
    </Dialog>
  );
}
