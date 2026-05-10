"use client";

import React, { useState, useEffect, useRef } from "react";
import { Timer, Play, RotateCcw, Pause, Trophy, Minus, Plus } from "lucide-react";

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
    <div className="flex items-center gap-1.5 h-8 relative">
      {/* Timer Icon */}
      <div className={`p-1.5 rounded-lg transition-all duration-200 ${
        isFinished ? "text-emerald-400" :
        isCritical && isRunning ? "text-red-400" :
        isRunning ? "text-accent" : "text-white/25"
      }`}>
        {isFinished ? <Trophy className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
      </div>

      {/* Time Adjust (-) */}
      {!isRunning && !isFinished && (
        <button 
          onClick={() => setTimeLeft(prev => Math.max(60, prev - 60))}
          className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-fg hover:bg-white/[0.08] hover:border-white/[0.1] transition-all duration-150"
          title="Remove 1 minute"
        >
          <Minus className="w-3 h-3" />
        </button>
      )}

      {/* Time Display */}
      <div className="flex flex-col items-center min-w-[48px]">
        <span className={`text-[14px] font-mono font-semibold tabular-nums leading-none transition-colors ${
          isFinished ? "text-emerald-400" :
          isCritical && isRunning ? "text-red-400" :
          isRunning ? "text-fg" : "text-fg/50"
        }`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        <span className="text-[8px] font-medium text-white/15 mt-0.5 tracking-wider">
          {isFinished ? "Done" : "Timer"}
        </span>
      </div>

      {/* Time Adjust (+) */}
      {!isRunning && !isFinished && (
        <button 
          onClick={() => setTimeLeft(prev => prev + 60)}
          className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-fg hover:bg-white/[0.08] hover:border-white/[0.1] transition-all duration-150"
          title="Add 1 minute"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}

      {/* Separator */}
      <div className="h-4 w-px bg-white/[0.06] mx-0.5" />

      {/* Play/Pause */}
      <button
        onClick={toggleTimer}
        disabled={isFinished}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
          isRunning 
            ? "text-white/40 hover:text-fg hover:bg-white/[0.06]" 
            : "bg-accent text-black shadow-[0_2px_10px_rgba(255,230,0,0.12)]"
        } disabled:opacity-20`}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
      </button>

      {/* Reset */}
      <button
        onClick={resetTimer}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-fg hover:bg-white/[0.06] transition-all duration-200"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Finishing Alert */}
      {isFinished && (
        <div className="absolute inset-0 bg-[#0A0A0A] rounded-lg flex items-center justify-center gap-2 px-3 animate-in fade-in zoom-in duration-300 border border-emerald-500/20">
           <Trophy className="w-3.5 h-3.5 text-emerald-400" />
           <span className="text-[11px] font-medium text-fg">Time's up!</span>
           <button onClick={resetTimer} className="ml-auto p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-fg transition-all">
             <RotateCcw className="w-3 h-3" />
           </button>
        </div>
      )}

      {/* Critical pulse background */}
      {isRunning && isCritical && (
        <div className="absolute inset-0 rounded-lg bg-red-500/[0.06] animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
