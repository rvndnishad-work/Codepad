"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

type BulkAction = "publish" | "unpublish" | "feature" | "unfeature" | "markPremium" | "markFree" | "archive" | "restore" | "delete";

const LABEL: Record<BulkAction, string> = {
  publish: "Publish",
  unpublish: "Unpublish",
  feature: "Feature",
  unfeature: "Unfeature",
  markPremium: "Premium",
  markFree: "Free",
  archive: "Archive",
  restore: "Restore",
  delete: "Delete",
};

const GROUPS: BulkAction[][] = [
  ["publish", "unpublish"],
  ["feature", "unfeature"],
  ["markPremium", "markFree"],
  ["archive", "restore", "delete"],
];

const CONFIRM: Partial<Record<BulkAction, (n: number) => string>> = {
  archive: (n) => `Archive ${n}? They leave every list and page; attempts and take-homes are kept.`,
  delete: (n) => `Delete ${n} for good? Only challenges with no attempts or take-homes are deleted; the rest are skipped.`,
};

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
  return (
    <input
      type="checkbox"
      checked={ctx.selected.has(id)}
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
  const [confirming, setConfirming] = useState<BulkAction | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
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
    if (CONFIRM[action] && confirming !== action) {
      setConfirming(action);
      setMessage(null);
      return;
    }
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/challenges/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; message?: string };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Failed: ${action}`);
      setConfirming(null);
      if (data.message) setMessage({ text: data.message, bad: false });
      else setSelected(new Set());
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Bulk action failed.", bad: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <BulkCtx.Provider value={ctx}>
      {children}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-surface border border-border rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2 max-w-[95vw]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pr-3 border-r border-border text-sm text-fg tabular-nums">{selected.size} selected</span>
              {GROUPS.map((g, gi) => (
                <div key={gi} className="flex items-center gap-1">
                  {g.map((a) => (
                    <button
                      key={a}
                      onClick={() => runAction(a)}
                      disabled={busy !== null}
                      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-xs font-medium transition disabled:opacity-50 ${
                        confirming === a ? "border-border-strong bg-panel" : "border-border bg-surface hover:bg-panel"
                      } ${a === "delete" ? "text-danger" : "text-fg"}`}
                    >
                      {busy === a && <Loader2 className="w-3 h-3 animate-spin" />}
                      {LABEL[a]}
                    </button>
                  ))}
                </div>
              ))}
              <button
                onClick={() => {
                  setSelected(new Set());
                  setConfirming(null);
                  setMessage(null);
                }}
                disabled={busy !== null}
                className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-panel transition disabled:opacity-50"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {confirming && CONFIRM[confirming] && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                <span className="text-sm text-fg">{CONFIRM[confirming]!(selected.size)}</span>
                <button
                  onClick={() => runAction(confirming)}
                  disabled={busy !== null}
                  className="h-7 px-2.5 rounded-md border border-danger/30 text-danger text-xs font-medium hover:bg-danger/[0.08] disabled:opacity-50"
                >
                  {LABEL[confirming]}
                </button>
                <button onClick={() => setConfirming(null)} className="h-7 px-2 text-xs text-muted hover:text-fg">
                  Cancel
                </button>
              </div>
            )}
            {message && <p className={`text-xs ${message.bad ? "text-danger" : "text-muted"}`}>{message.text}</p>}
          </div>
        </div>
      )}
    </BulkCtx.Provider>
  );
}
