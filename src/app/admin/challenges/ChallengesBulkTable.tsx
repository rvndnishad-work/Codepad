"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Star,
  StarOff,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

type BulkAction = "publish" | "unpublish" | "feature" | "unfeature" | "delete";

const ACTION_CONFIG: Record<
  BulkAction,
  { label: string; icon: typeof CheckCircle2; tone: "default" | "danger" | "success" | "accent" }
> = {
  publish: { label: "Publish", icon: CheckCircle2, tone: "success" },
  unpublish: { label: "Unpublish", icon: XCircle, tone: "default" },
  feature: { label: "Feature", icon: Star, tone: "accent" },
  unfeature: { label: "Unfeature", icon: StarOff, tone: "default" },
  delete: { label: "Delete", icon: Trash2, tone: "danger" },
};

const TONE_CLASS: Record<string, string> = {
  default: "bg-surface border-border text-muted hover:text-fg hover:bg-elevated",
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/15",
  danger: "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15",
  accent: "bg-accent/10 border-accent/30 text-accent hover:bg-accent/15",
};

const BAR_ACTIONS: BulkAction[] = ["publish", "unpublish", "feature", "unfeature", "delete"];

type Ctx = {
  selected: Set<string>;
  toggle: (id: string, checked: boolean) => void;
  selectAll: (ids: string[]) => void;
  clearAll: () => void;
};

const BulkCtx = createContext<Ctx | null>(null);

export function BulkRowCheckbox({ id }: { id: string }) {
  const ctx = useContext(BulkCtx);
  if (!ctx) return null;
  const checked = ctx.selected.has(id);
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => ctx.toggle(id, e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="w-3.5 h-3.5 accent-accent cursor-pointer"
      aria-label="Select row"
    />
  );
}

export function BulkHeaderCheckbox({ ids }: { ids: string[] }) {
  const ctx = useContext(BulkCtx);
  const ref = useRef<HTMLInputElement>(null);
  const allSelected = ctx ? ids.length > 0 && ids.every((id) => ctx.selected.has(id)) : false;
  const someSelected = ctx ? ids.some((id) => ctx.selected.has(id)) : false;
  const indeterminate = someSelected && !allSelected;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  if (!ctx) return null;
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      onChange={(e) => (e.target.checked ? ctx.selectAll(ids) : ctx.clearAll())}
      className="w-3.5 h-3.5 accent-accent cursor-pointer"
      aria-label="Select all rows on this page"
    />
  );
}

export default function ChallengesBulkTable({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const router = useRouter();

  const ctx = useMemo<Ctx>(
    () => ({
      selected,
      toggle: (id, checked) => {
        setSelected((prev) => {
          const next = new Set(prev);
          if (checked) next.add(id);
          else next.delete(id);
          return next;
        });
      },
      selectAll: (ids) => setSelected(new Set(ids)),
      clearAll: () => setSelected(new Set()),
    }),
    [selected],
  );

  async function runAction(action: BulkAction) {
    if (selected.size === 0) return;
    const count = selected.size;
    if (action === "delete" && !confirm(`Delete ${count} challenge${count === 1 ? "" : "s"}? This action can't be undone — attempts will also be deleted.`)) {
      return;
    }
    setBusy(action);
    try {
      const res = await fetch("/api/admin/challenges/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed: ${action}`);
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <BulkCtx.Provider value={ctx}>
      {children}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-bg/95 backdrop-blur border border-border rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2 max-w-[920px]">
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-bg text-xs font-black tabular-nums">
                {selected.size}
              </span>
              <span className="text-xs font-bold text-fg">selected</span>
            </div>

            {BAR_ACTIONS.map((a) => {
              const conf = ACTION_CONFIG[a];
              const Icon = conf.icon;
              const isBusy = busy === a;
              return (
                <button
                  key={a}
                  onClick={() => runAction(a)}
                  disabled={busy !== null}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition disabled:opacity-50 ${TONE_CLASS[conf.tone]}`}
                >
                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                  {conf.label}
                </button>
              );
            })}

            <button
              onClick={() => setSelected(new Set())}
              disabled={busy !== null}
              className="ml-1 p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition disabled:opacity-50"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </BulkCtx.Provider>
  );
}
