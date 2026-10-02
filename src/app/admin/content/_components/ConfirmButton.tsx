"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "../_lib/result";

/**
 * A button that asks before it acts. The confirm step is inline (no
 * window.confirm) and can take or require a note, which is passed to the
 * action. `action` is a server action, usually bound to the row id.
 */
export default function ConfirmButton({
  action,
  label,
  confirmLabel,
  prompt,
  withNote = false,
  requireNote = false,
  notePlaceholder,
  tone = "default",
  size = "xs",
  icon,
  disabled,
}: {
  action: (note: string) => Promise<ActionResult | void>;
  label: string;
  confirmLabel?: string;
  /** Sentence shown in the confirm step. Omit (and no note) to act on the first click. */
  prompt?: string;
  withNote?: boolean;
  requireNote?: boolean;
  notePlaceholder?: string;
  tone?: "default" | "danger" | "primary";
  size?: "sm" | "xs";
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const showNote = withNote || requireNote;

  const base =
    size === "xs"
      ? "inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium border transition disabled:opacity-50 whitespace-nowrap"
      : "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border transition disabled:opacity-50 whitespace-nowrap";
  const toneClass =
    tone === "danger"
      ? "border-danger/30 text-danger hover:bg-danger/[0.08]"
      : tone === "primary"
        ? "border-transparent bg-accent text-bg hover:bg-accent-soft"
        : "border-border text-fg bg-surface hover:bg-panel";

  function run() {
    if (requireNote && !note.trim()) {
      setError("Add a note first.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = await action(note.trim());
        if (res && !res.ok) {
          setError(res.error);
          return;
        }
        setOpen(false);
        setNote("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  if (!prompt && !showNote) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button type="button" disabled={disabled || pending} onClick={run} className={`${base} ${toneClass}`}>
          {icon}
          {pending ? "Working…" : label}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={`${base} ${toneClass}`}>
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left w-64 max-w-full">
      {prompt && <p className="text-sm text-fg whitespace-normal">{prompt}</p>}
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          autoFocus
          placeholder={notePlaceholder ?? (requireNote ? "Reason (required)" : "Note (optional)")}
          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-border-strong"
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="h-7 px-2.5 rounded-md text-xs font-medium text-muted hover:text-fg"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={run}
          className={`h-7 px-2.5 rounded-md text-xs font-medium border disabled:opacity-50 ${
            tone === "danger" ? "border-danger/30 text-danger hover:bg-danger/[0.08]" : "border-border bg-panel text-fg hover:bg-elevated"
          }`}
        >
          {pending ? "Working…" : confirmLabel ?? label}
        </button>
      </div>
    </div>
  );
}
