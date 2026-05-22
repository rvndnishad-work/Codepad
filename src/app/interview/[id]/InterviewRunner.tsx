"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Play,
  Trophy,
  XCircle,
  Eye,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  Share2,
  Users,
  Radio,
  Sparkles,
  PhoneCall,
  PhoneOff,
  Wifi,
  MessageCircle,
  Mail,
  Copy,
  FileText,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export type SessionChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
};

export type SessionPlayground = {
  id: string;
  slug: string;
  title: string;
  template: string;
};

type Interview = {
  id: string;
  title: string;
  candidateName: string | null;
  type: string;
  verdict: string | null;
  notes: string | null;
  totalSec: number;
  status: "scheduled" | "in_progress" | "completed" | "abandoned";
  shareToken: string;
  shortCode?: string | null;
  startedAtIso: string | null;
  finishedAtIso: string | null;
  sourceType: "challenge" | "playground";
  scenario: string | null;
  activePlaygroundId: string | null;
};

type Attempt = {
  challengeId: string;
  status: "passed" | "failed" | "in_progress" | "abandoned";
  durationSec: number | null;
};

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

const templateColors: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  "react": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "empty-react": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "react-hooks": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "react-classes": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "empty-ts": { 
    border: "hover:border-blue-500 dark:hover:border-blue-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]", 
    text: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-400/10 dark:border-blue-400/20" 
  },
  "typescript": { 
    border: "hover:border-blue-500 dark:hover:border-blue-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]", 
    text: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-400/10 dark:border-blue-400/20" 
  },
  "empty-js": { 
    border: "hover:border-yellow-500 dark:hover:border-yellow-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.08)] dark:hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]", 
    text: "text-yellow-600 dark:text-yellow-500", 
    bg: "bg-yellow-500/10 border-yellow-500/20 dark:bg-yellow-400/10 dark:border-yellow-400/20" 
  },
  "javascript": { 
    border: "hover:border-yellow-500 dark:hover:border-yellow-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.08)] dark:hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]", 
    text: "text-yellow-600 dark:text-yellow-500", 
    bg: "bg-yellow-500/10 border-yellow-500/20 dark:bg-yellow-400/10 dark:border-yellow-400/20" 
  },
  "svelte": { 
    border: "hover:border-orange-500 dark:hover:border-orange-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(249,115,22,0.08)] dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]", 
    text: "text-orange-600 dark:text-orange-400", 
    bg: "bg-orange-500/10 border-orange-500/20 dark:bg-orange-400/10 dark:border-orange-400/20" 
  },
  "vue": { 
    border: "hover:border-emerald-500 dark:hover:border-emerald-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]", 
    text: "text-emerald-600 dark:text-emerald-400", 
    bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-400/10 dark:border-emerald-400/20" 
  },
  "solid": { 
    border: "hover:border-indigo-500 dark:hover:border-indigo-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(129,140,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(129,140,248,0.15)]", 
    text: "text-indigo-600 dark:text-indigo-400", 
    bg: "bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-400/10 dark:border-indigo-400/20" 
  },
  "angular": { 
    border: "hover:border-rose-500 dark:hover:border-rose-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(244,63,94,0.08)] dark:hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]", 
    text: "text-rose-600 dark:text-rose-400", 
    bg: "bg-rose-500/10 border-rose-500/20 dark:bg-rose-400/10 dark:border-rose-400/20" 
  },
  "redux-toolkit": { 
    border: "hover:border-purple-500 dark:hover:border-purple-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.08)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]", 
    text: "text-purple-600 dark:text-purple-400", 
    bg: "bg-purple-500/10 border-purple-500/20 dark:bg-purple-400/10 dark:border-purple-400/20" 
  },
  "mobx": { 
    border: "hover:border-amber-600 dark:hover:border-amber-600/60", 
    glow: "hover:shadow-[0_0_20px_rgba(217,119,6,0.08)] dark:hover:shadow-[0_0_20px_rgba(217,119,6,0.15)]", 
    text: "text-amber-600 dark:text-amber-500", 
    bg: "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/20" 
  },
  "framer-motion": { 
    border: "hover:border-pink-500 dark:hover:border-pink-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(236,72,153,0.08)] dark:hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]", 
    text: "text-pink-600 dark:text-pink-400", 
    bg: "bg-pink-500/10 border-pink-500/20 dark:bg-pink-400/10 dark:border-pink-400/20" 
  }
};

