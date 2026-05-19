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
} from "lucide-react";
import { toast } from "sonner";

export type SessionChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
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

export default function InterviewRunner({
  interview,
  challenges,
  attempts,
  interviewerView,
  isOwner = false,
}: {
  interview: Interview;
  challenges: SessionChallenge[];
  attempts: Attempt[];
  interviewerView: boolean;
  isOwner?: boolean;
}) {
  const [status, setStatus] = useState(interview.status);
  const [startedAt, setStartedAt] = useState<string | null>(interview.startedAtIso);

  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  const [now, setNow] = useState<number>(Date.now());

  // Evaluator notes & outcomes
  const [notes, setNotes] = useState(interview.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [verdict, setVerdict] = useState(interview.verdict);
  const [verdictModalOpen, setVerdictModalOpen] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState<"success" | "failed" | "left_in_between" | "suspicious">("success");

  // Multiplayer Real-Time State variables
  const [inCall, setInCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [simColleague, setSimColleague] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCoInviteMenu, setShowCoInviteMenu] = useState(false);
  const [userDecibels, setUserDecibels] = useState<number[]>([15, 30, 20, 45, 15]);
  const [peerDecibels, setPeerDecibels] = useState<number[]>([10, 15, 8, 12, 10]);

  // Start-request handshake state
  const [startRequested, setStartRequested] = useState(false);
  const [startRequestSending, setStartRequestSending] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

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
        // Candidate: session started → reload to enter live state
        if (!interviewerView && data.status === "in_progress") {
          window.location.reload();
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
      const res = await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "in_progress",
          startedAt: new Date().toISOString(),
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const iso = new Date().toISOString();
      setStartedAt(iso);
      setStatus("in_progress");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't start clock", { description: msg });
    }
  }

  async function handleSaveNotes(val: string) {
    setNotes(val);
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: val }),
      });
      setNotesSaved(true);
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingNotes(false);
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
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/j/${shareCode}`;
  const candidateLink = `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${interview.id}?token=${interview.shareToken}`;
  // Co-interviewer link appends a ?cointerviewer=1 hint so the lobby knows to greet them differently  
  const coInterviewerLink = `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${interview.id}?token=${interview.shareToken}&cointerviewer=1`;
  const shareText = `Join my live coding session on Interviewpad!\n\nLink: ${joinUrl}\nCode: ${interview.shortCode || "N/A"}`;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Invite copied to clipboard!", { description: "Share this with your colleague." });
      setShowShareMenu(false);
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  async function copyCandidateLink() {
    try {
      await navigator.clipboard.writeText(candidateLink);
      toast.success("Candidate link copied!", { description: "Share this with the candidate. Only one candidate slot." });
      setShowShareMenu(false);
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  async function copyCoInterviewerLink() {
    try {
      await navigator.clipboard.writeText(coInterviewerLink);
      toast.success("Co-Interviewer link copied!", { description: "Multiple interviewers can join with this link." });
      setShowCoInviteMenu(false);
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    setShowShareMenu(false);
  }

  function shareEmail() {
    window.open(`mailto:?subject=Join my coding session&body=${encodeURIComponent(shareText)}`, "_blank");
    setShowShareMenu(false);
  }

  const activeChallengeId = challenges.find((c) => attemptByChallenge.get(c.id) !== "passed")?.id;

  return (
    <div className="min-h-[85vh] bg-bg relative overflow-hidden text-fg selection:bg-accent/30 selection:text-accent font-sans flex flex-col justify-center py-6 md:py-10">
      {/* Atmospheric Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-0 left-0 w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-10 dark:opacity-20 transition-colors duration-1000 ${status === "in_progress" ? "bg-amber-500/20 dark:bg-amber-500/30 animate-pulse" : status === "completed" ? "bg-emerald-500/20 dark:bg-emerald-500/30" : "bg-accent/10 dark:bg-accent/20"}`} />
        <div className={`absolute bottom-0 right-0 w-[60vw] h-[60vw] rounded-full blur-[150px] opacity-10 dark:opacity-20 transition-colors duration-1000 ${status === "in_progress" ? "bg-rose-500/10 dark:bg-rose-500/20" : status === "completed" ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-violet-500/10 dark:bg-violet-500/20"}`} />
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 relative z-10 space-y-5">
        
        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-muted hover:text-fg transition-colors group"
          >
            <div className="p-1 rounded-full bg-surface border border-border group-hover:border-border-strong group-hover:bg-panel transition-all">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-muted" />
            </div>
            Exit Arena
          </Link>
          
          <div className="flex items-center gap-2">
            {isOwner && (
              <div className="flex items-center gap-2">
                {/* Invite Candidate Button */}
                <div className="relative">
                  <button
                    onClick={() => { setShowShareMenu(!showShareMenu); setShowCoInviteMenu(false); }}
                    className="px-3.5 py-2 rounded-full bg-surface/85 backdrop-blur-xl border border-border hover:bg-panel hover:border-border-strong text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5 text-accent" />
                    Candidate
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-bg border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-3 py-2.5 border-b border-border mb-1.5">
                        <p className="text-[10px] text-muted font-black uppercase tracking-wider mb-1">Candidate Invite Link</p>
                        <p className="text-[10px] text-muted/70">One candidate slot — only one person can join as the candidate.</p>
                      </div>
                      {interview.shortCode && (
                        <div className="px-3 py-2.5 border-b border-border mb-1.5 flex flex-col items-center justify-center gap-1">
                          <p className="text-[10px] text-muted font-black uppercase tracking-wider">Access Code</p>
                          <p className="text-lg font-mono text-fg bg-surface border border-border/50 px-3 py-1 rounded-lg tracking-[0.25em] shadow-inner select-all">
                            {interview.shortCode}
                          </p>
                        </div>
                      )}
                      <button onClick={copyCandidateLink} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-surface transition flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5" /> Copy Candidate Link
                      </button>
                      <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join my coding interview as the candidate!\nLink: ${candidateLink}`)}`, "_blank"); setShowShareMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-emerald-500/80 hover:text-emerald-500 hover:bg-surface transition flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5" /> Share via WhatsApp
                      </button>
                      <button onClick={() => { window.open(`mailto:?subject=You are invited to a coding interview&body=${encodeURIComponent(`Join as the candidate:\n${candidateLink}`)}`, "_blank"); setShowShareMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-amber-500/80 hover:text-amber-500 hover:bg-surface transition flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> Share via Email
                      </button>
                    </div>
                  )}
                </div>

                {/* Invite Co-Interviewer Button */}
                {interviewerView && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowCoInviteMenu(!showCoInviteMenu); setShowShareMenu(false); }}
                      className="px-3.5 py-2 rounded-full bg-surface/85 backdrop-blur-xl border border-border hover:bg-panel hover:border-border-strong text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5 text-violet-500" />
                      Observer
                    </button>
                    {showCoInviteMenu && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-bg border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2.5 border-b border-border mb-1.5">
                          <p className="text-[10px] text-muted font-black uppercase tracking-wider mb-1">Co-Interviewer Invite</p>
                          <p className="text-[10px] text-muted/70">Multiple interviewers can join with this link to observe the session.</p>
                        </div>
                        <button onClick={copyCoInterviewerLink} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-surface transition flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5" /> Copy Co-Interviewer Link
                        </button>
                        <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join my coding interview as a co-interviewer!\nLink: ${coInterviewerLink}`)}`, "_blank"); setShowCoInviteMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-emerald-500/80 hover:text-emerald-500 hover:bg-surface transition flex items-center gap-2">
                          <MessageCircle className="w-3.5 h-3.5" /> Share via WhatsApp
                        </button>
                        <button onClick={() => { window.open(`mailto:?subject=Join as co-interviewer&body=${encodeURIComponent(`Co-Interviewer link:\n${coInterviewerLink}`)}`, "_blank"); setShowCoInviteMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-amber-500/80 hover:text-amber-500 hover:bg-surface transition flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> Share via Email
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Unified Glassmorphic Dashboard Window */}
        <div className="border border-border bg-surface/20 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-98 duration-500">
          
          {/* Dashboard Header Bar */}
          <div className="border-b border-border bg-surface/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-sm shrink-0">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg tracking-tight leading-none">{interview.title || "Interview Session"}</h2>
                <div className="flex items-center gap-2.5 mt-1.5">
                  {interview.candidateName && (
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted/70" /> Candidate: <span className="font-semibold text-fg/80">{interview.candidateName}</span>
                    </span>
                  )}
                  {interview.type && (
                    <>
                      <span className="text-muted/30 text-xs leading-none">•</span>
                      <span className="text-[9px] font-semibold bg-panel border border-border px-2 py-0.5 rounded-full text-muted uppercase tracking-wider">
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
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 shadow-sm border ${
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
            <div className="border-b border-border bg-bg/60 p-5 space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-border/80">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-accent animate-ping" />
                    Live Collaboration Active
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg mt-0.5">Multiplayer Mock Call</h3>
                </div>

                {/* Calling Room Call Bar Buttons */}
                <div className="flex items-center gap-2 bg-surface/50 border border-border rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`p-1.5 rounded-lg transition ${
                      micEnabled ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:bg-muted/10 hover:text-rose-500"
                    }`}
                    title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micEnabled ? <Mic className="w-3.5 h-3.5 text-accent" /> : <MicOff className="w-3.5 h-3.5 text-rose-500" />}
                  </button>
                  <button
                    onClick={() => setCamEnabled(!camEnabled)}
                    className={`p-1.5 rounded-lg transition ${
                      camEnabled ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:bg-muted/10 hover:text-rose-500"
                    }`}
                    title={camEnabled ? "Disable Video Camera" : "Enable Video Camera"}
                  >
                    {camEnabled ? <Video className="w-3.5 h-3.5 text-accent" /> : <VideoOff className="w-3.5 h-3.5 text-rose-500" />}
                  </button>
                  <button
                    onClick={() => setScreenShare(!screenShare)}
                    className={`p-1.5 rounded-lg transition ${
                      screenShare ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:bg-muted/10"
                    }`}
                    title={screenShare ? "Stop Screen Share" : "Share Screen"}
                  >
                    <ScreenShare className={`w-3.5 h-3.5 ${screenShare ? "text-accent" : ""}`} />
                  </button>

                  <div className="h-5 w-[1px] bg-border mx-1" />
                  <button
                    onClick={() => setSimColleague(!simColleague)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${
                      simColleague 
                        ? "bg-accent/15 border border-accent/20 text-accent hover:bg-accent/25" 
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
                <div className="rounded-xl border border-border bg-surface/50 aspect-video relative overflow-hidden flex flex-col justify-between p-4 group shadow-inner">
                  {!interviewerView ? (
                    // Local webcam feed (You as Candidate)
                    camEnabled ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-violet-500/5 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-accent font-black text-xl animate-pulse">
                          C
                        </div>
                        {/* Dynamic Sound Decibels */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                          {userDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-accent transition-all duration-150" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted">
                        <VideoOff className="w-7 h-7 opacity-40" />
                      </div>
                    )
                  ) : (
                    // Remote/Simulated peer feed (The Candidate)
                    simColleague ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-violet-500/5 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-lg relative mx-auto shadow-sm">
                            {interview.candidateName ? interview.candidateName.substring(0, 2).toUpperCase() : "C"}
                            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center shadow shadow-emerald-500/20">
                              <Mic className="w-2 h-2 text-white" />
                            </span>
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-fg/80">{interview.candidateName || "Candidate"}</div>
                          <div className="text-[9px] text-muted flex items-center justify-center gap-1">
                            <Wifi className="w-2.5 h-2.5 text-emerald-500" />
                            18ms (Excellent)
                          </div>
                        </div>

                        {/* Decibels Wave */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                          {peerDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-accent transition-all duration-150" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted gap-1.5">
                        <Users className="w-7 h-7 opacity-40" />
                        <div className="text-xs font-bold text-fg/70">Waiting for candidate...</div>
                        <div className="text-[9px] text-muted max-w-[200px]">Send the candidate invite link to allow them to join the room.</div>
                      </div>
                    )
                  )}

                  {/* Status tag */}
                  {(!interviewerView || simColleague) && (
                    <div className="absolute top-4 right-4 bg-black/40 text-white rounded-full px-2 py-0.5 text-[9px] font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {!interviewerView ? "You (Candidate)" : (interview.candidateName || "Candidate")}
                    </div>
                  )}
                </div>

                {/* Interviewer Frame (Right) */}
                <div className="rounded-xl border border-border bg-surface/50 aspect-video relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                  {interviewerView ? (
                    // Local webcam feed (You as Interviewer)
                    camEnabled ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-accent/5 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 font-black text-xl animate-pulse">
                          I
                        </div>
                        {/* Dynamic Sound Decibels */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                          {userDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-violet-500 transition-all duration-150" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted">
                        <VideoOff className="w-7 h-7 opacity-40" />
                      </div>
                    )
                  ) : (
                    // Remote/Simulated peer feed (The Interviewer)
                    simColleague ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-accent/5 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 font-black text-lg relative mx-auto shadow-sm">
                            AN
                            <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center shadow">
                              <Mic className="w-2.5 h-2.5 text-white" />
                            </span>
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-fg/80">Arvind Nishad (Interviewer)</div>
                          <div className="text-[9px] text-muted flex items-center justify-center gap-1">
                            <Wifi className="w-2.5 h-2.5 text-emerald-500" />
                            12ms (Excellent)
                          </div>
                        </div>

                        {/* Decibels Wave */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                          {peerDecibels.map((db, idx) => (
                            <div 
                              key={idx} 
                              style={{ height: `${db}%` }} 
                              className="w-1 rounded-full bg-violet-500 transition-all duration-150" 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted gap-1.5">
                        <Users className="w-7 h-7 opacity-40" />
                        <div className="text-xs font-bold text-fg/70">Waiting for interviewer...</div>
                        <div className="text-[9px] text-muted max-w-[200px]">Waiting for the interviewer to join the call lobby.</div>
                      </div>
                    )
                  )}

                  {/* Status tag */}
                  {(interviewerView || simColleague) && (
                    <div className="absolute top-4 right-4 bg-black/40 text-white rounded-full px-2 py-0.5 text-[9px] font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {interviewerView ? "You (Interviewer)" : "Arvind (Interviewer)"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid Content Panels */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border bg-surface/5">
            
            {/* LEFT COLUMN: Command Panel */}
            <div className="md:col-span-5 p-5 space-y-5">
              
              {/* Status and Timer Box */}
              <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Timer Status</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    status === "completed"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                      : status === "abandoned"
                        ? "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                        : status === "in_progress"
                          ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 animate-pulse"
                          : "bg-muted/10 border border-border text-muted"
                  }`}>
                    {status === "completed" ? "Concluded" : status === "abandoned" ? "Abandoned" : status === "in_progress" ? "Live" : "Standby"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted/70 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Time Remaining
                  </span>
                  <div className={`text-4xl font-mono font-bold tracking-tight transition-colors duration-500 tabular-nums ${remainingSec < 60 && status === "in_progress" ? "text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse" : "text-fg"}`}>
                    {status === "scheduled" ? formatDuration(interview.totalSec) : formatDuration(remainingSec)}
                  </div>
                </div>
              </div>

              {/* Action triggers */}
              <div className="space-y-2.5">
                {status === "scheduled" && interviewerView && (
                  <button
                    onClick={start}
                    className="w-full relative overflow-hidden group/btn px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-bg transition-all duration-300 shadow-md hover:-translate-y-0.5 flex items-center justify-between"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Initiate Clock</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                {status === "scheduled" && !interviewerView && (
                  <div className="p-4 rounded-xl border border-border bg-surface/30 text-center space-y-3.5">
                    <div className="relative w-10 h-10 mx-auto">
                      <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                      <div className="relative w-10 h-10 rounded-full bg-accent/10 border border-accent/25 grid place-items-center">
                        <Play className="w-3.5 h-3.5 text-accent fill-current translate-x-0.5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-fg">Awaiting Interviewer</div>
                      <div className="text-[11px] text-muted mt-1 leading-relaxed">Please standby. The interviewer will launch the round shortly.</div>
                    </div>
                    {startRequested ? (
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-accent px-3 py-1 bg-accent/10 border border-accent/20 rounded-full animate-pulse mx-auto">
                        Signal Sent • Ready
                      </div>
                    ) : (
                      <button
                        onClick={requestStart}
                        disabled={startRequestSending}
                        className="px-4 py-2 rounded-lg bg-surface hover:bg-panel border border-border text-[11px] font-bold text-fg transition-all active:scale-95 disabled:opacity-50"
                      >
                        {startRequestSending ? "Sending Signal..." : "Signal Ready"}
                      </button>
                    )}
                  </div>
                )}

                {status === "in_progress" && interviewerView && (
                  <button
                    onClick={() => setVerdictModalOpen(true)}
                    className="w-full px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-md hover:-translate-y-0.5 flex items-center justify-between"
                  >
                    <span>Conclude round</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                {status === "in_progress" && !interviewerView && (
                  <div className="p-3 rounded-xl border border-accent/10 bg-accent/5 text-center space-y-1 animate-pulse">
                    <div className="text-xs font-bold uppercase tracking-wider text-accent">Session Active</div>
                    <div className="text-[10px] text-muted">Proceed to the challenge roadmap on the right.</div>
                  </div>
                )}

                {(status === "completed" || status === "abandoned") && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 shadow-sm">
                    <Trophy className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider leading-none">Round Concluded</div>
                      {verdict && <div className="text-[10px] text-muted mt-1">Verdict: <span className="font-semibold text-fg/80 capitalize">{verdict.replace(/_/g, ' ')}</span></div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Private Notes (Interviewer) or Guidelines (Candidate) */}
              {interviewerView ? (
                <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none group-hover:bg-accent/10 transition-all duration-500" />
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Evaluation Notes</span>
                  </div>
                  
                  <textarea
                    value={notes}
                    onChange={(e) => handleSaveNotes(e.target.value)}
                    placeholder="Record insights, communication skills, or code quality seamlessly..."
                    className="w-full h-24 bg-transparent text-xs text-fg placeholder:text-muted/60 focus:outline-none resize-none leading-relaxed"
                  />
                  
                  <div className="flex justify-end items-center gap-1.5 text-[9px] text-muted border-t border-border/50 pt-2 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {savingNotes ? "Saving..." : notesSaved ? "Saved" : "Auto-saved"}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Guidelines</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted/95">
                    <li className="flex items-start gap-1.5">
                      <span className="text-accent font-bold">1.</span>
                      <span>Think out loud to explain your problem solving workflow.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-accent font-bold">2.</span>
                      <span>Consider edge cases and code complexities before writing.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-accent font-bold">3.</span>
                      <span>Collaborate with your evaluator to ensure clear intent.</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Challenge Timeline Steps */}
            <div className="md:col-span-7 p-5 space-y-4">
              
              <div className="border-b border-border/50 pb-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Challenge Sequence</span>
                <span className="text-[10px] text-muted/60 font-mono">{challenges.length} Steps</span>
              </div>

              <div className="relative pl-6 border-l border-dashed border-border/80 space-y-4 py-1">
                {challenges.map((c, idx) => {
                  const result = attemptByChallenge.get(c.id);
                  const passed = result === "passed";
                  const attempted = !!result;
                  const canEnter = status === "in_progress";
                  const isActive = activeChallengeId === c.id;
                  
                  let href: string | null = canEnter 
                    ? `/challenges/${c.slug}/attempt?session=${interview.id}&multiplayer=true` 
                    : null;
                    
                  if (href && interviewerView) {
                    href += `&token=${interview.shareToken}`;
                  }
                  
                  // Style configurations
                  let statusTag = "bg-panel border border-border text-muted";
                  if (isActive && status === "in_progress") {
                    statusTag = "bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-semibold animate-pulse";
                  } else if (passed) {
                    statusTag = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-semibold";
                  } else if (result === "failed") {
                    statusTag = "bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 font-semibold";
                  }

                  return (
                    <div key={c.id} className="relative group">
                      
                      {/* Interactive node dot on the left path line */}
                      <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-border bg-bg flex items-center justify-center transition-all duration-300 group-hover:border-accent">
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive && status === "in_progress" ? "bg-accent animate-ping" : passed ? "bg-emerald-500" : result === "failed" ? "bg-rose-500" : "bg-border"}`} />
                      </div>

                      {/* Card layout details */}
                      <div className="p-3.5 rounded-xl border border-border bg-surface/50 shadow-sm transition-all duration-300 hover:border-border-strong hover:bg-surface hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Stage {idx + 1}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${statusTag}`}>
                              {isActive && status === "in_progress" ? "Active Step" : passed ? "Passed" : result === "failed" ? "Failed" : "Pending"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-fg tracking-tight">{c.title}</h3>
                          <div className="flex items-center gap-2 text-[11px] text-muted">
                            <span className={`font-semibold capitalize ${difficultyColor[c.difficulty]}`}>
                              {c.difficulty}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted/70" />
                              {c.estimatedMinutes}m est.
                            </span>
                          </div>
                        </div>

                        {/* Right side workspace entry CTA */}
                        <div className="shrink-0 flex items-center gap-2">
                          {href ? (
                            <Link
                              href={href}
                              className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-panel border border-border hover:border-border-strong text-xs font-bold text-fg transition-all flex items-center gap-1.5 group-hover:text-accent shadow-sm"
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
                              className="px-3.5 py-1.5 rounded-lg bg-surface/30 border border-border/50 text-xs font-bold text-muted/60 flex items-center gap-1.5 cursor-not-allowed"
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
            </div>

          </div>
        </div>

      </div>

      {/* Verdict Selection Dialog */}
      {verdictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h3 className="text-lg font-bold text-fg tracking-tight">Lock Session Verdict</h3>
                <p className="text-xs text-muted mt-1">Select the official recommendation for this candidate. This action will conclude the session.</p>
              </div>
              <button
                onClick={() => setVerdictModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-panel transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 relative z-10">
              {[
                { id: "success", label: "Met Bar (Success)", desc: "Strong code design and problem-solving.", bg: "hover:bg-emerald-500/5 hover:border-emerald-500/20", activeBg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.08)]", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                { id: "failed", label: "Did Not Meet Bar", desc: "Failed to meet key coding standards.", bg: "hover:bg-rose-500/5 hover:border-rose-500/20", activeBg: "bg-rose-500/10 border-rose-500/40 text-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.08)]", icon: <XCircle className="w-4 h-4 text-rose-500" /> },
                { id: "left_in_between", label: "Walkout", desc: "Candidate abandoned the round mid-way.", bg: "hover:bg-panel hover:border-border-strong", activeBg: "bg-panel border-border-strong text-fg shadow-[0_2px_8px_rgba(0,0,0,0.04)]", icon: <ArrowLeft className="w-4 h-4 text-muted" /> },
                { id: "suspicious", label: "Flagged Suspicious", desc: "Suspected of cheating or external AI usage.", bg: "hover:bg-amber-500/5 hover:border-amber-500/20", activeBg: "bg-amber-500/10 border-amber-500/40 text-amber-600 shadow-[0_2px_8px_rgba(245,158,11,0.08)]", icon: <Radio className="w-4 h-4 text-amber-500 animate-pulse" /> },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVerdict(v.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-start gap-3 ${
                    selectedVerdict === v.id ? v.activeBg : `bg-surface border-border ${v.bg} text-fg/80`
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{v.icon}</div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">{v.label}</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 relative z-10 border-t border-border">
              <button
                type="button"
                onClick={() => setVerdictModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-muted hover:text-fg hover:bg-panel transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => finish("completed", selectedVerdict)}
                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold tracking-wide transition-all duration-300 shadow-sm"
              >
                Lock Verdict
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Start Request Approval Modal Overlay */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="relative w-12 h-12 shrink-0">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                <div className="relative w-12 h-12 rounded-full bg-accent/10 border border-accent/25 grid place-items-center shadow-sm">
                  <Play className="w-4 h-4 text-accent fill-current translate-x-0.5" />
                </div>
              </div>
              <div className="pt-0.5">
                <div className="text-lg font-bold text-fg tracking-tight">Candidate is Ready</div>
                <div className="text-xs text-muted mt-1 leading-relaxed">The candidate has signaled. Authorize to begin the session and start the clock.</div>
              </div>
            </div>
            
            <div className="flex gap-2.5 pt-3 relative z-10 border-t border-border">
              <button
                onClick={dismissRequest}
                className="flex-1 py-2 rounded-lg border border-border bg-surface hover:bg-panel text-xs font-semibold text-muted hover:text-fg transition-all"
              >
                Standby
              </button>
              <button
                onClick={approveStart}
                className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-semibold transition-all duration-300 shadow-sm"
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
    <div className="p-4 rounded-xl border border-border bg-surface/50">
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
