"use client";

import type { ComponentType } from "react";
import {
  Activity,
  Globe,
  RotateCw,
  Trash2,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

/**
 * Shared chrome for the output pane headers (preview / console, desktop +
 * mobile + split). One visual language everywhere instead of three
 * hand-rolled variants: icon-in-tint title lockups, pill badges, and
 * icon-first buttons.
 */

export function PaneTitle({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: IconType;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${iconClassName ?? "border-[#8b93ff]/30 bg-[#8b93ff]/10 text-[#aab0ff]"}`}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
        {children}
      </span>
    </div>
  );
}

export function LiveBadge() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300/90">
      <Activity className="h-3 w-3" aria-hidden />
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden />
      Live
    </div>
  );
}

export function UrlPill() {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-white/45"
      title="Preview served locally from the sandbox"
    >
      <Globe className="h-3 w-3 text-[#8b93ff]/70" aria-hidden />
      localhost:3000
    </div>
  );
}

export function ClearButton({
  onClear,
  showLabel = true,
}: {
  onClear: () => void;
  showLabel?: boolean;
}) {
  return (
    <button
      onClick={onClear}
      className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full text-white/40 transition hover:bg-white/10 hover:text-white ${
        showLabel ? "px-2 py-1" : "h-6 w-6 place-items-center"
      }`}
      title="Clear console"
    >
      <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wider">
          Clear
        </span>
      )}
    </button>
  );
}

export function RefreshPreviewButton({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button
      onClick={onRefresh}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
      title="Refresh preview"
      aria-label="Refresh preview"
    >
      <RotateCw className="h-3 w-3" aria-hidden />
    </button>
  );
}
