"use client";

/**
 * Pipeline-stage dropdown for the candidate detail page (IP-69 follow-up).
 * Before this, `stage` could only be changed by drag/drop on the Kanban —
 * the page you actually review a candidate on had no way to advance them.
 * Mirrors CandidateStatusControl's dropdown; REJECTED prompts for a reason
 * (same server rule as the board's reject modal).
 */
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Check, X } from "lucide-react";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_TONES,
  REJECT_REASONS,
  REJECT_REASON_LABELS,
  type PipelineStage,
  type RejectReason,
} from "@/lib/crm/stages";
import { updateCandidateStageAction } from "../actions";

type Props = {
  workspaceSlug: string;
  candidateId: string;
  initialStage: string;
};

export default function CandidateStageControl({ workspaceSlug, candidateId, initialStage }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<PipelineStage>(
    (PIPELINE_STAGES as readonly string[]).includes(initialStage)
      ? (initialStage as PipelineStage)
      : "APPLIED",
  );
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectReason>("SKILL_GAP");
  const [rejectNote, setRejectNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function commit(next: PipelineStage, reason?: RejectReason, note?: string) {
    setPending(true);
    const prev = stage;
    setStage(next);
    try {
      await updateCandidateStageAction(workspaceSlug, {
        candidateId,
        toStage: next,
        rejectReason: reason,
        rejectReasonNote: note,
      });
      toast.success(`Moved to ${STAGE_LABELS[next]}`);
      router.refresh();
    } catch (err) {
      setStage(prev);
      toast.error((err as Error).message ?? "Failed to update stage");
    } finally {
      setPending(false);
    }
  }

  function pick(next: PipelineStage) {
    setOpen(false);
    if (next === stage) return;
    if (next === "REJECTED") {
      setRejectOpen(true);
      return;
    }
    void commit(next);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 ${STAGE_TONES[stage]}`}
      >
        <span>{STAGE_LABELS[stage]}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-44 rounded-lg border border-border bg-elevated shadow-2xl ring-1 ring-black/5 dark:ring-white/5 z-30 overflow-hidden">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/60 px-3 pt-2.5 pb-1.5 border-b border-border/60">
            Move to stage
          </div>
          <div className="p-1">
            {PIPELINE_STAGES.map((s) => (
              <button
                key={s}
                onClick={() => pick(s)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                  s === stage
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25"
                    : "text-muted hover:text-fg hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15"
                }`}
              >
                <span>{STAGE_LABELS[s]}</span>
                {s === stage && <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reject-reason prompt — server enforces the reason, so the UI collects it. */}
      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm"
          onClick={() => setRejectOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-panel/30">
              <h3 className="text-sm font-semibold text-fg">Reject candidate</h3>
              <button
                onClick={() => setRejectOpen(false)}
                className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value as RejectReason)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
                >
                  {REJECT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {REJECT_REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Note <span className="lowercase font-normal text-muted/60">(optional)</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40 resize-none"
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setRejectOpen(false);
                  void commit("REJECTED", rejectReason, rejectNote.trim() || undefined);
                }}
                className="w-full py-2 rounded-md bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