export default function InterviewRunner({
  interview,
  challenges,
  playgrounds,
  attempts,
  interviewerView,
  isOwner = false,
}: {
  interview: Interview;
  challenges: SessionChallenge[];
  playgrounds: SessionPlayground[];
  attempts: Attempt[];
  interviewerView: boolean;
  isOwner?: boolean;
}) {
  const isPlayground = interview.sourceType === "playground";
  const [status, setStatus] = useState(interview.status);
  const [startedAt, setStartedAt] = useState<string | null>(interview.startedAtIso);

  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  const [now, setNow] = useState<number>(Date.now());


  const [verdict, setVerdict] = useState(interview.verdict);
  const [verdictModalOpen, setVerdictModalOpen] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState<"success" | "failed" | "left_in_between" | "suspicious">("success");



  // Multiplayer Real-Time State variables
  const [inCall, setInCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [simColleague, setSimColleague] = useState(false);

  const [userDecibels, setUserDecibels] = useState<number[]>([15, 30, 20, 45, 15]);
  const [peerDecibels, setPeerDecibels] = useState<number[]>([10, 15, 8, 12, 10]);

  // Start-request handshake state
  const [startRequested, setStartRequested] = useState(false);
  const [startRequestSending, setStartRequestSending] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  // Quick Join strip — toggle observer link disclosure
  const [showObserverLink, setShowObserverLink] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const getFirstStageHref = () => {
    if (interview.sourceType === "playground") {
      const p = playgrounds[0];
      if (!p) return null;
      const tokenQuery = isOwner ? "" : `?token=${interview.shareToken}`;
      return `/interview/${interview.id}/play/${p.id}${tokenQuery}`;
    } else {
      const c = challenges[0];
      if (!c) return null;
      let href = `/challenges/${c.slug}/attempt?session=${interview.id}&multiplayer=true`;
      if (interview.shareToken) {
        href += `&token=${interview.shareToken}`;
      }
      return href;
    }
  };

  // Candidate polls for status change (session started by interviewer)
  // Interviewer polls for start requests from candidate
  useEffect(() => {
    if (status !== "scheduled") return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/interview/${interview.id}?token=${interview.shareToken}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        // Candidate: session started → redirect to first stage immediately
        if (!interviewerView && data.status === "in_progress") {
          const dest = getFirstStageHref();
          if (dest) {
            window.location.href = dest;
          } else {
            window.location.reload();
          }
        }
        // Interviewer: candidate knocked — show approval modal
        if (interviewerView && data.startRequested && !approvalModalOpen) {
          setApprovalModalOpen(true);
          setStartRequested(true);
        }
        // Sync dismissed request
        if (interviewerView && !data.startRequested && startRequested) {
          setStartRequested(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [status, interviewerView, interview.id, interview.shareToken, approvalModalOpen, startRequested]);

  async function requestStart() {
    setStartRequestSending(true);
    try {
      const res = await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startRequested: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStartRequested(true);
      toast.success("Request sent!", { description: "Waiting for the interviewer to approve." });
    } catch {
      toast.error("Could not send request. Please try again.");
    } finally {
      setStartRequestSending(false);
    }
  }

  async function approveStart() {
    // Clear the request flag then start the session
    await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startRequested: false }),
    });
    setApprovalModalOpen(false);
    setStartRequested(false);
    await start();
  }

  async function dismissRequest() {
    await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startRequested: false }),
    });
    setApprovalModalOpen(false);
    setStartRequested(false);
    toast.info("Start request dismissed.");
  }

  // Dynamic Audio Voice Wave Simulation loops
  useEffect(() => {
    if (!inCall) return;
    const interval = setInterval(() => {
      if (micEnabled) {
        setUserDecibels(Array.from({ length: 7 }, () => Math.floor(Math.random() * 45) + 5));
      } else {
        setUserDecibels([2, 2, 2, 2, 2, 2, 2]);
      }
      if (simColleague) {
        setPeerDecibels(Array.from({ length: 7 }, () => Math.floor(Math.random() * 55) + 8));
      }
    }, 150);
    return () => clearInterval(interval);
  }, [inCall, micEnabled, simColleague]);

  useEffect(() => {
    if (status !== "in_progress" || !startedMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status, startedMs]);

  const elapsedSec = startedMs ? Math.floor((now - startedMs) / 1000) : 0;
  const remainingSec = Math.max(0, interview.totalSec - elapsedSec);
  const expired = status === "in_progress" && remainingSec === 0;

  // Auto-end when timer expires.
  useEffect(() => {
    if (expired && interviewerView) void finish("completed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  // Map best status per challenge.
  const attemptByChallenge = useMemo(() => {
    const out = new Map<string, Attempt["status"]>();
    for (const a of attempts) {
      const prev = out.get(a.challengeId);
      if (a.status === "passed" || !prev) out.set(a.challengeId, a.status);
    }
    return out;
  }, [attempts]);

  const passedCount = useMemo(() => {
    let n = 0;
    for (const c of challenges) if (attemptByChallenge.get(c.id) === "passed") n++;
    return n;
  }, [challenges, attemptByChallenge]);

  async function start() {
    try {
      const payload: any = {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      };
      if (interview.sourceType === "playground" && playgrounds[0]) {
        payload.activePlaygroundId = playgrounds[0].id;
      }

      const res = await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      if (interview.sourceType !== "playground" && challenges[0]) {
        await fetch(`/api/interview/${interview.id}/active?token=${interview.shareToken}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ challengeId: challenges[0].id }),
        }).catch(() => {});
      }

      const iso = new Date().toISOString();
      setStartedAt(iso);
      setStatus("in_progress");

      // Interviewer: Redirect to the first stage immediately!
      const dest = getFirstStageHref();
      if (dest) {
        window.location.href = dest;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't start clock", { description: msg });
    }
  }



  async function finish(target: "completed" | "abandoned", finalVerdict?: string) {
    try {
      const res = await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          status: target, 
          finishedAt: new Date().toISOString(),
          verdict: finalVerdict || null
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(target);
      if (finalVerdict) setVerdict(finalVerdict);
      setInCall(false);
      setVerdictModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't update status", { description: msg });
    }
  }

  const shareCode = interview.shortCode || interview.shareToken;
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${shareCode}`;
  const candidateLink = `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${interview.id}?token=${interview.shareToken}`;
  // Co-interviewer link appends a ?cointerviewer=1 hint so the lobby knows to greet them differently  
  const coInterviewerLink = `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${interview.id}?token=${interview.shareToken}&cointerviewer=1`;
  const shareText = `Join my live coding session on Interviewpad!\n\nLink: ${joinUrl}\nCode: ${interview.shortCode || "N/A"}`;

  async function copyCandidateLink() {
    try {
      await navigator.clipboard.writeText(candidateLink);
      toast.success("Candidate link copied!", { description: "Share this with the candidate. Only one candidate slot." });
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  async function copyAccessCode() {
    if (!interview.shortCode) return;
    try {
      await navigator.clipboard.writeText(interview.shortCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      toast.error("Failed to copy access code.");
    }
  }

  async function copyCoInterviewerLink() {
    try {
      await navigator.clipboard.writeText(coInterviewerLink);
      toast.success("Co-Interviewer link copied!", { description: "Multiple interviewers can join with this link." });
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  const activeChallengeId = challenges.find((c) => attemptByChallenge.get(c.id) !== "passed")?.id;

  return (
    <div className="min-h-[85vh] bg-bg relative overflow-hidden text-fg selection:bg-accent/30 selection:text-accent font-sans flex flex-col justify-center py-6 md:py-10">
      {/* Single soft glow behind hero (matches /interview pattern) */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none z-0" />

      <div className="max-w-5xl w-full mx-auto px-6 relative z-10 space-y-5">
        
        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2.5 text-xs font-medium tracking-wider text-muted hover:text-fg transition-all duration-300 group"
          >
            <div className="p-1.5 rounded-full bg-surface border border-border group-hover:border-accent/40 group-hover:bg-elevated transition-all shadow-sm">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-muted group-hover:text-accent" />
            </div>
            <span className="font-bold uppercase tracking-widest text-[10px]">Exit Arena</span>
          </Link>
          
        </div>

        {/* Dashboard Window */}
        <div className="border border-border bg-surface rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-98 duration-500">

          {/* Dashboard Header Bar */}
          <div className="border-b border-border bg-elevated px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-inner shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/5 animate-pulse" />
                <Sparkles className="w-4 h-4 text-accent relative z-10" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg tracking-tight leading-none">{interview.title || "Interview Session"}</h2>
                <div className="flex items-center gap-2.5 mt-1.5">
                  {interview.candidateName && (
                    <span className="text-[11px] text-muted flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted/65" /> Candidate: <span className="font-semibold text-fg/80">{interview.candidateName}</span>
                    </span>
                  )}
                  {interview.type && (
                    <>
                      <span className="text-muted/30 text-xs leading-none">•</span>
                      <span className="text-[9px] font-bold bg-bg/60 border border-border px-2 py-0.5 rounded-full text-muted uppercase tracking-wider">
                        {interview.type}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Call Trigger Button */}
              {status !== "completed" && status !== "abandoned" && (
                <button
                  onClick={() => setInCall(!inCall)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 shadow-sm border active:scale-95 ${
                    inCall 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20" 
                      : "bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
                  }`}
                >
                  {inCall ? (
                    <>
                      <PhoneOff className="w-3 h-3" />
                      Leave Call
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-3 h-3" />
                      Join Call
                    </>
                  )}
                </button>
              )}
              
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border shadow-sm ${
                interviewerView 
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400" 
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
              }`}>
                {interviewerView ? "Interviewer" : "Candidate"}
              </span>
            </div>
          </div>

          {/* Multiplayer Video Calling Lobby Canvas */}
          {inCall && (
            <div className="border-b border-border bg-bg/40 p-6 space-y-5 animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    Live Collaboration Active
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg/90 mt-1">Multiplayer Live Space</h3>
                </div>

                {/* Calling Room Call Bar Buttons */}
                <div className="flex items-center gap-2.5 bg-panel border border-border rounded-full px-3.5 py-1.5 shrink-0 shadow-sm">
                  <button
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 border ${
                      micEnabled ? "bg-surface border-border text-accent shadow-sm" : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
                    }`}
                    title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setCamEnabled(!camEnabled)}
                    className={`p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 border ${
                      camEnabled ? "bg-surface border-border text-accent shadow-sm" : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
                    }`}
                    title={camEnabled ? "Disable Video Camera" : "Enable Video Camera"}
                  >
                    {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setScreenShare(!screenShare)}
                    className={`p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 border ${
                      screenShare ? "bg-accent/15 border-accent/30 text-accent shadow-sm" : "bg-surface border-border text-muted hover:text-fg"
                    }`}
                    title={screenShare ? "Stop Screen Share" : "Share Screen"}
                  >
                    <ScreenShare className="w-4 h-4" />
                  </button>

                  <div className="h-5 w-[1px] bg-border/60 mx-1" />
                  
                  <button
                    onClick={() => setSimColleague(!simColleague)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 ${
                      simColleague 
                        ? "bg-accent/15 border border-accent/35 text-accent shadow-sm" 
                        : "bg-surface border border-border text-muted hover:text-fg"
                    }`}
                  >
                    {simColleague ? "Remove Mock Peer" : "Simulate Mock Peer"}
                  </button>
                </div>
              </div>

              {/* Grid display for active member cameras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidate Frame (Left) */}
                <div className="rounded-2xl border border-border bg-bg aspect-video relative overflow-hidden flex flex-col justify-between p-5 group shadow-inner transition-all duration-300 hover:border-accent/40">
                  
                  {!interviewerView ? (
                    // Local webcam feed (You as Candidate)
                    camEnabled ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-violet-500/5 flex items-center justify-center">
                        <div className="relative">
                          {/* Pulse Rings */}
                          <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-60" />
                          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center text-accent font-black text-2xl relative shadow-md">
                            C
                          </div>
                        </div>
                        
                        {/* Dynamic Sound Decibels */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10">
                          {userDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-accent transition-all duration-150 shadow-[0_0_8px_var(--accent)]" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted/50">
                        <VideoOff className="w-8 h-8 opacity-45" />
                      </div>
                    )
                  ) : (
                    // Remote/Simulated peer feed (The Candidate)
                    simColleague ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-violet-500/5 flex items-center justify-center">
                        <div className="text-center space-y-2.5">
                          <div className="relative mx-auto">
                            <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center text-accent font-black text-xl relative shadow-md">
                              {interview.candidateName ? interview.candidateName.substring(0, 2).toUpperCase() : "C"}
                              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center shadow shadow-emerald-500/30">
                                <Mic className="w-2.5 h-2.5 text-white" />
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-fg/80">{interview.candidateName || "Candidate"}</div>
                            <div className="text-[9px] text-muted flex items-center justify-center gap-1.5 mt-0.5">
                              <Wifi className="w-3 h-3 text-emerald-500/80" />
                              18ms (Excellent)
                            </div>
                          </div>
                        </div>

                        {/* Decibels Wave */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10">
                          {peerDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-accent transition-all duration-150 shadow-[0_0_8px_var(--accent)]" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted gap-2">
                        <Users className="w-8 h-8 opacity-35" />
                        <div className="text-xs font-bold text-fg/60">Waiting for candidate...</div>
                        <div className="text-[9px] text-muted max-w-[220px] leading-relaxed">Send the candidate invite link to allow them to join the room.</div>
                      </div>
                    )
                  )}

                  {/* Status tag */}
                  {(!interviewerView || simColleague) && (
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full px-2.5 py-1 text-[9px] font-mono flex items-center gap-1.5 border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {!interviewerView ? "You (Candidate)" : (interview.candidateName || "Candidate")}
                    </div>
                  )}
                </div>

                {/* Interviewer Frame (Right) */}
                <div className="rounded-2xl border border-border bg-bg aspect-video relative overflow-hidden flex flex-col justify-between p-5 group shadow-inner transition-all duration-300 hover:border-violet-500/40">
                  
                  {interviewerView ? (
                    // Local webcam feed (You as Interviewer)
                    camEnabled ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-accent/5 flex items-center justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping opacity-60" />
                          <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-500 font-black text-2xl relative shadow-md">
                            I
                          </div>
                        </div>
                        
                        {/* Dynamic Sound Decibels */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10">
                          {userDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-violet-500 transition-all duration-150 shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted/50">
                        <VideoOff className="w-8 h-8 opacity-45" />
                      </div>
                    )
                  ) : (
                    // Remote/Simulated peer feed (The Interviewer)
                    simColleague ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-accent/5 flex items-center justify-center">
                        <div className="text-center space-y-2.5">
                          <div className="relative mx-auto">
                            <div className="w-16 h-16 rounded-full bg-violet-500/5 border border-violet-500/20 flex items-center justify-center text-violet-500 font-black text-xl relative shadow-md">
                              AN
                              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center shadow shadow-emerald-500/30">
                                <Mic className="w-2.5 h-2.5 text-white" />
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-fg/80">Arvind Nishad (Interviewer)</div>
                            <div className="text-[9px] text-muted flex items-center justify-center gap-1.5 mt-0.5">
                              <Wifi className="w-3 h-3 text-emerald-500/80" />
                              12ms (Excellent)
                            </div>
                          </div>
                        </div>

                        {/* Decibels Wave */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10">
                          {peerDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-violet-500 transition-all duration-150 shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted gap-2">
                        <Users className="w-8 h-8 opacity-35" />
                        <div className="text-xs font-bold text-fg/60">Waiting for interviewer...</div>
                        <div className="text-[9px] text-muted max-w-[220px] leading-relaxed">Waiting for the interviewer to join the call lobby.</div>
                      </div>
                    )
                  )}

                  {/* Status tag */}
                  {(interviewerView || simColleague) && (
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full px-2.5 py-1 text-[9px] font-mono flex items-center gap-1.5 border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {interviewerView ? "You (Interviewer)" : "Arvind (Interviewer)"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid Content Panels */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border bg-surface">
            
            {/* LEFT COLUMN: Command Panel */}
            <div className="md:col-span-5 p-5 space-y-6 flex flex-col">
              
              {/* Status and Timer Box */}
              <div className="p-5 rounded-2xl border border-border bg-bg/60 relative overflow-hidden group transition-colors duration-300 hover:bg-elevated">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none transition-all duration-500 group-hover:bg-accent/10" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Timer Status</span>
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    status === "completed"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
                      : status === "abandoned"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"
                        : status === "in_progress"
                          ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-500 dark:text-indigo-400 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                          : "bg-bg/60 border-border text-muted"
                  }`}>
                    {status === "completed" ? "Concluded" : status === "abandoned" ? "Abandoned" : status === "in_progress" ? "Live" : "Standby"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/70 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted/60" /> Time Remaining
                  </span>
                  <div className={`text-4xl md:text-5xl font-mono font-extrabold tracking-tight transition-colors duration-500 tabular-nums ${remainingSec < 60 && status === "in_progress" ? "text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.35)] animate-pulse" : "text-fg"}`}>
                    {status === "scheduled" ? formatDuration(interview.totalSec) : formatDuration(remainingSec)}
                  </div>
                </div>
              </div>

              {/* Action triggers */}
              <div className="space-y-3">
                {status === "scheduled" && interviewerView && (
                  <button
                    onClick={start}
                    className="w-full relative overflow-hidden group/btn px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg transition-all duration-300 shadow-md hover:shadow-accent/20 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-between"
                  >
                    <span className="text-xs font-black uppercase tracking-wider">Initiate Clock</span>
                    <Play className="w-3.5 h-3.5 fill-current transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                )}

                {status === "scheduled" && !interviewerView && (
                  <div className="p-5 rounded-2xl border border-border bg-bg/60 text-center space-y-4">
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-60" />
                      <div className="relative w-12 h-12 rounded-full bg-accent/10 border border-accent/25 grid place-items-center shadow-md">
                        <Play className="w-4 h-4 text-accent fill-current translate-x-0.5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-fg">Awaiting Interviewer</div>
                      <div className="text-[11px] text-muted mt-1.5 leading-relaxed max-w-[280px] mx-auto">Please standby. The interviewer will launch the round shortly.</div>
                    </div>
                    {startRequested ? (
                      <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-accent px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full animate-pulse mx-auto shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                        Signal Sent • Ready
                      </div>
                    ) : (
                      <button
                        onClick={requestStart}
                        disabled={startRequestSending}
                        className="px-4.5 py-2 rounded-xl bg-bg border border-border text-[11px] font-bold text-fg hover:bg-elevated hover:border-accent/40 hover:text-accent transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                      >
                        {startRequestSending ? "Sending Signal..." : "Signal Ready"}
                      </button>
                    )}
                  </div>
                )}

                {status === "in_progress" && interviewerView && (
                  <button
                    onClick={() => setVerdictModalOpen(true)}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-lg hover:shadow-rose-500/25 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-between"
                  >
                    <span>Conclude round</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                {status === "in_progress" && !interviewerView && (
                  <div className="p-4 rounded-xl border border-accent/30 bg-accent/10 text-center space-y-1.5 animate-pulse">
                    <div className="text-xs font-black uppercase tracking-wider text-accent">Session Active</div>
                    <div className="text-[10px] text-muted">Proceed to the challenge roadmap on the right.</div>
                  </div>
                )}

                {(status === "completed" || status === "abandoned") && (
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider leading-none">Round Concluded</div>
                      {verdict && (
                        <div className="text-[10px] text-muted mt-1.5 flex items-center gap-1.5">
                          Verdict: <span className="font-semibold text-fg capitalize bg-bg/60 border border-border px-2 py-0.5 rounded-full">{verdict.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Round queue (challenges) or Scenario + playgrounds */}
            <div className="md:col-span-7 p-5 space-y-5 flex flex-col justify-between">

                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    {isPlayground ? "Playground Rounds" : "Challenge Sequence"}
                  </span>
                  <span className="text-[10px] text-muted font-mono tracking-wider bg-bg/60 border border-border px-2 py-0.5 rounded-full">
                    {isPlayground ? playgrounds.length : challenges.length} {isPlayground ? "Rooms" : "Steps"}
                  </span>
                </div>

              {isPlayground ? (
                <div className="relative pl-6 border-l border-dashed border-border space-y-4 py-1 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
                  {playgrounds.map((p, idx) => {
                    const canEnter = status === "in_progress";
                    const isActive = interview.activePlaygroundId === p.id;
                    const tokenQuery = isOwner
                      ? ""
                      : `?token=${interview.shareToken}`;
                    const href = canEnter
                      ? `/interview/${interview.id}/play/${p.id}${tokenQuery}`
                      : null;

                    let statusTag = "bg-bg/60 border border-border text-muted";
                    if (isActive && status === "in_progress") {
                      statusTag = "bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-extrabold animate-pulse";
                    }

                    const tColor = templateColors[p.template] || {
                      border: "hover:border-accent/40 dark:hover:border-accent/30",
                      glow: "hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]",
                      text: "text-accent",
                      bg: "bg-accent/10 border-accent/20"
                    };

                    return (
                      <div key={p.id} className="relative group">
                        <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-border bg-bg flex items-center justify-center transition-all duration-300 group-hover:border-accent shadow-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive && status === "in_progress" ? "bg-accent animate-ping" : "bg-border/60"}`} />
                        </div>

                        <div className={`p-4 rounded-2xl border border-border bg-bg/60 shadow-sm transition-all duration-300 hover:bg-elevated hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${tColor.border} ${tColor.glow}`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">Round {idx + 1}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide ${statusTag}`}>
                                {isActive && status === "in_progress" ? "Active" : "Queued"}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-fg tracking-tight">{p.title}</h3>
                            <div className="flex items-center gap-2 text-[11px] text-muted">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider shadow-sm ${tColor.bg} ${tColor.text}`}>
                                {p.template || "playground"}
                              </span>
                              <span>•</span>
                              <span>Scenario round (judged manually)</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {href ? (
                              <Link
                                href={href}
                                className="px-4 py-2 rounded-xl bg-bg hover:bg-elevated border border-border hover:border-accent/40 text-xs font-bold text-fg transition-all flex items-center gap-1.5 group-hover:text-accent shadow-sm active:scale-95"
                              >
                                {interviewerView ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
                                    Observe Code
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    Enter Workspace
                                  </>
                                )}
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="px-4 py-2 rounded-xl bg-bg/60 border border-border text-xs font-bold text-muted flex items-center gap-1.5 cursor-not-allowed"
                              >
                                Locked
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="relative pl-6 border-l border-dashed border-border space-y-4 py-1 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
                  {challenges.map((c, idx) => {
                    const result = attemptByChallenge.get(c.id);
                    const passed = result === "passed";
                    const attempted = !!result;
                    const canEnter = status === "in_progress";
                    const isActive = activeChallengeId === c.id;
                    
                    let href: string | null = canEnter 
                      ? `/challenges/${c.slug}/attempt?session=${interview.id}&multiplayer=true` 
                      : null;
                      
                    if (href && interview.shareToken) {
                      href += `&token=${interview.shareToken}`;
                    }
                    
                    // Style configurations
                    let statusTag = "bg-bg/60 border border-border text-muted";
                    if (isActive && status === "in_progress") {
                      statusTag = "bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-extrabold animate-pulse";
                    } else if (passed) {
                      statusTag = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-extrabold";
                    } else if (result === "failed") {
                      statusTag = "bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 font-extrabold";
                    }

                    const diffColors = {
                      easy: { text: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                      medium: { text: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                      hard: { text: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" }
                    }[c.difficulty] || { text: "text-accent", bg: "bg-accent/10 border-accent/20" };

                    return (
                      <div key={c.id} className="relative group">
                        
                        {/* Interactive node dot on the left path line */}
                        <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-border bg-bg flex items-center justify-center transition-all duration-300 group-hover:border-accent shadow-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive && status === "in_progress" ? "bg-accent animate-ping" : passed ? "bg-emerald-500" : result === "failed" ? "bg-rose-500" : "bg-border/60"}`} />
                        </div>

                        {/* Card layout details */}
                        <div className="p-4 rounded-2xl border border-border bg-bg/60 shadow-sm transition-all duration-300 hover:bg-elevated hover:border-accent/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">Stage {idx + 1}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide ${statusTag}`}>
                                {isActive && status === "in_progress" ? "Active Step" : passed ? "Passed" : result === "failed" ? "Failed" : "Pending"}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-fg tracking-tight">{c.title}</h3>
                            <div className="flex items-center gap-2.5 text-[11px] text-muted">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider shadow-sm ${diffColors.bg} ${diffColors.text}`}>
                                {c.difficulty}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-muted/65" />
                                {c.estimatedMinutes}m est.
                              </span>
                            </div>
                          </div>

                          {/* Right side workspace entry CTA */}
                          <div className="shrink-0 flex items-center gap-2">
                            {href ? (
                              <Link
                                href={href}
                                className="px-4 py-2 rounded-xl bg-bg hover:bg-elevated border border-border hover:border-accent/40 text-xs font-bold text-fg transition-all flex items-center gap-1.5 group-hover:text-accent shadow-sm active:scale-95"
                              >
                                {interviewerView ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
                                    Observe Code
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    {passed ? "Revisit Code" : attempted ? "Resume Attempt" : "Enter Workspace"}
                                  </>
                                )}
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="px-4 py-2 rounded-xl bg-bg/60 border border-border text-xs font-bold text-muted flex items-center gap-1.5 cursor-not-allowed"
                              >
                                View Only
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Quick Join Strip — code-first share for the candidate. Observer link tucked behind a disclosure. */}
        {isOwner && (
          <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Candidate row — access code is the hero */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5 p-4 md:p-5">
              <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Candidate access code</div>
                  {interview.shortCode ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-black text-2xl md:text-3xl tracking-[0.2em] text-accent select-all leading-none">
                        {interview.shortCode}
                      </span>
                      <button
                        onClick={copyAccessCode}
                        className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-bg border border-border hover:bg-elevated hover:border-accent/40 hover:text-accent text-muted transition active:scale-95"
                        title="Copy access code"
                      >
                        {codeCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted mt-1">No code generated</div>
                  )}
                </div>
              </div>

              {/* Inline share actions */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  onClick={copyCandidateLink}
                  className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-bg border border-border hover:bg-elevated hover:border-accent/40 hover:text-accent text-muted text-[10px] font-bold uppercase tracking-wider transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                  title="Copy candidate join link"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Copy link
                </button>
                <button
                  onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join my coding interview as the candidate!\nLink: ${candidateLink}`)}`, "_blank"); }}
                  className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-500 text-[10px] font-bold uppercase tracking-wider transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={() => { window.open(`mailto:?subject=You are invited to a coding interview&body=${encodeURIComponent(`Join as the candidate:\n${candidateLink}`)}`, "_blank"); }}
                  className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-amber-500 text-[10px] font-bold uppercase tracking-wider transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
              </div>
            </div>

            {/* Observer disclosure */}
            <div className="border-t border-border">
              <button
                onClick={() => setShowObserverLink((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg transition group"
                aria-expanded={showObserverLink}
              >
                <span className="inline-flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-violet-500" />
                  Observer share link
                  <span className="text-[9px] font-mono text-muted normal-case tracking-normal">view & note-taking</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showObserverLink ? "rotate-180" : ""}`} />
              </button>

              {showObserverLink && (
                <div className="px-5 pb-4 pt-1 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={coInterviewerLink}
                      className="flex-1 min-w-0 bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono text-fg select-all outline-none"
                    />
                    <button
                      onClick={copyCoInterviewerLink}
                      className="p-2 rounded-lg bg-bg border border-border hover:bg-elevated hover:border-violet-500/40 hover:text-violet-500 text-muted transition active:scale-95"
                      title="Copy observer link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join my coding interview as an observer!\nLink: ${coInterviewerLink}`)}`, "_blank"); }}
                      className="p-2 rounded-lg bg-bg border border-border hover:bg-elevated hover:text-emerald-500 text-muted transition active:scale-95"
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { window.open(`mailto:?subject=Join as co-interviewer&body=${encodeURIComponent(`Co-Interviewer link:\n${coInterviewerLink}`)}`, "_blank"); }}
                      className="p-2 rounded-lg bg-bg border border-border hover:bg-elevated hover:text-amber-500 text-muted transition active:scale-95"
                      title="Share via Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Verdict Selection Dialog */}
      {verdictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h3 className="text-lg font-bold text-fg tracking-tight">Lock Session Verdict</h3>
                <p className="text-xs text-muted mt-1">Select the official recommendation for this candidate. This action will conclude the session.</p>
              </div>
              <button
                onClick={() => setVerdictModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-panel transition-all active:scale-95"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 relative z-10">
              {[
                { id: "success", label: "Met Bar (Success)", desc: "Strong code design and problem-solving.", bg: "hover:bg-emerald-500/5 hover:border-emerald-500/20", activeBg: "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.12)]", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                { id: "failed", label: "Did Not Meet Bar", desc: "Failed to meet key coding standards.", bg: "hover:bg-rose-500/5 hover:border-rose-500/20", activeBg: "bg-rose-500/10 border-rose-500/35 text-rose-600 dark:text-rose-400 shadow-[0_4px_20px_rgba(244,63,94,0.12)]", icon: <XCircle className="w-4 h-4 text-rose-500" /> },
                { id: "left_in_between", label: "Walkout", desc: "Candidate abandoned the round mid-way.", bg: "hover:bg-elevated", activeBg: "bg-elevated border-border text-fg shadow-[0_4px_20px_rgba(0,0,0,0.06)]", icon: <ArrowLeft className="w-4 h-4 text-muted" /> },
                { id: "suspicious", label: "Flagged Suspicious", desc: "Suspected of cheating or AI usage.", bg: "hover:bg-amber-500/5 hover:border-amber-500/20", activeBg: "bg-amber-500/10 border-amber-500/35 text-amber-600 dark:text-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.12)]", icon: <Radio className="w-4 h-4 text-amber-500 animate-pulse" /> },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVerdict(v.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-start gap-3 ${
                    selectedVerdict === v.id ? v.activeBg : `bg-bg border-border ${v.bg} text-fg`
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{v.icon}</div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">{v.label}</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 relative z-10 border-t border-border">
              <button
                type="button"
                onClick={() => setVerdictModalOpen(false)}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold text-muted hover:text-fg hover:bg-panel transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => finish("completed", selectedVerdict)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold tracking-wide transition-all duration-300 shadow-md hover:shadow-rose-500/25 active:scale-95"
              >
                Lock Verdict
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Start Request Approval Modal Overlay */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="relative w-12 h-12 shrink-0">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-60" />
                <div className="relative w-12 h-12 rounded-full bg-accent/10 border border-accent/25 grid place-items-center shadow-md">
                  <Play className="w-4 h-4 text-accent fill-current translate-x-0.5" />
                </div>
              </div>
              <div className="pt-0.5">
                <div className="text-lg font-bold text-fg tracking-tight">Candidate is Ready</div>
                <div className="text-xs text-muted mt-1 leading-relaxed">The candidate has signaled. Authorize to begin the session and start the clock.</div>
              </div>
            </div>
            
            <div className="flex gap-2.5 pt-4 relative z-10 border-t border-border">
              <button
                onClick={dismissRequest}
                className="flex-1 py-2 rounded-xl border border-border bg-bg hover:bg-elevated text-xs font-semibold text-muted hover:text-fg transition-all active:scale-95"
              >
                Standby
              </button>
              <button
                onClick={approveStart}
                className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-bold transition-all duration-300 shadow-md hover:shadow-accent/20 active:scale-95"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "rose" | "fg" | "muted";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "amber"
        ? "text-amber-500"
        : accent === "rose"
          ? "text-rose-500 animate-pulse"
          : accent === "muted"
            ? "text-muted"
            : "text-fg";
  return (
    <div className="p-4 rounded-xl border border-border bg-surface">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-1">
        {label}
      </div>
      <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
