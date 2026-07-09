"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Upload,
  ArrowLeft,
  Mail,
  Tag,
  Clock,
  XCircle,
  ChevronRight,
  MoreHorizontal,
  Check,
  Send,
  Trophy,
} from "lucide-react";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_TONES,
  REJECT_REASONS,
  REJECT_REASON_LABELS,
  type PipelineStage,
  type RejectReason,
} from "@/lib/crm/stages";
import {
  updateCandidateStageAction,
  importCandidatesCsvAction,
  bulkCreateTakeHomeSessions,
  type CsvImportResult,
  type BulkDispatchResult,
} from "./actions";

type CandidateRow = {
  id: string;
  name: string;
  email: string | null;
  stage: string;
  rejectReason: string | null;
  rejectReasonNote: string | null;
  stageChangedAt: string | null;
  tags: string | null;
  source: string | null;
  createdAt: string;
};

type Buckets = Record<PipelineStage, CandidateRow[]>;

type ChallengeOption = { id: string; title: string; difficulty: string };

type Props = {
  slug: string;
  workspaceName: string;
  canEdit: boolean;
  initialBuckets: Buckets;
  challenges: ChallengeOption[];
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export default function CandidatePipelineClient({
  slug,
  workspaceName,
  canEdit,
  initialBuckets,
  challenges,
}: Props) {
  const [buckets, setBuckets] = useState<Buckets>(initialBuckets);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [rejectPrompt, setRejectPrompt] = useState<{
    candidateId: string;
    fromStage: PipelineStage;
  } | null>(null);
  // Context menu state — { x, y } anchor the menu globally; cardId tells us
  // which candidate is being moved.
  const [contextMenu, setContextMenu] = useState<{
    cardId: string;
    fromStage: PipelineStage;
    x: number;
    y: number;
  } | null>(null);
  const [, startTransition] = useTransition();

  const totalByStage = useMemo(
    () =>
      Object.fromEntries(
        (Object.entries(buckets) as Array<[PipelineStage, CandidateRow[]]>).map(
          ([k, v]) => [k, v.length],
        ),
      ),
    [buckets],
  );
  const total = Object.values(totalByStage).reduce((a, b) => a + b, 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function findCandidate(id: string): { stage: PipelineStage; row: CandidateRow } | null {
    for (const stage of PIPELINE_STAGES) {
      const row = buckets[stage].find((c) => c.id === id);
      if (row) return { stage, row };
    }
    return null;
  }

  function moveLocally(candidateId: string, from: PipelineStage, to: PipelineStage) {
    if (from === to) return;
    setBuckets((prev) => {
      const next = { ...prev };
      const row = next[from].find((c) => c.id === candidateId);
      if (!row) return prev;
      next[from] = next[from].filter((c) => c.id !== candidateId);
      next[to] = [{ ...row, stage: to, stageChangedAt: new Date().toISOString() }, ...next[to]];
      return next;
    });
  }

  async function commitMove(
    candidateId: string,
    toStage: PipelineStage,
    fromStage: PipelineStage,
    rejectReason?: RejectReason,
    rejectReasonNote?: string,
  ) {
    try {
      await updateCandidateStageAction(slug, {
        candidateId,
        toStage,
        rejectReason,
        rejectReasonNote,
      });
      toast.success(`Moved to ${STAGE_LABELS[toStage]}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't update stage.");
      // Revert the optimistic move in place — no full-page reload.
      moveLocally(candidateId, toStage, fromStage);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    if (!canEdit) return;
    const candidateId = String(e.active.id);
    const toStage = e.over?.id ? (String(e.over.id) as PipelineStage) : null;
    if (!toStage) return;
    const cur = findCandidate(candidateId);
    if (!cur || cur.stage === toStage) return;

    if (toStage === "REJECTED") {
      // Don't move yet — prompt for reason first.
      setRejectPrompt({ candidateId, fromStage: cur.stage });
      return;
    }
    moveLocally(candidateId, cur.stage, toStage);
    startTransition(() => {
      void commitMove(candidateId, toStage, cur.stage);
    });
  }

  function confirmReject(reason: RejectReason, note: string) {
    if (!rejectPrompt) return;
    const { candidateId, fromStage } = rejectPrompt;
    moveLocally(candidateId, fromStage, "REJECTED");
    setRejectPrompt(null);
    startTransition(() => {
      void commitMove(candidateId, "REJECTED", fromStage, reason, note);
    });
  }

  /**
   * Context menu — triggered by either right-click or the ⋯ button on a card.
   * Picking a destination stage commits the move immediately (REJECTED still
   * routes through the reason modal).
   */
  function openContextMenu(card: CandidateRow, fromStage: PipelineStage, x: number, y: number) {
    if (!canEdit) return;
    setContextMenu({ cardId: card.id, fromStage, x, y });
  }

  function pickStageFromMenu(toStage: PipelineStage) {
    if (!contextMenu) return;
    const { cardId, fromStage } = contextMenu;
    setContextMenu(null);
    if (toStage === fromStage) return;
    if (toStage === "REJECTED") {
      setRejectPrompt({ candidateId: cardId, fromStage });
      return;
    }
    moveLocally(cardId, fromStage, toStage);
    startTransition(() => {
      void commitMove(cardId, toStage, fromStage);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <Link
            href={`/w/${slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft className="w-3 h-3" /> {workspaceName}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Candidate pipeline</h1>
          <p className="text-sm text-muted leading-relaxed max-w-xl">
            Drag between adjacent stages, or <span className="text-fg font-medium">right-click</span>
            {" "}(or use the <span className="text-fg font-medium">⋯ button</span>) on any card to jump
            to a specific stage. Moving to{" "}
            <span className="text-rose-300 font-medium">Rejected</span> requires a reason.
            Workflow events (take-home sent or submitted, AI screening completed, interview
            scheduled) advance candidates forward automatically — never backward, and
            hire/offer decisions always stay with you.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/w/${slug}?section=candidates&view=leaderboard`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel"
          >
            <Trophy className="w-3 h-3" />
            Leaderboard
          </Link>
          <button
            type="button"
            onClick={() => setBulkSendOpen(true)}
            disabled={!canEdit || challenges.length === 0}
            title={
              challenges.length === 0
                ? "No challenges available — create one first."
                : "Dispatch one challenge to many candidates at once."
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-bg bg-fg hover:opacity-90 disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            Send to many
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            disabled={!canEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            Import CSV
          </button>
        </div>
      </header>

      <div className="text-[11px] text-muted">
        {total} candidates ·{" "}
        {(PIPELINE_STAGES as readonly PipelineStage[]).map((s, i) => (
          <span key={s}>
            {i > 0 && <span className="text-muted/40 mx-1">·</span>}
            <span className="font-mono">
              {STAGE_LABELS[s]} {totalByStage[s] ?? 0}
            </span>
          </span>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/*
          Horizontal-scroll layout (à la Trello/Jira). Preserves pipeline
          reading order on every viewport instead of wrapping into rows.
          Each column gets a fixed min-width so cards don't crush at 7 stages
          wide. The outer `-mx-*` extends past the parent's padding so the
          scroll surface uses the full page width.
        */}
        <div className="kanban-scroll -mx-4 md:-mx-8 px-4 md:px-8 pb-3">
          <div className="flex items-start gap-3 min-w-max">
            {(PIPELINE_STAGES as readonly PipelineStage[]).map((stage, i) => (
              <StageColumn
                key={stage}
                stage={stage}
                candidates={buckets[stage]}
                count={totalByStage[stage] ?? 0}
                slug={slug}
                canEdit={canEdit}
                onOpenContextMenu={openContextMenu}
                // Pin the first column so the inflow source stays visible
                // while the recruiter scrolls right to drop into later stages.
                isSticky={i === 0}
              />
            ))}
          </div>
        </div>
      </DndContext>

      {rejectPrompt && (
        <RejectReasonModal
          onCancel={() => setRejectPrompt(null)}
          onConfirm={confirmReject}
        />
      )}

      {importOpen && (
        <CsvImportModal
          slug={slug}
          onClose={() => setImportOpen(false)}
          onImported={(result) => {
            toast.success(
              `CSV imported: ${result.imported} new, ${result.skipped} duplicates, ${result.errored} errors.`,
            );
            // Reload to pull the fresh rows. A more granular optimistic update
            // would require returning the rows from the action — left for a follow-up.
            window.location.reload();
          }}
        />
      )}

      {contextMenu && (
        <StageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          fromStage={contextMenu.fromStage}
          onPick={pickStageFromMenu}
          onClose={() => setContextMenu(null)}
        />
      )}

      {bulkSendOpen && (
        <BulkSendTakeHomeModal
          slug={slug}
          challenges={challenges}
          buckets={buckets}
          onClose={() => setBulkSendOpen(false)}
          onComplete={(r) => {
            toast.success(
              `Dispatched ${r.dispatched} take-home${r.dispatched === 1 ? "" : "s"} of ${r.challengeTitle} — ${r.emailed} invite${r.emailed === 1 ? "" : "s"} emailed.`,
              {
                description:
                  (r.skipped || r.errored ? `${r.skipped} skipped, ${r.errored} errored. ` : "") +
                  (r.dispatched > r.emailed
                    ? `${r.dispatched - r.emailed} not emailed (suppressed or transport issue) — links still available.`
                    : ""),
              },
            );
            // Reload to pull fresh take-home counts everywhere.
            window.location.href = `/w/${slug}?section=candidates&view=leaderboard`;
          }}
        />
      )}
    </div>
  );
}

function StageColumn({
  stage,
  candidates,
  count,
  slug,
  canEdit,
  onOpenContextMenu,
  isSticky = false,
}: {
  stage: PipelineStage;
  candidates: CandidateRow[];
  count: number;
  slug: string;
  canEdit: boolean;
  onOpenContextMenu: (card: CandidateRow, fromStage: PipelineStage, x: number, y: number) => void;
  isSticky?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // Sticky column needs an opaque background so other columns scrolling
  // behind it don't bleed through. Right-edge shadow signals the pin.
  // The padding-left compensation aligns the sticky position with the
  // scroll container's inner edge (which has px-4 / md:px-8).
  const stickyClass = isSticky
    ? "sticky left-0 md:left-0 z-10 bg-surface shadow-[8px_0_14px_-8px_rgba(0,0,0,0.5)]"
    : "bg-surface/60";
  const borderClass = isOver ? "border-fg/60 bg-panel/70" : "border-border";

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl border transition w-[260px] shrink-0 ${stickyClass} ${borderClass}`}
    >
      <header className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STAGE_TONES[stage]}`}>
          {STAGE_LABELS[stage]}
        </span>
        <span className="text-[10px] font-mono text-muted/80">{count}</span>
      </header>
      <ul className="p-2 space-y-2 min-h-[180px]">
        {candidates.length === 0 ? (
          <li className="text-[10px] text-muted/60 italic text-center py-4">
            No candidates here yet.
          </li>
        ) : (
          candidates.map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              slug={slug}
              canEdit={canEdit}
              onOpenContextMenu={(x, y) => onOpenContextMenu(c, stage, x, y)}
            />
          ))
        )}
      </ul>
    </section>
  );
}

function CandidateCard({
  c,
  slug,
  canEdit,
  onOpenContextMenu,
}: {
  c: CandidateRow;
  slug: string;
  canEdit: boolean;
  onOpenContextMenu: (x: number, y: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: c.id,
    disabled: !canEdit,
  });
  const tags = parseTags(c.tags);
  return (
    <li
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
          : undefined
      }
      {...listeners}
      {...attributes}
      onContextMenu={(e) => {
        // Right-click → open the stage picker at the cursor. Suppress the
        // browser's native menu since ours is the value-add here.
        if (!canEdit) return;
        e.preventDefault();
        onOpenContextMenu(e.clientX, e.clientY);
      }}
      className={`group rounded-lg border bg-bg/60 p-2.5 space-y-1.5 cursor-grab active:cursor-grabbing transition relative ${
        isDragging ? "opacity-60 border-fg/40 shadow-lg" : "border-border hover:border-fg/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <Link
          href={`/w/${slug}/candidates/${c.id}`}
          className="text-xs font-semibold text-fg truncate hover:text-accent"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {c.name}
        </Link>
        {canEdit && (
          <button
            type="button"
            // PointerDown stop is essential — otherwise the drag sensor swallows the click.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              onOpenContextMenu(rect.left, rect.bottom + 4);
            }}
            aria-label="Move candidate"
            title="Move to another stage (right-click also works)"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition w-5 h-5 rounded flex items-center justify-center text-muted hover:text-fg hover:bg-panel/60 shrink-0"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        )}
      </div>
      {c.email && (
        <div className="text-[10px] text-muted/80 truncate flex items-center gap-1">
          <Mail className="w-2.5 h-2.5 shrink-0" /> {c.email}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bg border border-border text-[9px] text-muted/90"
            >
              <Tag className="w-2 h-2" /> {t}
            </span>
          ))}
        </div>
      )}
      {c.stage === "REJECTED" && c.rejectReason && (
        <div className="text-[9px] text-rose-300 flex items-start gap-1 pt-1 border-t border-border/40">
          <XCircle className="w-2.5 h-2.5 shrink-0 mt-0.5" />
          <span className="truncate">
            {REJECT_REASON_LABELS[c.rejectReason as RejectReason] ?? c.rejectReason}
          </span>
        </div>
      )}
      {c.stageChangedAt && c.stage !== "APPLIED" && (
        <div className="text-[9px] text-muted/60 font-mono pt-0.5">
          <Clock className="w-2 h-2 inline mr-0.5" />
          {new Date(c.stageChangedAt).toLocaleDateString()}
        </div>
      )}
    </li>
  );
}

/**
 * Floating menu positioned at an absolute (x, y) anchor. Used by both
 * right-click on a card and click of the ⋯ button. Closes on outside click,
 * Escape, or window resize/scroll so a stale anchor never lingers.
 *
 * Renders into a portal so it escapes any `overflow:hidden` ancestor.
 */
function StageContextMenu({
  x,
  y,
  fromStage,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  fromStage: PipelineStage;
  onPick: (stage: PipelineStage) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScrollOrResize() {
      onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [onClose]);

  // Clamp the menu inside the viewport — useful when right-click happens near
  // the right or bottom edge.
  const MENU_W = 220;
  const MENU_H = (PIPELINE_STAGES.length + 1) * 36;
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - MENU_W - 8);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - MENU_H - 8);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", left, top, width: MENU_W }}
      className="rounded-lg border border-border bg-elevated shadow-2xl z-[100] p-1 ring-1 ring-black/10"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 px-2.5 pt-1.5 pb-1 border-b border-border/60">
        Move to stage
      </div>
      <ul>
        {(PIPELINE_STAGES as readonly PipelineStage[]).map((s) => {
          const current = s === fromStage;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onPick(s)}
                disabled={current}
                role="menuitem"
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11.5px] font-semibold transition text-left ${
                  current
                    ? "text-muted/50 cursor-not-allowed"
                    : "text-fg hover:bg-panel/60"
                }`}
              >
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${STAGE_TONES[s]} shrink-0`}
                >
                  {STAGE_LABELS[s]}
                </span>
                {current && <Check className="w-3 h-3 text-muted/60 ml-auto" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}

function RejectReasonModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (reason: RejectReason, note: string) => void;
}) {
  const [reason, setReason] = useState<RejectReason>("SKILL_GAP");
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-rose-500/30 bg-surface p-5 space-y-4">
        <header className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
            Reject candidate
          </div>
          <h2 className="text-lg font-semibold">Why?</h2>
          <p className="text-[12px] text-muted">
            Recorded against the candidate and feeds workspace analytics.
          </p>
        </header>
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as RejectReason)}
            className="w-full px-3 py-2 rounded-md bg-bg border border-border text-sm text-fg focus:outline-none focus:border-fg"
          >
            {REJECT_REASONS.map((r) => (
              <option key={r} value={r}>
                {REJECT_REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Free-text expansion. Stays internal to the workspace."
            className="w-full px-3 py-2 rounded-md bg-bg border border-border text-sm text-fg focus:outline-none focus:border-fg resize-y"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold text-muted border border-border hover:bg-panel/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason, note)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-rose-500/80 text-white hover:bg-rose-500"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Bulk take-home dispatch modal (IP-35).
 *
 * Two recipient input modes, additive:
 *   - Picked from CRM   — checkbox list of existing candidates with email
 *   - Pasted plaintext  — "Name <email>" or "name,email" per line for ad-hoc
 *
 * Dedup happens server-side (and within the batch on submit). The preview
 * count shows the live de-duplicated tally so the recruiter sees what's
 * actually about to fly.
 */
function BulkSendTakeHomeModal({
  slug,
  challenges,
  buckets,
  onClose,
  onComplete,
}: {
  slug: string;
  challenges: ChallengeOption[];
  buckets: Buckets;
  onClose: () => void;
  onComplete: (r: BulkDispatchResult) => void;
}) {
  // Flatten all CRM candidates with a usable email into a selectable list.
  // Existing candidates already in the workspace pipeline are the primary
  // audience for "send a take-home to everyone we're screening for Senior FE".
  const eligibleFromCrm = useMemo(() => {
    const all: { id: string; name: string; email: string; stage: string }[] = [];
    for (const stage of PIPELINE_STAGES) {
      for (const c of buckets[stage]) {
        if (c.email) all.push({ id: c.id, name: c.name, email: c.email, stage });
      }
    }
    return all;
  }, [buckets]);

  const [challengeId, setChallengeId] = useState(challenges[0]?.id ?? "");
  const [timeLimitMin, setTimeLimitMin] = useState(120);
  const [daysToExpire, setDaysToExpire] = useState(7);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [pastedRaw, setPastedRaw] = useState("");
  const [searchCrm, setSearchCrm] = useState("");
  const [pending, startPending] = useTransition();

  // Parse the pasted text into {name,email} pairs. Accept "Name <email>",
  // "name,email", "email" (name auto-derived from local-part), one per line.
  // Returned with full original text so the recruiter sees what was parsed.
  const pastedRecipients = useMemo(() => {
    const out: { name: string; email: string }[] = [];
    for (const line of pastedRaw.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) continue;
      // Match "Name <email>"
      const m1 = s.match(/^(.+?)\s*<\s*([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)\s*>$/);
      if (m1) {
        out.push({ name: m1[1].trim().replace(/^["']|["']$/g, ""), email: m1[2] });
        continue;
      }
      // Match "name,email"
      const m2 = s.match(/^(.+?)\s*,\s*([^\s,]+@[^\s,]+\.[^\s,]+)$/);
      if (m2) {
        out.push({ name: m2[1].trim(), email: m2[2] });
        continue;
      }
      // Bare email — synthesize a placeholder name from the local-part.
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        const local = s.split("@")[0];
        out.push({ name: local || s, email: s });
        continue;
      }
      // Unparseable line — included so server returns an "errored" row the
      // recruiter can review.
      out.push({ name: "", email: s });
    }
    return out;
  }, [pastedRaw]);

  // Merge CRM picks + pasted, de-duplicated by lowercased email.
  const finalRecipients = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; email: string }[] = [];
    for (const c of eligibleFromCrm) {
      if (!pickedIds.has(c.id)) continue;
      const k = c.email.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      list.push({ name: c.name, email: c.email });
    }
    for (const r of pastedRecipients) {
      const k = (r.email ?? "").toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      list.push({ name: r.name || k.split("@")[0], email: r.email });
    }
    return list;
  }, [eligibleFromCrm, pickedIds, pastedRecipients]);

  const visibleCrm = useMemo(() => {
    const q = searchCrm.trim().toLowerCase();
    if (!q) return eligibleFromCrm;
    return eligibleFromCrm.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.stage.toLowerCase().includes(q),
    );
  }, [eligibleFromCrm, searchCrm]);

  function toggleCrmPick(id: string) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSend() {
    if (!challengeId) {
      toast.error("Pick a challenge.");
      return;
    }
    if (finalRecipients.length === 0) {
      toast.error("Pick at least one candidate or paste some emails.");
      return;
    }
    startPending(async () => {
      try {
        // Session-backed dispatch (IP-88 convergence): each recipient gets a
        // 1-question take-home session — same runner/review as the builder.
        const picked = challenges.find((c) => c.id === challengeId);
        const result = await bulkCreateTakeHomeSessions(slug, {
          title: picked ? `Take-home: ${picked.title}` : "Take-home assessment",
          curation: {
            challengeIds: [challengeId],
            playgroundIds: [],
            promptScenarioIds: [],
            perQuestionMinutes: { [challengeId]: timeLimitMin },
          },
          recipients: finalRecipients,
          daysToExpire,
        });
        onComplete({
          dispatched: result.created,
          emailed: result.emailed,
          skipped: result.skipped,
          errored: result.errored,
          details: result.details,
          challengeTitle: picked?.title ?? "take-home",
        });
      } catch (err) {
        toast.error((err as Error).message ?? "Bulk dispatch failed.");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-surface p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <header className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/80 flex items-center gap-1.5">
            <Send className="w-3 h-3" />
            Bulk dispatch
          </div>
          <h2 className="text-lg font-semibold">Send a take-home to many candidates</h2>
          <p className="text-[12px] text-muted">
            One transaction — either all rows land or none do. Capped at 100 per send.
          </p>
        </header>

        {/* Challenge + window */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/80 block">
              Challenge
            </label>
            <select
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-bg border border-border text-sm text-fg focus:outline-none focus:border-fg"
            >
              {challenges.length === 0 ? (
                <option value="">No challenges available — create one first</option>
              ) : (
                challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {c.difficulty}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/80 block">
              Time limit (min)
            </label>
            <input
              type="number"
              min={15}
              max={1440}
              value={timeLimitMin}
              onChange={(e) => setTimeLimitMin(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-md bg-bg border border-border text-sm font-mono text-fg focus:outline-none focus:border-fg"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/80 block">
              Days to expire
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={daysToExpire}
              onChange={(e) => setDaysToExpire(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-md bg-bg border border-border text-sm font-mono text-fg focus:outline-none focus:border-fg"
            />
          </div>
          <div className="space-y-1.5 self-end">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
              Will dispatch
            </div>
            <div className="px-3 py-2 rounded-md bg-bg border border-border text-sm font-mono text-fg">
              {finalRecipients.length} recipient{finalRecipients.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* CRM picker */}
        <section className="space-y-2 rounded-lg border border-border bg-bg/40 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
              Pick from CRM ({eligibleFromCrm.length} eligible)
            </div>
            <input
              type="text"
              value={searchCrm}
              onChange={(e) => setSearchCrm(e.target.value)}
              placeholder="Filter…"
              className="px-2 py-1 rounded text-[11px] bg-bg border border-border text-fg focus:outline-none focus:border-fg w-40"
            />
          </div>
          {eligibleFromCrm.length === 0 ? (
            <p className="text-[11px] text-muted/60 italic py-2">
              No CRM candidates with email yet. Paste emails below instead.
            </p>
          ) : (
            <ul className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
              {visibleCrm.map((c) => {
                const checked = pickedIds.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-panel/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCrmPick(c.id)}
                        className="accent-fg"
                      />
                      <span className="text-xs text-fg flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-muted/80 font-mono truncate max-w-[200px]">
                        {c.email}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-muted/60 shrink-0">
                        {c.stage}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pasted recipients */}
        <section className="space-y-2 rounded-lg border border-border bg-bg/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
            …or paste recipients ({pastedRecipients.length} parsed)
          </div>
          <textarea
            value={pastedRaw}
            onChange={(e) => setPastedRaw(e.target.value)}
            rows={5}
            placeholder={`One per line:\nAva Patel <ava@example.com>\nLee Chen, lee@example.com\ncarlos@example.com`}
            className="w-full px-3 py-2 rounded-md bg-bg border border-border text-[12px] font-mono text-fg/90 focus:outline-none focus:border-fg resize-y"
          />
        </section>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold text-muted border border-border hover:bg-panel/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={pending || finalRecipients.length === 0 || !challengeId}
            className="px-4 py-1.5 rounded-md text-[11px] font-semibold bg-fg text-bg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" />
            {pending ? "Dispatching…" : `Send to ${finalRecipients.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CsvImportModal({
  slug,
  onClose,
  onImported,
}: {
  slug: string;
  onClose: () => void;
  onImported: (r: CsvImportResult) => void;
}) {
  const [csv, setCsv] = useState("");
  const [pending, startPending] = useTransition();
  function onSubmit() {
    if (!csv.trim()) {
      toast.error("Paste some CSV first.");
      return;
    }
    startPending(async () => {
      try {
        const result = await importCandidatesCsvAction(slug, csv);
        onImported(result);
      } catch (err) {
        toast.error((err as Error).message ?? "Import failed.");
      }
    });
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-5 space-y-4">
        <header className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted/80 flex items-center gap-1.5">
            <Upload className="w-3 h-3" />
            CSV import
          </div>
          <h2 className="text-lg font-semibold">Paste candidate CSV</h2>
          <p className="text-[12px] text-muted">
            Header row required. Recognised columns: <code className="font-mono">name</code>,{" "}
            <code className="font-mono">email</code> (required),{" "}
            <code className="font-mono">phone</code>, <code className="font-mono">source</code>,{" "}
            <code className="font-mono">stage</code>, <code className="font-mono">tags</code>,{" "}
            <code className="font-mono">notes</code>. Duplicates by email are skipped.
          </p>
        </header>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          placeholder={`name,email,stage,tags\nAva Patel,ava@example.com,SCREENED,senior;react\nLee Chen,lee@example.com,APPLIED,`}
          className="w-full px-3 py-2 rounded-md bg-bg border border-border text-[12px] font-mono text-fg/90 focus:outline-none focus:border-fg resize-y"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold text-muted border border-border hover:bg-panel/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-fg text-bg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {pending ? "Importing…" : <>Import <ChevronRight className="w-3 h-3" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
