"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowDownUp,
  Check,
  Columns3,
  Download,
  Layers,
  List,
  MoreHorizontal,
  MoveRight,
  Plus,
  Search,
  Send,
  Star,
  Tag,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { PIPELINE_STAGES, STAGE_LABELS, type RejectReason } from "@/lib/crm/stages";
import {
  EMPTY_FILTERS,
  filterRows,
  rowsToCsv,
  sortRows,
  type RosterBatch,
  type RosterFilters,
  type RosterMember,
  type RosterRow,
  type SortKey,
} from "@/lib/crm/roster";
import { RESULT_KIND_LABELS } from "@/lib/crm/results";
import { plural, sourceLabel } from "@/lib/workspace/display";
import { bulkCandidatesAction } from "../manage-actions";
import type { BulkAction } from "@/lib/crm/candidates-server";
import { ConfirmDialog, RejectDialog, TagDialog } from "./dialogs";
import { QuickView } from "./QuickView";
import {
  Avatar,
  Btn,
  Menu,
  MenuItem,
  MenuLabel,
  NextStepPill,
  ScoreBar,
  StageChip,
  StageDot,
  stageLabel,
  useToasts,
} from "./ui";

export type Perms = { canWrite: boolean; canPipeline: boolean; canDelete: boolean; isManager: boolean };

const FLOW = PIPELINE_STAGES.filter((s) => s !== "REJECTED");
const PAGE = 100;
const SORTS: Record<SortKey, string> = {
  attention: "Needs attention first",
  updated: "Recently updated",
  name: "Name",
  score: "Highest score",
  stage_time: "Longest in stage",
};

type SavedView = { name: string; query: string };

function readFilters(sp: URLSearchParams): RosterFilters {
  const min = sp.get("min");
  return {
    q: sp.get("q") ?? "",
    stage: sp.get("stage"),
    batch: sp.get("batch"),
    owner: sp.get("owner"),
    source: sp.get("source"),
    tag: sp.get("tag"),
    minScore: min && !Number.isNaN(Number(min)) ? Number(min) : null,
    attention: sp.get("attention") === "1",
    archived: sp.get("archived") === "1",
  };
}

function writeFilters(f: RosterFilters, extra: Record<string, string | null>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.stage) p.set("stage", f.stage);
  if (f.batch) p.set("batch", f.batch);
  if (f.owner) p.set("owner", f.owner);
  if (f.source) p.set("source", f.source);
  if (f.tag) p.set("tag", f.tag);
  if (f.minScore != null) p.set("min", String(f.minScore));
  if (f.attention) p.set("attention", "1");
  if (f.archived) p.set("archived", "1");
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}

