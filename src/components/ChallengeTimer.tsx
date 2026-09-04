"use client";

import React, { useState, useEffect, useRef } from "react";
import { Timer, Play, RotateCcw, Pause, Trophy, Minus, Plus } from "lucide-react";

export type ChallengeTimerController = {
  minutes: number;
  seconds: number;
  timeLeft: number;
  total: number;
  isRunning: boolean;
  isFinished: boolean;
  isCritical: boolean;
  toggle: () => void;
  reset: () => void;
  pause: () => void;
  adjust: (deltaSec: number) => void;
};

/**
 * Challenge countdown brain. Lives outside any popover so closing a menu
 * never unmounts the interval — the toolbar chip and the full controls
 * below both drink from this one instance.
 */
export function useChallengeTimer(): ChallengeTimerController {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [total, setTotal] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const totalRef = useRef(300);
  const leftRef = useRef(300);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isCritical = timeLeft < 60;

  // Mirror state into refs so adjust() never needs setState-in-updater.
  useEffect(() => {
    leftRef.current = timeLeft;
  }, [timeLeft]);

  // Deadline-driven ticking: one interval per run (no per-second teardown),
  // immune to throttled-tab drift, floored at zero so the display can never
  // show negative time.
  const deadlineRef = useRef(0);
  useEffect(() => {
    if (!isRunning) return;
    if (deadlineRef.current <= Date.now()) {
      deadlineRef.current = Date.now() + leftRef.current * 1000;
    }
    const id = setInterval(() => {
      const remain = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      leftRef.current = remain;
      setTimeLeft(remain);
      if (remain <= 0) {
        setIsRunning(false);
        setIsFinished(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const toggle = () => {
    if (isFinished) return;
    if (!isRunning) deadlineRef.current = 0; // recompute from current timeLeft
    setIsRunning((r) => !r);
  };

  const resetTimer = () => {
    deadlineRef.current = 0;
    setIsRunning(false);
    setIsFinished(false);
    leftRef.current = totalRef.current;
    setTimeLeft(totalRef.current);
  };

  return {
    minutes,
    seconds,
    timeLeft,
    total,
    isRunning,
    isFinished,
    isCritical,
    toggle,
    reset: resetTimer,
    pause: () => {
      deadlineRef.current = 0;
      setIsRunning(false);
    },
    adjust: (deltaSec: number) => {
      const next = Math.min(3599, Math.max(60, leftRef.current + deltaSec));
      leftRef.current = next;
      totalRef.current = Math.max(totalRef.current, next);
      if (isRunning) deadlineRef.current += deltaSec * 1000;
      setTimeLeft(next);
      setTotal(totalRef.current);
    },
  };
}

export default function ChallengeTimer({ controller }: { controller?: ChallengeTimerController }) {
  const internal = useChallengeTimer();
  const t = controller ?? internal;
  const { minutes, seconds, isRunning, isFinished, isCritical, toggle, reset, adjust } = t;

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Timer Icon */}
      <div className={`rounded-lg p-1.5 transition-all duration-200 ${
        isFinished ? "text-emerald-400" :
        isCritical && isRunning ? "text-red-400" :
        isRunning ? "text-[#8b93ff]" : "text-white/40"
      }`}>
        {isFinished ? <Trophy className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
      </div>

      {/* Time Adjust (-) */}
      {!isRunning && !isFinished && (
        <button
          onClick={() => adjust(-60)}
          className="grid h-6 w-6 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          title="Remove 1 minute"
        >
          <Minus className="w-3 h-3" />
        </button>
      )}

      {/* Time Display */}
      <div className="flex min-w-[52px] flex-col items-center">
        <span className={`font-mono text-[14px] font-bold leading-none tabular-nums transition-colors ${
          isFinished ? "text-emerald-400" :
          isCritical && isRunning ? "text-red-400" :
          isRunning ? "text-white" : "text-white/60"
        }`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">
          {isFinished ? "Done" : isRunning ? "Live" : "Timer"}
        </span>
      </div>

      {/* Time Adjust (+) */}
      {!isRunning && !isFinished && (
        <button
          onClick={() => adjust(60)}
          className="grid h-6 w-6 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          title="Add 1 minute"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}

      {/* Separator */}
      <div className="mx-0.5 h-4 w-px bg-white/10" />

      {/* Play/Pause */}
      <button
        onClick={toggle}
        disabled={isFinished}
        className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ${
          isRunning
            ? "text-white/60 hover:bg-white/10 hover:text-white"
            : "bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3] text-white shadow-[0_4px_14px_-4px_rgba(255,47,179,0.7)] hover:scale-105"
        }`}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
      </button>

      {/* Reset */}
      <button
        onClick={reset}
        className="grid h-7 w-7 place-items-center rounded-full text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Finishing Alert */}
      {isFinished && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-[#0d0f16]/90 px-3 backdrop-blur animate-in fade-in zoom-in duration-300">
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-white">Time's up!</span>
          <button onClick={reset} className="ml-auto grid h-6 w-6 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Critical pulse background */}
      {isRunning && isCritical && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl bg-red-500/[0.07]" />
      )}
    </div>
  );
}
