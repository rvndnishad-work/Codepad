"use client";

/**
 * Candidates board, laid out like a Jira board: one lane per stage with a
 * count in its header, compact cards (name, batch and tags, next step, days
 * in stage, score, owner), and optional swimlanes by batch or owner. Drag a
 * card to another lane to change its stage.
 */
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { ChevronDown, Clock, Layers, UserRound } from "lucide-react";
import { PIPELINE_STAGES, REJECT_REASON_LABELS, STAGE_LABELS, type PipelineStage, type RejectReason } from "@/lib/crm/stages";
import { STUCK_AFTER_DAYS, type NextStep } from "@/lib/crm/results";
import type { RosterRow } from "@/lib/crm/roster";
import { Avatar, StageDot } from "./ui";

type GroupBy = "none" | "batch" | "owner";

const GROUPS: [GroupBy, string][] = [
  ["none", "None"],
  ["batch", "Batch"],
  ["owner", "Owner"],
];
const GROUP_KEY = "candidates-board-group";
/** Cards rendered per lane before "and N more". */
const LANE_MAX = 60;

const NEXT_TEXT: Record<NextStep["tone"], string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-secondary-soft",
  plain: "text-muted",
};
const NEXT_DOT: Record<NextStep["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-secondary",
  plain: "bg-subtle",
};

const LANE_ACCENT: Record<PipelineStage, string> = {
  NEW: "bg-subtle/70",
  SCREENING: "bg-secondary",
  PASSED: "bg-success",
  REJECTED: "bg-danger",
};
const LANE_COUNT: Record<PipelineStage, string> = {
  NEW: "bg-elevated text-muted",
  SCREENING: "bg-secondary/20 text-secondary-soft",
  PASSED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};

type Group = { key: string; label: string; kind: GroupBy; rows: RosterRow[] };

function groupRows(rows: RosterRow[], by: GroupBy, batchName: (id: string | null) => string, memberName: (id: string | null) => string): Group[] {
  if (by === "none") return [{ key: "all", label: "All", kind: by, rows }];
  const m = new Map<string, RosterRow[]>();
  for (const r of rows) {
    const k = (by === "batch" ? r.batchId : r.ownerId) ?? "";
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  const label = (k: string) => (k ? (by === "batch" ? batchName(k) : memberName(k)) || "Unknown" : by === "batch" ? "No batch" : "Unassigned");
  return [...m.entries()]
    .map(([k, list]) => ({ key: k || "none", label: label(k), kind: by, rows: list }))
    // Named groups A to Z, then the "No batch" or "Unassigned" lane last.
    .sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : a.label.localeCompare(b.label)));
}

