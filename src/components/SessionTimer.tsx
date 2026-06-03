"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Plus, ChevronDown, Loader2, CheckCircle2, XCircle, ArrowLeft, Radio, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SessionTimerProps {
  sessionId: string;
  shareToken: string;
  isInterviewer: boolean;
  initialTotalSec?: number;
  initialStartedAtIso?: string | null;
  initialStatus?: string;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionTimer({
  sessionId,
  shareToken,
  isInterviewer,
  initialTotalSec = 3600,
  initialStartedAtIso = null,
  initialStatus = "scheduled",
}: SessionTimerProps) {
  const [totalSec, setTotalSec] = useState<number>(initialTotalSec);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAtIso);
  const [status, setStatus] = useState<string>(initialStatus);
  const [now, setNow] = useState<number>(Date.now());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // End Session & Verdict modal states
  const [isEnding, setIsEnding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState<"success" | "failed" | "left_in_between" | "suspicious">("success");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Live Countdown math
  useEffect(() => {
    if (status !== "in_progress" || !startedAt) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  const elapsedSec = startedMs ? Math.floor((now - startedMs) / 1000) : 0;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const isTimeLow = remainingSec < 60 && status === "in_progress";

  // 2. Poll server for sync (e.g. interviewer updates, candidate sees it)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const url = `/api/interview/${sessionId}${shareToken ? `?token=${shareToken}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (data.totalSec !== undefined && data.totalSec !== totalSec) {
          setTotalSec(data.totalSec);
        }
        if (data.startedAt !== undefined && data.startedAt !== startedAt) {
          setStartedAt(data.startedAt);
        }
        if (data.status !== undefined && data.status !== status) {
          setStatus(data.status);
          if (data.status === "completed" || data.status === "abandoned") {
            toast.info("This session has been concluded. Exiting arena...");
            const backHref = isInterviewer
              ? `/interview/${sessionId}?lobby=true`
              : `/interview/${sessionId}?token=${shareToken}&lobby=true`;
            setTimeout(() => {
              window.location.href = backHref;
            }, 1500);
          }
        }
      } catch (err) {
        console.error("SessionTimer sync failed:", err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [sessionId, shareToken, totalSec, startedAt, status, isInterviewer]);

  // 3. Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Extend time function
  async function extendTime(minutes: number) {
    if (isExtending) return;
    setIsExtending(true);
    setIsDropdownOpen(false);

    const addedSec = minutes * 60;
    const newTotalSec = totalSec + addedSec;

    try {
      const url = `/api/interview/${sessionId}${shareToken ? `?token=${shareToken}` : ""}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ totalSec: newTotalSec }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const updated = await res.json();
      if (updated.totalSec) {
        setTotalSec(updated.totalSec);
      } else {
        setTotalSec(newTotalSec);
      }
      toast.success(`Time extended by +${minutes} minutes!`, {
        description: `Total duration is now ${formatDuration(updated.totalSec || newTotalSec)}.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast.error("Couldn't extend time", { description: msg });
    } finally {
      setIsExtending(false);
    }
  }

  // 5. End Session function (capturing verdict + notes)
  async function handleEndSession() {
    if (isEnding) return;
    setIsEnding(true);

    try {
      const url = `/api/interview/${sessionId}${shareToken ? `?token=${shareToken}` : ""}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          finishedAt: new Date().toISOString(),
          verdict: selectedVerdict,
          notes: feedbackNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Session completed and verdict locked!", {
        description: "Redirecting you to the session lobby...",
      });
      setIsModalOpen(false);
      
      // Redirect to the session lobby
      const backHref = isInterviewer
        ? `/interview/${sessionId}?lobby=true`
        : `/interview/${sessionId}?token=${shareToken}&lobby=true`;
      
      setTimeout(() => {
        window.location.href = backHref;
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast.error("Couldn't end session", { description: msg });
    } finally {
      setIsEnding(false);
    }
  }

  // If standby, show total duration. If concluded, show concluding.
  let labelText = "";
  if (status === "scheduled") {
    labelText = `${formatDuration(totalSec)} (Standby)`;
  } else if (status === "completed") {
    labelText = "Concluded";
  } else if (status === "abandoned") {
    labelText = "Abandoned";
  } else {
    labelText = formatDuration(remainingSec);
  }

  return (
    <div className="flex items-center gap-2 select-none relative" ref={dropdownRef}>
      {/* Timer Display Capsule */}
      <div
        className={`h-8 px-3 rounded-full border bg-surface/50 text-[11px] font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${
          isTimeLow
            ? "border-rose-500/50 text-rose-500 bg-rose-500/5 animate-pulse drop-shadow-[0_0_10px_rgba(244,63,94,0.15)]"
            : "border-border/80 text-fg/95 hover:border-border-strong"
        }`}
        title={status === "in_progress" ? "Live remaining time" : "Interview status"}
      >
        <Clock className={`w-3.5 h-3.5 ${isTimeLow ? "text-rose-500" : "text-muted"}`} />
        <span className="tabular-nums">{labelText}</span>
      </div>

      {/* Interviewer Only: Elegant Options Dropdown (Extend + End Session) */}
      {isInterviewer && (status === "scheduled" || status === "in_progress") && (
        <div>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isExtending || isEnding}
            className="h-8 w-8 rounded-full border border-border/80 bg-surface/50 hover:bg-elevated hover:border-border-strong text-muted hover:text-fg transition-all active:scale-95 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Extend duration or End session"
          >
            {isExtending || isEnding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Premium Dropdown Panel */}
          {isDropdownOpen && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-0 z-[9999] w-44 p-1 rounded-xl border border-border/80 bg-surface/90 backdrop-blur-xl shadow-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted/70 border-b border-border/50 mb-0.5">
                Extend Duration
              </div>
              <button
                onClick={() => extendTime(5)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-fg/80 hover:bg-accent/10 hover:text-accent transition-all duration-150 flex items-center justify-between"
              >
                <span>+5 minutes</span>
                <span className="text-[10px] text-muted/60 font-mono">+5m</span>
              </button>
              <button
                onClick={() => extendTime(10)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-fg/80 hover:bg-accent/10 hover:text-accent transition-all duration-150 flex items-center justify-between"
              >
                <span>+10 minutes</span>
                <span className="text-[10px] text-muted/60 font-mono">+10m</span>
              </button>
              <button
                onClick={() => extendTime(15)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-fg/80 hover:bg-accent/10 hover:text-accent transition-all duration-150 flex items-center justify-between"
              >
                <span>+15 minutes</span>
                <span className="text-[10px] text-muted/60 font-mono">+15m</span>
              </button>
              <button
                onClick={() => extendTime(30)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-fg/80 hover:bg-accent/10 hover:text-accent transition-all duration-150 flex items-center justify-between"
              >
                <span>+30 minutes</span>
                <span className="text-[10px] text-muted/60 font-mono">+30m</span>
              </button>
              
              <div className="border-t border-border/40 my-1"></div>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all duration-150 flex items-center justify-between"
              >
                <span>End Session</span>
                <span className="text-[10px] opacity-75 font-mono">End</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* End Session Dialog Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h3 className="text-base font-bold text-fg tracking-tight">Lock Session & Capture Feedback</h3>
                <p className="text-xs text-muted mt-1">Conclude the round before the clock runs out and submit recommendation & feedback notes.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-panel transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Verdict Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 relative z-10">
              {[
                { id: "success", label: "Met Bar (Success)", desc: "Strong code design and problem-solving.", bg: "hover:bg-emerald-500/5 hover:border-emerald-500/20", activeBg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.08)]", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                { id: "failed", label: "Did Not Meet Bar", desc: "Failed to meet key coding standards.", bg: "hover:bg-rose-500/5 hover:border-rose-500/20", activeBg: "bg-rose-500/10 border-rose-500/40 text-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.08)]", icon: <XCircle className="w-4 h-4 text-rose-500" /> },
                { id: "left_in_between", label: "Walkout", desc: "Candidate abandoned the round mid-way.", bg: "hover:bg-panel hover:border-border-strong", activeBg: "bg-panel border-border-strong text-fg shadow-[0_2px_8px_rgba(0,0,0,0.04)]", icon: <ArrowLeft className="w-4 h-4 text-muted" /> },
                { id: "suspicious", label: "Flagged Suspicious", desc: "Suspected of cheating or plagiarism.", bg: "hover:bg-amber-500/5 hover:border-amber-500/20", activeBg: "bg-amber-500/10 border-amber-500/40 text-amber-600 shadow-[0_2px_8px_rgba(245,158,11,0.08)]", icon: <Radio className="w-4 h-4 text-amber-500 animate-pulse" /> },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVerdict(v.id as any)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                    selectedVerdict === v.id ? v.activeBg : `bg-surface border-border ${v.bg} text-fg/80`
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{v.icon}</div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider">{v.label}</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-tight">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Evaluation Notes Area */}
            <div className="space-y-1.5 relative z-10">
              <label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-widest text-muted/80">
                Evaluation Notes / Comments
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Describe candidate's coding performance, algorithmic approach, and core strengths or weaknesses..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface border border-border text-xs text-fg/90 placeholder:text-muted/50 focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all duration-200 resize-none"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 relative z-10 border-t border-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-muted hover:text-fg hover:bg-panel transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndSession}
                disabled={isEnding}
                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold tracking-wide transition-all duration-300 shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Locking Verdict...
                  </>
                ) : (
                  "Complete & Lock"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
