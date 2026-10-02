"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export type ActionResult = { ok: true; message?: string; redirectTo?: string } | { ok: false; error: string };

/**
 * A button that opens an inline confirm step before running a server action.
 * With `noteLabel` the step asks for a note, and Confirm stays off until one
 * is typed. No window.confirm: the step is part of the page, so it works the
 * same in every browser and can show what is about to happen.
 */
export default function ConfirmAction({
  label,
  title,
  body,
  confirmLabel = "Confirm",
  noteLabel,
  notePlaceholder,
  tone = "default",
  run,
  small,
}: {
  label: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  /** When set, a note is required. */
  noteLabel?: string;
  notePlaceholder?: string;
  tone?: "default" | "danger";
  run: (note: string) => Promise<ActionResult>;
  small?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const trigger = small
    ? "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 text-sm text-fg transition hover:border-border-strong hover:bg-panel disabled:opacity-50"
    : "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg transition hover:border-border-strong hover:bg-panel disabled:opacity-50";
  const confirmCls =
    tone === "danger"
      ? "inline-flex h-9 items-center gap-1.5 rounded-lg bg-danger-solid px-3 text-sm font-medium text-white disabled:opacity-50"
      : "inline-flex h-9 items-center gap-1.5 rounded-lg bg-fg px-3 text-sm font-medium text-bg disabled:opacity-50";

  const needsNote = Boolean(noteLabel);
  const canConfirm = !pending && (!needsNote || note.trim().length > 0);

  const confirm = () =>
    start(async () => {
      try {
        const res = await run(note.trim());
        setResult(res);
        if (res.ok) {
          setOpen(false);
          setNote("");
          if (res.redirectTo) router.push(res.redirectTo);
          else router.refresh();
        }
      } catch (err) {
        setResult({ ok: false, error: err instanceof Error ? err.message : "Something went wrong." });
      }
    });

  if (!open) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button type="button" className={trigger} onClick={() => { setOpen(true); setResult(null); }}>
          {label}
        </button>
        {result?.ok && result.message && <span role="status" className="text-xs text-success">{result.message}</span>}
      </span>
    );
  }

  return (
    <div role="alertdialog" aria-label={title} className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-border-strong bg-surface p-4 text-left">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {body && <div className="text-sm text-muted">{body}</div>}
      {needsNote && (
        <label className="flex flex-col gap-1 text-xs text-muted">
          {noteLabel} (required)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={notePlaceholder}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-secondary/60 focus:outline-none"
          />
        </label>
      )}
      {result && !result.ok && <p role="alert" className="text-sm text-danger">{result.error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={!canConfirm} onClick={confirm} className={confirmCls}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => { setOpen(false); setResult(null); }}
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm text-fg hover:bg-panel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
