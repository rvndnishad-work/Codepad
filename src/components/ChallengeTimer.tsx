"use client";

import React, { useState, useEffect, useRef } from "react";
import { Timer, Play, RotateCcw, Pause, Trophy, ChevronUp, ChevronDown } from "lucide-react";

export default function ChallengeTimer() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isCritical = timeLeft < 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    if (isFinished) return;
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(300);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-panel/50 border border-border backdrop-blur-md group/timer relative overflow-hidden h-11">
      {/* Background Pulse for Critical State */}
      {isRunning && isCritical && (
        <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
      )}
 
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-all shadow-inner ${
          isFinished ? "bg-emerald-500/20 text-emerald-400" :
          isCritical ? "bg-red-500/20 text-red-400 animate-pulse scale-110" :
          isRunning ? "bg-accent/20 text-accent" : "bg-surface/50 text-muted/40"
        }`}>
          {isFinished ? <Trophy className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
        </div>
 
        <div className="flex flex-col items-start min-w-[60px]">
          <div className="flex items-center gap-2">
            {!isRunning && !isFinished && (
              <div className="flex flex-col -gap-1 translate-y-[1px]">
                <button 
                  onClick={() => setTimeLeft(prev => prev + 60)}
                  className="text-accent/40 hover:text-accent transition-colors p-0.5"
                  title="Add 1 minute"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setTimeLeft(prev => Math.max(60, prev - 60))}
                  className="text-accent/40 hover:text-accent transition-colors p-0.5"
                  title="Remove 1 minute"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <span className={`text-sm font-black tabular-nums leading-none transition-colors ${
              isFinished ? "text-emerald-400" :
              isCritical ? "text-red-400" :
              isRunning ? "text-fg" : "text-fg/40"
            }`}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-fg/20 mt-0.5">
            {isFinished ? "Completed" : "Challenge Mode"}
          </span>
        </div>
      </div>
 
      <div className="h-6 w-px bg-border mx-1" />
 
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleTimer}
          disabled={isFinished}
          className={`p-2 rounded-xl transition-all ${
            isRunning 
              ? "text-fg/40 hover:text-fg hover:bg-surface/5" 
              : "bg-accent text-black shadow-[0_0_15px_var(--accent-glow)] scale-105"
          } disabled:opacity-20`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        <button
          onClick={resetTimer}
          className="p-2 rounded-xl text-fg/20 hover:text-fg hover:bg-surface/5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
 
      {/* Finishing Alert */}
      {isFinished && (
        <div className="absolute inset-0 bg-surface flex items-center justify-center gap-2 px-3 animate-in fade-in zoom-in duration-300">
           <Trophy className="w-3.5 h-3.5 text-emerald-400" />
           <span className="text-[9px] font-black text-fg uppercase tracking-widest">Time's Up!</span>
           <button onClick={resetTimer} className="ml-auto p-1 rounded-lg hover:bg-surface/50 text-fg/40">
             <RotateCcw className="w-3 h-3" />
           </button>
        </div>
      )}
    </div>
  );
}
