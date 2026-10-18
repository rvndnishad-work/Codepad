"use client";

/**
 * Three-state switch (On / Read only / Off) with an inline confirm panel.
 * Local copy for the Developers dashboard; same behaviour as the shared
 * control under src/app/admin/_components/switch-control/ (the lead unifies).
 */
import { useId, useState, useTransition } from "react";
import { setDeveloperSwitch } from "./actions";
import type { SwitchState } from "@/lib/admin/switches";

export type SwitchControlProps = {
  switchKey: string;
  label: string;
  /** Second line under the label: what it covers, or since when it is paused. */
  detail?: string | null;
  state: SwitchState;
  /** Current message, or the registry default. */
  message: string;
  resumeAt: string | null;
};

const OPTIONS: { value: SwitchState; short: string; long: string }[] = [
  { value: "on", short: "On", long: "On" },
  { value: "read_only", short: "Read", long: "Read only" },
  { value: "off", short: "Off", long: "Off" },
];

const SELECTED: Record<SwitchState, string> = {
  on: "bg-success/15 text-success",
  read_only: "bg-warning/15 text-warning",
  off: "bg-panel text-fg",
};

/** "2026-10-02T15:30" in the viewer's local time, for datetime-local. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SwitchControl({ switchKey, label, detail, state, message, resumeAt }: SwitchControlProps) {
  const id = useId();
  const [target, setTarget] = useState<SwitchState | null>(null);
  const [msg, setMsg] = useState(message);
  const [resume, setResume] = useState(toLocalInput(resumeAt));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: SwitchState) {
    if (pending) return;
    if (next === state) {
      setTarget(null);
      return;
    }
    setTarget(next);
    setError(null);
    setNote("");
    setMsg(message);
    setResume(next === "on" ? "" : toLocalInput(resumeAt));
  }

  function confirm() {
    if (!target) return;
    if (note.trim().length < 3) {
      setError("Write a short note saying why.");
      return;
    }
    let resumeIso: string | null = null;
    if (target !== "on" && resume) {
      const d = new Date(resume);
      if (Number.isNaN(d.getTime())) {
        setError("The resume time is not a valid date.");
        return;
      }
      resumeIso = d.toISOString();
    }
    setError(null);
    startTransition(async () => {
      const res = await setDeveloperSwitch({
        key: switchKey,
        state: target,
        message: target === "on" ? null : msg,
        resumeAt: resumeIso,
        note,
      }).catch(() => ({ ok: false as const, error: "Could not save. Try again." }));
      if (res.ok) setTarget(null);
      else setError(res.error);
    });
  }

  const shown = target ?? state;
  const targetLabel = OPTIONS.find((o) => o.value === target)?.long ?? "";

  return (
    <div className="py-3 border-t border-border first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-fg">{label}</div>
          {detail && <div className="text-xs text-muted mt-0.5">{detail}</div>}
        </div>
        <div
          role="radiogroup"
          aria-label={`${label} state`}
          className="inline-flex shrink-0 h-8 rounded-lg border border-border overflow-hidden"
        >
          {OPTIONS.map((o, i) => {
            const selected = shown === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                title={o.long}
                aria-label={o.long}
                disabled={pending}
                onClick={() => choose(o.value)}
                className={`min-w-[44px] px-2.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  i > 0 ? "border-l border-border" : ""
                } ${selected ? SELECTED[o.value] : "bg-surface text-muted hover:bg-panel hover:text-fg"} ${
                  selected && target ? "underline underline-offset-4" : ""
                }`}
              >
                {o.short}
              </button>
            );
          })}
        </div>
      </div>

      {target && (
        <div className="mt-3 rounded-lg border border-border bg-bg p-3 space-y-3" role="group" aria-labelledby={`${id}-h`}>
          <div id={`${id}-h`} className="text-sm font-medium text-fg">
            Set {label} to {targetLabel.toLowerCase()}?
          </div>
          <p className="text-xs text-muted">
            {target === "on" && "The function starts working again for everyone."}
            {target === "read_only" && "Pages stay open and running work finishes, but nothing new starts or saves."}
            {target === "off" && "The function is replaced by your message everywhere it appears."}
          </p>

          {target !== "on" && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-muted">Message people see</span>
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-secondary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Turn back on at (optional)</span>
                <input
                  type="datetime-local"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg focus:outline-none focus:border-secondary"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="text-xs font-medium text-muted">Note for the audit log (required)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              maxLength={2000}
              placeholder="Why you are changing it"
              className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-secondary"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTarget(null)}
              disabled={pending}
              className="h-8 px-3 rounded-md border border-border bg-surface text-xs font-medium text-fg hover:bg-panel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={pending || note.trim().length < 3}
              className="h-8 px-3 rounded-md bg-ink text-ink-fg text-xs font-medium disabled:opacity-50"
            >
              {pending ? "Saving…" : `Set to ${targetLabel.toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
