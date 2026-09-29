"use client";

/** Shared timer: a pill in the dock plus the interviewer's controls. */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { timerRemaining, type ToolsState } from "@/lib/interview/tools";
import type { ToolsRoom } from "./useToolsRoom";

const spring = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.7 };

function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function useTimerLeft(state: ToolsState, offset: number) {
  const t = state.timer!;
  const [now, setNow] = useState(() => Date.now());
  const running = t.endsAt != null;
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [running]);
  return { t, running, left: timerRemaining(t, now + offset) };
}

export function TimerPill({ state, offset, isInterviewer, readOnly, open, onToggle }: { state: ToolsState; offset: number; isInterviewer: boolean; readOnly: boolean; open: boolean; onToggle: () => void }) {
  const { t, running, left } = useTimerLeft(state, offset);
  const tone = left === 0 ? "text-danger" : left <= 60 ? "text-warning" : "text-fg";
  const pct = t.durationSec ? left / t.durationSec : 0;

  const body = (
    <span className="relative inline-flex items-center gap-1.5">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="-rotate-90">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${pct * 37.7} 37.7`} strokeLinecap="round" />
      </svg>
      <span className={`tabular-nums font-semibold ${left === 0 && running ? "animate-pulse" : ""}`}>{fmtClock(left)}</span>
      {!running && left > 0 && <span className="text-xs text-subtle font-normal">paused</span>}
    </span>
  );

  if (!isInterviewer || readOnly) {
    return (
      <span className={`inline-flex items-center h-9 px-3 rounded-xl text-[13px] ${tone}`} aria-label={`Timer ${fmtClock(left)}${running ? "" : ", paused"}`}>
        {body}
      </span>
    );
  }
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Timer ${fmtClock(left)}. Change timer`} className={`inline-flex items-center h-9 px-3 rounded-xl text-[13px] hover:bg-panel/70 ${tone}`}>
      {body}
    </button>
  );
}

export function TimerPanel({ state, offset, run, onClose }: { state: ToolsState; offset: number; run: (a: Parameters<ToolsRoom["act"]>[0]) => Promise<void>; onClose: () => void }) {
  const { t, running, left } = useTimerLeft(state, offset);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(el) && !el.closest?.('nav[aria-label="Room tools"]')) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={spring}
      className="absolute bottom-full mb-3 right-0 w-[260px] rounded-xl border border-border-strong bg-surface shadow-2xl shadow-black/40 p-3 flex flex-col gap-3"
      role="dialog"
      aria-label="Timer"
    >
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => void run({ type: "timer", op: running ? "pause" : "start" })} className="flex-1 h-9 rounded-lg bg-secondary text-bg text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
          {running ? <Pause className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
          {running ? "Pause" : left < t.durationSec && left > 0 ? "Resume" : "Start"}
        </button>
        <button type="button" onClick={() => void run({ type: "timer", op: "reset" })} aria-label="Reset" className="w-9 h-9 rounded-lg border border-border text-muted hover:text-fg flex items-center justify-center">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            void run({ type: "enable", tool: "timer", on: false });
          }}
          aria-label="Remove timer"
          className="w-9 h-9 rounded-lg border border-border text-muted hover:text-danger flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <p className="text-xs text-subtle mb-1.5">Set to</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 10, 15, 30].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => void run({ type: "timer", op: "set", seconds: m * 60 })}
              className={`h-8 rounded-lg text-[12px] font-medium ring-1 ring-inset ${t.durationSec === m * 60 ? "bg-secondary/15 text-secondary-soft ring-secondary/40" : "ring-border text-muted hover:text-fg"}`}
            >
              {m} min
            </button>
          ))}
        </div>
        <form
          className="flex gap-1.5 mt-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.round(Number(custom));
            if (n > 0 && n <= 180) {
              void run({ type: "timer", op: "set", seconds: n * 60 });
              setCustom("");
            }
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="Other, in minutes"
            aria-label="Minutes"
            className="flex-1 min-w-0 h-8 rounded-lg border border-border bg-bg px-2 text-[12px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60"
          />
          <button type="submit" disabled={!custom} className="h-8 px-2.5 rounded-lg border border-border text-[12px] text-fg disabled:opacity-40">
            Set
          </button>
        </form>
      </div>
      <p className="text-xs text-subtle">The candidate sees the same countdown.</p>
    </motion.div>
  );
}

