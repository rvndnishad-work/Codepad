"use client";

import { useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { REPORT_REASONS } from "@/app/api/reports/reasons";

type TargetType = "blog_comment" | "question_comment" | "blog" | "snippet" | "experience";

/**
 * Small "Report" control: a flag button that opens a reason picker and posts
 * to /api/reports. Render it only for signed-in viewers who are not the author.
 */
export default function ReportButton({
  targetType,
  targetId,
  className = "",
  label = false,
  up = false,
}: {
  targetType: TargetType;
  targetId: string;
  className?: string;
  /** Show the word "Report" next to the flag. */
  label?: boolean;
  /** Open the picker above the button, left-aligned (for corner placements). */
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function send() {
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, detail: detail.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not send the report.");
      }
      setState("done");
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "Could not send the report.");
    }
  }

  return (
    <div ref={box} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-muted/60 hover:text-fg transition-colors text-xs"
        title="Report"
        aria-label="Report"
        aria-expanded={open}
      >
        <Flag className="w-3.5 h-3.5" />
        {label && "Report"}
      </button>
      {open && (
        <div className={`absolute z-50 w-64 ${up ? "left-0 bottom-full mb-2" : "right-0 mt-1"} rounded-lg border border-border bg-surface p-3 shadow-lg text-left`}>
          {state === "done" ? (
            <p className="text-sm text-fg">Thanks. A moderator will take a look.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">Report this</p>
              <div className="space-y-1">
                {REPORT_REASONS.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                    <input type="radio" name={`report-${targetId}`} value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-accent" />
                    {r.label}
                  </label>
                ))}
              </div>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Anything else? (optional)"
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-7 px-2 text-xs text-muted hover:text-fg">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={state === "sending"}
                  className="h-7 px-2.5 rounded-md border border-border bg-panel text-xs font-medium text-fg hover:bg-elevated disabled:opacity-50"
                >
                  {state === "sending" ? "Sending…" : "Send report"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
