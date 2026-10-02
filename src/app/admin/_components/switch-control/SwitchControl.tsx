"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SwitchSegment from "./SwitchSegment";
import SwitchConfirm from "./SwitchConfirm";
import type { SwitchState, SwitchView } from "./types";

function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Muted second line: who changed it last (when not on), else the switch scope. */
export function switchSubtitle(view: SwitchView): string {
  if (view.state !== "on" && view.updatedAt) {
    const who = view.updatedByName ? `changed by ${view.updatedByName} ` : "changed ";
    const back = view.resumeAt ? `, back on ${new Date(view.resumeAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "";
    return `${who}${ago(view.updatedAt)}${back}`;
  }
  return view.description;
}

/**
 * One switch row: label, subtitle and the segmented control; picking a new
 * state opens the confirm panel underneath. Refreshes the page on save.
 */
export default function SwitchControl({ view, compact, hideSubtitle }: { view: SwitchView; compact?: boolean; hideSubtitle?: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<SwitchState | null>(null);
  const [state, setState] = useState<SwitchState>(view.state);
  const [prevView, setPrevView] = useState(view);
  // Server refresh brought a new value: follow it.
  if (prevView !== view) {
    setPrevView(view);
    setState(view.state);
  }

  return (
    <div className="border-t border-border py-2.5 first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-fg">{view.label}</div>
          {!hideSubtitle && <div className="truncate text-xs text-muted" title={view.updatedNote ?? undefined}>{switchSubtitle(view)}</div>}
        </div>
        <SwitchSegment value={state} pending={target} onSelect={setTarget} label={view.label} compact={compact} />
      </div>
      {target && (
        <SwitchConfirm
          key={target}
          view={{ ...view, state }}
          target={target}
          onCancel={() => setTarget(null)}
          onDone={(r) => {
            setState(r.state);
            setTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
