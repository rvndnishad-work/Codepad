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
  DollarSign,
  Sparkles,
} from "lucide-react";

type BulkAction = "publish" | "unpublish" | "feature" | "unfeature" | "delete" | "markPremium" | "markFree";

const ACTION_CONFIG: Record<
  BulkAction,
  { label: string; icon: any; tone: "default" | "danger" | "success" | "accent" | "premium" | "free" }
> = {
  publish: { label: "Publish", icon: CheckCircle2, tone: "success" },
  unpublish: { label: "Draft", icon: XCircle, tone: "default" },
  feature: { label: "Feature", icon: Star, tone: "accent" },
  unfeature: { label: "Unfeature", icon: StarOff, tone: "default" },
  markPremium: { label: "Premium", icon: DollarSign, tone: "premium" },
  markFree: { label: "Free", icon: Sparkles, tone: "free" },
  delete: { label: "Delete", icon: Trash2, tone: "danger" },
};

const TONE_CLASS: Record<string, string> = {
  default: "bg-surface border-border text-muted hover:text-fg hover:bg-elevated",
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/15",
  danger: "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15",
  accent: "bg-accent/10 border-accent/30 text-accent hover:bg-accent/15",
  premium: "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/15 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-400",
  free: "bg-slate-500/10 border-slate-500/30 text-slate-500 hover:bg-slate-500/15 dark:bg-slate-500/20 dark:border-slate-500/40 dark:text-slate-400",
};

const BAR_ACTIONS: BulkAction[] = ["publish", "unpublish", "feature", "unfeature", "markPremium", "markFree", "delete"];

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

  function renderButton(a: BulkAction) {
    const conf = ACTION_CONFIG[a];
    const Icon = conf.icon;
    const isBusy = busy === a;
    return (
      <button
        onClick={() => runAction(a)}
        disabled={busy !== null}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wide transition-all duration-200 disabled:opacity-50 shrink-0 ${TONE_CLASS[conf.tone]}`}
      >
        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
        {conf.label}
      </button>
    );
  }

  return (
    <BulkCtx.Provider value={ctx}>
      {children}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-white/95 dark:bg-[#0c0d15]/95 backdrop-blur-md border border-slate-200 dark:border-[#1d2035] rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3.5 max-w-[95vw] sm:max-w-max select-none">
            <div className="flex items-center gap-2 pr-3.5 border-r border-slate-200 dark:border-border/10 shrink-0">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-bg text-[11px] font-black font-mono tabular-nums shadow-sm">
                {selected.size}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-fg">selected</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5">
              {/* Group 1: Status */}
              <div className="flex items-center gap-1 shrink-0">
                {renderButton("publish")}
                {renderButton("unpublish")}
              </div>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-border/10 shrink-0" />

              {/* Group 2: Accent */}
              <div className="flex items-center gap-1 shrink-0">
                {renderButton("feature")}
                {renderButton("unfeature")}
              </div>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-border/10 shrink-0" />

              {/* Group 3: Monetization */}
              <div className="flex items-center gap-1 shrink-0">
                {renderButton("markPremium")}
                {renderButton("markFree")}
              </div>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-border/10 shrink-0" />

              {/* Group 4: Destructive */}
              <div className="shrink-0">
                {renderButton("delete")}
              </div>
            </div>

            <div className="pl-1 border-l border-slate-200 dark:border-border/10 shrink-0 flex items-center">
              <button
                onClick={() => setSelected(new Set())}
                disabled={busy !== null}
                className="p-1.5 rounded-xl text-muted hover:text-fg hover:bg-slate-100 dark:hover:bg-black/20 transition disabled:opacity-50"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </BulkCtx.Provider>
  );
}
