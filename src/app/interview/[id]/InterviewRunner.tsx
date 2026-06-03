"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import PromptChallengeRunner from "./PromptChallengeRunner";
import SubmissionPreview from "./SubmissionPreview";
import SubmissionReviewModal from "./SubmissionReviewModal";
import { challengeSurface } from "@/lib/templates";
import { describeStack, type TechStack } from "@/lib/interview/stack";
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
  X,
  MessageSquare,
  Layers,
  Code,
  Terminal,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export type SessionChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  /** Sandpack template id — drives the review surface (frontend → live preview). */
  template: string;
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
  sourceType: "challenge" | "playground" | "prompt" | "combined";
  scenario: string | null;
  stackJson?: string | null;
  activePlaygroundId: string | null;
  userId?: string | null;
  rubric?: {
    ratings: string;
    notes: string | null;
  } | null;
};

type Attempt = {
  challengeId: string;
  status: "passed" | "failed" | "in_progress" | "abandoned" | "submitted";
  durationSec: number | null;
  files?: string | null;
  testResults?: string | null;
  score?: number | null;
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

export type SessionPromptScenario = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  category: string;
  objective: string;
  description: string;
};

export type PromptAttempt = {
  id: string;
  scenarioId: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null;
  feedback: string | null;
  graderType: string | null;
  durationSec: number | null;
};

