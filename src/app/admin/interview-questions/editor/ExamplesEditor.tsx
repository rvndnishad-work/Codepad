"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Trash2, Plus, Braces, Play } from "lucide-react";
import CodeMirrorField, { type CodeLanguage } from "./CodeMirrorField";
import JsonField, { validateJson } from "./JsonField";
import { CODE_VARIANTS } from "@/lib/interview-questions/code-variants";

/**
 * Structured editor for PrepQuestion.examplesData. The common single-snippet
 * shape ({ label, tech, code, runnable }) gets a proper form + code editor;
 * anything richer (multi-variant, multi-file) keeps a per-entry JSON editor so
 * no shape the question page understands is un-editable here.
 */

export type ExampleItem =
  | { id: string; kind: "simple"; label: string; tech: string; runnable: boolean; code: string }
  | { id: string; kind: "advanced"; raw: string };

let nextId = 1;
const genId = () => `ex-${nextId++}`;

const SIMPLE_KEYS = new Set(["label", "tech", "code", "runnable"]);

/** Parse the stored/pretty JSON into editor items. Invalid JSON → advanced blob. */
export function parseExamples(raw: string): ExampleItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [{ id: genId(), kind: "advanced", raw: trimmed }];
  }
  if (!Array.isArray(parsed)) return [{ id: genId(), kind: "advanced", raw: trimmed }];
  return parsed.map((entry): ExampleItem => {
    const isSimple =
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      typeof (entry as Record<string, unknown>).code === "string" &&
      Object.keys(entry).every((k) => SIMPLE_KEYS.has(k));
    if (isSimple) {
      const e = entry as { label?: string; tech?: string; code: string; runnable?: boolean };
      return { id: genId(), kind: "simple", label: e.label ?? "", tech: e.tech ?? "", runnable: Boolean(e.runnable), code: e.code };
    }
    return { id: genId(), kind: "advanced", raw: JSON.stringify(entry, null, 2) };
  });
}

/** Serialize items back to the stored JSON string ("" clears the column). */
export function serializeExamples(items: ExampleItem[]): { value: string; error: string | null } {
  if (items.length === 0) return { value: "", error: null };
  const out: unknown[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "simple") {
      if (!item.code.trim()) return { value: "", error: `Example ${i + 1}: code is empty — add code or remove it.` };
      out.push({
        ...(item.label.trim() ? { label: item.label.trim() } : {}),
        ...(item.tech ? { tech: item.tech } : {}),
        ...(item.runnable ? { runnable: true } : {}),
        code: item.code,
      });
    } else {
      try {
        out.push(JSON.parse(item.raw));
      } catch {
        return { value: "", error: `Example ${i + 1}: invalid JSON.` };
      }
    }
  }
  return { value: JSON.stringify(out), error: null };
}

function editorLanguage(tech: string): CodeLanguage {
  if (tech === "typescript") return "typescript";
  if (tech === "python") return "python";
  if (tech === "sql") return "sql";
  return "javascript";
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm focus:outline-none focus:border-accent/50";
const miniLabel = "text-[10px] font-black uppercase tracking-widest text-muted mb-1.5 block";

export default function ExamplesEditor({
  items,
  onChange,
}: {
  items: ExampleItem[];
  onChange: (items: ExampleItem[]) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.length <= 2 ? items.map((i) => i.id) : []),
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const update = (id: string, patch: Partial<ExampleItem>) =>
    onChange(items.map((it) => (it.id === id ? ({ ...it, ...patch } as ExampleItem) : it)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const add = (kind: "simple" | "advanced") => {
    const item: ExampleItem =
      kind === "simple"
        ? { id: genId(), kind, label: "", tech: "", runnable: false, code: "" }
        : { id: genId(), kind, raw: '{\n  "label": "",\n  "variants": []\n}' };
    onChange([...items, item]);
    setExpanded((prev) => new Set(prev).add(item.id));
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = expanded.has(item.id);
        const title = item.kind === "simple"
          ? item.label.trim() || "Untitled example"
          : (() => { try { return (JSON.parse(item.raw)?.label as string) || "Advanced example"; } catch { return "Advanced example"; } })();
        const invalid = item.kind === "advanced" && Boolean(validateJson(item.raw, "object"));
        return (
          <div key={item.id} className={`rounded-xl border overflow-hidden ${invalid ? "border-rose-500/40" : "border-border"}`}>
            <div className="flex items-center gap-2 px-3 py-2 bg-bg/60">
              <button type="button" onClick={() => toggle(item.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left group">
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />}
                <span className="text-xs font-bold truncate group-hover:text-accent transition-colors">{i + 1}. {title}</span>
                {item.kind === "simple" ? (
                  <>
                    {item.tech && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-border text-muted shrink-0">
                        {CODE_VARIANTS[item.tech]?.label ?? item.tech}
                      </span>
                    )}
                    {item.runnable && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-500 shrink-0">
                        <Play className="w-2.5 h-2.5" /> runnable
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-500 shrink-0">
                    <Braces className="w-2.5 h-2.5" /> JSON
                  </span>
                )}
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up" className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated disabled:opacity-30 transition">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down" className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated disabled:opacity-30 transition">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => remove(item.id)} title="Remove example" className="p-1.5 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="p-3 border-t border-border space-y-3">
                {item.kind === "simple" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,200px,auto] gap-3 items-end">
                      <div>
                        <label className={miniLabel}>Label</label>
                        <input
                          value={item.label}
                          onChange={(e) => update(item.id, { label: e.target.value })}
                          className={inputCls}
                          placeholder="Non-blocking password hash"
                        />
                      </div>
                      <div>
                        <label className={miniLabel}>Language</label>
                        <select value={item.tech} onChange={(e) => update(item.id, { tech: e.target.value })} className={inputCls}>
                          <option value="">Question default</option>
                          {Object.entries(CODE_VARIANTS).map(([slug, meta]) => (
                            <option key={slug} value={slug}>{meta.label}</option>
                          ))}
                        </select>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-muted cursor-pointer pb-2.5">
                        <input
                          type="checkbox"
                          checked={item.runnable}
                          onChange={(e) => update(item.id, { runnable: e.target.checked })}
                          className="accent-[var(--accent,#eab308)]"
                        />
                        Runnable
                      </label>
                    </div>
                    <div className="rounded-xl border border-border overflow-hidden focus-within:border-accent/50 transition-colors">
                      <CodeMirrorField
                        value={item.code}
                        onChange={(code) => update(item.id, { code })}
                        language={editorLanguage(item.tech)}
                        placeholder="// example code shown (and optionally run) on the question page"
                        minHeight={120}
                        maxHeight={420}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-muted">
                      Multi-variant / multi-file example — edited as JSON. Shape: <code className="text-accent">{'{ label, variants: [{ tech, code }] }'}</code> or <code className="text-accent">{'{ label, files: { "/App.js": "…" } }'}</code>.
                    </p>
                    <JsonField
                      value={item.raw}
                      onChange={(raw) => update(item.id, { raw })}
                      kind="object"
                      minHeight={140}
                      maxHeight={420}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => add("simple")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-bold text-muted hover:text-fg hover:border-accent/40 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add code example
        </button>
        <button
          type="button"
          onClick={() => add("advanced")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-bold text-muted hover:text-fg hover:border-accent/40 transition"
        >
          <Braces className="w-3.5 h-3.5" /> Add advanced (JSON)
        </button>
      </div>
    </div>
  );
}
