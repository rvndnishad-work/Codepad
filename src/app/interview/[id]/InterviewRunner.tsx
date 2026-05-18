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

  // Guest polls for status change (session started by host)
  // Host polls for start requests from candidate
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
        // Guest: session started → reload to enter live state
        if (!isOwner && data.status === "in_progress") {
          window.location.reload();
        }
        // Host: candidate knocked — show approval modal
        if (isOwner && data.startRequested && !approvalModalOpen) {
          setApprovalModalOpen(true);
          setStartRequested(true);
        }
        // Sync dismissed request
        if (isOwner && !data.startRequested && startRequested) {
          setStartRequested(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [status, isOwner, interview.id, interview.shareToken, approvalModalOpen, startRequested]);

  async function requestStart() {
    setStartRequestSending(true);
    try {
      const res = await fetch(`/api/interview/${interview.id}`, {
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
    await fetch(`/api/interview/${interview.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startRequested: false }),
    });
    setApprovalModalOpen(false);
    setStartRequested(false);
    await start();
  }

  async function dismissRequest() {
    await fetch(`/api/interview/${interview.id}`, {
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
    if (expired && !interviewerView) void finish("completed");
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
      const res = await fetch(`/api/interview/${interview.id}`, {
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
      await fetch(`/api/interview/${interview.id}`, {
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
      const res = await fetch(`/api/interview/${interview.id}`, {
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/interview"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Interviews
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center shrink-0">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black tracking-[0.2em] text-muted uppercase mb-0.5 flex items-center gap-2">
                Cooperative Mock Workspace
                {interviewerView && (
                  <span className="text-accent normal-case tracking-normal font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Interviewer View
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-fg">{interview.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Share button — always visible to session owner, never to guests */}
            {isOwner && (
              <div className="flex items-center gap-2">
                {/* Invite Candidate (single slot) */}
                <div className="relative">
                  <button
                    onClick={() => { setShowShareMenu(!showShareMenu); setShowCoInviteMenu(false); }}
                    className="px-3.5 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5 shadow-sm"
                    title="Invite Candidate — one slot only"
                  >
                    <Users className="w-3.5 h-3.5 text-accent" />
                    Invite Candidate
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
                      <button onClick={copyCandidateLink} className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-surface transition flex items-center gap-2">
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

                {/* Invite Co-Interviewer (multiple slots) — only for Interviewers */}
                {interviewerView && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowCoInviteMenu(!showCoInviteMenu); setShowShareMenu(false); }}
                      className="px-3.5 py-2.5 rounded-xl border border-border bg-bg hover:bg-panel text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5 shadow-sm"
                      title="Invite Co-Interviewer — multiple allowed"
                    >
                      <Share2 className="w-3.5 h-3.5 text-violet-500" />
                      Invite Co-Interviewer
                    </button>
                    {showCoInviteMenu && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-bg border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2.5 border-b border-border mb-1.5">
                          <p className="text-[10px] text-muted font-black uppercase tracking-wider mb-1">Co-Interviewer Invite</p>
                          <p className="text-[10px] text-muted/70">Multiple interviewers can join with this link to observe the session.</p>
                        </div>
                        <button onClick={copyCoInterviewerLink} className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-surface transition flex items-center gap-2">
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

            {/* Multiplayer Call Command Center Trigger - Hidden once ended */}
            {status !== "completed" && status !== "abandoned" && (
              <button
                onClick={() => setInCall(!inCall)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md ${
                  inCall 
                    ? "bg-rose-500 text-white hover:bg-rose-600 hover:scale-[1.02] active:scale-[0.98]" 
                    : "bg-accent text-bg hover:bg-accent-soft hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {inCall ? (
                  <>
                    <PhoneOff className="w-3.5 h-3.5" />
                    Leave Calling Room
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3.5 h-3.5" />
                    Join Colleague Call
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multiplayer Video Calling Lobby Canvas */}
      {inCall && (
        <div className="rounded-2xl border border-border bg-bg shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-accent flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-accent animate-ping" />
                Live Session Active
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-fg mt-1">Multiplayer Mock Call</h3>
            </div>

            {/* Calling Room Call Bar Buttons */}
            <div className="flex items-center gap-2 bg-surface/50 border border-border rounded-xl p-1 shrink-0">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-2 rounded-lg transition ${
                  micEnabled ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:bg-muted/10 hover:text-rose-500"
                }`}
                title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {micEnabled ? <Mic className="w-4 h-4 text-accent" /> : <MicOff className="w-4 h-4 text-rose-500" />}
              </button>
              <button
                onClick={() => setCamEnabled(!camEnabled)}
                className={`p-2 rounded-lg transition ${
                  camEnabled ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:bg-muted/10 hover:text-rose-500"
                }`}
                title={camEnabled ? "Disable Video Camera" : "Enable Video Camera"}
              >
                {camEnabled ? <Video className="w-4 h-4 text-accent" /> : <VideoOff className="w-4 h-4 text-rose-500" />}
              </button>
              <button
                onClick={() => setScreenShare(!screenShare)}
                className={`p-2 rounded-lg transition ${
                  screenShare ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:bg-muted/10"
                }`}
                title={screenShare ? "Stop Screen Share" : "Share Screen"}
              >
                <ScreenShare className={`w-4 h-4 ${screenShare ? "text-accent" : ""}`} />
              </button>

              {!interviewerView && (
                <div className="h-6 w-[1px] bg-border mx-1" />
              )}

              {!interviewerView && (
                <button
                  onClick={() => setSimColleague(!simColleague)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                    simColleague 
                      ? "bg-accent/15 border border-accent/20 text-accent hover:bg-accent/25" 
                      : "bg-surface border border-border text-muted hover:text-fg"
                  }`}
                >
                  {simColleague ? "Remove Mock Peer" : "Simulate Mock Peer"}
                </button>
              )}
            </div>
          </div>

          {/* Grid display for active member cameras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Candidate Frame */}
            <div className="rounded-xl border border-border bg-surface/50 aspect-video relative overflow-hidden flex flex-col justify-between p-4 group">
              {camEnabled ? (
                <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-violet-500/5 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-accent font-black text-xl animate-pulse">
                    C
                  </div>
                  {/* Dynamic Sound Decibels visual representation */}
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
                  <VideoOff className="w-8 h-8 opacity-40" />
                </div>
              )}

              <div className="absolute top-4 right-4 bg-black/40 text-white rounded-full px-2 py-0.5 text-[9px] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {interviewerView ? "Candidate" : "You (Candidate)"}
              </div>
            </div>

            {/* Interviewer Frame */}
            <div className="rounded-xl border border-border bg-surface/50 aspect-video relative overflow-hidden flex flex-col justify-between p-4">
              {simColleague ? (
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-accent/5 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 font-black text-xl relative mx-auto">
                      AN
                      <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center">
                        <Mic className="w-2.5 h-2.5 text-white" />
                      </span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-fg/80">{interviewerView ? "You (Interviewer)" : "Arvind Nishad (Interviewer)"}</div>
                    <div className="text-[9px] text-muted flex items-center justify-center gap-1">
                      <Wifi className="w-3 h-3 text-emerald-500" />
                      Latency: 12ms (Excellent)
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
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted gap-2">
                  <Users className="w-8 h-8 opacity-40" />
                  <div className="text-xs font-bold text-fg/70">Waiting for peer...</div>
                  <div className="text-[10px] text-muted max-w-[200px]">Click invite to share this live practicing lobby with your team.</div>
                </div>
              )}

              {simColleague && (
                <div className="absolute top-4 right-4 bg-black/40 text-white rounded-full px-2 py-0.5 text-[9px] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {interviewerView ? "You (Interviewer)" : "Arvind (Interviewer)"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status / Timer / Score row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Status"
          value={
            status === "scheduled"
              ? "Not started"
              : status === "in_progress"
                ? "In progress"
                : status === "completed"
                  ? "Completed"
                  : "Abandoned"
          }
          accent={status === "in_progress" ? "amber" : status === "completed" ? "emerald" : "muted"}
        />
        <Stat
          label="Time remaining"
          value={status === "scheduled" ? formatDuration(interview.totalSec) : formatDuration(remainingSec)}
          accent={remainingSec < 60 && status === "in_progress" ? "rose" : "fg"}
        />
        <Stat
          label="Score"
          value={`${passedCount}/${challenges.length}`}
          accent={passedCount === challenges.length && challenges.length > 0 ? "emerald" : "fg"}
        />
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Span 2): Challenge Queue & CTA */}
        <div className="lg:col-span-2 space-y-6">
          {/* Start CTA — Owner only */}
          {status === "scheduled" && isOwner && (
            <div className="p-5 rounded-xl border border-accent/30 bg-accent/5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-fg mb-0.5">Ready when you are.</div>
                <div className="text-xs text-muted">
                  The clock starts as soon as you click. Hard limit: {formatDuration(interview.totalSec)}.
                </div>
              </div>
              <button
                onClick={start}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)]"
              >
                <Play className="w-4 h-4 fill-current" />
                Start clock
              </button>
            </div>
          )}

          {/* Guest waiting state */}
          {status === "scheduled" && !isOwner && (
            <div className="p-5 rounded-xl border border-border bg-surface/50 space-y-4">
              <div className="flex items-center gap-4">
                {startRequested ? (
                  <div className="w-8 h-8 rounded-full border-2 border-accent/40 border-t-accent animate-spin shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 grid place-items-center shrink-0">
                    <Play className="w-4 h-4 text-accent" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-bold text-fg mb-0.5">
                    {startRequested ? "Waiting for the interviewer to approve…" : "Ready to begin?"}
                  </div>
                  <div className="text-xs text-muted">
                    {startRequested
                      ? "Your request has been sent. The interviewer will start the clock shortly."
                      : "Click the button to notify the interviewer that you're ready to start."}
                  </div>
                </div>
                {!startRequested && (
                  <button
                    onClick={requestStart}
                    disabled={startRequestSending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)] disabled:opacity-60"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {startRequestSending ? "Sending…" : "Request to Start"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Challenge queue */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
              Challenge Queue
            </h2>
            <ul className="flex flex-col gap-3">
              {challenges.map((c, idx) => {
                const result = attemptByChallenge.get(c.id);
                const passed = result === "passed";
                const attempted = !!result;
                const canEnter = status === "in_progress";
                
                // Cooperatively pass calling & simulation context down to editor attempts
                let href: string | null = canEnter 
                  ? `/challenges/${c.slug}/attempt?session=${interview.id}&multiplayer=true${simColleague ? "&sim=true" : ""}` 
                  : null;
                  
                if (href && interviewerView) {
                  href += `&token=${interview.shareToken}`;
                }
                  
                return (
                  <li
                    key={c.id}
                    className={`group flex items-center gap-4 p-4 rounded-xl border transition ${
                      passed
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : attempted
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-surface"
                    }`}
                  >
                    <span className="text-sm font-mono text-muted tabular-nums w-6 text-right">
                      {idx + 1}.
                    </span>
                    <div className="shrink-0">
                      {passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : result === "failed" ? (
                        <XCircle className="w-5 h-5 text-rose-500/60" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-muted/60">
                        {c.estimatedMinutes}m estimate
                      </div>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${difficultyBg[c.difficulty]} ${difficultyColor[c.difficulty]} shrink-0`}
                    >
                      {c.difficulty}
                    </div>
                    {href ? (
                      <Link
                        href={href}
                        className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold transition shrink-0 inline-flex items-center gap-1 shadow-sm"
                      >
                        {interviewerView ? "Observe" : passed ? "Revisit" : attempted ? "Resume" : "Start"}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-muted/40 shrink-0">
                        {status === "scheduled" ? "Locked" : interviewerView ? "View only" : "—"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right Column: Private Interviewer Notes & Outcomes */}
        {!interviewerView && (
          <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-accent flex items-center justify-between">
                <span>Interviewer Panel</span>
                {savingNotes ? (
                  <span className="text-muted/60 normal-case tracking-normal animate-pulse">Saving...</span>
                ) : notesSaved ? (
                  <span className="text-emerald-500 normal-case tracking-normal font-bold">Saved</span>
                ) : null}
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-fg mt-1">Live Evaluation Notes</h3>
            </div>

            <textarea
              value={notes}
              onChange={(e) => handleSaveNotes(e.target.value)}
              placeholder="Record candidate strengths, coding speed, communication style, or system design insights here. Saves automatically on change..."
              rows={8}
              className="w-full p-3.5 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-xs text-fg outline-none transition resize-none leading-relaxed"
            />

            {verdict && (
              <div className="rounded-xl border border-border bg-surface/80 p-4 space-y-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-muted">Final Verdict Outcome</div>
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                  {verdict === "success" && <span className="text-emerald-500">🟢 Met Bar (Success)</span>}
                  {verdict === "failed" && <span className="text-rose-500">🔴 Failed to Meet Bar</span>}
                  {verdict === "left_in_between" && <span className="text-muted">⚪ Walkout / Incomplete</span>}
                  {verdict === "suspicious" && <span className="text-amber-500">⚠️ Flagged Suspicious</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* End session */}
      {status === "in_progress" && !interviewerView && (
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted">
            <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
            {formatDuration(remainingSec)} remaining
          </div>
          <button
            onClick={() => setVerdictModalOpen(true)}
            className="px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-elevated text-sm font-bold text-fg transition"
          >
            End session
          </button>
        </div>
      )}

      {status === "completed" && (
        <div className="mt-10 pt-6 border-t border-border p-5 rounded-xl bg-emerald-500/5 border-emerald-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-black text-fg">Session complete</h2>
            </div>
            {verdict && (
              <div className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-surface/50">
                {verdict === "success" && <span className="text-emerald-500">🟢 Met Bar</span>}
                {verdict === "failed" && <span className="text-rose-500">🔴 Failed</span>}
                {verdict === "left_in_between" && <span className="text-muted">⚪ Walkout</span>}
                {verdict === "suspicious" && <span className="text-amber-500">⚠️ Flagged Suspicious</span>}
              </div>
            )}
          </div>
          <p className="text-sm text-muted">
            Final score: <span className="text-fg font-bold tabular-nums">{passedCount}/{challenges.length}</span> challenges passed.
          </p>
        </div>
      )}

      {/* Structured End-Session Verdict Modal Overlay */}
      {verdictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-fg">Complete Interview Session</h3>
              <p className="text-xs text-muted mt-1">
                Select the final assessment verdict for this candidate's round.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: "success",
                  label: "🟢 Met Bar (Success)",
                  desc: "Passed the technical criteria. Strong code design and problem-solving.",
                  bg: "hover:bg-emerald-500/5 hover:border-emerald-500/30",
                  activeBg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-500",
                },
                {
                  id: "failed",
                  label: "🔴 Did Not Meet Bar (Failed)",
                  desc: "Failed to meet key coding standards or solve primary edge cases.",
                  bg: "hover:bg-rose-500/5 hover:border-rose-500/30",
                  activeBg: "bg-rose-500/10 border-rose-500/40 text-rose-500",
                },
                {
                  id: "left_in_between",
                  label: "⚪ Walkout (Left In Between)",
                  desc: "Candidate closed the browser or abandoned the round mid-way.",
                  bg: "hover:bg-zinc-500/5 hover:border-zinc-500/30",
                  activeBg: "bg-zinc-500/10 border-zinc-500/40 text-zinc-500",
                },
                {
                  id: "suspicious",
                  label: "⚠️ Flagged Suspicious (Cheating / AI Assistance)",
                  desc: "Suspected of copy-pasting code, tab switching, or external AI usage.",
                  bg: "hover:bg-amber-500/5 hover:border-amber-500/30",
                  activeBg: "bg-amber-500/10 border-amber-500/40 text-amber-500",
                },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVerdict(v.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col ${
                    selectedVerdict === v.id ? v.activeBg : `bg-surface border-border ${v.bg} text-fg/80`
                  }`}
                >
                  <div className="text-xs font-black uppercase tracking-wider">{v.label}</div>
                  <div className="text-[10px] text-muted mt-1 leading-relaxed">{v.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerdictModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:text-fg hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => finish("completed", selectedVerdict)}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition shadow-md"
              >
                Confirm & Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Start Request Approval Modal */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md mx-4 bg-bg border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                <div className="relative w-14 h-14 rounded-full bg-accent/15 border border-accent/30 grid place-items-center">
                  <Play className="w-6 h-6 text-accent fill-current" />
                </div>
              </div>
              <div>
                <div className="text-base font-black text-fg">Candidate is Ready!</div>
                <div className="text-xs text-muted mt-0.5">The candidate has requested to start the interview. Approve to begin the session and start the clock.</div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={dismissRequest}
                className="flex-1 py-2.5 rounded-xl border border-border bg-surface text-xs font-bold text-muted hover:text-fg hover:bg-elevated transition"
              >
                Not Yet
              </button>
              <button
                onClick={approveStart}
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
              >
                ✓ Approve & Start
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
