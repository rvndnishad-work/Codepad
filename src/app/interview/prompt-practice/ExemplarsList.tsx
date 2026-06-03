"use client";

import { useState } from "react";
import { Copy, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { type Exemplar, parseRubric, RUBRIC_LABELS } from "./types";

interface Props {
  exemplars: Exemplar[];
  onLoadIntoEditor?: (promptText: string) => void;
}

/**
 * Collapsible list of admin-curated exemplar prompts for a scenario. Each row
 * expands to show the full prompt + summary + per-dimension rubric scores.
 * Click "Use as starting point" to push the text into the editor.
 *
 * Replaces the old "fake macOS code editor" demo that had two hardcoded prompts
 * baked into the React component. Exemplars now live in the database.
 */
export default function ExemplarsList({ exemplars, onLoadIntoEditor }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (exemplars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-panel/20 p-5 text-center">
        <BookOpen className="w-4 h-4 text-muted/60 mx-auto mb-2" />
        <p className="text-xs text-muted">No exemplars for this scenario yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {exemplars.map((ex) => {
        const open = openId === ex.id;
        const rubric = parseRubric(ex.rubricScores);
        const avgScore = Math.round(
          RUBRIC_LABELS.reduce((sum, { key }) => sum + rubric[key], 0) / RUBRIC_LABELS.length,
        );
        return (
          <div key={ex.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : ex.id)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-panel/30 transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg truncate">{ex.title}</div>
                <div className="text-xs text-muted mt-0.5 line-clamp-1">{ex.summary}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {ex.rubricScores ? (
                  <span className="text-[11px] font-mono font-semibold tabular-nums text-indigo-400">
                    {avgScore}
                  </span>
                ) : null}
                {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </div>
            </button>

            {open ? (
              <div className="border-t border-border bg-panel/20 p-4 space-y-3">
                {ex.rubricScores ? (
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
                    {RUBRIC_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-muted truncate">{label}</span>
                        <span className="font-mono tabular-nums text-fg/80">{rubric[key]}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <pre className="text-[11px] font-mono leading-relaxed text-fg/85 bg-bg border border-border rounded-lg p-3 whitespace-pre-wrap max-h-[280px] overflow-y-auto">
                  {ex.promptText}
                </pre>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ex.promptText);
                      toast.success("Exemplar copied");
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-bg hover:bg-panel text-[11px] font-semibold text-muted hover:text-fg transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  {onLoadIntoEditor ? (
                    <button
                      type="button"
                      onClick={() => {
                        onLoadIntoEditor(ex.promptText);
                        toast.success("Loaded into editor");
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors"
                    >
                      Use as starting point
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