export function Board({
  rows,
  canMove,
  onMove,
  onOpen,
  batchName,
  memberName,
  showBatch,
}: {
  rows: RosterRow[];
  canMove: boolean;
  onMove: (ids: string[], stage: string) => void;
  onOpen: (id: string) => void;
  batchName: (id: string | null) => string;
  memberName: (id: string | null) => string;
  /** False on a batch page, where every card is in the same batch. */
  showBatch: boolean;
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    try {
      const g = localStorage.getItem(GROUP_KEY);
      if (g === "batch" || g === "owner" || g === "none") setGroupBy(g === "batch" && !showBatch ? "none" : g);
    } catch {
      /* storage unavailable */
    }
  }, [showBatch]);

  const pickGroup = (g: GroupBy) => {
    setGroupBy(g);
    setCollapsed(new Set());
    try {
      localStorage.setItem(GROUP_KEY, g);
    } catch {
      /* storage unavailable */
    }
  };

  const groups = useMemo(() => groupRows(rows, groupBy, batchName, memberName), [rows, groupBy, batchName, memberName]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.stage, (m.get(r.stage) ?? 0) + 1);
    return m;
  }, [rows]);
  const swimlanes = groupBy !== "none";

  const dropProps = (cell: string, stage: PipelineStage) =>
    canMove
      ? {
          onDragOver: (e: DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (over !== cell) setOver(cell);
          },
          onDragLeave: (e: DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === cell ? null : o));
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain") || dragId;
            setOver(null);
            setDragId(null);
            const row = rows.find((r) => r.id === id);
            if (row && row.stage !== stage) onMove([row.id], stage);
          },
        }
      : {};

  const card = (r: RosterRow, i = 0) => {
    const owner = memberName(r.ownerId);
    const decided = r.stage === "PASSED" || r.stage === "REJECTED";
    const stuck = !decided && r.daysInStage >= STUCK_AFTER_DAYS;
    const reason = r.stage === "REJECTED" && r.rejectReason ? (REJECT_REASON_LABELS[r.rejectReason as RejectReason] ?? r.rejectReason) : null;
    // The swimlane already names the batch when grouping by it.
    const chips = [...(showBatch && groupBy !== "batch" && r.batchId ? [{ key: "batch", text: batchName(r.batchId), batch: true }] : []), ...r.tags.slice(0, 2).map((t) => ({ key: t, text: t, batch: false }))];
    return (
      <div
        key={r.id}
        role="button"
        tabIndex={0}
        aria-label={`${r.name}, ${STAGE_LABELS[r.stage as PipelineStage] ?? r.stage}. Open`}
        draggable={canMove}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", r.id);
          e.dataTransfer.effectAllowed = "move";
          setDragId(r.id);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        onClick={() => onOpen(r.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(r.id))}
        style={{ animationDelay: `${Math.min(i, 10) * 35}ms`, animationFillMode: "backwards" }}
        className={`group rounded-lg border border-border bg-surface px-3 pt-2.5 pb-2 shadow-sm shadow-black/10 animate-slide-up motion-reduce:animate-none transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 hover:border-border-strong hover:bg-elevated/50 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${
          canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${dragId === r.id ? "opacity-40" : ""}`}
      >
        <div className="text-sm font-medium text-fg leading-snug line-clamp-2 break-words">{r.name}</div>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 min-w-0">
            {chips.map((c) => (
              <span
                key={c.key}
                className={`inline-flex items-center gap-1 max-w-full h-5 px-1.5 rounded text-xs truncate ${
                  c.batch ? "bg-secondary/15 text-secondary-soft" : "bg-panel text-muted"
                }`}
              >
                {c.batch && <Layers className="w-3 h-3 shrink-0" aria-hidden />}
                <span className="truncate">{c.text}</span>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2 min-w-0">
          {reason ? (
            <span className="flex-1 min-w-0 truncate text-xs text-danger">{reason}</span>
          ) : (
            <span className={`flex-1 min-w-0 flex items-center gap-1.5 text-xs ${NEXT_TEXT[r.next.tone]}`} title={r.next.detail ?? undefined}>
              <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${NEXT_DOT[r.next.tone]}`} />
              <span className="truncate">{r.next.label}</span>
            </span>
          )}
          {!decided && (
            <span className={`shrink-0 inline-flex items-center gap-0.5 text-xs tabular-nums ${stuck ? "text-warning" : "text-subtle"}`} title={`${r.daysInStage} days in ${STAGE_LABELS[r.stage as PipelineStage] ?? r.stage}`}>
              <Clock className="w-3 h-3" aria-hidden />
              {r.daysInStage}d
            </span>
          )}
          {r.combined != null && (
            <span
              className={`shrink-0 h-5 px-1.5 rounded text-xs font-semibold leading-5 tabular-nums ${r.combined >= 60 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
              title={`Combined score ${r.combined}`}
            >
              {r.combined}
            </span>
          )}
          {owner ? (
            <span title={`Owner: ${owner}`} className="shrink-0">
              <Avatar name={owner} size={24} />
            </span>
          ) : (
            <span title="No owner" aria-label="No owner" className="shrink-0 w-6 h-6 rounded-full border border-dashed border-border-strong flex items-center justify-center text-subtle">
              <UserRound className="w-3 h-3" aria-hidden />
            </span>
          )}
        </div>
      </div>
    );
  };

  const lane = (g: Group, stage: PipelineStage) => {
    const cell = `${g.key}:${stage}`;
    const list = g.rows.filter((r) => r.stage === stage);
    const isOver = over === cell;
    return (
      <div
        key={cell}
        role="group"
        aria-label={`${STAGE_LABELS[stage]}${swimlanes ? `, ${g.label}` : ""}, ${list.length}`}
        {...dropProps(cell, stage)}
        className={`flex flex-col gap-1.5 p-1.5 bg-panel/50 transition-colors ${swimlanes ? "rounded-lg min-h-[88px]" : "rounded-b-lg min-h-[max(320px,calc(100vh_-_460px))]"} ${
          isOver ? (stage === "REJECTED" ? "ring-2 ring-inset ring-danger/50 bg-danger/[0.06]" : "ring-2 ring-inset ring-secondary/60 bg-secondary/[0.06]") : ""
        }`}
      >
        {list.slice(0, LANE_MAX).map((r, i) => card(r, i))}
        {list.length > LANE_MAX && <p className="text-xs text-subtle px-1.5 py-1">and {list.length - LANE_MAX} more. Filter to narrow down.</p>}
        {list.length === 0 &&
          (dragId ? (
            <div className="flex-1 min-h-16 rounded-md border border-dashed border-border-strong flex items-center justify-center text-xs text-subtle">Drop here</div>
          ) : (
            !swimlanes && <p className="text-xs text-subtle text-center pt-6">No candidates</p>
          ))}
      </div>
    );
  };

  const header = (stage: PipelineStage) => (
    <div key={stage} className={`relative overflow-hidden flex items-center gap-2 px-3 h-10 bg-panel/50 ${swimlanes ? "rounded-lg" : "rounded-t-lg"}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${LANE_ACCENT[stage]}`} />
      <StageDot stage={stage} className="w-2 h-2" />
      <span className="text-[13px] font-semibold text-muted truncate">{STAGE_LABELS[stage]}</span>
      <span className={`ml-auto h-5 min-w-5 px-1.5 rounded-full text-xs font-medium leading-5 text-center tabular-nums ${LANE_COUNT[stage]}`}>{counts.get(stage) ?? 0}</span>
    </div>
  );

  const grid = "grid grid-cols-[repeat(4,minmax(248px,1fr))] gap-x-2.5";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted" id="swimlanes-label">
            Swimlanes
          </span>
          <div role="group" aria-labelledby="swimlanes-label" className="flex gap-0.5 p-0.5 rounded-lg bg-panel">
            {GROUPS.filter(([g]) => g !== "batch" || showBatch).map(([g, text]) => (
              <button
                key={g}
                type="button"
                aria-pressed={groupBy === g}
                onClick={() => pickGroup(g)}
                className={`h-7 px-2.5 rounded-md text-[13px] font-medium transition ${groupBy === g ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
        {canMove && <p className="text-[13px] text-subtle ml-auto">Drag a card to change its stage. Not passed asks for a reason.</p>}
      </div>

      <div className="overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-proximity">
        <div className="min-w-max lg:min-w-0 flex flex-col gap-2">
          {swimlanes ? (
            <>
              <div className={grid}>{PIPELINE_STAGES.map(header)}</div>
              {groups.map((g) => {
                const open = !collapsed.has(g.key);
                return (
                  <section key={g.key} aria-label={g.label} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() =>
                        setCollapsed((s) => {
                          const n = new Set(s);
                          if (n.has(g.key)) n.delete(g.key);
                          else n.add(g.key);
                          return n;
                        })
                      }
                      className="sticky left-0 self-start flex items-center gap-2 h-8 pl-1 pr-2.5 mt-1 rounded-md text-left hover:bg-panel"
                    >
                      <ChevronDown className={`w-4 h-4 text-subtle transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"}`} aria-hidden />
                      {g.kind === "owner" && g.key !== "none" ? <Avatar name={g.label} size={20} /> : g.kind === "batch" ? <Layers className="w-3.5 h-3.5 text-subtle" aria-hidden /> : <UserRound className="w-3.5 h-3.5 text-subtle" aria-hidden />}
                      <span className="text-[13px] font-semibold text-fg">{g.label}</span>
                      <span className="text-xs text-subtle tabular-nums">
                        {g.rows.length} {g.rows.length === 1 ? "candidate" : "candidates"}
                      </span>
                    </button>
                    {open && <div className={grid}>{PIPELINE_STAGES.map((s) => lane(g, s))}</div>}
                  </section>
                );
              })}
            </>
          ) : (
            <div className={grid}>
              {PIPELINE_STAGES.map((s) => (
                <div key={s} className="flex flex-col snap-start">
                  {header(s)}
                  {lane(groups[0], s)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
