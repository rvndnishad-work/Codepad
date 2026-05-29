"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ThumbsUp, Copy } from "lucide-react";
import { toast } from "sonner";
import { type Attempt, parseRubric, RUBRIC_LABELS } from "./types";

interface Props {
  /** Community-shared attempts for the current scenario. */
  prompts: Attempt[];
  /** Whether the current user has already upvoted each attempt. */
  upvotedIds: Set<string>;
  currentUserId: string | null;
  onLoadIntoEditor?: (promptText: string) => void;
  onUpvoteToggle: (attemptId: string, nextUpvoted: boolean) => void;
}

/**
 * Community Prompts section in the Practice runner. Shows prompts shared by
 * other developers for the same scenario, sorted by upvotes server-side.
 * Each row expands to reveal the full prompt + per-dimension rubric breakdown.
 *
 * Anonymous viewers see counts and content but can't upvote.
 */
export default function CommunityList({
  prompts,
  upvotedIds,
  currentUserId,
  onLoadIntoEditor,
  onUpvoteToggle,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (prompts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-panel/20 p-5 text-center">
        <p className="text-xs text-muted">Nobody has shared a prompt for this scenario yet.</p>
        <p className="text-[11px] text-muted/70 mt-1">Be the first — submit a prompt and toggle "Share".</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prompts.map((p) => {
        const open = openId === p.id;
        const rubric = parseRubric(p.rubricScores);
        const upvoted = upvotedIds.has(p.id);
        return (
          <div key={p.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-sm font-semibold text-fg truncate">
                  {p.shareTitle || p.scenarioTitle}
                </div>
                <div className="text-xs text-muted mt-0.5 line-clamp-1">
                  {p.shareNote || "No note provided."}
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono font-semibold tabular-nums text-emerald-400">
                  {p.score ?? "—"}
                </span>
                <button
                  type="button"
                  disabled={!currentUserId}
                  onClick={() => onUpvoteToggle(p.id, !upvoted)}
                  title={currentUserId ? (upvoted ? "Remove upvote" : "Upvote") : "Sign in to upvote"}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    upvoted
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                      : "bg-bg border-border text-muted hover:text-fg hover:border-border-strong"
                  }`}
                >
                  <ThumbsUp className={`w-3 h-3 ${upvoted ? "fill-current" : ""}`} />
                  <span className="tabular-nums">{p.shareUpvotes ?? 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="text-muted hover:text-fg"
                >
                  {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {open ? (
              <div className="border-t border-border bg-panel/20 p-4 space-y-3">
                {p.rubricScores ? (
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
                  {p.promptText}
                </pre>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(p.promptText);
                      toast.success("Prompt copied");
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
                        onLoadIntoEditor(p.promptText);
                        toast.success("Loaded into editor");
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors"
                    >
                      Fork
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
