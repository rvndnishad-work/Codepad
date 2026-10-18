"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Star,
  StarOff,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

type BulkAction =
  | "publish"
  | "unpublish"
  | "feature"
  | "unfeature"
  | "reject"
  | "mark-pending"
  | "needs-changes"
  | "delete";

const ACTION_CONFIG: Record<
  BulkAction,
  { label: string; icon: typeof CheckCircle2; tone: "default" | "danger" | "warning" | "success" | "accent" }
> = {
  publish: { label: "Approve & publish", icon: CheckCircle2, tone: "success" },
  unpublish: { label: "Unpublish", icon: XCircle, tone: "default" },
  feature: { label: "Feature", icon: Star, tone: "accent" },
  unfeature: { label: "Unfeature", icon: StarOff, tone: "default" },
  reject: { label: "Reject", icon: XCircle, tone: "danger" },
  "mark-pending": { label: "Mark pending", icon: Clock, tone: "warning" },
  "needs-changes": { label: "Needs changes", icon: AlertCircle, tone: "warning" },
  delete: { label: "Delete", icon: Trash2, tone: "danger" },
};


const BAR_ACTIONS: BulkAction[] = [
  "publish",
  "unpublish",
  "mark-pending",
  "feature",
  "unfeature",
  "needs-changes",
  "reject",
  "delete",
];

type Ctx = {
  selected: Set<string>;
  toggle: (id: string, checked: boolean) => void;
  selectAll: (ids: string[]) => void;
  clearAll: () => void;
};

const BulkCtx = createContext<Ctx | null>(null);

/** Per-row checkbox. Returns null if not inside a BlogsBulkTable. */
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

/** Master "select all" checkbox for the table header. */
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

export default function BlogsBulkTable({
  children,
  apiPath = "/api/admin/blogs/bulk",
}: {
  children: ReactNode;
  apiPath?: string;
}) {
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

  const [confirming, setConfirming] = useState<BulkAction | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const needsReason = (a: BulkAction) => a === "reject" || a === "needs-changes";
  const needsConfirm = (a: BulkAction) => a === "delete" || needsReason(a);

  async function runAction(action: BulkAction) {
    if (selected.size === 0) return;
    if (needsConfirm(action) && confirming !== action) {
      setConfirming(action);
      setReason("");
      setError(null);
      return;
    }
    if (needsReason(action) && !reason.trim()) {
      setError("Add a reason. Each author gets it in a notification.");
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : `Failed: ${action}`);
      }
      setSelected(new Set());
      setConfirming(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <BulkCtx.Provider value={ctx}>
      {children}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-surface border border-border rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2 max-w-[920px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pr-3 border-r border-border text-sm text-fg tabular-nums">{selected.size} selected</span>
              {BAR_ACTIONS.map((a) => {
                const conf = ACTION_CONFIG[a];
                const Icon = conf.icon;
                return (
                  <button
                    key={a}
                    onClick={() => runAction(a)}
                    disabled={busy !== null}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium transition disabled:opacity-50 ${
                      confirming === a ? "border-border-strong bg-panel text-fg" : "border-border bg-surface text-fg hover:bg-panel"
                    } ${conf.tone === "danger" ? "text-danger" : ""}`}
                  >
                    {busy === a ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                    {conf.label}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setSelected(new Set());
                  setConfirming(null);
                }}
                disabled={busy !== null}
                className="ml-1 p-1.5 rounded-md text-muted hover:text-fg hover:bg-panel transition disabled:opacity-50"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {confirming && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                {needsReason(confirming) ? (
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                    placeholder="Reason for the authors (required)"
                    className="flex-1 min-w-[220px] h-8 rounded-md border border-border bg-bg px-2.5 text-sm text-fg focus:outline-none focus:border-border-strong"
                  />
                ) : (
                  <span className="text-sm text-fg">
                    Delete {selected.size} post{selected.size === 1 ? "" : "s"} and their comments? This cannot be undone.
                  </span>
                )}
                <button
                  onClick={() => runAction(confirming)}
                  disabled={busy !== null}
                  className="h-8 px-3 rounded-md border border-danger/30 text-danger text-sm font-medium hover:bg-danger/[0.08] disabled:opacity-50"
                >
                  Confirm {ACTION_CONFIG[confirming].label.toLowerCase()}
                </button>
                <button onClick={() => setConfirming(null)} className="h-8 px-2 text-sm text-muted hover:text-fg">
                  Cancel
                </button>
              </div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </div>
      )}
    </BulkCtx.Provider>
  );
}
