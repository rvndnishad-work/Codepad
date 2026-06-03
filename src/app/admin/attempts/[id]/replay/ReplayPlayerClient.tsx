"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import MonacoEditor from "@monaco-editor/react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  Award,
  FileCode,
  Calendar,
  Sparkles,
  Clipboard,
  MousePointerClick
} from "lucide-react";

type TelemetryEvent = {
  t: number; // elapsed ms
  type: "snapshot" | "blur" | "focus" | "paste";
  payload: any;
};

type PasteDetail = {
  t: number;
  length: number;
  snippet: string;
};

type Props = {
  attempt: {
    id: string;
    candidateName: string;
    candidateEmail: string;
    challengeTitle: string;
    startedAt: string;
    durationSec: number;
    score: number | null;
  };
  events: TelemetryEvent[];
  integrity: {
    suspicionScore: number;
    totalBlurSec: number;
    blurCount: number;
    pasteCount: number;
    pasteDetails: PasteDetail[];
  } | null;
  backUrl?: string;
};


export default function ReplayPlayerClient({ attempt, events, integrity, backUrl }: Props) {
  // Sort events chronologically to be absolutely bulletproof
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.t - b.t);
  }, [events]);

  const maxElapsedMs = sortedEvents[sortedEvents.length - 1]?.t || (attempt.durationSec * 1000) || 1000;

  // Filter snapshot events for fast index-based scrubbing
  const snapshots = useMemo(() => {
    return sortedEvents.filter((ev) => ev.type === "snapshot");
  }, [sortedEvents]);

  // Telemetry playhead states
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5 | 10>(1);
  const [activeFile, setActiveFile] = useState<string>("");
  const [currentFiles, setCurrentFiles] = useState<Record<string, string>>({});

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

  // Re-calculate the file map at the current playhead
  useEffect(() => {
    // Find the latest snapshot that occurred before or at the playhead
    let latestSnapshot: TelemetryEvent | null = null;
    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i].t <= playheadMs) {
        latestSnapshot = snapshots[i];
        break;
      }
    }

    if (latestSnapshot && latestSnapshot.payload) {
      setCurrentFiles(latestSnapshot.payload.files || {});
      setActiveFile(latestSnapshot.payload.activeFile || Object.keys(latestSnapshot.payload.files)[0] || "");
    } else if (snapshots[0]?.payload) {
      // Fallback: use first snapshot
      setCurrentFiles(snapshots[0].payload.files || {});
      setActiveFile(snapshots[0].payload.activeFile || "");
    }
  }, [playheadMs, snapshots]);

  // Playing loop handler
  useEffect(() => {
    if (!playing) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTickTimeRef.current = null;
      return;
    }

    const tick = () => {
      const now = performance.now();
      if (lastTickTimeRef.current === null) {
        lastTickTimeRef.current = now;
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      setPlayheadMs((prev) => {
        const next = prev + delta * speed;
        if (next >= maxElapsedMs) {
          setPlaying(false);
          return maxElapsedMs;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playing, speed, maxElapsedMs]);

  const formattedTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const suspicionScoreColor = (score: number) => {
    if (score < 25) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score < 55) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20 font-black animate-pulse";
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Replay Header block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <Link
            href={backUrl || `/admin/attempts/${attempt.id}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Scorecard
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-[#F3F4F6] tracking-tight mt-1">
            Candidate Session Replay
          </h1>
          <p className="text-xs text-muted leading-relaxed">
            Reconstructing attempt for candidate <span className="text-[#F3F4F6] font-bold">{attempt.candidateName}</span> solving <span className="text-[#F3F4F6] font-bold">{attempt.challengeTitle}</span>.
          </p>
        </div>
        {integrity && (
          <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 shrink-0 ${suspicionScoreColor(integrity.suspicionScore)}`}>
            <AlertTriangle className="w-4 h-4" />
            <span>AI Suspicion Score: {integrity.suspicionScore}%</span>
          </div>
        )}
      </div>

      {/* Replay Main Layout (Monaco Left, Stats Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editor & Controls Panel (8 columns) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* File selector tab strip */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-t-2xl border border-border bg-[#111625]/60 overflow-x-auto -mb-4 relative z-10">
            <FileCode className="w-4 h-4 text-accent mr-1.5 shrink-0" />
            {Object.keys(currentFiles).length === 0 ? (
              <span className="text-xs text-muted font-bold font-mono">/index.ts</span>
            ) : (
              Object.keys(currentFiles).map((path) => {
                const isActive = path === activeFile;
                return (
                  <button
                    key={path}
                    onClick={() => setActiveFile(path)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                      isActive
                        ? "bg-accent/15 border-accent/25 text-accent"
                        : "bg-transparent border-transparent text-muted hover:text-fg hover:bg-surface/30"
                    }`}
                  >
                    {path.replace(/^\//, "")}
                  </button>
                );
              })
            )}
          </div>

          {/* Monaco Editor Container */}
          <div className="rounded-b-3xl border border-border bg-[#161B2E]/40 backdrop-blur-md p-1 overflow-hidden shadow-2xl relative">
            <div className="h-[480px] rounded-2xl overflow-hidden border border-border">
              <MonacoEditor
                height="100%"
                language="typescript"
                theme="vs-dark"
                value={currentFiles[activeFile] || ""}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollbar: { vertical: "visible", horizontal: "auto" },
                  fontSize: 13,
                  lineHeight: 20,
                  fontFamily: "var(--font-mono)",
                  padding: { top: 12, bottom: 12 },
                  lineNumbers: "on",
                  glyphMargin: false,
                  folding: true,
                  domReadOnly: true,
                }}
              />
            </div>
          </div>

          {/* Player controls */}
          <div className="p-4 rounded-3xl border border-border bg-[#161B2E]/60 backdrop-blur-md shadow-lg space-y-4">
            
            {/* Timeline Scrubbing Track */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono tabular-nums text-muted shrink-0 w-8 text-right">
                {formattedTime(playheadMs)}
              </span>
              
              {/* Timeline slider wrapper */}
              <div className="flex-1 relative h-6 flex items-center group/timeline cursor-pointer">
                {/* Visual heatmaps layered under the slider */}
                <div className="absolute inset-0 top-[10px] bottom-[10px] bg-surface rounded-full overflow-hidden border border-border">
                  {/* Blurs background layers */}
                  {events
                    .filter((ev) => ev.type === "blur")
                    .map((blurEv, idx) => {
                      const nextFocus = events.find((ev) => ev.type === "focus" && ev.t > blurEv.t);
                      const endMs = nextFocus ? nextFocus.t : maxElapsedMs;
                      const leftPercent = (blurEv.t / maxElapsedMs) * 100;
                      const widthPercent = ((endMs - blurEv.t) / maxElapsedMs) * 100;
                      return (
                        <div
                          key={idx}
                          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                          className="absolute inset-y-0 bg-rose-500/25 border-l border-r border-rose-500/30"
                          title={`Unfocused: ${formattedTime(blurEv.t)}`}
                        />
                      );
                    })}

                  {/* Pastes ticks */}
                  {events
                    .filter((ev) => ev.type === "paste")
                    .map((pasteEv, idx) => {
                      const leftPercent = (pasteEv.t / maxElapsedMs) * 100;
                      return (
                        <div
                          key={idx}
                          style={{ left: `${leftPercent}%` }}
                          className="absolute inset-y-0 w-[3px] bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                          title={`Paste event: ${formattedTime(pasteEv.t)}`}
                        />
                      );
                    })}
                </div>

                {/* Real input slider overlaid */}
                <input
                  type="range"
                  min={0}
                  max={maxElapsedMs}
                  value={playheadMs}
                  onChange={(e) => setPlayheadMs(Number(e.target.value))}
                  className="w-full relative z-10 opacity-0 cursor-pointer h-full"
                />

                {/* Styled progress track thumb follow */}
                <div
                  style={{ width: `${(playheadMs / maxElapsedMs) * 100}%` }}
                  className="absolute top-[10px] bottom-[10px] left-0 bg-accent/25 rounded-l-full pointer-events-none border-r border-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.1)]"
                />
                
                {/* Thumb playhead circle tracker */}
                <div
                  style={{ left: `calc(${(playheadMs / maxElapsedMs) * 100}% - 6px)` }}
                  className="absolute w-3.5 h-3.5 rounded-full bg-accent border-2 border-[#0B0F19] pointer-events-none z-20 shadow-md group-hover/timeline:scale-125 transition-transform"
                />
              </div>

              <span className="text-[10px] font-mono tabular-nums text-muted shrink-0 w-8">
                {formattedTime(maxElapsedMs)}
              </span>
            </div>

            {/* Play controls and speed toggles */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying(!playing)}
                  className="w-10 h-10 rounded-2xl bg-accent hover:bg-accent-soft text-bg flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
                </button>
                <div className="text-[10px] font-black uppercase text-muted tracking-wider ml-2">
                  Playback controls
                </div>
              </div>

              {/* Speed controls */}
              <div className="flex items-center gap-1 bg-[#111625]/60 border border-border p-1 rounded-xl shrink-0">
                {([1, 2, 5, 10] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all border ${
                      speed === s
                        ? "bg-accent/15 border-accent/25 text-accent shadow-sm"
                        : "bg-transparent border-transparent text-muted hover:text-fg hover:bg-surface/30"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* AI Proctoring Details Sidebar (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Bento integrity widgets */}
          {integrity && (
            <div className="rounded-3xl border border-border bg-[#161B2E]/60 backdrop-blur-md p-6 space-y-5 shadow-2xl">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Proctoring Summary
              </h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl border border-border bg-[#0B0F19]/40 flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Tab Blurs
                  </span>
                  <span className="text-xs font-bold text-fg mt-2">{integrity.blurCount} times</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-[#0B0F19]/40 flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Unfocused
                  </span>
                  <span className="text-xs font-bold text-fg mt-2">{integrity.totalBlurSec} seconds</span>
                </div>
                <div className="p-3.5 rounded-2xl border border-border bg-[#0B0F19]/40 flex flex-col justify-between col-span-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted flex items-center gap-1">
                    <Clipboard className="w-3.5 h-3.5 text-amber-400" /> Block Pastes
                  </span>
                  <span className="text-xs font-bold text-fg mt-2">{integrity.pasteCount} pastes detected</span>
                </div>
              </div>
            </div>
          )}

          {/* Paste History Events Feed */}
          {integrity && integrity.pasteDetails.length > 0 && (
            <div className="rounded-3xl border border-border bg-[#161B2E]/40 p-5 space-y-3.5 max-h-80 overflow-y-auto">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted">Copy-Paste Logs</h3>
              <div className="space-y-3">
                {integrity.pasteDetails.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPlayheadMs(p.t)}
                    className="p-3 rounded-xl border border-border bg-[#0B0F19]/40 text-[10px] space-y-1.5 hover:border-accent/30 cursor-pointer hover:bg-[#0B0F19]/60 transition"
                  >
                    <div className="flex justify-between items-center text-muted">
                      <span className="font-mono text-amber-400 font-bold flex items-center gap-1">
                        <Clipboard className="w-3 h-3" /> Pasted {p.length} chars
                      </span>
                      <span className="font-mono">{formattedTime(p.t)}</span>
                    </div>
                    <pre className="p-2 rounded bg-bg text-fg/80 border border-border truncate max-w-full font-mono">
                      {p.snippet || "..."}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Blur Events Feed */}
          {events.some((ev) => ev.type === "blur") && (
            <div className="rounded-3xl border border-border bg-[#161B2E]/40 p-5 space-y-3.5 max-h-80 overflow-y-auto">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted">Unfocused logs</h3>
              <div className="space-y-2">
                {events
                  .filter((ev) => ev.type === "blur")
                  .map((blurEv, idx) => {
                    const nextFocus = events.find((ev) => ev.type === "focus" && ev.t > blurEv.t);
                    const blurDuration = nextFocus ? nextFocus.t - blurEv.t : null;
                    return (
                      <div
                        key={idx}
                        onClick={() => setPlayheadMs(blurEv.t)}
                        className="flex justify-between items-center p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[10px] hover:border-rose-500/40 cursor-pointer transition"
                      >
                        <span className="font-bold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Tab Blurred
                        </span>
                        <span className="text-muted font-mono">
                          {formattedTime(blurEv.t)} {blurDuration !== null ? `(${Math.round(blurDuration / 1000)}s)` : "(active)"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