export function CandidatesView({
  slug,
  meId,
  rows,
  batches,
  members,
  perms,
  scopeBatchId,
  view,
  onViewChange,
  showViewToggle = true,
}: {
  slug: string;
  meId: string;
  rows: RosterRow[];
  batches: RosterBatch[];
  members: RosterMember[];
  perms: Perms;
  /** Set on a batch page: the batch filter is fixed and hidden. */
  scopeBatchId?: string;
  view: "list" | "board";
  onViewChange?: (v: "list" | "board") => void;
  showViewToggle?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [filters, setFilters] = useState<RosterFilters>(() => ({
    ...readFilters(new URLSearchParams(sp.toString())),
    ...(scopeBatchId ? { batch: null } : {}),
  }));
  const [sort, setSort] = useState<SortKey>(() => (sp.get("sort") as SortKey) in SORTS ? (sp.get("sort") as SortKey) : "attention");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pendingReject, setPendingReject] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<null | "archive" | "erase">(null);
  const [tagging, setTagging] = useState(false);
  const [busy, startBusy] = useTransition();
  const [toasts, toast] = useToasts();
  const [views, setViews] = useState<SavedView[]>([]);
  const [showRejected, setShowRejected] = useState(false);
  const viewsKey = `candidates.views.${slug}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(viewsKey);
      if (raw) setViews(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
  }, [viewsKey]);

  // Keep filters in the URL so a view can be shared or bookmarked.
  useEffect(() => {
    const keep: Record<string, string | null> = {
      view: onViewChange ? sp.get("view") : null,
      tab: sp.get("tab"),
      sort: sort === "attention" ? null : sort,
    };
    const next = writeFilters(filters, keep);
    if (next !== sp.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  // Server data wins once it reflects an optimistic move.
  useEffect(() => setOverrides({}), [rows]);

  const live = useMemo(
    () => rows.map((r) => (overrides[r.id] ? { ...r, stage: overrides[r.id] } : r)),
    [rows, overrides],
  );
  const batchName = useCallback((id: string | null) => batches.find((b) => b.id === id)?.name ?? "", [batches]);
  const memberName = useCallback((id: string | null) => members.find((m) => m.id === id)?.name ?? "", [members]);

  const base = useMemo(() => filterRows(live, filters, meId), [live, filters, meId]);
  const stageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of base) m.set(r.stage, (m.get(r.stage) ?? 0) + 1);
    return m;
  }, [base]);
  const visible = useMemo(
    () => sortRows(filters.stage ? base.filter((r) => r.stage === filters.stage) : base, sort),
    [base, filters.stage, sort],
  );
  const attentionCount = useMemo(
    () => filterRows(live, { ...filters, attention: true }, meId).filter((r) => !filters.stage || r.stage === filters.stage).length,
    [live, filters, meId],
  );
  const sources = useMemo(() => [...new Set(live.map((r) => r.source).filter((s): s is string => !!s))].sort(), [live]);
  const tags = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of live) for (const t of r.tags) c.set(t, (c.get(t) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [live]);
  const archivedCount = useMemo(() => live.filter((r) => r.status === "archived").length, [live]);

  const set = (patch: Partial<RosterFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
    setSelected(new Set());
  };

  const selectedRows = visible.filter((r) => selected.has(r.id));
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function run(ids: string[], op: BulkAction, done: (n: number) => string, undo?: BulkAction) {
    startBusy(async () => {
      const r = await bulkCandidatesAction(slug, ids, op);
      if (!r.ok) {
        toast(r.error, "error");
        setOverrides({});
        return;
      }
      toast(done(r.changed), "ok", undo ? () => run(ids, undo, () => "Undone") : undefined);
      if (op.action === "archive" || op.action === "restore" || op.action === "erase") setSelected(new Set());
      router.refresh();
    });
  }

  function moveTo(ids: string[], stage: string) {
    if (stage === "REJECTED") {
      setPendingReject(ids);
      return;
    }
    setOverrides((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, stage])) }));
    run(ids, { action: "stage", stage }, (n) => (n ? `Moved ${plural(n, "candidate")} to ${stageLabel(stage)}` : "Nothing to move"));
  }

  function exportCsv(list: RosterRow[]) {
    const csv = rowsToCsv(list, { batch: batchName, owner: memberName, stage: stageLabel });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveView() {
    const name = window.prompt("Name this view", "My open reviews")?.trim();
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, query: writeFilters(filters, { sort: sort === "attention" ? null : sort }) }];
    setViews(next);
    try {
      localStorage.setItem(viewsKey, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    toast(`Saved "${name}"`);
  }
  function applyView(v: SavedView) {
    const p = new URLSearchParams(v.query);
    set({ ...EMPTY_FILTERS, ...readFilters(p), ...(scopeBatchId ? { batch: null } : {}) });
    const s = p.get("sort") as SortKey;
    setSort(s in SORTS ? s : "attention");
  }
  function deleteView(name: string) {
    const next = views.filter((v) => v.name !== name);
    setViews(next);
    try {
      localStorage.setItem(viewsKey, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  const quickIndex = quick ? visible.findIndex((r) => r.id === quick) : -1;
  const quickRow = quickIndex >= 0 ? visible[quickIndex] : quick ? live.find((r) => r.id === quick) : undefined;
  const activeFilterCount =
    (filters.batch && !scopeBatchId ? 1 : 0) + (filters.owner ? 1 : 0) + (filters.source ? 1 : 0) + (filters.tag ? 1 : 0) + (filters.minScore != null ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Stage strip: counts under the other filters, and the stage filter itself. */}
      <div role="group" aria-label="Filter by stage" className="flex overflow-x-auto lg:grid lg:grid-cols-8 rounded-xl border border-border bg-surface">
        {[null, ...PIPELINE_STAGES].map((s, i) => {
          const on = filters.stage === s;
          const n = s ? (stageCounts.get(s) ?? 0) : base.length;
          return (
            <button
              key={s ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => set({ stage: s })}
              className={`relative shrink-0 flex-1 min-w-[104px] text-left px-4 py-3 transition border-border ${i ? "border-l" : ""} ${
                on ? "bg-panel" : "hover:bg-panel/60"
              }`}
            >
              {on && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-secondary" />}
              <span className="flex items-center gap-1.5 text-[13px] text-muted whitespace-nowrap">
                {s && <StageDot stage={s} className="w-[7px] h-[7px]" />}
                {s ? STAGE_LABELS[s] : "All"}
              </span>
              <span className="block text-[22px] font-semibold text-fg mt-1 tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 h-8 w-full sm:w-64 px-2.5 rounded-lg border border-border bg-surface text-subtle focus-within:border-secondary/60">
          <Search className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search name, email or tag"
            aria-label="Search candidates"
            className="flex-1 min-w-0 bg-transparent text-[13px] text-fg placeholder:text-subtle outline-none"
          />
          {filters.q && (
            <button type="button" onClick={() => set({ q: "" })} aria-label="Clear search" className="text-subtle hover:text-fg">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>

        {!scopeBatchId && (
          <FilterMenu
            label="Batch"
            value={filters.batch === "none" ? "No batch" : filters.batch ? batchName(filters.batch) : null}
            onClear={() => set({ batch: null })}
          >
            {(close) => (
              <>
                {batches.map((b) => (
                  <MenuItem key={b.id} active={filters.batch === b.id} onClick={() => (set({ batch: b.id }), close())}>
                    <Layers className="w-3.5 h-3.5 text-subtle" />
                    <span className="flex-1 truncate">{b.name}</span>
                    {b.status === "CLOSED" && <span className="text-xs text-subtle">Closed</span>}
                  </MenuItem>
                ))}
                <MenuItem active={filters.batch === "none"} onClick={() => (set({ batch: "none" }), close())}>
                  No batch
                </MenuItem>
              </>
            )}
          </FilterMenu>
        )}
        <FilterMenu
          label="Owner"
          value={filters.owner === "me" ? "Me" : filters.owner === "none" ? "Unassigned" : filters.owner ? memberName(filters.owner) : null}
          onClear={() => set({ owner: null })}
        >
          {(close) => (
            <>
              <MenuItem active={filters.owner === "me"} onClick={() => (set({ owner: "me" }), close())}>
                Me
              </MenuItem>
              <MenuItem active={filters.owner === "none"} onClick={() => (set({ owner: "none" }), close())}>
                Unassigned
              </MenuItem>
              <MenuLabel>Members</MenuLabel>
              {members.map((m) => (
                <MenuItem key={m.id} active={filters.owner === m.id} onClick={() => (set({ owner: m.id }), close())}>
                  <Avatar name={m.name} size={20} />
                  <span className="truncate">{m.name}</span>
                </MenuItem>
              ))}
            </>
          )}
        </FilterMenu>
        <FilterMenu label="Source" value={filters.source ? sourceLabel(filters.source) : null} onClear={() => set({ source: null })}>
          {(close) =>
            sources.length ? (
              sources.map((s) => (
                <MenuItem key={s} active={filters.source === s} onClick={() => (set({ source: s }), close())}>
                  {sourceLabel(s)}
                </MenuItem>
              ))
            ) : (
              <MenuLabel>No sources yet</MenuLabel>
            )
          }
        </FilterMenu>
        <FilterMenu label="Tags" value={filters.tag} onClear={() => set({ tag: null })}>
          {(close) =>
            tags.length ? (
              tags.map((t) => (
                <MenuItem key={t} active={filters.tag === t} onClick={() => (set({ tag: t }), close())}>
                  <Tag className="w-3.5 h-3.5 text-subtle" />
                  {t}
                </MenuItem>
              ))
            ) : (
              <MenuLabel>No tags yet</MenuLabel>
            )
          }
        </FilterMenu>
        <FilterMenu label="Score" value={filters.minScore != null ? `${filters.minScore} or more` : null} onClear={() => set({ minScore: null })}>
          {(close) =>
            [80, 70, 60, 50].map((v) => (
              <MenuItem key={v} active={filters.minScore === v} onClick={() => (set({ minScore: v }), close())}>
                Combined {v} or more
              </MenuItem>
            ))
          }
        </FilterMenu>
        <button
          type="button"
          aria-pressed={filters.attention}
          onClick={() => set({ attention: !filters.attention })}
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[13px] font-medium transition ${
            filters.attention ? "border-warning/50 bg-warning/15 text-warning" : "border-border text-warning hover:bg-panel"
          }`}
        >
          <Zap className="w-3.5 h-3.5" aria-hidden />
          Needs attention
          <span className={filters.attention ? "text-warning" : "text-subtle"}>{attentionCount}</span>
        </button>
        {activeFilterCount > 0 && (
          <button type="button" onClick={() => set({ ...EMPTY_FILTERS, q: filters.q, stage: filters.stage, archived: filters.archived })} className="h-8 px-2 text-[13px] text-muted hover:text-fg">
            Clear filters
          </button>
        )}

        <div className="flex-1" />

        <Menu
          align="right"
          width={240}
          label="Saved views"
          trigger={(p) => (
            <button type="button" {...p} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-[13px] font-medium text-muted hover:text-fg hover:bg-panel">
              <Star className="w-3.5 h-3.5 text-subtle" aria-hidden />
              Saved views
            </button>
          )}
        >
          {(close) => (
            <>
              {views.length === 0 && <MenuLabel>Save a filter set to reuse it.</MenuLabel>}
              {views.map((v) => (
                <div key={v.name} className="flex items-center">
                  <MenuItem onClick={() => (applyView(v), close())}>
                    <span className="truncate">{v.name}</span>
                  </MenuItem>
                  <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => deleteView(v.name)} className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-subtle hover:text-danger">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <MenuItem onClick={() => (saveView(), close())}>
                  <Plus className="w-3.5 h-3.5 text-subtle" />
                  Save current view
                </MenuItem>
                <MenuItem active={filters.archived} onClick={() => (set({ archived: !filters.archived, stage: null }), close())}>
                  <Archive className="w-3.5 h-3.5 text-subtle" />
                  {filters.archived ? "Back to active candidates" : `Show archived (${archivedCount})`}
                </MenuItem>
              </div>
            </>
          )}
        </Menu>
        {view === "list" && (
          <Menu
            align="right"
            width={200}
            label="Sort"
            trigger={(p) => (
              <button type="button" {...p} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-[13px] font-medium text-muted hover:text-fg hover:bg-panel">
                <ArrowDownUp className="w-3.5 h-3.5 text-subtle" aria-hidden />
                {SORTS[sort]}
              </button>
            )}
          >
            {(close) =>
              (Object.keys(SORTS) as SortKey[]).map((k) => (
                <MenuItem key={k} active={sort === k} onClick={() => (setSort(k), close())}>
                  {SORTS[k]}
                </MenuItem>
              ))
            }
          </Menu>
        )}
        {showViewToggle && onViewChange && (
          <div role="group" aria-label="View" className="flex gap-0.5 p-0.5 rounded-lg bg-panel">
            {(
              [
                ["list", List, "List"],
                ["board", Columns3, "Board"],
              ] as const
            ).map(([id, Icon, text]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => onViewChange(id)}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium transition ${
                  view === id ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {text}
              </button>
            ))}
          </div>
        )}
      </div>

      {filters.archived && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-panel/60 px-3 py-2 text-[13px] text-muted">
          <Archive className="w-3.5 h-3.5" aria-hidden />
          Showing archived candidates. Restore someone to bring them back into the list.
          <button type="button" onClick={() => set({ archived: false })} className="ml-auto font-medium text-secondary-soft hover:underline">
            Back to active
          </button>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-secondary/40 bg-elevated/95 backdrop-blur px-3 py-2 shadow-lg shadow-black/20 animate-[menuIn_140ms_ease-out] motion-reduce:animate-none">
          <span className="text-[13px] font-semibold text-fg pl-1">{selected.size} selected</span>
          {!allVisibleSelected && (
            <button type="button" onClick={() => setSelected(new Set(visible.map((r) => r.id)))} className="h-7 px-2 text-[13px] font-medium text-secondary-soft hover:underline">
              Select all {visible.length}
            </button>
          )}
          <div className="flex-1" />
          {filters.archived ? (
            perms.canDelete && (
              <Btn icon={ArchiveRestore} disabled={busy} onClick={() => run([...selected], { action: "restore" }, (n) => `Restored ${plural(n, "candidate")}`)}>
                Restore
              </Btn>
            )
          ) : (
            <>
              {perms.canPipeline && (
                <Menu
                  label="Move stage"
                  trigger={(p) => (
                    <Btn icon={MoveRight} disabled={busy} {...p}>
                      Move stage
                    </Btn>
                  )}
                >
                  {(close) =>
                    PIPELINE_STAGES.map((s) => (
                      <MenuItem key={s} danger={s === "REJECTED"} onClick={() => (moveTo([...selected], s), close())}>
                        <StageDot stage={s} />
                        {STAGE_LABELS[s]}
                      </MenuItem>
                    ))
                  }
                </Menu>
              )}
              {perms.canWrite && !scopeBatchId && (
                <Menu
                  label="Add to batch"
                  trigger={(p) => (
                    <Btn icon={Layers} disabled={busy} {...p}>
                      Add to batch
                    </Btn>
                  )}
                >
                  {(close) => (
                    <>
                      {batches.filter((b) => b.status === "OPEN").map((b) => (
                        <MenuItem key={b.id} onClick={() => (run([...selected], { action: "batch", batchId: b.id }, (n) => `Added ${plural(n, "candidate")} to ${b.name}`), close())}>
                          <Layers className="w-3.5 h-3.5 text-subtle" />
                          <span className="truncate">{b.name}</span>
                        </MenuItem>
                      ))}
                      {batches.every((b) => b.status !== "OPEN") && <MenuLabel>No open batches yet</MenuLabel>}
                      <div className="border-t border-border mt-1 pt-1">
                        <MenuItem href={`/w/${slug}/batches?new=1`}>
                          <Plus className="w-3.5 h-3.5 text-subtle" />
                          New batch
                        </MenuItem>
                        <MenuItem onClick={() => (run([...selected], { action: "batch", batchId: null }, (n) => `Removed ${plural(n, "candidate")} from their batch`), close())}>
                          Remove from batch
                        </MenuItem>
                      </div>
                    </>
                  )}
                </Menu>
              )}
              <Btn icon={Send} href={`/w/${slug}/take-homes/new?candidates=${[...selected].slice(0, 100).join(",")}`}>
                Send take-home
              </Btn>
              {perms.canWrite && (
                <Menu
                  label="Assign owner"
                  trigger={(p) => (
                    <Btn icon={UserPlus} disabled={busy} {...p}>
                      Assign owner
                    </Btn>
                  )}
                >
                  {(close) => (
                    <>
                      {members.map((m) => (
                        <MenuItem key={m.id} onClick={() => (run([...selected], { action: "owner", ownerId: m.id }, (n) => `Assigned ${plural(n, "candidate")} to ${m.name}`), close())}>
                          <Avatar name={m.name} size={20} />
                          <span className="truncate">{m.name}</span>
                        </MenuItem>
                      ))}
                      <MenuItem onClick={() => (run([...selected], { action: "owner", ownerId: null }, (n) => `Unassigned ${plural(n, "candidate")}`), close())}>Unassign</MenuItem>
                    </>
                  )}
                </Menu>
              )}
              {perms.canWrite && (
                <Btn icon={Tag} disabled={busy} onClick={() => setTagging(true)}>
                  Tag
                </Btn>
              )}
              <Btn icon={Download} onClick={() => exportCsv(selectedRows)}>
                Export
              </Btn>
              {perms.canDelete && (
                <Btn icon={Archive} disabled={busy} onClick={() => setConfirm("archive")}>
                  Archive
                </Btn>
              )}
            </>
          )}
          {perms.isManager && perms.canDelete && (
            <Menu
              align="right"
              label="More bulk actions"
              trigger={(p) => (
                <button type="button" {...p} aria-label="More bulk actions" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            >
              {(close) => (
                <MenuItem danger onClick={() => (setConfirm("erase"), close())}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Erase permanently
                </MenuItem>
              )}
            </Menu>
          )}
          <button type="button" aria-label="Clear selection" onClick={() => setSelected(new Set())} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {view === "list" ? (
        <ListTable
          slug={slug}
          rows={visible.slice(0, limit)}
          total={visible.length}
          selected={selected}
          allSelected={allVisibleSelected}
          onToggleAll={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((r) => r.id)))}
          onToggle={toggle}
          onOpen={setQuick}
          onMore={() => setLimit((l) => l + PAGE)}
          batchName={batchName}
          memberName={memberName}
          showBatch={!scopeBatchId}
          perms={perms}
          quickId={quick}
          onMove={moveTo}
          onArchive={(id, archived) =>
            run([id], { action: archived ? "archive" : "restore" }, () => (archived ? "Archived" : "Restored"), archived ? { action: "restore" } : undefined)
          }
          empty={rows.length === 0}
        />
      ) : (
        <Board
          rows={visible}
          canMove={perms.canPipeline && !filters.archived}
          onMove={moveTo}
          onOpen={setQuick}
          showRejected={showRejected || filters.stage === "REJECTED"}
          onToggleRejected={() => setShowRejected((v) => !v)}
          batchName={batchName}
          showBatch={!scopeBatchId}
        />
      )}

      {quickRow && (
        <QuickView
          slug={slug}
          row={quickRow}
          position={{ index: Math.max(0, quickIndex), total: visible.length }}
          batchName={batchName(quickRow.batchId) || null}
          canPipeline={perms.canPipeline}
          canWrite={perms.canWrite}
          onClose={() => setQuick(null)}
          onStep={(d) => {
            if (quickIndex < 0 || !visible.length) return;
            setQuick(visible[(quickIndex + d + visible.length) % visible.length].id);
          }}
          onMove={(s) => moveTo([quickRow.id], s)}
          onReject={() => setPendingReject([quickRow.id])}
        />
      )}

      {pendingReject && (
        <RejectDialog
          names={live.filter((r) => pendingReject.includes(r.id)).map((r) => r.name)}
          busy={busy}
          onCancel={() => setPendingReject(null)}
          onConfirm={(reason: RejectReason, note) => {
            const ids = pendingReject;
            setPendingReject(null);
            setOverrides((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, "REJECTED"])) }));
            run(ids, { action: "stage", stage: "REJECTED", rejectReason: reason, rejectReasonNote: note }, (n) => `Rejected ${plural(n, "candidate")}`);
          }}
        />
      )}
      {confirm === "archive" && (
        <ConfirmDialog
          title={`Archive ${plural(selected.size, "candidate")}?`}
          body="They leave the list and the board but keep their history and results. You can restore them from Saved views, Show archived."
          confirmLabel="Archive"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const ids = [...selected];
            setConfirm(null);
            run(ids, { action: "archive" }, (n) => `Archived ${plural(n, "candidate")}`, { action: "restore" });
          }}
        />
      )}
      {confirm === "erase" && (
        <ConfirmDialog
          title={`Erase ${plural(selected.size, "candidate")} for good?`}
          body="This removes them and their notes permanently and replaces their name on past take-homes, interviews and screenings with Erased candidate. Scores stay for reporting. This cannot be undone."
          confirmLabel="Erase"
          danger
          requireText="erase"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const ids = [...selected];
            setConfirm(null);
            run(ids, { action: "erase" }, (n) => `Erased ${plural(n, "candidate")}`);
          }}
        />
      )}
      {tagging && (
        <TagDialog
          count={selected.size}
          suggestions={["shortlist", ...tags.filter((t) => t !== "shortlist")]}
          busy={busy}
          onCancel={() => setTagging(false)}
          onConfirm={(add, remove) => {
            setTagging(false);
            run([...selected], { action: "tag", add, remove }, (n) => `Updated tags on ${plural(n, "candidate")}`);
          }}
        />
      )}
      {toasts}
    </div>
  );
}

