"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Check } from "lucide-react";

type Status = "active" | "future_hire" | "do_not_hire" | "hired" | "rejected" | "archived";

type Props = {
  workspaceSlug: string;
  candidateId: string;
  initialStatus: string;
};

const STATUS_BADGES: Record<Status, string> = {
  active: "text-secondary border-secondary/25 bg-secondary/[0.08]",
  future_hire: "text-warning border-warning/30 bg-warning/[0.08]",
  do_not_hire: "text-danger border-danger/40 bg-danger/[0.10]",
  hired: "text-success border-success/25 bg-success/[0.06]",
  rejected: "text-danger border-danger/25 bg-danger/[0.06]",
  archived: "text-muted border-border bg-panel/50",
};

const STATUS_LABELS: Record<Status, string> = {
  active: "Active",
  future_hire: "Future hire",
  do_not_hire: "Do not hire",
  hired: "Hired",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUSES: Status[] = ["active", "future_hire", "do_not_hire", "hired", "rejected", "archived"];

export default function CandidateStatusControl({ workspaceSlug, candidateId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>((initialStatus as Status) || "active");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function pick(next: Status) {
    setOpen(false);
    if (next === status) return;
    setPending(true);
    const prev = status;
    setStatus(next);
    try {
      const res = await fetch(`/api/w/${workspaceSlug}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Status set to ${next}`);
      router.refresh();
    } catch (err) {
      setStatus(prev);
      toast.error("Failed to update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors disabled:opacity-60 ${STATUS_BADGES[status]}`}
      >
        <span>{STATUS_LABELS[status]}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-40 rounded-lg border border-border bg-elevated shadow-2xl ring-1 ring-black/5 dark:ring-white/5 z-30 overflow-hidden">
          <div className="text-xs font-semibold text-muted/60 px-3 pt-2.5 pb-1.5 border-b border-border/60">
            Set status
          </div>
          <div className="p-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => pick(s)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                  s === status
                    ? "bg-secondary/15 text-secondary hover:bg-secondary/25"
                    : "text-muted hover:text-fg hover:bg-secondary/10 dark:hover:bg-secondary/15"
                }`}
              >
                <span>{STATUS_LABELS[s]}</span>
                {s === status && <Check className="w-3.5 h-3.5 text-secondary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
