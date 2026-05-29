"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DeleteSessionButton({
  sessionId,
  size = "default",
}: {
  sessionId: string;
  /** "default" matches the recruiter row's h-10 actions; "sm" matches the
   *  compact h-8 actions in the candidate practice list. */
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Size variants — the button height + icon stay together so the trigger
  // looks intentional next to the row's primary action button.
  const triggerClass =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : "h-10 w-10 rounded-xl";
  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while the confirmation modal is open so the user can't
  // scroll the page behind it (which would reveal undimmed footer/cards).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function handleDelete() {
    setIsOpen(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = (await res.text()) || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      toast.success("Session deleted");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast.error("Delete failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={loading}
        aria-label="Delete interview session"
        className={`${triggerClass} border border-border bg-bg text-muted hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all duration-200 flex items-center justify-center shrink-0 disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]`}
        title="Delete interview session"
      >
        {loading ? <Loader2 className={`${iconClass} animate-spin`} /> : <Trash2 className={iconClass} />}
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-panel p-6 flex flex-col gap-5 shadow-2xl shadow-black/40 ring-1 ring-border scale-100 transition-transform duration-300">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-fg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Confirm Session Deletion
              </h3>
              <p className="text-xs text-muted/80 leading-relaxed font-sans">
                Are you sure you want to delete this interview session? All records, candidate logs, and test attempts will be permanently erased. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface text-xs font-bold text-muted hover:text-fg hover:bg-elevated transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
