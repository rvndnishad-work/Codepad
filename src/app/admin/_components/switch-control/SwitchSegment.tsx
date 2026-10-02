"use client";

import type { SwitchState } from "./types";

const OPTIONS: { state: SwitchState; label: string; short: string }[] = [
  { state: "on", label: "On", short: "On" },
  { state: "read_only", label: "Read only", short: "Read" },
  { state: "off", label: "Off", short: "Off" },
];

/** Selected-state colours: green on, amber read only, slate off. Readable on both themes. */
const SELECTED: Record<SwitchState, string> = {
  on: "bg-success/15 text-success",
  read_only: "bg-warning/15 text-warning",
  off: "bg-panel text-fg",
};

/**
 * Three-state segmented control: On / Read only / Off. Controlled; selecting a
 * different state calls `onSelect`, which should open SwitchConfirm rather
 * than change anything directly. `pending` marks the state awaiting confirm.
 */
export default function SwitchSegment({
  value,
  pending,
  onSelect,
  disabled,
  label,
  compact,
}: {
  value: SwitchState;
  pending?: SwitchState | null;
  onSelect: (state: SwitchState) => void;
  disabled?: boolean;
  /** Screen-reader name, e.g. "AI screening". */
  label: string;
  /** "Read" instead of "Read only", for narrow rails. */
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-8 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
      {OPTIONS.map((o, i) => {
        const selected = o.state === value;
        const isPending = pending === o.state && !selected;
        return (
          <button
            key={o.state}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.label}
            disabled={disabled}
            onClick={() => !selected && onSelect(o.state)}
            className={[
              "min-w-[44px] px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              i > 0 ? "border-l border-border" : "",
              selected ? SELECTED[o.state] : isPending ? "bg-panel text-fg underline underline-offset-4" : "text-muted hover:bg-panel hover:text-fg",
            ].join(" ")}
          >
            {compact ? o.short : o.label}
          </button>
        );
      })}
    </div>
  );
}