function FilterMenu({
  label,
  value,
  onClear,
  children,
}: {
  label: string;
  value: string | null;
  onClear: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  return (
    <Menu
      label={label}
      trigger={(p) =>
        value ? (
          <span className="inline-flex items-center h-8 rounded-lg border border-secondary/60 bg-secondary/15 text-secondary-soft text-[13px] font-medium">
            <button type="button" {...p} className="h-full pl-2.5 pr-1.5 max-w-[200px] truncate">
              {label}: {value}
            </button>
            <button type="button" onClick={onClear} aria-label={`Clear ${label} filter`} className="h-full pr-2 pl-0.5 hover:text-fg">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            {...p}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-muted hover:text-fg hover:bg-panel"
          >
            <Plus className="w-3.5 h-3.5 text-subtle" aria-hidden />
            {label}
          </button>
        )
      }
    >
      {children}
    </Menu>
  );
}

const GRID =
  "md:grid md:grid-cols-[36px_minmax(0,1.6fr)_140px_140px_minmax(0,1.1fr)_minmax(0,1.2fr)_120px_32px] md:gap-4 md:items-center";
const GRID_NO_BATCH =
  "md:grid md:grid-cols-[36px_minmax(0,1.6fr)_140px_minmax(0,1.1fr)_minmax(0,1.2fr)_120px_32px] md:gap-4 md:items-center";

function ListTable({
  slug,
  rows,
  total,
  selected,
  allSelected,
  onToggleAll,
  onToggle,
  onOpen,
  onMore,
  batchName,
  memberName,
  showBatch,
  perms,
  quickId,
  onMove,
  onArchive,
  empty,
}: {
  slug: string;
  rows: RosterRow[];
  total: number;
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onMore: () => void;
  batchName: (id: string | null) => string;
  memberName: (id: string | null) => string;
  showBatch: boolean;
  perms: Perms;
  quickId: string | null;
  onMove: (ids: string[], stage: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  empty: boolean;
}) {
  const grid = showBatch ? GRID : GRID_NO_BATCH;
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center">
        <p className="text-[15px] font-medium text-fg">{empty ? "No candidates yet" : "Nobody matches these filters"}</p>
        <p className="text-[13px] text-muted mt-1">
          {empty ? "Add people one at a time, paste a list or upload a CSV." : "Try clearing a filter or searching for something else."}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden" role="table" aria-label="Candidates" aria-rowcount={total}>
      <div role="row" className={`hidden ${grid} px-4 py-2.5 text-xs font-medium text-subtle border-b border-border`}>
        <span role="columnheader" className="flex items-center justify-center">
          <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all" className="w-4 h-4 accent-secondary" />
        </span>
        <span role="columnheader">Candidate</span>
        {showBatch && <span role="columnheader">Batch</span>}
        <span role="columnheader">Stage</span>
        <span role="columnheader">Latest result</span>
        <span role="columnheader">Next step</span>
        <span role="columnheader">Owner</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>
      {rows.map((r) => {
        const sel = selected.has(r.id);
        const owner = memberName(r.ownerId);
        const batch = batchName(r.batchId);
        return (
          <div
            key={r.id}
            role="row"
            onClick={() => onOpen(r.id)}
            className={`group relative flex gap-3 md:gap-0 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${grid} ${
              quickId === r.id ? "bg-panel" : sel ? "bg-secondary/[0.07]" : "hover:bg-panel/60"
            }`}
          >
            <span role="cell" className="flex items-start md:items-center justify-center pt-2 md:pt-0" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={sel} onChange={() => onToggle(r.id)} aria-label={`Select ${r.name}`} className="w-4 h-4 accent-secondary" />
            </span>
            <div role="cell" className="flex items-start md:items-center gap-3 min-w-0 flex-1">
              <Avatar name={r.name} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/w/${slug}/candidates/${r.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium text-fg hover:underline underline-offset-2 truncate block"
                >
                  {r.name}
                </Link>
                <div className="text-[13px] text-subtle truncate">{r.email ?? "No email"}</div>
                {/* Phone and narrow screens: the other columns collapse into one line. */}
                <div className="md:hidden flex flex-wrap items-center gap-2 mt-2">
                  <StageChip stage={r.stage} />
                  <span className="text-xs text-subtle">
                    {r.daysInStage}d{showBatch && batch ? ` · ${batch}` : ""}
                  </span>
                  {r.combined != null && <span className="text-xs font-semibold text-fg">{r.combined}</span>}
                </div>
                <div className="md:hidden mt-1.5">
                  <NextStepPill next={r.next} compact />
                </div>
              </div>
            </div>
            {showBatch && (
              <span role="cell" className="hidden md:flex items-center gap-1.5 text-[13px] text-muted min-w-0">
                {batch ? (
                  <>
                    <Layers className="w-3.5 h-3.5 text-subtle shrink-0" aria-hidden />
                    <span className="truncate">{batch}</span>
                  </>
                ) : (
                  <span className="text-subtle">No batch</span>
                )}
              </span>
            )}
            <div role="cell" className="hidden md:flex flex-col items-start gap-1" onClick={(e) => e.stopPropagation()}>
              {perms.canPipeline && r.status !== "archived" ? (
                <Menu
                  label={`Move ${r.name}`}
                  width={200}
                  trigger={(p) => (
                    <button type="button" {...p} aria-label={`Stage: ${stageLabel(r.stage)}. Change stage`} className="rounded-md hover:ring-1 hover:ring-border-strong">
                      <StageChip stage={r.stage} />
                    </button>
                  )}
                >
                  {(close) =>
                    PIPELINE_STAGES.map((s) => (
                      <MenuItem key={s} active={s === r.stage} danger={s === "REJECTED" && s !== r.stage} onClick={() => (s !== r.stage && onMove([r.id], s), close())}>
                        <StageDot stage={s} />
                        <span className="flex-1">{STAGE_LABELS[s]}</span>
                        {s === r.stage && <Check className="w-3.5 h-3.5 text-secondary-soft" />}
                      </MenuItem>
                    ))
                  }
                </Menu>
              ) : (
                <StageChip stage={r.stage} />
              )}
              <span className={`text-xs ${r.daysInStage >= 7 && r.stage !== "HIRED" && r.stage !== "REJECTED" ? "text-warning" : "text-subtle"}`}>
                {plural(r.daysInStage, "day")} in stage
              </span>
            </div>
            <div role="cell" className="hidden md:block min-w-0">
              {!r.latest && r.pending ? (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] text-fg truncate">{r.pending.text}</span>
                  <span className="text-xs text-subtle truncate">
                    {RESULT_KIND_LABELS[r.pending.kind]} · {r.pending.title}
                  </span>
                </div>
              ) : (
                <ScoreBar value={r.latest?.score ?? null} label={r.latest ? `${RESULT_KIND_LABELS[r.latest.kind]} · ${r.latest.title}` : undefined} />
              )}
            </div>
            <div role="cell" className="hidden md:block min-w-0">
              <NextStepPill next={r.next} />
            </div>
            <div role="cell" className="hidden md:flex items-center gap-2 min-w-0">
              {owner ? (
                <>
                  <Avatar name={owner} size={24} />
                  <span className="text-[13px] text-muted truncate">{owner.split(" ")[0]}</span>
                </>
              ) : (
                <span className="text-[13px] text-subtle">Unassigned</span>
              )}
            </div>
            <div role="cell" className="absolute right-2 top-2 md:static" onClick={(e) => e.stopPropagation()}>
              <Menu
                align="right"
                width={200}
                label={`Actions for ${r.name}`}
                trigger={(p) => (
                  <button type="button" {...p} aria-label={`Actions for ${r.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-subtle hover:text-fg hover:bg-panel">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem href={`/w/${slug}/candidates/${r.id}`}>Open profile</MenuItem>
                    <MenuItem onClick={() => (onOpen(r.id), close())}>Quick view</MenuItem>
                    <MenuItem href={`/w/${slug}/take-homes/new?candidates=${r.id}`}>Send take-home</MenuItem>
                    {perms.canDelete && (
                      <MenuItem onClick={() => (onArchive(r.id, r.status !== "archived"), close())}>
                        {r.status === "archived" ? "Restore" : "Archive"}
                      </MenuItem>
                    )}
                  </>
                )}
              </Menu>
            </div>
          </div>
        );
      })}
      {total > rows.length && (
        <button type="button" onClick={onMore} className="w-full h-11 text-[13px] font-medium text-secondary-soft hover:bg-panel/60 border-t border-border">
          Show {Math.min(PAGE, total - rows.length)} more of {total - rows.length}
        </button>
      )}
    </div>
  );
}

function Board({
  rows,
  canMove,
  onMove,
  onOpen,
  showRejected,
  onToggleRejected,
  batchName,
  showBatch,
}: {
  rows: RosterRow[];
  canMove: boolean;
  onMove: (ids: string[], stage: string) => void;
  onOpen: (id: string) => void;
  showRejected: boolean;
  onToggleRejected: () => void;
  batchName: (id: string | null) => string;
  showBatch: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const by = useMemo(() => {
    const m = new Map<string, RosterRow[]>();
    for (const r of rows) m.set(r.stage, [...(m.get(r.stage) ?? []), r]);
    return m;
  }, [rows]);
  const rejected = by.get("REJECTED") ?? [];

  const dropProps = (stage: string) =>
    canMove
      ? {
          onDragOver: (e: DragEvent) => {
            e.preventDefault();
            setOver(stage);
          },
          onDragLeave: () => setOver((o) => (o === stage ? null : o)),
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

  const card = (r: RosterRow) => (
    <div
      key={r.id}
      role="button"
      tabIndex={0}
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
      className={`flex flex-col gap-2.5 p-3 rounded-[10px] border border-border bg-surface hover:border-border-strong transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${
        dragId === r.id ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Avatar name={r.name} size={26} />
        <span className="text-[13px] font-medium text-fg flex-1 truncate">{r.name}</span>
        {r.combined != null && (
          <span className={`text-[13px] font-semibold tabular-nums ${r.combined >= 80 ? "text-success" : "text-fg"}`}>{r.combined}</span>
        )}
      </div>
      <NextStepPill next={r.next} compact />
      <div className="flex items-center gap-1.5 text-xs text-subtle min-w-0">
        <span className={`shrink-0 ${r.daysInStage >= 7 && r.stage !== "HIRED" && r.stage !== "REJECTED" ? "text-warning" : ""}`}>
          {r.daysInStage}d in stage
        </span>
        {showBatch && r.batchId && <span className="truncate">· {batchName(r.batchId)}</span>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {canMove && <p className="text-[13px] text-subtle">Drag a card to move it. Rejected asks for a reason.</p>}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className={`grid gap-2.5 items-start ${showRejected ? "min-w-[1500px] grid-cols-7" : "min-w-[1330px] grid-cols-[repeat(6,minmax(0,1fr))_64px]"}`}>
          {FLOW.map((s) => {
            const list = by.get(s) ?? [];
            return (
              <section
                key={s}
                aria-label={`${STAGE_LABELS[s]}, ${list.length}`}
                {...dropProps(s)}
                className={`rounded-xl border p-2.5 flex flex-col gap-2 min-h-[140px] transition-colors ${
                  over === s ? "border-secondary/70 bg-secondary/[0.06]" : "border-border bg-bg/60"
                }`}
              >
                <div className="flex items-center justify-between px-1 pt-0.5 pb-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                    <StageDot stage={s} className="w-2 h-2" />
                    {STAGE_LABELS[s]}
                  </span>
                  <span className="text-xs text-subtle tabular-nums">{list.length}</span>
                </div>
                {list.slice(0, 60).map(card)}
                {list.length > 60 && <p className="text-xs text-subtle px-1">and {list.length - 60} more. Filter to narrow down.</p>}
              </section>
            );
          })}
          {showRejected ? (
            <section
              aria-label={`Rejected, ${rejected.length}`}
              {...dropProps("REJECTED")}
              className={`rounded-xl border p-2.5 flex flex-col gap-2 min-h-[140px] ${over === "REJECTED" ? "border-danger/60 bg-danger/[0.06]" : "border-border bg-bg/60"}`}
            >
              <div className="flex items-center justify-between px-1 pt-0.5 pb-1">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                  <StageDot stage="REJECTED" className="w-2 h-2" />
                  Rejected
                </span>
                <button type="button" onClick={onToggleRejected} className="text-xs text-subtle hover:text-fg">
                  Hide
                </button>
              </div>
              {rejected.slice(0, 60).map(card)}
            </section>
          ) : (
            <button
              type="button"
              onClick={onToggleRejected}
              {...dropProps("REJECTED")}
              aria-label={`Show rejected, ${rejected.length}`}
              className={`rounded-xl border h-[220px] flex flex-col items-center gap-2 pt-3 transition-colors ${
                over === "REJECTED" ? "border-danger/60 bg-danger/[0.06]" : "border-border bg-bg/60 hover:bg-panel/60"
              }`}
            >
              <StageDot stage="REJECTED" className="w-2 h-2" />
              <span className="text-xs text-subtle tabular-nums">{rejected.length}</span>
              <span className="[writing-mode:vertical-rl] text-[13px] font-semibold text-muted">Rejected</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