export default function InterviewRunner({
  interview,
  challenges,
  playgrounds,
  promptScenarios = [],
  attempts,
  promptAttempts = [],
  interviewerView,
  isOwner = false,
}: {
  interview: Interview;
  challenges: SessionChallenge[];
  playgrounds: SessionPlayground[];
  promptScenarios?: SessionPromptScenario[];
  attempts: Attempt[];
  promptAttempts?: PromptAttempt[];
  interviewerView: boolean;
  isOwner?: boolean;
}) {
  const isPlayground = interview.sourceType === "playground";
  const isPrompt = interview.sourceType === "prompt";
  const isCombined = interview.sourceType === "combined";

  const [selectedPromptScenario, setSelectedPromptScenario] = useState<SessionPromptScenario | null>(null);

  const activeScenario = useMemo(() => {
    if (!isPrompt || promptScenarios.length === 0) return null;
    return promptScenarios.find(
      (p) => !promptAttempts.some((a) => a.scenarioId === p.id)
    ) || promptScenarios[0];
  }, [isPrompt, promptScenarios, promptAttempts]);

  const initialAttempt = useMemo(() => {
    if (!activeScenario) return null;
    return promptAttempts.find((a) => a.scenarioId === activeScenario.id) || null;
  }, [activeScenario, promptAttempts]);
  const [status, setStatus] = useState(interview.status);
  const [startedAt, setStartedAt] = useState<string | null>(interview.startedAtIso);

  const startedMs = startedAt ? new Date(startedAt).getTime() : null;
  const [now, setNow] = useState<number>(Date.now());


  const [verdict, setVerdict] = useState(interview.verdict);
  const [verdictModalOpen, setVerdictModalOpen] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState<"success" | "failed" | "left_in_between" | "suspicious">("success");

  // Rubric States
  const parsedRubric = useMemo(() => {
    if (!interview.rubric) return null;
    try {
      return {
        ratings: JSON.parse(interview.rubric.ratings) as Record<string, number>,
        notes: interview.rubric.notes,
      };
    } catch {
      return null;
    }
  }, [interview.rubric]);

  const [rubricCodeQuality, setRubricCodeQuality] = useState(parsedRubric?.ratings?.CodeQuality ?? 3);
  const [rubricCommunication, setRubricCommunication] = useState(parsedRubric?.ratings?.Communication ?? 3);
  const [rubricProblemSolving, setRubricProblemSolving] = useState(parsedRubric?.ratings?.ProblemSolving ?? 3);
  const [rubricNotes, setRubricNotes] = useState(parsedRubric?.notes ?? "");

  // Post-interview Evaluation Summary Dashboard states
  const [selectedReview, setSelectedReview] = useState<{
    id: string;
    type: "challenge" | "playground" | "prompt";
  } | null>(() => {
    if (challenges.length > 0) return { id: challenges[0].id, type: "challenge" };
    if (playgrounds.length > 0) return { id: playgrounds[0].id, type: "playground" };
    if (promptScenarios.length > 0) return { id: promptScenarios[0].id, type: "prompt" };
    return null;
  });
  const [activeReviewTab, setActiveReviewTab] = useState<"code" | "tests" | "preview">("code");
  const [activeFileKey, setActiveFileKey] = useState<string>("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const activeReviewChallenge = useMemo(() => {
    if (!selectedReview || selectedReview.type !== "challenge") return null;
    return challenges.find((c) => c.id === selectedReview.id) || null;
  }, [selectedReview, challenges]);

  // Frontend/playground challenges (react, vanilla, …) get a live preview of the
  // submitted work in review; DSA (test-*) challenges only show code + tests.
  const reviewIsFrontend =
    !!activeReviewChallenge && challengeSurface(activeReviewChallenge.template) === "frontend";

  const activeReviewPlayground = useMemo(() => {
    if (!selectedReview || selectedReview.type !== "playground") return null;
    return playgrounds.find((p) => p.id === selectedReview.id) || null;
  }, [selectedReview, playgrounds]);

  const activeReviewPrompt = useMemo(() => {
    if (!selectedReview || selectedReview.type !== "prompt") return null;
    return promptScenarios.find((ps) => ps.id === selectedReview.id) || null;
  }, [selectedReview, promptScenarios]);

  const activeReviewAttempt = useMemo(() => {
    if (!selectedReview || selectedReview.type !== "challenge") return null;
    return attempts.find((a) => a.challengeId === selectedReview.id) || null;
  }, [selectedReview, attempts]);

  const activeReviewPromptAttempt = useMemo(() => {
    if (!selectedReview || selectedReview.type !== "prompt") return null;
    return promptAttempts.find((a) => a.scenarioId === selectedReview.id) || null;
  }, [selectedReview, promptAttempts]);

  const reviewFiles = useMemo(() => {
    if (!activeReviewAttempt?.files) return {} as Record<string, string>;
    try {
      return JSON.parse(activeReviewAttempt.files) as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  }, [activeReviewAttempt]);

  const reviewFileKeys = useMemo(() => Object.keys(reviewFiles), [reviewFiles]);

  useEffect(() => {
    if (reviewFileKeys.length > 0) {
      setActiveFileKey((prev) => reviewFileKeys.includes(prev) ? prev : reviewFileKeys[0]);
    } else {
      setActiveFileKey("");
    }
  }, [reviewFileKeys]);

  // Reset to the Code tab + close the full-editor modal whenever the reviewed
  // item changes, so a "preview" tab on a frontend challenge doesn't carry onto
  // a DSA one and the modal never shows another submission's files.
  useEffect(() => {
    setActiveReviewTab("code");
    setReviewModalOpen(false);
  }, [selectedReview]);

  const reviewTestResults = useMemo(() => {
    if (!activeReviewAttempt?.testResults) return null;
    try {
      return JSON.parse(activeReviewAttempt.testResults) as {
        passed: number;
        total: number;
        tests: Array<{ name: string; status: "pass" | "fail" | string; error?: string | null }>;
      };
    } catch {
      return null;
    }
  }, [activeReviewAttempt]);



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
    if (interview.sourceType === "combined") {
      return null;
    }
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
      const rubricPayload = {
        ratings: {
          CodeQuality: rubricCodeQuality,
          Communication: rubricCommunication,
          ProblemSolving: rubricProblemSolving,
        },
        notes: rubricNotes || null,
      };

      const res = await fetch(`/api/interview/${interview.id}?token=${interview.shareToken}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          status: target, 
          finishedAt: new Date().toISOString(),
          verdict: finalVerdict || null,
          rubric: rubricPayload,
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
    <div className="min-h-screen bg-bg relative overflow-x-hidden text-fg selection:bg-accent/30 selection:text-accent font-sans flex flex-col z-10">
      {/* Single soft glow behind hero (matches /interview pattern) */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none z-0" />

      {/* Immersive Docking Telemetry Header Bar */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-30 shrink-0 sticky top-0">
        <div className="flex items-center gap-6">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2.5 text-xs font-medium tracking-wider text-muted hover:text-fg transition-all duration-300 group shrink-0"
          >
            <div className="p-1.5 rounded-full bg-surface border border-border group-hover:border-accent/40 group-hover:bg-elevated transition-all shadow-sm">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-muted group-hover:text-accent" />
            </div>
            <span className="font-bold uppercase tracking-wider text-xs">Exit Arena</span>
          </Link>
          <div className="h-6 w-px bg-border hidden md:block" />
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/25 flex items-center justify-center text-accent shadow-inner shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 animate-pulse" />
              <Sparkles className="w-5 h-5 text-accent relative z-10" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-fg tracking-tight leading-tight">{interview.title || "Interview Session"}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {interview.candidateName && (
                  <span className="text-xs md:text-sm text-muted flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted/65" /> Candidate: <span className="font-semibold text-fg/80">{interview.candidateName}</span>
                  </span>
                )}
                {interview.stackJson && (() => {
                  try {
                    const label = describeStack(JSON.parse(interview.stackJson) as TechStack);
                    return label ? (
                      <span className="text-[10px] md:text-xs font-bold bg-accent/10 border border-accent/25 text-accent px-2.5 py-1 rounded-full leading-none inline-flex items-center gap-1.5">
                        <Layers className="w-3 h-3" /> {label}
                      </span>
                    ) : null;
                  } catch {
                    return null;
                  }
                })()}
                {interview.type && (
                  <>
                    <span className="text-muted/30 text-xs leading-none">•</span>
                    <span className="text-[10px] md:text-xs font-black bg-bg/60 border border-border px-3 py-1 rounded-full text-muted uppercase tracking-widest leading-none">
                      {interview.type}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3.5">
          {/* Call Trigger Button */}
          {status !== "completed" && status !== "abandoned" && (
            <button
              onClick={() => setInCall(!inCall)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 shadow-sm border active:scale-95 shrink-0 ${
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
          
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border shadow-sm shrink-0 ${
            interviewerView 
              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400" 
              : "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
          }`}>
            {interviewerView ? "Interviewer" : "Candidate"}
          </span>
        </div>
      </header>

      {/* Main Full-Screen Telemetry Body Window */}
      <div className="flex-1 flex flex-col min-h-0 w-full relative z-10 px-6 py-5 md:px-8 md:py-6 space-y-6">

          {/* Multiplayer Video Calling Lobby Canvas */}
          {inCall && (
            <div className="border-b border-border bg-bg/40 p-6 space-y-5 animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    Live Collaboration Active
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-fg/90 mt-1">Multiplayer Live Space</h3>
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
                    onClick={() => setSimColleague(!micEnabled ? false : !simColleague)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 ${
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
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-border">
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
                            <div className="text-xs font-black uppercase tracking-wider text-fg/80">{interview.candidateName || "Candidate"}</div>
                            <div className="text-xs text-muted flex items-center justify-center gap-1.5 mt-0.5">
                              <Wifi className="w-3.5 h-3.5 text-emerald-500/80" />
                              18ms (Excellent)
                            </div>
                          </div>
                        </div>

                        {/* Decibels Wave */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-border">
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
                        <div className="text-xs text-muted max-w-[220px] leading-relaxed">Send the candidate invite link to allow them to join the room.</div>
                      </div>
                    )
                  )}

                  {/* Status tag */}
                  {(!interviewerView || simColleague) && (
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 border border-border">
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
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-border">
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
                            <div className="text-xs font-black uppercase tracking-wider text-fg/80">Arvind Nishad (Interviewer)</div>
                            <div className="text-xs text-muted flex items-center justify-center gap-1.5 mt-0.5">
                              <Wifi className="w-3.5 h-3.5 text-emerald-500/80" />
                              12ms (Excellent)
                            </div>
                          </div>
                        </div>

                        {/* Decibels Wave */}
                        <div className="absolute bottom-4 left-4 flex items-end gap-1 h-8 px-2.5 py-1 rounded-lg bg-black/50 border border-border">
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
                        <div className="text-xs text-muted max-w-[220px] leading-relaxed">Waiting for the interviewer to join the call lobby.</div>
                      </div>
                    )
                  )}

                  {/* Status tag */}
                  {(interviewerView || simColleague) && (
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 border border-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {interviewerView ? "You (Interviewer)" : "Arvind (Interviewer)"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid Content Panels */}
          {(isPrompt || selectedPromptScenario) && status !== "scheduled" ? (
            <div className="p-6 bg-surface space-y-4 flex flex-col">
              {isCombined && (
                <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                  <button
                    onClick={() => setSelectedPromptScenario(null)}
                    className="px-4 py-2 rounded-xl bg-bg hover:bg-elevated border border-border text-xs font-bold text-fg transition-all flex items-center gap-1.5 hover:text-accent shadow-sm active:scale-95 animate-in fade-in duration-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Central Lobby
                  </button>
                  <span className="text-xs font-black uppercase tracking-wider text-muted">
                    Prompt Engineering Workspace
                  </span>
                </div>
              )}
              {(() => {
                const scenarioToRun = isPrompt ? activeScenario : selectedPromptScenario;
                if (!scenarioToRun) {
                  return (
                    <div className="text-center p-8 text-muted">
                      No prompt scenarios assigned to this session.
                    </div>
                  );
                }
                const specificAttempt = promptAttempts.find((a) => a.scenarioId === scenarioToRun.id) || null;
                return (
                  <PromptChallengeRunner
                    scenario={scenarioToRun}
                    sessionId={interview.id}
                    userId={isOwner ? interview.userId : null}
                    initialAttempt={specificAttempt}
                    interviewerView={interviewerView}
                    onSuccessSubmit={(newAttempt) => {
                      window.location.reload();
                    }}
                  />
                );
              })()}
            </div>
          ) : status === "scheduled" ? (
            <div className="w-full flex-1 max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in flex flex-col justify-center">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-black tracking-tight text-fg">Session Waiting Room</h2>
                <p className="text-muted text-sm max-w-lg mx-auto">
                  {interview.type === "mock" 
                    ? "Welcome to your mock interview session. Review the upcoming rounds and start when you are ready." 
                    : "The session is currently on standby. Invite the candidate and any co-interviewers, then initiate the clock to begin."}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COL: Start & Timer */}
                <div className="lg:col-span-5 space-y-6 flex flex-col">
                  <div className="p-8 rounded-3xl border border-border bg-surface/50 shadow-sm flex flex-col justify-between items-center text-center h-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
                    
                    <div className="space-y-3 relative z-10 w-full mb-8 mt-4">
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-muted">Session Duration</div>
                      <div className="text-5xl font-mono font-extrabold text-fg tabular-nums">{formatDuration(interview.totalSec)}</div>
                      <div className="text-xs text-muted/70 font-medium">Timer is currently on standby</div>
                    </div>

                    <div className="w-full relative z-10">
                      {(interviewerView || interview.type === "mock") ? (
                        <button
                          onClick={start}
                          className="w-full relative overflow-hidden group/btn px-6 py-5 rounded-2xl bg-accent hover:bg-accent-soft text-bg transition-all duration-300 shadow-[0_0_40px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_60px_rgba(var(--accent-rgb),0.4)] hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                          <Play className="w-5 h-5 fill-current transition-transform group-hover/btn:scale-110" />
                          <span className="text-sm font-black uppercase tracking-widest">
                            {interview.type === "mock" ? "Start Practice" : "Initiate Clock"}
                          </span>
                        </button>
                      ) : (
                        <div className="w-full p-5 rounded-2xl border border-border bg-bg/50 flex flex-col items-center justify-center gap-3">
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-60" />
                            <div className="relative w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                              <Clock className="w-4 h-4 text-accent" />
                            </div>
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-fg">Awaiting Interviewer</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COL: Invites & Rounds */}
                <div className="lg:col-span-7 space-y-6">
                  {isOwner && (
                    <div className="rounded-3xl border border-accent/20 bg-accent/5 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                              <Users className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-accent">Candidate Access</span>
                          </div>
                          <p className="text-xs text-fg/80 mb-5">Share this code or link with the candidate so they can join the session.</p>
                          
                          {interview.shortCode ? (
                            <div className="flex items-center gap-3 bg-surface border border-accent/20 rounded-2xl p-3 shadow-inner">
                              <span className="font-mono font-black text-3xl md:text-4xl tracking-[0.25em] text-accent select-all pl-3 flex-1">
                                {interview.shortCode}
                              </span>
                              <div className="h-10 w-px bg-border mx-2" />
                              <div className="flex flex-col gap-1.5 shrink-0 pr-1">
                                <button onClick={copyAccessCode} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-bg border border-border hover:bg-elevated hover:border-accent/40 hover:text-accent text-muted transition active:scale-95">
                                  {codeCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />} Code
                                </button>
                                <button onClick={copyCandidateLink} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-bg border border-border hover:bg-elevated hover:border-accent/40 hover:text-accent text-muted transition active:scale-95">
                                  <LinkIcon className="w-3 h-3" /> Link
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted">No code generated</div>
                          )}
                        </div>

                        <div className="md:w-48 shrink-0 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-accent/10 pt-5 md:pt-0 md:pl-6">
                          <span className="text-xs font-black uppercase tracking-wider text-muted mb-1">Quick Share</span>
                          <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join my coding interview as the candidate!\nLink: ${candidateLink}`)}`, "_blank"); }} className="w-full px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center gap-2.5">
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                          </button>
                          <button onClick={() => { window.open(`mailto:?subject=You are invited to a coding interview&body=${encodeURIComponent(`Join as the candidate:\n${candidateLink}`)}`, "_blank"); }} className="w-full px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold transition flex items-center gap-2.5">
                            <Mail className="w-4 h-4" /> Email
                          </button>
                        </div>
                      </div>

                      <div className="bg-surface/50 border-t border-accent/10 px-6 md:px-8 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Share2 className="w-4 h-4 text-violet-500 shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider text-muted shrink-0">Observer Link:</span>
                          <input type="text" readOnly value={coInterviewerLink} className="bg-transparent border-none outline-none text-xs font-mono text-fg/70 w-full truncate" />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={copyCoInterviewerLink} className="p-2 rounded-lg hover:bg-bg border border-transparent hover:border-violet-500/40 text-muted hover:text-violet-500 transition" title="Copy Observer Link">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join my coding interview as an observer!\nLink: ${coInterviewerLink}`)}`, "_blank"); }} className="p-2 rounded-lg hover:bg-bg border border-transparent hover:border-emerald-500/40 text-muted hover:text-emerald-500 transition" title="Share via WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { window.open(`mailto:?subject=Join as co-interviewer&body=${encodeURIComponent(`Co-Interviewer link:\n${coInterviewerLink}`)}`, "_blank"); }} className="p-2 rounded-lg hover:bg-bg border border-transparent hover:border-amber-500/40 text-muted hover:text-amber-500 transition" title="Share via Email">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-6 md:p-8 rounded-3xl border border-border bg-surface/50 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2.5 mb-6">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-fg">Session Itinerary</span>
                    </div>

                    {(challenges.length + playgrounds.length + promptScenarios.length) === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-8 text-xs text-muted italic">
                        No specific rounds configured for this session.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {challenges.map((c, i) => (
                          <div key={c.id} className="p-4 rounded-2xl border border-border bg-bg/50 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-xs font-black text-muted shrink-0">{i + 1}</div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-fg truncate">{c.title}</div>
                              <div className="text-xs text-muted mt-1 flex items-center gap-2">
                                <span className="uppercase px-1.5 py-[1px] bg-surface border border-border rounded text-xs font-semibold">{c.difficulty}</span>
                                {c.estimatedMinutes} mins
                              </div>
                            </div>
                            <Code className="w-4 h-4 text-muted/30" />
                          </div>
                        ))}
                        {playgrounds.map((p, i) => (
                          <div key={p.id} className="p-4 rounded-2xl border border-border bg-bg/50 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-xs font-black text-muted shrink-0">{challenges.length + i + 1}</div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-fg truncate">{p.title}</div>
                              <div className="text-xs text-muted mt-1 flex items-center gap-2">
                                <span className="uppercase px-1.5 py-[1px] bg-surface border border-border rounded text-xs font-semibold">Sandbox</span>
                                {p.template}
                              </div>
                            </div>
                            <Terminal className="w-4 h-4 text-muted/30" />
                          </div>
                        ))}
                        {promptScenarios.map((ps, i) => (
                          <div key={ps.id} className="p-4 rounded-2xl border border-border bg-bg/50 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-xs font-black text-muted shrink-0">{challenges.length + playgrounds.length + i + 1}</div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-fg truncate">{ps.title}</div>
                              <div className="text-xs text-muted mt-1 flex items-center gap-2">
                                <span className="uppercase px-1.5 py-[1px] bg-surface border border-border rounded text-xs font-semibold">AI Prompt</span>
                                {ps.difficulty}
                              </div>
                            </div>
                            <MessageSquare className="w-4 h-4 text-muted/30" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border bg-surface border border-border rounded-2xl shadow-xl overflow-hidden min-h-0">
            
            {/* LEFT COLUMN: Command Panel */}
            <div className="lg:col-span-5 p-6 space-y-6 flex flex-col overflow-y-auto scrollbar-thin">
              
              {/* Status and Timer Box */}
              <div className="p-6 rounded-3xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 backdrop-blur-md relative overflow-hidden group shadow-lg">
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-accent/10 rounded-full blur-[40px] pointer-events-none transition-all duration-500 group-hover:bg-accent/20" />
                <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-indigo-500/10 rounded-full blur-[30px] pointer-events-none" />
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-muted flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Timer Status
                  </span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider shadow-sm ${
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

                <div className="space-y-2 relative z-10">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-muted/70 flex items-center gap-1.5">
                     Time Remaining
                  </span>
                  <div className={`text-4xl md:text-5xl font-mono font-extrabold tracking-tight transition-colors duration-500 tabular-nums ${remainingSec < 60 && status === "in_progress" ? "text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.35)] animate-pulse" : "text-fg"}`}>
                    {formatDuration(remainingSec)}
                  </div>
                </div>

                {interview.candidateName && (
                  <div className="mt-5 pt-4 border-t border-border/60 relative z-10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">Candidate Name</div>
                      <div className="text-xs font-bold text-fg">{interview.candidateName}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action triggers */}
              <div className="space-y-3">
                {status === "in_progress" && (interviewerView || interview.type === "mock") && (
                  <button
                    onClick={() => setVerdictModalOpen(true)}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold uppercase tracking-widest text-xs transition-all duration-300 shadow-lg hover:shadow-rose-500/25 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-between"
                  >
                    <span>Conclude round</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                {status === "in_progress" && !interviewerView && interview.type !== "mock" && (
                  <div className="p-4 rounded-xl border border-accent/30 bg-accent/10 text-center space-y-1.5 animate-pulse">
                    <div className="text-xs font-black uppercase tracking-wider text-accent">Session Active</div>
                    <div className="text-xs text-muted">Proceed to the challenge roadmap on the right.</div>
                  </div>
                )}


                {interview.type === "mock" && status !== "completed" && status !== "abandoned" && (
                  <div className="p-4.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] space-y-3.5 shadow-sm animate-fade-in">
                    <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Self-Practice Guide</h4>
                    </div>
                    <ul className="space-y-3 text-xs text-muted leading-relaxed font-sans">
                      <li className="flex items-start gap-2.5">
                        <span className="w-4.5 h-4.5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px] mt-0.5 border border-indigo-500/20 shrink-0">1</span>
                        <div className="space-y-0.5">
                          <p className="text-fg font-semibold">Start &amp; Attempt Challenges</p>
                          <p className="text-xs text-muted/70">Click &quot;Start Practice&quot; to begin, then solve challenges using the timeline on the right.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-4.5 h-4.5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px] mt-0.5 border border-indigo-500/20 shrink-0">2</span>
                        <div className="space-y-0.5">
                          <p className="text-fg font-semibold">Think Aloud &amp; Simulate</p>
                          <p className="text-xs text-muted/70">Describe your logic out loud while writing code. It develops excellent muscle memory!</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-4.5 h-4.5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px] mt-0.5 border border-indigo-500/20 shrink-0">3</span>
                        <div className="space-y-0.5">
                          <p className="text-fg font-semibold">Self-Evaluation Rubric</p>
                          <p className="text-xs text-muted/70">When done, click &quot;Conclude round&quot; to score yourself on Code Quality, Problem Solving, and Communication.</p>
                        </div>
                      </li>
                    </ul>
                    
                    <div className="pt-2.5 border-t border-indigo-500/10 space-y-2">
                      <p className="text-xs text-muted leading-relaxed">Want peer feedback? Copy the link to invite a friend or mentor to act as your interviewer:</p>
                      <button
                        onClick={copyCoInterviewerLink}
                        className="w-full py-1.5 rounded-lg bg-bg border border-border text-xs font-bold text-fg hover:bg-elevated hover:border-indigo-500/30 hover:text-indigo-400 transition-all flex items-center justify-center gap-1.5 active:scale-[0.97]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Copy guest link
                      </button>
                    </div>
                  </div>
                )}

                {(status === "completed" || status === "abandoned") && (
                  <div className="space-y-5 w-full">
                    <div className="flex items-center gap-4 p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 shadow-sm animate-fade-in relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-emerald-500)_0%,transparent_40%)] opacity-[0.08]" />
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 relative z-10 shadow-inner">
                        <Trophy className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="relative z-10">
                        <div className="text-xs font-black uppercase tracking-[0.2em] leading-none mb-1.5 text-emerald-500">Round Concluded</div>
                        {verdict && (
                          <div className="text-xs text-muted flex items-center gap-1.5">
                            Verdict: <span className="font-bold text-fg capitalize bg-bg/80 border border-border px-2 py-0.5 rounded-md shadow-sm">{verdict.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl border border-border bg-gradient-to-b from-surface/50 to-bg/50 backdrop-blur-sm space-y-6 animate-fade-in delay-75 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4 relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.2em] text-fg">Evaluation Rubric</span>
                        </div>
                        {interviewerView && (
                          <Link
                            href={`/interview/${interview.id}/report?token=${interview.shareToken}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors text-xs font-bold tracking-wider"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View PDF Report
                          </Link>
                        )}
                      </div>

                      <div className="space-y-4 relative z-10">
                        {[
                          { name: "Code Quality", val: rubricCodeQuality, icon: Code },
                          { name: "Communication", val: rubricCommunication, icon: MessageSquare },
                          { name: "Problem Solving", val: rubricProblemSolving, icon: Layers }
                        ].map((m) => (
                          <div key={m.name} className="space-y-2 group">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-muted flex items-center gap-1.5 group-hover:text-fg transition-colors">
                                <m.icon className="w-3.5 h-3.5 text-muted/60 group-hover:text-accent transition-colors" />
                                {m.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-accent text-xs">{m.val}</span>
                                <span className="text-muted/50 font-mono">/ 5</span>
                              </div>
                            </div>
                            <div className="w-full bg-bg/50 border border-border h-2.5 rounded-full overflow-hidden flex gap-0.5 p-[1px]">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div
                                  key={star}
                                  className={`h-full flex-1 rounded-[2px] transition-all duration-500 ${
                                    star <= m.val
                                      ? "bg-gradient-to-r from-accent to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                      : "bg-surface"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {rubricNotes && (
                        <div className="space-y-2.5 pt-4 border-t border-border/50 relative z-10">
                          <span className="text-xs font-black uppercase tracking-[0.2em] text-muted flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-muted/60" /> Notes & Feedback
                          </span>
                          <div className="relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-accent/40 rounded-l-xl" />
                            <p className="text-xs text-fg/90 italic leading-relaxed bg-surface/50 p-4 pl-5 rounded-xl border border-border whitespace-pre-wrap shadow-inner">
                              {rubricNotes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Concluded Evaluation Summary OR Live Round sequence */}
            <div className="lg:col-span-7 p-6 space-y-6 flex flex-col overflow-y-auto scrollbar-thin min-h-[480px]">

              {status === "completed" || status === "abandoned" ? (
                <div className="space-y-5 flex-1 flex flex-col min-h-0 p-6 rounded-3xl border border-border bg-surface/30 backdrop-blur-md shadow-2xl relative overflow-hidden animate-fade-in">
                  {/* Subtle glass glow circles inside the dashboard */}
                  <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-accent/5 rounded-full blur-[64px] pointer-events-none" />
                  <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/5 rounded-full blur-[64px] pointer-events-none" />

                  {/* Dashboard Header */}
                  <div className="flex flex-col gap-1.5 pb-4 border-b border-border relative z-10 transition-all duration-300 hover:border-accent/25">
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] text-accent flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Trophy className="w-3.5 h-3.5 text-accent animate-pulse" />
                      </div>
                      Post-Round Review Dashboard
                    </h3>
                    <p className="text-xs text-muted tracking-wide mt-1 pl-8">
                      Review candidate's final submitted work across all curated steps. Select a round to inspect:
                    </p>
                  </div>

                  {/* Round Step Selectors */}
                  <div className="flex flex-col gap-2.5 pb-2 relative z-10 animate-fade-in delay-75 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {/* DSA Challenges */}
                    {challenges.map((c, idx) => {
                      const attempt = attempts.find((a) => a.challengeId === c.id);
                      const passed = attempt?.status === "passed";
                      const failed = attempt?.status === "failed";
                      const isSelected = selectedReview?.id === c.id && selectedReview?.type === "challenge";

                      let statusBadgeColor = "text-muted bg-surface/50 border-border";
                      let statusBadgeLabel = "Unattempted";
                      if (passed) {
                        statusBadgeColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.06)]";
                        statusBadgeLabel = "Passed";
                      } else if (failed) {
                        statusBadgeColor = "text-rose-500 bg-rose-500/10 border-rose-500/25 shadow-[0_0_8px_rgba(244,63,94,0.06)]";
                        statusBadgeLabel = "Failed";
                      }

                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedReview({ id: c.id, type: "challenge" })}
                          className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.99] duration-200 relative overflow-hidden ${
                            isSelected
                              ? "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]"
                              : "bg-surface/50 border-border hover:bg-elevated hover:border-border-strong text-muted hover:text-fg"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs opacity-70 shrink-0">DSA Step {idx + 1}</span>
                            <span className="w-1 h-1 rounded-full bg-border-strong shrink-0" />
                            <span className="font-extrabold text-fg truncate text-left">{c.title}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border shrink-0 ${statusBadgeColor}`}>
                            {statusBadgeLabel}
                          </span>
                        </button>
                      );
                    })}

                    {/* Playgrounds */}
                    {playgrounds.map((p, idx) => {
                      const isSelected = selectedReview?.id === p.id && selectedReview?.type === "playground";

                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedReview({ id: p.id, type: "playground" })}
                          className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.99] duration-200 relative overflow-hidden ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                              : "bg-surface/50 border-border hover:bg-elevated hover:border-border-strong text-muted hover:text-fg"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs opacity-70 shrink-0">Playground {idx + 1}</span>
                            <span className="w-1 h-1 rounded-full bg-border-strong shrink-0" />
                            <span className="font-extrabold text-fg truncate text-left">{p.title}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded border text-muted bg-surface/50 border-border shrink-0">
                            Manual
                          </span>
                        </button>
                      );
                    })}

                    {/* Prompt Scenarios */}
                    {promptScenarios.map((ps, idx) => {
                      const attempt = promptAttempts.find((a) => a.scenarioId === ps.id);
                      const isSelected = selectedReview?.id === ps.id && selectedReview?.type === "prompt";

                      let statusBadgeColor = "text-muted bg-surface/50 border-border";
                      let statusBadgeLabel = "Unattempted";
                      if (attempt) {
                        statusBadgeColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/25";
                        statusBadgeLabel = `${attempt.score}%`;
                      }

                      return (
                        <button
                          key={ps.id}
                          onClick={() => setSelectedReview({ id: ps.id, type: "prompt" })}
                          className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs font-bold transition-all active:scale-[0.99] duration-200 relative overflow-hidden ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                              : "bg-surface/50 border-border hover:bg-elevated hover:border-border-strong text-muted hover:text-fg"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs opacity-70 shrink-0">Prompt {idx + 1}</span>
                            <span className="w-1 h-1 rounded-full bg-border-strong shrink-0" />
                            <span className="font-extrabold text-fg truncate text-left">{ps.title}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border shrink-0 ${statusBadgeColor}`}>
                            {statusBadgeLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Round Details & Submissions */}
                  {selectedReview ? (
                    <div className="flex-1 flex flex-col space-y-4 min-h-0 relative z-10 animate-fade-in delay-100">
                      
                      {/* Active Selected Question / Round Banner */}
                      {(() => {
                        let title = "";
                        let typeLabel = "";
                        let iconColor = "text-accent bg-accent/10 border-accent/20";
                        if (selectedReview.type === "challenge" && activeReviewChallenge) {
                          title = activeReviewChallenge.title;
                          typeLabel = "DSA Algorithmic Challenge";
                          iconColor = "text-accent bg-accent/10 border-accent/25";
                        } else if (selectedReview.type === "playground" && activeReviewPlayground) {
                          title = activeReviewPlayground.title;
                          typeLabel = "Collaborative Sandbox Room";
                          iconColor = "text-indigo-500 bg-indigo-500/10 border-indigo-500/25";
                        } else if (selectedReview.type === "prompt" && activeReviewPrompt) {
                          title = activeReviewPrompt.title;
                          typeLabel = "AI Prompt Engineering Scenario";
                          iconColor = "text-amber-500 bg-amber-500/10 border-amber-500/25";
                        }

                        if (!title) return null;

                        return (
                          <div className="p-4 rounded-2xl border border-border bg-gradient-to-r from-panel/70 to-surface/30 backdrop-blur-sm relative overflow-hidden group shadow-sm flex items-center gap-4">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-[40px] pointer-events-none" />
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-inner ${iconColor}`}>
                              <Sparkles className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">{typeLabel}</div>
                              <h3 className="text-sm font-extrabold text-fg tracking-tight mt-1 leading-snug truncate">{title}</h3>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {selectedReview.type === "challenge" && activeReviewChallenge && (
                        <>
                          {activeReviewAttempt ? (
                            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                              {/* Attempt Metrics Banner */}
                              <div className="grid grid-cols-2 gap-3.5">
                                <div className="p-3.5 rounded-2xl border border-border bg-bg/20 hover:bg-bg/30 transition-all duration-300 flex flex-col justify-between group shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted">Solve Status</span>
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      activeReviewAttempt.status === "passed"
                                        ? "bg-emerald-500 animate-ping"
                                        : activeReviewAttempt.status === "submitted"
                                          ? "bg-amber-500"
                                          : "bg-rose-500"
                                    }`} />
                                  </div>
                                  <span className={`text-xs font-black uppercase tracking-wide mt-2.5 flex items-center gap-1.5 ${
                                    activeReviewAttempt.status === "passed"
                                      ? "text-emerald-500"
                                      : activeReviewAttempt.status === "submitted"
                                        ? "text-amber-500"
                                        : "text-rose-500"
                                  }`}>
                                    {activeReviewAttempt.status === "passed"
                                      ? "Success (Passed)"
                                      : activeReviewAttempt.status === "submitted"
                                        ? "Pending Review"
                                        : "Did Not Pass"}
                                  </span>
                                </div>
                                <div className="p-3.5 rounded-2xl border border-border bg-bg/20 hover:bg-bg/30 transition-all duration-300 flex flex-col justify-between group shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted">Result Grade</span>
                                    <span className="text-xs font-mono text-muted">Score / Rating</span>
                                  </div>
                                  <span className="text-xs font-mono font-black text-fg mt-2.5">
                                    {activeReviewAttempt.score != null
                                      ? `${activeReviewAttempt.score} %`
                                      : activeReviewAttempt.status === "submitted"
                                        ? "Manual review"
                                        : reviewTestResults && reviewTestResults.total > 0
                                          ? `${reviewTestResults.passed} / ${reviewTestResults.total} passed`
                                          : "—"}
                                  </span>
                                </div>
                              </div>

                              {/* Code vs Test tabs */}
                              <div className="flex border-b border-border gap-1">
                                <button
                                  onClick={() => setActiveReviewTab("code")}
                                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
                                    activeReviewTab === "code"
                                      ? "border-accent text-accent"
                                      : "border-transparent text-muted hover:text-fg hover:border-border-strong"
                                  }`}
                                >
                                  Code Submitted
                                </button>
                                {reviewTestResults && reviewTestResults.total > 0 && (
                                  <button
                                    onClick={() => setActiveReviewTab("tests")}
                                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
                                      activeReviewTab === "tests"
                                        ? "border-accent text-accent"
                                        : "border-transparent text-muted hover:text-fg hover:border-border-strong"
                                    }`}
                                  >
                                    Test Cases ({reviewTestResults.passed}/{reviewTestResults.total})
                                  </button>
                                )}
                                {reviewIsFrontend && reviewFileKeys.length > 0 && (
                                  <button
                                    onClick={() => setActiveReviewTab("preview")}
                                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                                      activeReviewTab === "preview"
                                        ? "border-accent text-accent"
                                        : "border-transparent text-muted hover:text-fg hover:border-border-strong"
                                    }`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Live Preview
                                  </button>
                                )}
                                {reviewFileKeys.length > 0 && (
                                  <button
                                    onClick={() => setReviewModalOpen(true)}
                                    title="Open the submission in a full-screen read-only editor"
                                    className="ml-auto mb-1 self-center px-3 py-1.5 rounded-lg border border-border bg-bg hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 text-accent" />
                                    Full editor
                                  </button>
                                )}
                              </div>

                              {/* Active Tab Screen Content */}
                              <div className="flex-1 flex flex-col min-h-0 animate-fade-in delay-150">
                                {activeReviewTab === "preview" && reviewIsFrontend ? (
                                  <div className="flex-1 flex flex-col rounded-2xl border border-border bg-bg/10 overflow-hidden min-h-0 shadow-md">
                                    <SubmissionPreview
                                      template={activeReviewChallenge.template}
                                      files={reviewFiles}
                                    />
                                  </div>
                                ) : activeReviewTab === "code" ? (
                                  <div className="flex-1 flex flex-col rounded-2xl border border-border bg-bg/10 backdrop-blur-sm overflow-hidden min-h-0 shadow-md">
                                    {/* File Explorer Tab bar */}
                                    <div className="flex items-center overflow-x-auto border-b border-border bg-surface shrink-0 scrollbar-none">
                                      {reviewFileKeys.map((fk) => {
                                        const isSelected = fk === activeFileKey;
                                        return (
                                          <button
                                            key={fk}
                                            onClick={() => setActiveFileKey(fk)}
                                            className={`px-4 py-2.5 text-xs font-mono border-r border-border transition-all flex items-center gap-1.5 ${
                                              isSelected
                                                ? "bg-bg/40 text-fg font-black border-b border-b-accent"
                                                : "text-muted hover:text-fg hover:bg-bg/20"
                                            }`}
                                          >
                                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-accent" : "bg-muted/40"}`} />
                                            {fk.replace(/^\//, "")}
                                          </button>
                                        );
                                      })}
                                      {reviewFileKeys.length === 0 && (
                                        <span className="p-3.5 text-xs text-muted italic">No files submitted.</span>
                                      )}
                                    </div>

                                    {/* Active File Header Info Bar */}
                                    {activeFileKey && (
                                      <div className="px-4 py-2 border-b border-border bg-surface/20 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-muted">
                                        <span className="flex items-center gap-1.5 text-fg/80">
                                          <span className="text-accent">●</span> Active File: {activeFileKey}
                                        </span>
                                        <span className="bg-bg/50 border border-border px-2 py-0.5 rounded-md font-mono text-[10px]">
                                          {activeFileKey.split(".").pop() ?? "code"}
                                        </span>
                                      </div>
                                    )}

                                    {/* Monaco Reader */}
                                    <div className="flex-1 min-h-[250px] relative">
                                      {activeFileKey ? (
                                        <Monaco
                                          height="250px"
                                          language={
                                            activeFileKey.endsWith(".ts") || activeFileKey.endsWith(".tsx")
                                              ? "typescript"
                                              : activeFileKey.endsWith(".js") || activeFileKey.endsWith(".jsx")
                                                ? "javascript"
                                                : "plaintext"
                                          }
                                          theme="vs-dark"
                                          value={reviewFiles[activeFileKey] ?? ""}
                                          options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 12,
                                            fontFamily: "var(--font-mono), 'Fira Code', monospace",
                                            fontLigatures: true,
                                            automaticLayout: true,
                                            scrollBeyondLastLine: false,
                                            tabSize: 2,
                                            wordWrap: "on",
                                            lineNumbersMinChars: 3,
                                          }}
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted/50 italic">
                                          Select a file to view code submission.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  // Test Results Tab
                                  <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2.5 pr-1 scrollbar-thin">
                                    {reviewTestResults?.tests.map((t, tIdx) => {
                                      const isPass = t.status === "pass";
                                      return (
                                        <div
                                          key={tIdx}
                                          className={`p-3.5 rounded-2xl border flex flex-col gap-2 transition-all hover:translate-x-0.5 duration-200 ${
                                            isPass
                                              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                              : "bg-rose-500/5 border-rose-500/15 text-rose-600 dark:text-rose-400"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                              {isPass ? (
                                                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-500" />
                                              ) : (
                                                <XCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                                              )}
                                              <span className="text-xs font-black truncate text-fg">
                                                {t.name || `Test Case #${tIdx + 1}`}
                                              </span>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                              isPass ? "bg-emerald-500/10 border-emerald-500/25" : "bg-rose-500/10 border-rose-500/25"
                                            }`}>
                                              {isPass ? "Pass" : "Fail"}
                                            </span>
                                          </div>
                                          {t.error && (
                                            <div className="font-mono text-xs bg-black/40 border border-border rounded-xl p-3 overflow-x-auto text-muted whitespace-pre-wrap leading-relaxed">
                                              {t.error}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {(!reviewTestResults || reviewTestResults.tests.length === 0) && (
                                      <div className="text-center p-6 text-xs text-muted italic">
                                        No detailed test results available.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-bg/30">
                              <FileText className="w-8 h-8 text-muted/40 mb-3" />
                              <div className="text-xs font-black uppercase text-fg/70">No Attempt Recorded</div>
                              <p className="text-xs text-muted max-w-[280px] mt-1.5 leading-relaxed">
                                The candidate did not attempt or submit any code for this step during the session.
                              </p>
                            </div>
                          )}
                          <SubmissionReviewModal
                            open={reviewModalOpen}
                            onClose={() => setReviewModalOpen(false)}
                            title={activeReviewChallenge.title}
                            candidateName={interview.candidateName}
                            template={activeReviewChallenge.template}
                            files={reviewFiles}
                          />
                        </>
                      )}

                      {selectedReview.type === "playground" && activeReviewPlayground && (
                        <div className="flex-1 flex flex-col space-y-4 min-h-0">
                          <div className="p-4 rounded-2xl border border-border bg-bg/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-fg">{activeReviewPlayground.title}</h4>
                              <p className="text-xs text-muted mt-1">
                                Framework: <span className="font-mono bg-bg/50 px-2 py-0.5 border border-border rounded text-fg">{activeReviewPlayground.template}</span>
                              </p>
                            </div>
                            <Link
                              href={`/interview/${interview.id}/play/${activeReviewPlayground.id}${isOwner ? "" : `?token=${interview.shareToken}`}`}
                              className="px-4 py-2 rounded-xl bg-bg hover:bg-elevated border border-border hover:border-indigo-500/40 text-xs font-bold text-fg transition-all flex items-center gap-1.5 hover:text-indigo-500 shadow-sm active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Observe Sandbox Code
                            </Link>
                          </div>
                          <div className="p-8 rounded-2xl border border-border bg-bg/30 text-center space-y-3.5">
                            <FileText className="w-8 h-8 text-muted/40 mx-auto" />
                            <div className="text-xs font-bold text-fg/80">Manual Evaluation Workspace</div>
                            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                              This system design sandbox round requires manual grading by the interviewer. Click the action button above to enter the workspace read-only, where you can inspect final code files and view the live browser execution output directly.
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedReview.type === "prompt" && activeReviewPrompt && (
                        <div className="flex-1 flex flex-col space-y-4 min-h-0">
                          {activeReviewPromptAttempt ? (
                            <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
                              <div className="grid grid-cols-2 gap-3.5">
                                <div className="p-3.5 rounded-2xl border border-border bg-bg/20 flex flex-col justify-between shadow-sm">
                                  <span className="text-xs font-extrabold uppercase tracking-widest text-muted">Evaluation Status</span>
                                  <span className="text-xs font-black text-emerald-500 mt-2.5 uppercase">
                                    Graded ({activeReviewPromptAttempt.graderType === "ai" ? "Gemini AI" : "Local"})
                                  </span>
                                </div>
                                <div className="p-3.5 rounded-2xl border border-border bg-bg/20 flex flex-col justify-between shadow-sm">
                                  <span className="text-xs font-extrabold uppercase tracking-widest text-muted">AI Grader Score</span>
                                  <span className="text-xs font-mono font-black text-fg mt-2.5">
                                    {activeReviewPromptAttempt.score}%
                                  </span>
                                </div>
                              </div>

                              {/* Rubric Breakdown */}
                              {activeReviewPromptAttempt.rubricScores && (
                                <div className="p-4 rounded-2xl border border-border bg-bg/10 space-y-3.5">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-fg/80">Rubric Dimensions</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    {(() => {
                                      try {
                                        const rubric = JSON.parse(activeReviewPromptAttempt.rubricScores);
                                        return [
                                          { key: "clarity", label: "Clarity & Structure" },
                                          { key: "specificity", label: "Technical Specificity" },
                                          { key: "efficiency", label: "Token Efficiency" },
                                          { key: "context", label: "Contextual Persona" },
                                          { key: "constraints", label: "Constraint Specification" },
                                          { key: "edgeCases", label: "Edge-Case Mitigation" },
                                        ].map((item) => {
                                          const val = rubric[item.key] || 0;
                                          let barColor = "bg-accent";
                                          if (val < 50) barColor = "bg-rose-500";
                                          else if (val < 75) barColor = "bg-amber-500";
                                          return (
                                            <div key={item.key} className="space-y-1">
                                              <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-muted">{item.label}</span>
                                                <span className="text-fg/80">{val}/100</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-panel border border-border rounded-full overflow-hidden">
                                                <div
                                                  style={{ width: `${val}%` }}
                                                  className={`h-full ${barColor} rounded-full`}
                                                />
                                              </div>
                                            </div>
                                          );
                                        });
                                      } catch {
                                        return null;
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                              
                              {/* Feedback text */}
                              {activeReviewPromptAttempt.feedback && (
                                <div className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-widest text-muted">Detailed Grader Feedback</span>
                                  <div className="p-4 rounded-2xl border border-border bg-bg/20 text-xs leading-relaxed text-muted whitespace-pre-wrap">
                                    {activeReviewPromptAttempt.feedback}
                                  </div>
                                </div>
                              )}
 
                              {/* Submitted Prompt */}
                              <div className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-widest text-muted">Submitted Prompt Text</span>
                                <pre className="p-4 bg-panel border border-border rounded-2xl text-xs font-mono whitespace-pre-wrap overflow-x-auto text-fg/80 leading-relaxed shadow-inner">
                                  {activeReviewPromptAttempt.promptText}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-bg/30">
                              <FileText className="w-8 h-8 text-muted/40 mb-3" />
                              <div className="text-xs font-black uppercase text-fg/70">No Attempt Recorded</div>
                              <p className="text-xs text-muted max-w-[280px] mt-1.5 leading-relaxed">
                                The candidate did not submit any prompt response for this step during the session.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="border-b border-border pb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      {isCombined
                        ? "Unified Interview Timeline"
                        : isPlayground
                        ? "Playground Rounds"
                        : "Challenge Sequence"}
                    </span>
                    <span className="text-[10px] text-muted font-mono tracking-wider bg-bg/60 border border-border px-2 py-0.5 rounded-full">
                      {isCombined
                        ? `${challenges.length + playgrounds.length + promptScenarios.length} Rounds`
                        : isPlayground
                        ? `${playgrounds.length} Rooms`
                        : `${challenges.length} Steps`}
                    </span>
                  </div>

                  {isCombined ? (
                    <div className="relative pl-6 border-l border-dashed border-border space-y-5 py-1 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
                      
                      {/* Section 1: Algorithmic / DSA Challenges */}
                      {challenges.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted/80 pb-1 border-b border-border/50">
                            Algorithmic / DSA Challenges
                          </div>
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
                                <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-border bg-bg flex items-center justify-center transition-all duration-300 group-hover:border-accent shadow-sm">
                                  <div className={`w-1.5 h-1.5 rounded-full ${isActive && status === "in_progress" ? "bg-accent animate-ping" : passed ? "bg-emerald-500" : result === "failed" ? "bg-rose-500" : "bg-border/60"}`} />
                                </div>

                                <div className="p-4 rounded-2xl border border-border bg-bg/60 shadow-sm transition-all duration-300 hover:bg-elevated hover:border-accent/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">DSA Round {idx + 1}</span>
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
                                        Locked
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Section 2: Collaborative Playgrounds */}
                      {playgrounds.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted/80 pb-1 border-b border-border/50">
                            Collaborative Playgrounds
                          </div>
                          {playgrounds.map((p, idx) => {
                            const canEnter = status === "in_progress";
                            const isActive = interview.activePlaygroundId === p.id;
                            const tokenQuery = isOwner ? "" : `?token=${interview.shareToken}`;
                            const href = canEnter ? `/interview/${interview.id}/play/${p.id}${tokenQuery}` : null;

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
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">Playground Round {idx + 1}</span>
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
                      )}

                      {/* Section 3: AI Prompt Engineering Scenarios */}
                      {promptScenarios.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted/80 pb-1 border-b border-border/50">
                            AI Prompt Engineering Scenarios
                          </div>
                          {promptScenarios.map((ps, idx) => {
                            const attempt = promptAttempts.find((a) => a.scenarioId === ps.id);
                            const hasAttempt = !!attempt;
                            const score = attempt?.score;
                            const canEnter = status === "in_progress";

                            let statusTag = "bg-bg/60 border border-border text-muted";
                            if (hasAttempt) {
                              statusTag = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-extrabold";
                            }

                            const diffColors = {
                              beginner: { text: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                              intermediate: { text: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                              advanced: { text: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" }
                            }[ps.difficulty] || { text: "text-accent", bg: "bg-accent/10 border-accent/20" };

                            return (
                              <div key={ps.id} className="relative group">
                                <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-border bg-bg flex items-center justify-center transition-all duration-300 group-hover:border-accent shadow-sm">
                                  <div className={`w-1.5 h-1.5 rounded-full ${hasAttempt ? "bg-emerald-500" : "bg-border/60"}`} />
                                </div>

                                <div className="p-4 rounded-2xl border border-border bg-bg/60 shadow-sm transition-all duration-300 hover:bg-elevated hover:border-accent/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">Prompt Round {idx + 1}</span>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide ${statusTag}`}>
                                        {hasAttempt ? `Completed (${score}%)` : "Pending"}
                                      </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-fg tracking-tight">{ps.title}</h3>
                                    <div className="flex items-center gap-2.5 text-[11px] text-muted">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider shadow-sm ${diffColors.bg} ${diffColors.text}`}>
                                        {ps.difficulty}
                                      </span>
                                      <span>•</span>
                                      <span className="text-[9px] font-bold bg-bg/60 border border-border px-2 py-0.5 rounded text-muted uppercase tracking-wider">
                                        {ps.category}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-2">
                                    {canEnter ? (
                                      <button
                                        onClick={() => setSelectedPromptScenario(ps)}
                                        className="px-4 py-2 rounded-xl bg-bg hover:bg-elevated border border-border hover:border-accent/40 text-xs font-bold text-fg transition-all flex items-center gap-1.5 group-hover:text-accent shadow-sm active:scale-95"
                                      >
                                        {interviewerView ? (
                                          <>
                                            <Eye className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
                                            Observe Response
                                          </>
                                        ) : (
                                          <>
                                            <Play className="w-3 h-3 fill-current" />
                                            {hasAttempt ? "Revisit Prompt" : "Enter Workspace"}
                                          </>
                                        )}
                                      </button>
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
                      )}

                    </div>
                  ) : isPlayground ? (
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
                </>
              )}
            </div>

          </div>
          )}
        </div>

        {/* Quick Join Strip — code-first share for the candidate. Observer link tucked behind a disclosure. */}
        {isOwner && status === "in_progress" && (
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


      {/* Verdict Selection Dialog */}
      {verdictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h3 className="text-lg font-bold text-fg tracking-tight">
                  {interview.type === "mock" ? "Conclude & Rate Practice Session" : "Lock Session Verdict"}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {interview.type === "mock"
                    ? "Complete your self-evaluation to rate your execution, code cleanliness, and problem solving."
                    : "Select the official recommendation for this candidate. This action will conclude the session."}
                </p>
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
                {
                  id: "success",
                  label: interview.type === "mock" ? "Target Achieved (Success)" : "Met Bar (Success)",
                  desc: interview.type === "mock" ? "I solved the challenges, passed the tests, and followed good design." : "Strong code design and problem-solving.",
                  bg: "hover:bg-emerald-500/5 hover:border-emerald-500/20",
                  activeBg: "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.12)]",
                  icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                },
                {
                  id: "failed",
                  label: interview.type === "mock" ? "Need More Prep" : "Did Not Meet Bar",
                  desc: interview.type === "mock" ? "I struggled with logic correctness, efficiency, or debugging." : "Failed to meet key coding standards.",
                  bg: "hover:bg-rose-500/5 hover:border-rose-500/20",
                  activeBg: "bg-rose-500/10 border-rose-500/35 text-rose-600 dark:text-rose-400 shadow-[0_4px_20px_rgba(244,63,94,0.12)]",
                  icon: <XCircle className="w-4 h-4 text-rose-500" />
                },
                {
                  id: "left_in_between",
                  label: interview.type === "mock" ? "Incomplete Practice" : "Walkout",
                  desc: interview.type === "mock" ? "I left the practice slot before completing all stages." : "Candidate abandoned the round mid-way.",
                  bg: "hover:bg-elevated",
                  activeBg: "bg-elevated border-border text-fg shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
                  icon: <ArrowLeft className="w-4 h-4 text-muted" />
                },
                {
                  id: "suspicious",
                  label: interview.type === "mock" ? "AI/Reference Assisted" : "Flagged Suspicious",
                  desc: interview.type === "mock" ? "I referenced solution guides, external docs, or used AI helpers." : "Suspected of cheating or AI usage.",
                  bg: "hover:bg-amber-500/5 hover:border-amber-500/20",
                  activeBg: "bg-amber-500/10 border-amber-500/35 text-amber-600 dark:text-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.12)]",
                  icon: <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
                },
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

            {/* Structured Rubric Evaluation */}
            <div className="border-t border-border pt-4 mt-2 space-y-4 relative z-10 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-accent">Structured Rubric Evaluation</h4>
              
              <div className="space-y-3">
                {[
                  { name: "Code Quality", value: rubricCodeQuality, setter: setRubricCodeQuality, desc: "Cleanliness, structure, safety, and readability." },
                  { name: "Communication", value: rubricCommunication, setter: setRubricCommunication, desc: "Explaining thought process and proactive collaboration." },
                  { name: "Problem Solving", value: rubricProblemSolving, setter: setRubricProblemSolving, desc: "Logic correctness, efficiency, and debugging." }
                ].map((metric) => (
                  <div key={metric.name} className="flex flex-col gap-1.5 p-3 rounded-xl bg-bg/40 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-fg">{metric.name}</span>
                      <span className="text-xs font-mono font-bold text-accent">{metric.value} / 5</span>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={metric.value}
                        onChange={(e) => metric.setter(Number(e.target.value))}
                        className="flex-1 accent-accent cursor-pointer bg-border h-1.5 rounded-lg appearance-none"
                      />
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xs ${star <= metric.value ? "text-amber-400" : "text-muted/30"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted/70">{metric.desc}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-fg">Rich-Text Feedback & Notes</label>
                <textarea
                  value={rubricNotes}
                  onChange={(e) => setRubricNotes(e.target.value)}
                  placeholder="Provide structured feedback regarding code design, algorithmic complexity, communication style, etc..."
                  className="w-full min-h-[80px] p-3 rounded-xl border border-border bg-bg/40 text-fg text-xs placeholder:text-muted/50 focus:outline-none focus:border-accent/40 resize-y"
                />
              </div>
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
                {interview.type === "mock" ? "Save Self-Rating" : "Lock Verdict"}
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
