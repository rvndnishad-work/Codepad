"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Copy, GripVertical, Sparkles, Undo2 } from "lucide-react";
import { DIFFICULTY_ORDER, type DifficultyKey } from "@/lib/interview-questions/topic-catalog";
import { compactNumber } from "@/lib/interview-questions/shared";
import { saveTopicOrder, suggestBandOrder } from "./actions";

type Row = { slug: string; title: string; views: number; ordered: boolean };
type Bands = Record<DifficultyKey, Row[]>;

const LABEL: Record<DifficultyKey, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const TONE: Record<DifficultyKey, string> = {
  easy: "text-emerald-700 dark:text-emerald-400",
  medium: "text-amber-700 dark:text-amber-400",
  hard: "text-rose-700 dark:text-rose-400",
};

function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Drag, nudge or AI-suggest the order of each difficulty band, then save. */
export default function OrderEditor({ tech, initial }: { tech: string; initial: Bands }) {
  const [bands, setBands] = useState<Bands>(initial);
  const [drag, setDrag] = useState<{ band: DifficultyKey; index: number } | null>(null);
  const [over, setOver] = useState<{ band: DifficultyKey; index: number } | null>(null);
  const [busy, setBusy] = useState<DifficultyKey | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, startSave] = useTransition();

  const dirty = useMemo(
    () => DIFFICULTY_ORDER.some((d) => bands[d].some((r, i) => r.slug !== initial[d][i]?.slug || !r.ordered)),
    [bands, initial],
  );

  const update = (band: DifficultyKey, rows: Row[]) => setBands((b) => ({ ...b, [band]: rows }));

  const onDrop = (band: DifficultyKey, index: number) => {
    if (!drag || drag.band !== band) return;
    update(band, move(bands[band], drag.index, index));
    setDrag(null);
    setOver(null);
  };

  const suggest = async (band: DifficultyKey) => {
    setBusy(band);
    setNotice(null);
    const res = await suggestBandOrder(tech, band, bands[band].map((r) => ({ slug: r.slug, title: r.title })));
    setBusy(null);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error });
      return;
    }
    const bySlug = new Map(bands[band].map((r) => [r.slug, r]));
    update(band, res.slugs.map((s) => bySlug.get(s)!).filter(Boolean));
    setNotice({ kind: "ok", text: `${LABEL[band]} reordered by the model. Review it, then save.` });
  };

  const copy = async () => {
    const text = DIFFICULTY_ORDER.map((d) => `## ${LABEL[d]}\n` + bands[d].map((r, i) => `${i + 1}. ${r.title} (${r.slug})`).join("\n")).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ kind: "ok", text: "Current order copied as text." });
    } catch {
      setNotice({ kind: "error", text: "Could not copy to the clipboard." });
    }
  };

  const save = () =>
    startSave(async () => {
      const res = await saveTopicOrder(tech, {
        easy: bands.easy.map((r) => r.slug),
        medium: bands.medium.map((r) => r.slug),
        hard: bands.hard.map((r) => r.slug),
      });
      if (res.ok) {
        setBands((b) => {
          const next = { ...b };
          for (const d of DIFFICULTY_ORDER) next[d] = b[d].map((r) => ({ ...r, ordered: true }));
          return next;
        });
      }
      setNotice(res.ok ? { kind: "ok", text: res.message ?? "Saved." } : { kind: "error", text: res.error });
    });

  const total = DIFFICULTY_ORDER.reduce((n, d) => n + bands[d].length, 0);
  const unordered = DIFFICULTY_ORDER.reduce((n, d) => n + bands[d].filter((r) => !r.ordered).length, 0);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/95 px-3 py-2 backdrop-blur">
        <p className="text-xs text-muted">
          {total} published · {unordered > 0 ? `${unordered} not ordered yet (sorted by views)` : "every question ordered"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {notice && <span className={`text-xs font-semibold ${notice.kind === "ok" ? "text-success" : "text-danger"}`}>{notice.text}</span>}
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent/40">
            <Copy className="h-3.5 w-3.5" /> Copy as text
          </button>
          <button
            type="button"
            onClick={() => { setBands(initial); setNotice(null); }}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent/40 disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-bg hover:bg-accent-soft disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>

      {DIFFICULTY_ORDER.map((band) => (
        <section key={band} className="overflow-hidden rounded-2xl border border-border">
          <header className="flex items-center justify-between gap-3 bg-bg/50 px-4 py-2.5">
            <h2 className={`text-xs font-bold uppercase tracking-wider ${TONE[band]}`}>
              {LABEL[band]} <span className="font-mono text-subtle">· {bands[band].length}</span>
            </h2>
            <button
              type="button"
              onClick={() => suggest(band)}
              disabled={busy !== null || bands[band].length < 2}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:border-accent/40 disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" /> {busy === band ? "Thinking…" : "Suggest a teaching order"}
            </button>
          </header>
          {bands[band].length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No published {LABEL[band].toLowerCase()} questions in this topic.</p>
          ) : (
            <ol className="divide-y divide-border">
              {bands[band].map((row, i) => {
                const isOver = over?.band === band && over.index === i && drag?.index !== i;
                return (
                  <li
                    key={row.slug}
                    draggable
                    onDragStart={() => setDrag({ band, index: i })}
                    onDragOver={(e) => { e.preventDefault(); if (drag?.band === band) setOver({ band, index: i }); }}
                    onDragLeave={() => setOver((o) => (o?.index === i ? null : o))}
                    onDrop={() => onDrop(band, i)}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm ${isOver ? "bg-accent/10" : "hover:bg-panel"} ${drag?.band === band && drag.index === i ? "opacity-50" : ""}`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-subtle" aria-hidden />
                    <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-subtle">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{row.title}</span>
                    {!row.ordered && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-subtle">new</span>}
                    <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-subtle sm:block">{compactNumber(row.views)} views</span>
                    <span className="flex shrink-0 items-center">
                      <Nudge title="Move to top" disabled={i === 0} onClick={() => update(band, move(bands[band], i, 0))}><ChevronsUp className="h-3.5 w-3.5" /></Nudge>
                      <Nudge title="Move up" disabled={i === 0} onClick={() => update(band, move(bands[band], i, i - 1))}><ArrowUp className="h-3.5 w-3.5" /></Nudge>
                      <Nudge title="Move down" disabled={i === bands[band].length - 1} onClick={() => update(band, move(bands[band], i, i + 1))}><ArrowDown className="h-3.5 w-3.5" /></Nudge>
                      <Nudge title="Move to bottom" disabled={i === bands[band].length - 1} onClick={() => update(band, move(bands[band], i, bands[band].length - 1))}><ChevronsDown className="h-3.5 w-3.5" /></Nudge>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}

function Nudge({ title, disabled, onClick, children }: { title: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className="rounded-md p-1 text-muted hover:bg-bg hover:text-fg disabled:opacity-30">
      {children}
    </button>
  );
}
