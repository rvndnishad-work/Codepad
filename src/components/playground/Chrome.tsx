"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { History, Lock } from "lucide-react";

/**
 * Keyboard- and pointer-operable pane divider. Arrow keys nudge the pane by
 * 16px (Shift: 64px); `invert` is for panes anchored to the right of or below
 * their handle, where moving the handle left or up grows them.
 */
export function ResizeHandle({
  orientation,
  label,
  value,
  min,
  max,
  onPointerDown,
  onResize,
  invert = false,
}: {
  /** "vertical" = a vertical line between side-by-side panes. */
  orientation: "vertical" | "horizontal";
  label: string;
  value: number;
  min: number;
  max: number;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onResize: (next: number) => void;
  invert?: boolean;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = orientation === "vertical" ? ["ArrowRight"] : ["ArrowDown"];
    const shrink = orientation === "vertical" ? ["ArrowLeft"] : ["ArrowUp"];
    let dir = 0;
    if (grow.includes(e.key)) dir = 1;
    else if (shrink.includes(e.key)) dir = -1;
    else if (e.key === "Home") return (e.preventDefault(), onResize(invert ? max : min));
    else if (e.key === "End") return (e.preventDefault(), onResize(invert ? min : max));
    else return;
    e.preventDefault();
    const step = (e.shiftKey ? 64 : 16) * dir * (invert ? -1 : 1);
    onResize(Math.min(max, Math.max(min, value + step)));
  };
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="pg-divider touch-none select-none"
    />
  );
}

/**
 * Percentage-based vertical split for the stacked phone layout. Tracks a
 * pointer drag as a % of the container height so it works with mouse and
 * touch (the handle carries `touch-none` so the browser does not steal the
 * gesture for scrolling).
 */
export function useVerticalSplit(initialPct: number, min = 12, max = 88) {
  const [split, setSplitState] = useState(initialPct);
  const splitRef = useRef(initialPct);
  const setSplit = useCallback(
    (pct: number) => {
      const next = Math.min(max, Math.max(min, pct));
      splitRef.current = next;
      setSplitState(next);
    },
    [min, max],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const container = e.currentTarget.parentElement;
      if (!container) return;
      e.preventDefault();
      const total = container.getBoundingClientRect().height;
      const startY = e.clientY;
      const startSplit = splitRef.current;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture unsupported — document listeners still track */
      }
      const onPointerMove = (ev: globalThis.PointerEvent) => {
        setSplit(startSplit + ((ev.clientY - startY) / Math.max(1, total)) * 100);
      };
      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        document.body.style.userSelect = "";
      };
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
      document.body.style.userSelect = "none";
    },
    [setSplit],
  );

  return { split, setSplit, onPointerDown, min, max };
}

/** Grab handle between stacked phone panes: a bottom-sheet style grip. */
export function MobileSplitHandle({
  label,
  split,
}: {
  label: string;
  split: ReturnType<typeof useVerticalSplit>;
}) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={Math.round(split.split)}
      aria-valuemin={split.min}
      aria-valuemax={split.max}
      tabIndex={0}
      onPointerDown={split.onPointerDown}
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        split.setSplit(split.split + (e.key === "ArrowDown" ? 5 : -5));
      }}
      title="Drag to resize"
      className="flex h-6 shrink-0 cursor-row-resize touch-none select-none items-center justify-center border-y border-border bg-surface transition-colors active:bg-panel focus-visible:bg-panel focus-visible:outline-none"
    >
      <span className="h-1 w-10 rounded-full bg-border-strong" aria-hidden />
    </div>
  );
}

/** Strip under the editor when the viewer cannot edit. */
export function ReadOnlyBar() {
  return (
    <div className="flex h-8 shrink-0 select-none items-center justify-between gap-3 border-t border-border bg-surface px-3 text-[12px]">
      <span className="flex items-center gap-1.5 font-medium text-muted">
        <Lock className="h-3 w-3" aria-hidden />
        Read-only
      </span>
      <span className="truncate text-subtle">Fork this playground to edit it</span>
    </div>
  );
}

/** Read-only readout of the template, save state, runtime and run state. */
export function StatusBar({
  templateTitle,
  saveState,
  isBackend,
  running,
}: {
  templateTitle: string;
  /** "local": no account save yet, but a draft is kept in this browser. */
  saveState: "saving" | "unsaved" | "saved" | "local";
  isBackend: boolean;
  running: boolean;
}) {
  const saveText = {
    saving: "Saving…",
    unsaved: "Not saved",
    saved: "Saved",
    local: "Draft kept in this browser",
  }[saveState];
  return (
    <div className="flex h-7 shrink-0 items-center justify-between gap-3 overflow-hidden border-t border-border bg-surface px-3 text-[12px] text-subtle">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <span className="truncate font-medium text-muted">{templateTitle}</span>
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${saveState === "saved" ? "bg-success" : "bg-warning"}`}
            aria-hidden
          />
          {saveText}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
        <span className="hidden md:inline">{isBackend ? "Runs on server" : "Runs in browser"}</span>
        <span aria-live="polite" className={running ? "font-medium text-accent" : ""}>
          {running ? "Running…" : "Ready"}
        </span>
      </div>
    </div>
  );
}

/** Offer to bring back the last unsaved session for this template. */
export function RestoreDraftBar({
  age,
  onRestore,
  onDismiss,
}: {
  age: string;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-2 text-[13px]"
    >
      <History className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      <span className="min-w-0 flex-1 text-muted">
        You have unsaved work in this template from {age}.
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onDismiss}
          className="h-7 rounded-md px-2.5 text-subtle transition hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="h-7 rounded-md bg-accent px-2.5 font-medium text-accent-ink transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Restore your last session
        </button>
      </div>
    </div>
  );
}
