"use client";

import { useId, useState, useTransition } from "react";
import { setFeatureSwitch, type SetSwitchResult } from "./actions";
import { MESSAGE_MAX, NOTE_MAX, NOTE_MIN, STATE_LABELS } from "./validate";
import type { SwitchState, SwitchView } from "./types";

const EFFECT: Record<SwitchState, string> = {
  on: "The function works normally again.",
  read_only: "Pages stay open and running work finishes; nothing new starts or saves.",
  off: "The function is replaced by your message.",
};

/** datetime-local value (local time) for an ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Inline confirm panel for a switch change: what it does, the message people
 * will see, an optional turn-back-on time and a required note. Calls the
 * setFeatureSwitch server action; `onDone` gets the result on success.
 */
export default function SwitchConfirm({
  view,
  target,
  onCancel,
  onDone,
}: {
  view: SwitchView;
  target: SwitchState;
  onCancel: () => void;
  onDone?: (result: Extract<SetSwitchResult, { ok: true }>) => void;
}) {
  const id = useId();
  const [message, setMessage] = useState(view.state === "on" ? view.defaultMessage : view.message);
  const [resumeAt, setResumeAt] = useState(target === "on" ? "" : toLocalInput(view.resumeAt));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const turningOn = target === "on";
  const noteOk = note.trim().length >= NOTE_MIN;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!noteOk) {
      setError("Write a short note saying why.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await setFeatureSwitch({
        key: view.key,
        state: target,
        message: turningOn ? null : message,
        resumeAt: !turningOn && resumeAt ? new Date(resumeAt).toISOString() : null,
        note,
      });
      if (!res.ok) setError(res.error);
      else onDone?.(res);
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label={`Change ${view.label}`}
      className="mt-2 flex flex-col gap-3 rounded-lg border border-border bg-panel p-3 text-sm"
    >
      <div>
        <p className="font-medium text-fg">
          Set {view.label} to {STATE_LABELS[target]}?
        </p>
        <p className="mt-0.5 text-xs text-muted">{EFFECT[target]}</p>
        {view.alsoAffects.length > 0 && !turningOn && (
          <p className="mt-1 text-xs text-muted">Also stops: {view.alsoAffects.join(", ")}.</p>
        )}
      </div>

      {!turningOn && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Message people see</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX}
              rows={2}
              placeholder={view.defaultMessage || "This is paused for maintenance."}
              className="w-full resize-y rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Turn back on at (optional)</span>
            <input
              type="datetime-local"
              value={resumeAt}
              onChange={(e) => setResumeAt(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1" htmlFor={`${id}-note`}>
        <span className="text-xs font-medium text-muted">Note (required, goes in the audit log)</span>
        <input
          id={`${id}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          required
          autoFocus
          placeholder="Why, for the audit log"
          className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      </label>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-medium text-fg hover:bg-bg disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !noteOk}
          className="h-8 rounded-md bg-ink px-3 text-xs font-medium text-ink-fg hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : `Set to ${STATE_LABELS[target]}`}
        </button>
      </div>
    </form>
  );
}
