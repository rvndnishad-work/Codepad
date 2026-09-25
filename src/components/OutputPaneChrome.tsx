"use client";

import type { ComponentType, ReactNode } from "react";
import { RotateCw, Trash2 } from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

/**
 * Shared chrome for the output pane headers (preview and console). One
 * quiet visual language everywhere: a muted icon, a sentence-case label,
 * and icon-first buttons. Tokens only.
 */

export function PaneTitle({
  icon: Icon,
  children,
}: {
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <Icon className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
      <span className="truncate text-[13px] font-medium text-fg">{children}</span>
    </div>
  );
}

/** Marks the browser console as streaming while code runs on each edit. */
export function LiveBadge() {
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] text-subtle"
      title="Output streams in as the code runs"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
      Live
    </span>
  );
}

const ICON_BUTTON =
  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md text-subtle transition hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function ClearButton({
  onClear,
  showLabel = true,
}: {
  onClear: () => void;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className={`${ICON_BUTTON} ${showLabel ? "h-7 px-2" : "h-7 w-7 justify-center"}`}
      title="Clear console"
      aria-label="Clear console"
    >
      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {showLabel && <span className="text-[12px]">Clear</span>}
    </button>
  );
}

export function RefreshPreviewButton({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      className={`${ICON_BUTTON} h-7 w-7 justify-center`}
      title="Refresh preview"
      aria-label="Refresh preview"
    >
      <RotateCw className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Header row shared by every output section. */
export function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-border bg-surface px-3">
      {children}
    </div>
  );
}
