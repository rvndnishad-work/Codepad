"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Send,
  Bot,
  User,
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
  LogOut,
  Play,
  Clock,
  Monitor,
  Server,
  Binary,
  ArrowLeft,
  Terminal,
  MessageSquare,
  PanelBottom,
  Mic,
  MicOff,
  Briefcase,
  FolderClosed,
  FolderOpen,
  SlidersHorizontal,
} from "lucide-react";

/** Format a millisecond duration as M:SS. Used by the session countdown chip. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { getSandpackTheme } from "@/lib/sandpack-theme";
import { speakNaturally, cancelSpeak, updateSpeechConfig, pickBestVoice, configureCloudTTS } from "@/lib/copilot-tts";
import ThemeToggle from "@/components/ThemeToggle";
import FileExplorer from "@/components/FileExplorer";
import { useResizable } from "@/hooks/useResizable";
import { useResizableHeight } from "@/hooks/useResizableHeight";
import { javascript } from "@codemirror/lang-javascript";
import MarkdownRenderer from "@/components/MarkdownRenderer";

import CustomMonacoEditor from "@/components/MonacoEditor";
const RawMonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/** Map our execution language id → Monaco language + Piston (/api/execute) id. */
const SURFACE_LANG: Record<string, { monaco: string; exec: string }> = {
  node: { monaco: "javascript", exec: "javascript" },
  javascript: { monaco: "javascript", exec: "javascript" },
  "ts-node": { monaco: "typescript", exec: "typescript" },
  typescript: { monaco: "typescript", exec: "typescript" },
  python: { monaco: "python", exec: "python" },
  go: { monaco: "go", exec: "go" },
  java: { monaco: "java", exec: "java" },
  cpp: { monaco: "cpp", exec: "cpp" },
  rust: { monaco: "rust", exec: "rust" },
};
import {
  MAX_FILES_JSON_BYTES,
  FILES_JSON_WARN_BYTES,
} from "@/lib/ai-interview/files-size";

type Message = {
  role: "user" | "assistant";
  text: string;
};

/** One round surfaced to the candidate (resolved server-side from its source). */
export type RoundView = {
  roundId: string;
  order: number;
  title: string;
  description: string;
  kind: "frontend" | "backend" | "dsa";
  language?: string;
  estimatedMinutes: number;
  files: Record<string, string>;
  status: string;
};

type Props = {
  session: {
    inviteToken: string;
    candidateName: string;
    candidateEmail: string;
    positionTitle: string;
    status: string;
    startedAt: string | null;
    estimatedMinutes: number;
    /** Live interviewer presence: REACTIVE | OBSERVER | COACH. */
    engagementLevel: string;
  };
  rounds: RoundView[];
  initialChat: Message[];
};

const ROUND_ICON: Record<string, React.ReactNode> = {
  frontend: <Monitor className="w-3.5 h-3.5" />,
  backend: <Server className="w-3.5 h-3.5" />,
  dsa: <Binary className="w-3.5 h-3.5" />,
};

/** Extract a plain code map from a Sandpack files object. */
function extractCodeMap(files: Record<string, unknown>): Record<string, string> {
  const codeMap: Record<string, string> = {};
  for (const [path, fileObj] of Object.entries(files)) {
    if (typeof fileObj === "string") codeMap[path] = fileObj;
    else if (fileObj && typeof fileObj === "object" && "code" in fileObj) {
      codeMap[path] = String((fileObj as { code: unknown }).code ?? "");
    }
  }
  return codeMap;
}

export default function AIInterviewWorkspace({ session, rounds, initialChat }: Props) {
  const [activeRoundId, setActiveRoundId] = useState(rounds[0]?.roundId ?? "");
  // Per-round file state. The active round's files are what we send to the AI
  // and to grading; the SurfaceBridge keeps this synced as the candidate edits.
  const [roundFiles, setRoundFiles] = useState<Record<string, Record<string, string>>>(
    () => Object.fromEntries(rounds.map((r) => [r.roundId, r.files]))
  );
  const [chat, setChat] = useState<Message[]>(initialChat);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(session.status === "COMPLETED");
  const [voiceMode, setVoiceMode] = useState(true);
  // Latest backend/DSA run output for the active round, sent with the next
  // message so the AI can evaluate real execution output (reset on round switch).
  const [lastRun, setLastRun] = useState<{ stdout?: string; stderr?: string } | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const handleExit = () => setExitConfirmOpen(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [outputView, setOutputView] = useState<"preview" | "both" | "console">("both");
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [extendedMinutes, setExtendedMinutes] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(0.97);
  const recognitionRef = useRef<any>(null);
  const { width: chatW, onPointerDown: onChatDrag } = useResizable(450, 240, 700);

  const activeRound = rounds.find((r) => r.roundId === activeRoundId) ?? rounds[0];
  const activeFiles = roundFiles[activeRoundId] ?? {};
  const isMultiRound = rounds.length > 1;

  const chatEndRef = useRef<HTMLDivElement>(null);

  const updateRoundFiles = (roundId: string, files: Record<string, string>) => {
    setRoundFiles((prev) => ({ ...prev, [roundId]: files }));
  };

  // Keep the size indicator in sync with the active round's files.
  const filesBytes = useMemo(() => {
    try {
      return new TextEncoder().encode(JSON.stringify(activeFiles)).length;
    } catch {
      return 0;
    }
  }, [activeFiles]);

  // Reset the last-run output when switching rounds — it belongs to one surface.
  useEffect(() => {
    setLastRun(null);
  }, [activeRoundId]);

  // Route cloud TTS through this interview's token-scoped endpoint so the AI
  // interviewer can speak in natural cloud voices (OpenAI / ElevenLabs) when a
  // provider is configured. Falls back to browser TTS automatically otherwise.
  useEffect(() => {
    configureCloudTTS({
      endpoint: "/api/ai-interview/tts",
      body: { inviteToken: session.inviteToken },
    });
    return () => configureCloudTTS(null);
  }, [session.inviteToken]);

  // Load available speech synthesis voices and rate settings on mount
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const enVoices = allVoices.filter((v) => v.lang.toLowerCase().startsWith("en"));
      setAvailableVoices(enVoices);

      const savedVoice = localStorage.getItem("jarvis_tts_voice");
      if (savedVoice) {
        setSelectedVoiceName(savedVoice);
      } else {
        const best = pickBestVoice(allVoices);
        if (best) setSelectedVoiceName(best.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const savedRate = localStorage.getItem("jarvis_tts_rate");
    if (savedRate) {
      const parsed = parseFloat(savedRate);
      if (!isNaN(parsed)) setSpeechRate(parsed);
    }
  }, []);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    updateSpeechConfig({ voiceName });
  };

  const handleRateChange = (rateVal: number) => {
    setSpeechRate(rateVal);
    updateSpeechConfig({ rate: rateVal });
  };

  // Mounted gate: the countdown is derived from Date.now(), which differs
  // between server and client, so we only render the time chip after mount to
  // avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Whole-session countdown (sum of round budgets). Server is source of
  //    truth on expiry; this is UX with a matching grace buffer. ──────────────
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (!session.startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);
  const deadlineMs = session.startedAt
    ? new Date(session.startedAt).getTime() + (session.estimatedMinutes + extendedMinutes) * 60_000
    : null;
  const remainingMs = deadlineMs ? deadlineMs - now : null;
  const isExpired = remainingMs !== null && remainingMs <= 0;
  const isLowTime = remainingMs !== null && remainingMs < 5 * 60_000;

  const handleExtendTimer = () => {
    setExtendedMinutes((prev) => prev + 15);
    toast.success("Added 15 minutes to your session!");
  };

  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (isExpired && !autoSubmittedRef.current && !completed && !submitting) {
      autoSubmittedRef.current = true;
      toast.warning("Time's up — auto-submitting your assessment.");
      void handleSubmitAssessment({ auto: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpired, completed, submitting]);

  // Track the active round id in a ref so telemetry handlers (bound once) can
  // attribute each event to whichever round was on screen when it fired.
  const activeRoundIdRef = useRef(activeRoundId);
  useEffect(() => {
    activeRoundIdRef.current = activeRoundId;
  }, [activeRoundId]);

  // Integrity telemetry — paste + tab-blur events, buffered until submit.
  const sessionStartRef = useRef<number>(Date.now());
  const telemetryRef = useRef<Array<{ t: number; type: string; payload: unknown }>>([]);
  useEffect(() => {
    const recordPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      telemetryRef.current.push({ t: Date.now() - sessionStartRef.current, type: "paste", payload: { length: text.length, roundId: activeRoundIdRef.current } });
    };
    const recordBlur = () => {
      telemetryRef.current.push({ t: Date.now() - sessionStartRef.current, type: "blur", payload: { roundId: activeRoundIdRef.current } });
    };
    const recordFocus = () => {
      telemetryRef.current.push({ t: Date.now() - sessionStartRef.current, type: "focus", payload: { roundId: activeRoundIdRef.current } });
    };
    window.addEventListener("paste", recordPaste, true);
    window.addEventListener("blur", recordBlur);
    window.addEventListener("focus", recordFocus);
    return () => {
      window.removeEventListener("paste", recordPaste, true);
      window.removeEventListener("blur", recordBlur);
      window.removeEventListener("focus", recordFocus);
    };
  }, []);

  // Auto-scroll chat window.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Initial greeting if history is empty.
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      if (chat.length === 0) void sendInitialGreeting();
      return () => window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    } else if (chat.length === 0) {
      void sendInitialGreeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
          toast.success("Holographic audio link active. Speak now...");
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            console.log("Voice dictation transcript:", transcript);
            toast.success(`Heard: "${transcript}"`);
            setTimeout(() => handleSendTextRef.current(transcript), 30);
          }
        };

        rec.onerror = (err: any) => {
          console.error("Dictation failure:", err);
          setIsListening(false);
          toast.error("Speech recognition failed. Please try again.");
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) {
      toast.error("Native voice dictation is not supported in this browser. Try using Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      cancelSpeak();
      setIsAISpeaking(false);
      recognitionRef.current.start();
    }
  };

  async function postMessage(messageText: string) {
    const res = await fetch("/api/ai-interview/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteToken: session.inviteToken,
        roundId: activeRoundId,
        message: messageText,
        files: roundFiles[activeRoundId] ?? {},
        lastRun: lastRun ?? undefined,
      }),
    });
    return res;
  }

  async function sendInitialGreeting() {
    setSending(true);
    try {
      const res = await postMessage("hello");
      if (res.ok) {
        const data = (await res.json()) as { chatHistory: Message[] };
        setChat(data.chatHistory);
        speakResponse(data.chatHistory[data.chatHistory.length - 1]?.text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const handleSendTextRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    handleSendTextRef.current = (text: string) => {
      void handleSendText(text);
    };
  });

  const speakResponse = (text: string | undefined) => {
    if (!voiceMode || !text) return;
    void speakNaturally(text, {
      onStart: () => setIsAISpeaking(true),
      onEnd: () => setIsAISpeaking(false),
      onError: () => setIsAISpeaking(false),
    });
  };

  // ── Live "Observer" loop ───────────────────────────────────────────────────
  // For OBSERVER/COACH screenings, the interviewer watches the candidate code
  // and may interject on its own. We debounce on edit-then-pause, then ask the
  // server (which decides whether to actually say anything). All cadence/caps
  // are enforced server-side; the client just throttles requests.
  const OBSERVE_IDLE_MS = 25_000;
  const liveRef = useRef({ sending, isAISpeaking, roundFiles, activeRoundId, lastRun });
  liveRef.current = { sending, isAISpeaking, roundFiles, activeRoundId, lastRun };
  const lastObservedRef = useRef<Record<string, string>>({});
  const lastProactiveAtRef = useRef(0);
  const observeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the per-round snapshots once so the first nudge only fires after the
  // candidate actually edits (not on the untouched starter code).
  useEffect(() => {
    const seed: Record<string, string> = {};
    for (const r of rounds) seed[r.roundId] = JSON.stringify(roundFiles[r.roundId] ?? {});
    lastObservedRef.current = seed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runObserve = async () => {
    const live = liveRef.current;
    const level = session.engagementLevel;
    if (level !== "OBSERVER" && level !== "COACH") return;
    if (live.sending || live.isAISpeaking) return; // don't talk over an active turn
    const cooldownMs = level === "COACH" ? 75_000 : 150_000;
    if (Date.now() - lastProactiveAtRef.current < cooldownMs) return;

    const rid = live.activeRoundId;
    const cur = JSON.stringify(live.roundFiles[rid] ?? {});
    const prev = lastObservedRef.current[rid] ?? "";
    // Require a non-trivial change since we last looked.
    if (cur === prev || Math.abs(cur.length - prev.length) < 40) return;
    lastObservedRef.current[rid] = cur;

    try {
      const res = await fetch("/api/ai-interview/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: session.inviteToken,
          roundId: rid,
          files: live.roundFiles[rid] ?? {},
          lastRun: live.lastRun ?? undefined,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { comment: string | null; chatHistory?: Message[] };
      if (data.comment) {
        lastProactiveAtRef.current = Date.now();
        if (Array.isArray(data.chatHistory)) setChat(data.chatHistory);
        else setChat((p) => [...p, { role: "assistant", text: data.comment as string }]);
        speakResponse(data.comment);
        if (!floatingChatOpen && !voiceMode) {
          toast("The interviewer left you a note", { icon: "💬" });
        }
      }
    } catch {
      /* network hiccup — try again on the next pause */
    }
  };

  // Debounced trigger: every edit resets the timer, so observe fires ~25s after
  // the candidate STOPS typing. Reactive screenings never schedule it.
  useEffect(() => {
    if (session.engagementLevel === "REACTIVE") return;
    if (completed) return;
    if (observeTimerRef.current) clearTimeout(observeTimerRef.current);
    observeTimerRef.current = setTimeout(() => void runObserve(), OBSERVE_IDLE_MS);
    return () => {
      if (observeTimerRef.current) clearTimeout(observeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundFiles, activeRoundId, session.engagementLevel, completed]);

  const handleSendText = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMessage = text.trim();
    setSending(true);
    setChat((prev) => [...prev, { role: "user", text: userMessage }]);
    try {
      const res = await postMessage(userMessage);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to dispatch message");
      }
      const data = (await res.json()) as { chatHistory: Message[] };
      setChat(data.chatHistory);
      speakResponse(data.chatHistory[data.chatHistory.length - 1]?.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Interviewer failed to respond.");
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput("");
    await handleSendText(userMessage);
  };

  const handleSubmitAssessment = async (opts?: { auto?: boolean }) => {
    if (submitting) return;
    if (!opts?.auto) {
      const confirmSubmit = confirm(
        "Are you sure you want to finalize all rounds and submit the interview? The AI will compile your grading scorecards instantly."
      );
      if (!confirmSubmit) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ai-interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: session.inviteToken,
          // Send every round's current files keyed by round id; the server
          // grades each and aggregates. `files` kept for legacy compatibility.
          roundFiles,
          files: roundFiles[activeRoundId] ?? {},
          telemetry: telemetryRef.current,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Grading engine failure");
      }
      toast.success("Assessment graded successfully!");
      setCompleted(true);
      cancelSpeak();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── RENDER COMPLETED SUCCESS SCREEN ─────────────────────────────────────
  if (completed) {
    return (
      <div className="min-h-screen bg-bg text-fg flex flex-col justify-center items-center px-4 font-sans relative overflow-hidden">
        {/* Animated Background Glow Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-accent/8 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "6s" }} />

        {/* Premium Glassmorphic Completed Card */}
        <div className="w-full max-w-xl bg-surface/40 border border-border/80 backdrop-blur-xl rounded-[2.5rem] p-10 space-y-8 shadow-[0_32px_80px_rgba(0,0,0,0.3)] relative z-10">
          
          {/* Header section with pulsating green check */}
          <div className="text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <span className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping" />
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                <CheckCircle className="w-10 h-10" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tight leading-none bg-gradient-to-r from-accent via-[#8b5cf6] to-emerald-400 bg-clip-text text-transparent uppercase">
                Assessment Completed
              </h2>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed font-medium">
                Thank you for completing the technical round{isMultiRound ? "s" : ""}, <span className="text-fg font-extrabold">{session.candidateName}</span>! Your code submissions, editor workflows, and dictation history across {rounds.length} round{rounds.length === 1 ? "" : "s"} have been successfully audited and graded by our AI Agent.
              </p>
            </div>
          </div>

          {/* Stats Metrics Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Position */}
            <div className="p-4 rounded-2xl bg-surface/50 border border-border/60 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-muted tracking-widest block">Target Position</span>
                <span className="text-xs font-bold text-fg block truncate">{session.positionTitle}</span>
              </div>
            </div>

            {/* Candidate Email */}
            <div className="p-4 rounded-2xl bg-surface/50 border border-border/60 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <User className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-muted tracking-widest block">Candidate Email</span>
                <span className="text-xs font-mono text-fg block truncate" title={session.candidateEmail}>{session.candidateEmail}</span>
              </div>
            </div>

            {/* Assessment Scope */}
            <div className="p-4 rounded-2xl bg-surface/50 border border-border/60 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-muted tracking-widest block">Assessment Scope</span>
                <span className="text-xs font-bold text-fg block truncate">{rounds.length} Evaluated Round{rounds.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            {/* Evaluation Sync Status */}
            <div className="p-4 rounded-2xl bg-surface/50 border border-border/60 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-muted tracking-widest block">AI Evaluation</span>
                <span className="text-xs font-extrabold text-emerald-400 block tracking-wider animate-pulse uppercase">GRADED &amp; SYNCED</span>
              </div>
            </div>
          </div>

          {/* Gracious Reassurance Text */}
          <div className="text-center bg-bg/40 border border-border/40 rounded-2xl p-4 text-[11px] leading-relaxed text-muted font-medium">
            💼 Your technical scores, file templates, terminal execution records, and dictation sessions are securely compiled. The engineering hiring panel will review your profile and connect with you on next steps shortly. Best of luck!
          </div>

          {/* Premium Finalize & Exit Button */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-accent to-[#8b5cf6] text-bg hover:shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:scale-[1.02] text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer shadow-lg"
          >
            Finalize &amp; Exit Workspace
            <LogOut className="w-4 h-4 animate-pulse" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-fg font-sans overflow-hidden">
      {/* Workspace Header top bar */}
      <header className="h-14 border-b border-border bg-surface/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => setChatCollapsed(!chatCollapsed)}
            title={chatCollapsed ? "Expand Question Pane" : "Collapse Question Pane"}
            className="flex items-center justify-center p-2 rounded-xl border border-border bg-bg hover:bg-elevated text-muted hover:text-fg transition shrink-0 cursor-pointer"
          >
            <PanelBottom className={`w-4 h-4 transition-transform duration-300 ${chatCollapsed ? "-rotate-90" : "rotate-90"}`} />
          </button>

          <span className="text-muted/30">|</span>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/35 flex items-center justify-center text-accent font-black text-sm">
              C
            </div>
            <span className="font-extrabold text-xs tracking-widest text-fg uppercase hidden sm:inline">
              Interviewpad
            </span>
          </Link>
          <span className="text-muted/30 hidden sm:inline">|</span>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-muted tracking-widest block">AI Technical Round</span>
            <span className="text-xs font-bold text-fg truncate block">{session.positionTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {filesBytes > FILES_JSON_WARN_BYTES && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                filesBytes > MAX_FILES_JSON_BYTES
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse"
                  : "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
              }`}
              title={
                filesBytes > MAX_FILES_JSON_BYTES
                  ? "Code exceeds the size limit — trim large pasted content before sending"
                  : "Approaching the code-size limit — trim large pasted content if possible"
              }
            >
              <span>
                {(filesBytes / 1024).toFixed(0)}KB / {(MAX_FILES_JSON_BYTES / 1024).toFixed(0)}KB
              </span>
            </div>
          )}
          {mounted && remainingMs !== null && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                  isExpired
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse"
                    : isLowTime
                    ? "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
                    : "bg-surface border-border text-slate-700 dark:text-slate-300"
                }`}
                title="Time remaining on this screening"
              >
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>{formatRemaining(remainingMs)}</span>
              </div>

              <button
                type="button"
                onClick={handleExtendTimer}
                title="Extend timer by 15 minutes"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:bg-elevated text-slate-700 dark:text-slate-300 hover:text-fg text-[10px] font-black tracking-wider transition cursor-pointer shrink-0 active:scale-95 shadow-sm"
              >
                +15m
              </button>
            </div>
          )}
          
          {activeRound.kind === "frontend" && (
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg p-0.5 shadow-sm">
              {([
                { key: "preview", title: "Preview only", icon: Monitor },
                { key: "both", title: "Split view", icon: PanelBottom },
                { key: "console", title: "Console only", icon: Terminal },
              ] as const).map(({ key, title, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutputView(key)}
                  title={title}
                  aria-pressed={outputView === key}
                  className={`p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                    outputView === key
                      ? "bg-accent text-bg"
                      : "text-muted hover:text-fg hover:bg-surface"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}

          <ThemeToggle />
          <button
            onClick={() => handleSubmitAssessment()}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider transition shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            <span>Complete Assessment</span>
          </button>

          <button
            type="button"
            onClick={handleExit}
            title="Exit Assessment"
            className="group flex items-center gap-0 hover:gap-1.5 px-2.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 shrink-0 cursor-pointer shadow-[0_2px_8px_rgba(244,63,94,0.08)]"
          >
            <LogOut className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-12" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-[50px] transition-all duration-300 text-[10px] font-black uppercase tracking-wider select-none leading-none">
              Exit
            </span>
          </button>
        </div>
      </header>

      {/* Main split-pane workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Pane: Question Pane - collapsible & draggable */}
        <div
          style={{ width: chatCollapsed ? "0px" : `${chatW}px` }}
          className={`transition-all duration-300 flex flex-col min-w-0 border-r border-border bg-surface/40 ${chatCollapsed ? "opacity-0 pointer-events-none border-r-0 shrink-0" : "shrink-0"}`}
        >
          <div className="px-5 py-3.5 border-b border-border bg-surface/60 flex items-center justify-between shrink-0 h-14">
            <span className="text-[10px] font-black uppercase text-accent tracking-widest">Assessment Question</span>
            <button
              type="button"
              onClick={() => setChatCollapsed(true)}
              title="Collapse Question Pane"
              className="text-muted hover:text-fg hover:bg-elevated p-1.5 rounded-lg border border-border/45 bg-bg transition cursor-pointer flex items-center justify-center"
            >
              <PanelBottom className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 scrollbar-thin">
            <div className="space-y-4">
              <h2 className="text-sm font-black tracking-widest text-fg uppercase border-b border-border/60 pb-3 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-accent rounded-full inline-block"></span>
                {activeRound.title}
              </h2>
              <div className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                {activeRound.description ? (
                  <MarkdownRenderer 
                    content={activeRound.description} 
                    className="prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:my-2.5 prose-p:leading-relaxed
                      prose-h3:text-accent prose-h3:text-xs prose-h3:font-black prose-h3:tracking-widest prose-h3:uppercase prose-h3:mt-5 prose-h3:mb-2
                      prose-ul:my-2 prose-ul:pl-4 prose-ul:list-disc
                      prose-li:my-1 prose-li:text-slate-700 dark:prose-li:text-slate-300
                      prose-code:text-accent prose-code:bg-panel prose-code:border prose-code:border-border/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                      prose-hr:my-4 prose-hr:border-border/40"
                  />
                ) : (
                  <p className="text-muted/65">No question details available for this round.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Drag handle */}
        {!chatCollapsed && (
          <div
            onPointerDown={onChatDrag}
            title="Drag to resize chat"
            role="separator"
            aria-orientation="vertical"
            className="hidden md:block w-1.5 shrink-0 cursor-col-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors z-20"
          />
        )}

        {/* Right Pane: per-round coding surface with a round switcher. */}
        <div className="flex-1 flex flex-col min-w-0">
          {isMultiRound && (
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-panel/40 overflow-x-auto shrink-0">
              {rounds.map((r, i) => {
                const on = r.roundId === activeRoundId;
                return (
                  <button
                    key={r.roundId}
                    onClick={() => setActiveRoundId(r.roundId)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0 border ${
                      on
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "bg-bg border-border/50 text-muted hover:text-fg"
                    }`}
                    title={r.title}
                  >
                    {ROUND_ICON[r.kind]}
                    <span>Round {i + 1}</span>
                    <span className="text-muted/50 hidden md:inline">·</span>
                    <span className="hidden md:inline max-w-[120px] truncate">{r.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active round banner */}
          <div className="px-4 py-2 border-b border-border bg-surface/40 flex items-center gap-2 shrink-0">
            <span className="text-accent">{ROUND_ICON[activeRound.kind]}</span>
            <span className="text-[11px] font-bold text-fg truncate">{activeRound.title}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted bg-bg border border-border px-1.5 py-0.5 rounded ml-1">
              {activeRound.kind}
              {activeRound.language ? ` · ${activeRound.language}` : ""}
            </span>
          </div>

          <div className="flex-1 min-h-0">
            <RoundSurface
              key={activeRound.roundId}
              round={activeRound}
              files={roundFiles[activeRound.roundId] ?? activeRound.files}
              onFilesChange={updateRoundFiles}
              onRun={(o) => setLastRun(o)}
              outputView={outputView}
              setOutputView={setOutputView}
            />
          </div>
        </div>
      </main>

      {/* Exit confirmation — the countdown keeps running. */}
      {exitConfirmOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExitConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
                <LogOut className="w-6 h-6" />
              </div>
              <h2 className="mt-3 text-base font-black text-fg">Exit the assessment?</h2>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                Your countdown <strong className="text-fg font-bold">keeps running</strong> while
                you&apos;re away. You can return any time using your invite link.
              </p>
            </div>
            <div className="flex items-center gap-2.5 px-6 pb-5">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-panel/50 text-sm font-bold text-muted hover:text-fg hover:bg-panel transition cursor-pointer"
              >
                Keep working
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-black transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centralized AI Voice Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2.5 rounded-full bg-surface/90 border border-violet-500/25 backdrop-blur-md shadow-[0_16px_48px_rgba(124,58,237,0.3),0_4px_16px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/5">
        {/* Custom animations inject */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes orb-active {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
            }
            50% {
              transform: scale(1.15);
              box-shadow: 0 0 28px rgba(139, 92, 246, 0.8);
            }
          }
          @keyframes bounce-eq-1 { 0%, 100% { height: 4px; } 50% { height: 18px; } }
          @keyframes bounce-eq-2 { 0%, 100% { height: 6px; } 50% { height: 24px; } }
          @keyframes bounce-eq-3 { 0%, 100% { height: 3px; } 50% { height: 28px; } }
          @keyframes bounce-eq-4 { 0%, 100% { height: 5px; } 50% { height: 20px; } }
          @keyframes bounce-eq-5 { 0%, 100% { height: 4px; } 50% { height: 14px; } }
          @keyframes bounce-dot {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          /* Idle: a soft, breathing dual-tone (violet + fuchsia) glow — no drift. */
          @keyframes soft-glow {
            0%, 100% { box-shadow: 0 0 16px 2px rgba(168,85,247,0.42), 0 0 26px 4px rgba(236,72,153,0.18); }
            50% { box-shadow: 0 0 30px 7px rgba(168,85,247,0.65), 0 0 46px 10px rgba(236,72,153,0.32); }
          }
          /* Talking: an equalizer-like shake — quick scale/rotate jitter with a
             vibrant violet → fuchsia → cyan glow that reacts to the voice. */
          @keyframes eq-shake {
            0%, 100% { transform: scale(1.04); box-shadow: 0 0 22px 5px rgba(168,85,247,0.6), 0 0 32px 6px rgba(34,211,238,0.28); }
            20% { transform: scale(1.14) translateY(-1.5px) rotate(-2.5deg); box-shadow: 0 0 42px 11px rgba(168,85,247,0.95), 0 0 54px 13px rgba(236,72,153,0.5); }
            40% { transform: scale(0.96) translateY(1.5px) rotate(2deg); box-shadow: 0 0 24px 6px rgba(34,211,238,0.55); }
            60% { transform: scale(1.12) translateY(-1px) rotate(-1.5deg); box-shadow: 0 0 38px 9px rgba(236,72,153,0.85); }
            80% { transform: scale(1.0) translateY(1px) rotate(1.5deg); box-shadow: 0 0 28px 7px rgba(168,85,247,0.7); }
          }
        `}} />

        {/* Mic Toggle Button */}
        <button
          type="button"
          onClick={toggleVoiceDictation}
          className={`p-2.5 rounded-full border transition-all cursor-pointer ${
            isListening
              ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              : "bg-surface border-border text-muted hover:text-fg hover:bg-elevated"
          }`}
          title={isListening ? "Stop listening" : "Talk to AI (Voice dictation)"}
        >
          {isListening ? (
            <div className="flex items-center gap-1 px-1 h-4.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[bounce-dot_0.8s_infinite_ease-in-out]" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[bounce-dot_0.8s_infinite_ease-in-out]" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[bounce-dot_0.8s_infinite_ease-in-out]" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <Mic className="w-4.5 h-4.5" />
          )}
        </button>

        {/* AI Orb — vibrant violet→fuchsia. The Bot icon stays visible at all
            times; the equalizer bars sit BEHIND it as a translucent underlay
            while the AI is listening / speaking / thinking. */}
        <div
          onClick={() => setFloatingChatOpen(!floatingChatOpen)}
          className={`relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-300 ${
            isListening || isAISpeaking || sending
              ? "animate-[eq-shake_0.55s_infinite_ease-in-out]"
              : "animate-[soft-glow_3s_infinite_ease-in-out]"
          }`}
          title="Toggle Chat Control Panel"
        >
          {/* Pulse ring — calm violet when idle, energetic fuchsia when talking. */}
          <span
            className={`absolute inset-0 rounded-full ${
              isListening || isAISpeaking || sending
                ? "bg-fuchsia-400/30 animate-ping"
                : "bg-violet-400/15"
            }`}
          />

          {/* Equalizer bars — translucent underlay behind the icon while active. */}
          {(isListening || isAISpeaking || sending) && (
            <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1.5 opacity-50 pointer-events-none">
              <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-1_1s_infinite_ease-in-out]" />
              <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-2_1s_infinite_ease-in-out]" style={{ animationDelay: "100ms" }} />
              <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-3_1s_infinite_ease-in-out]" style={{ animationDelay: "200ms" }} />
              <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-4_1s_infinite_ease-in-out]" style={{ animationDelay: "150ms" }} />
              <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-5_1s_infinite_ease-in-out]" style={{ animationDelay: "50ms" }} />
            </div>
          )}

          {/* Bot icon — always on top. */}
          <Bot className="w-5 h-5 text-white relative z-10 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]" />
        </div>

        {/* Floating Chat Overlay panel keyboard icon toggle */}
        <button
          type="button"
          onClick={() => setFloatingChatOpen(!floatingChatOpen)}
          className={`p-2.5 rounded-full border transition-all cursor-pointer ${
            floatingChatOpen
              ? "bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-soft"
              : "bg-surface border-border text-muted hover:text-fg hover:bg-elevated"
          }`}
          title="Toggle Text Chat Overlay"
        >
          <MessageSquare className="w-4.5 h-4.5" />
        </button>

        {/* Mute/Voice output toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !voiceMode;
            setVoiceMode(next);
            if (!next) {
              window.speechSynthesis?.cancel();
              setIsAISpeaking(false);
            }
          }}
          className={`p-2.5 rounded-full border transition-all cursor-pointer ${
            voiceMode
              ? "bg-violet-500/15 border-violet-500/30 text-violet-300 font-black"
              : "bg-surface border-border text-muted hover:text-fg hover:bg-elevated"
          }`}
          title={voiceMode ? "Mute AI voice responses" : "Unmute AI voice responses"}
        >
          {voiceMode ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
        </button>

        {/* Voice settings popover toggle */}
        <button
          type="button"
          onClick={() => setVoiceSettingsOpen(!voiceSettingsOpen)}
          className={`p-2.5 rounded-full border transition-all cursor-pointer ${
            voiceSettingsOpen
              ? "bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-soft"
              : "bg-surface border-border text-muted hover:text-fg hover:bg-elevated"
          }`}
          title="Configure voice and speech rate settings"
        >
          <SlidersHorizontal className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Floating Voice/Speech Rate Settings Popover Panel centered above the Dock */}
      {voiceSettingsOpen && (
        <div
          style={{ boxShadow: "0 24px 64px rgba(0, 0, 0, 0.3)" }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[320px] bg-surface/95 border border-border/80 backdrop-blur-lg rounded-2xl p-4 flex flex-col gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-black uppercase text-fg tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
              Voice Settings
            </span>
            <button
              onClick={() => setVoiceSettingsOpen(false)}
              className="text-muted hover:text-fg text-xs p-1 cursor-pointer transition"
            >
              ✕
            </button>
          </div>

          {/* Voice select group */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              AI Voice Profile
            </label>
            <div className="relative">
              <select
                value={selectedVoiceName}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full text-xs bg-panel/50 border border-border rounded-xl px-3 py-2 text-fg outline-none focus:border-accent/40 cursor-pointer appearance-none pr-8 transition"
              >
                {availableVoices.length === 0 ? (
                  <option value="">Default System Voice</option>
                ) : (
                  availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name.replace("Microsoft", "").replace("Google", "").trim()} ({v.lang})
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted select-none text-[8px]">
                ▼
              </div>
            </div>
          </div>

          {/* Speech speed group */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                Speaking Speed
              </label>
              <span className="text-[11px] font-black text-accent">{speechRate.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted font-bold">0.5x</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speechRate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                className="flex-1 accent-accent bg-border h-1 rounded-full cursor-pointer appearance-none outline-none"
              />
              <span className="text-[10px] text-muted font-bold">2.0x</span>
            </div>
          </div>
          
          {/* Quick test speech button */}
          <button
            type="button"
            onClick={() => {
              void speakNaturally("Hello! This is my new voice profile. How does it sound?", {
                onStart: () => setIsAISpeaking(true),
                onEnd: () => setIsAISpeaking(false),
              });
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-bg text-xs font-black hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            Test Speech Profile
          </button>
        </div>
      )}

      {/* Floating Chat Overlay Panel centered above the Dock */}
      {floatingChatOpen && (
        <div
          style={{ boxShadow: "0 24px 64px rgba(0, 0, 0, 0.3)" }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[400px] h-[560px] bg-surface/95 border border-border/80 backdrop-blur-lg rounded-3xl flex flex-col min-w-0 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 overflow-hidden"
        >
          {/* Custom Scrollbar Styles for the Chat popup */}
          <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar {
              width: 5px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.25);
              border-radius: 99px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.45);
            }
          `}} />

          {/* Chat box header */}
          <div className="px-5 py-4 border-b border-border bg-surface/80 flex items-center justify-between shrink-0 rounded-t-3xl h-14">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
                  <Bot className="w-4 h-4" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#101424] ${sending ? "animate-ping" : ""}`} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-accent tracking-widest block">AI Interviewer</span>
                <span className="text-xs font-bold text-fg">Agent Active</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFloatingChatOpen(false)}
              className="text-xs font-bold text-muted hover:text-fg p-1.5 rounded-lg hover:bg-bg transition cursor-pointer"
            >
              Hide
            </button>
          </div>

          {/* Chat messages list with wrapping and custom thin scrollbars */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4 custom-scrollbar max-w-full">
            {chat.map((msg, idx) => {
              const isAI = msg.role === "assistant";
              return (
                <div key={idx} className={`flex gap-2.5 max-w-[88%] ${isAI ? "" : "ml-auto flex-row-reverse"}`}>
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                    isAI ? "bg-accent/10 border border-accent/25 text-accent" : "bg-elevated/40 border border-border text-muted"
                  }`}>
                    {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3 rounded-2xl border text-xs leading-relaxed font-medium break-words [overflow-wrap:anywhere] max-w-full overflow-hidden ${
                    isAI ? "bg-surface/80 border-border/80 text-fg" : "bg-surface border-border/40 text-muted"
                  }`}>
                    {isAI ? (
                      // Interviewer replies are markdown (bold, lists, inline code) —
                      // render them properly instead of leaking raw ** and ` markers.
                      <MarkdownRenderer
                        content={msg.text}
                        className="text-xs max-w-full break-words [overflow-wrap:anywhere]
                          prose-p:my-1.5 prose-p:leading-relaxed prose-p:text-fg
                          prose-headings:text-fg prose-headings:text-xs prose-headings:font-black prose-headings:tracking-wide prose-headings:my-2
                          prose-ul:my-1.5 prose-ul:pl-4 prose-ul:list-disc prose-ol:my-1.5 prose-ol:pl-4
                          prose-li:my-0.5 prose-li:text-fg
                          prose-strong:text-fg prose-strong:font-bold
                          prose-code:text-accent prose-code:text-[11px]
                          prose-pre:my-2 prose-pre:text-[11px]"
                      />
                    ) : (
                      <div className="whitespace-pre-line break-words [overflow-wrap:anywhere]">{msg.text}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex gap-2.5 max-w-[88%]">
                <div className="w-7 h-7 rounded-lg shrink-0 bg-accent/10 border border-accent/25 text-accent flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-2xl border border-border/80 bg-surface/80 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-150" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSend} className="p-4 border-t border-border bg-surface/80 shrink-0 rounded-b-3xl">
            <div className="relative flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Talk to the AI Interviewer..."
                disabled={sending}
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-border bg-bg text-xs text-fg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition placeholder:text-muted/65"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="absolute right-2 p-2 rounded-lg bg-accent text-bg hover:bg-accent-soft active:scale-95 disabled:opacity-30 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * One round's coding surface. Owns its own Sandpack provider (so switching
 * rounds fully remounts the editor for a different template/files), and lifts
 * file changes up to the parent via `onFilesChange` so the shared chat panel —
 * which lives outside any provider — can ship the current code with each turn.
 */
function RoundSurface({
  round,
  files,
  onFilesChange,
  onRun,
  outputView,
  setOutputView,
}: {
  round: RoundView;
  files: Record<string, string>;
  onFilesChange: (roundId: string, files: Record<string, string>) => void;
  onRun: (out: { stdout?: string; stderr?: string }) => void;
  outputView: "preview" | "both" | "console";
  setOutputView: (val: "preview" | "both" | "console") => void;
}) {
  const isFrontend = round.kind === "frontend";
  const { resolvedTheme } = useTheme();
  // Avoid the Sandpack SSR/client theme hydration mismatch: next-themes has no
  // resolved theme on the server, so the first client render must also treat it
  // as light (matching the server HTML), then switch to the real theme once
  // mounted. Theme is folded into the provider key so it re-applies cleanly.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const [fileTreeCollapsed, setFileTreeCollapsed] = useState(false);
  const { width: editorW, onPointerDown: onEditorDrag } = useResizable(840, 320, 2000);
  const { height: consoleH, onPointerDown: onConsoleDrag } = useResizableHeight(180, 80, 700);

  // Capture initial files on mount of this round to keep SandpackProvider stable!
  const initialFilesRef = useRef(files);

  const [previewKey, setPreviewKey] = useState(0);
  const handleRefreshPreview = () => {
    initialFilesRef.current = files;
    setPreviewKey((prev) => prev + 1);
    toast.success("Preview recompiled and refreshed");
  };

  return (
    <SandpackProvider
      key={`${previewKey}-${isDark ? "dark" : "light"}`}
      template={isFrontend ? "react" : "vanilla"}
      theme={getSandpackTheme(isDark)}
      files={initialFilesRef.current}
      options={{
        initMode: "immediate",
        recompileMode: "delayed",
        recompileDelay: 300,
        visibleFiles: isFrontend ? ["/App.js"] : undefined,
        activeFile: isFrontend ? "/App.js" : undefined,
      }}
    >
      <SurfaceBridge roundId={round.roundId} onFilesChange={onFilesChange} />
      {isFrontend ? (
        <div className="flex h-full flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Column 2: File explorer sidebar & Editor area - drag-resizable on desktop */}
          <div
            className="w-full md:w-[var(--ide-editor-w)] md:shrink-0 flex border-r border-border h-full overflow-hidden"
            style={{ "--ide-editor-w": `${editorW}px` } as React.CSSProperties}
          >
            {fileTreeCollapsed ? (
              <div className="w-12 shrink-0 border-r border-border bg-surface/20 hidden sm:flex flex-col items-center py-4 gap-4 h-full transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setFileTreeCollapsed(false)}
                  className="p-2 rounded-lg border border-border bg-bg hover:bg-elevated hover:text-accent transition cursor-pointer text-muted shadow-sm flex items-center justify-center"
                  title="Expand File Explorer"
                >
                  <FolderClosed className="w-4 h-4 text-accent animate-pulse" />
                </button>
              </div>
            ) : (
              <div className="w-48 border-r border-border shrink-0 hidden sm:block h-full transition-all duration-300">
                <FileExplorer
                  templateId="react"
                  readOnly={false}
                  showDownload={false}
                  collapsed={fileTreeCollapsed}
                  onToggleCollapse={() => setFileTreeCollapsed((v) => !v)}
                  plainFolders
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0 h-full flex flex-col bg-bg overflow-hidden">
              <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface/30">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Code Workpad
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFileTreeCollapsed(!fileTreeCollapsed)}
                    className="text-[9px] font-black tracking-wider text-accent hover:text-accent-soft uppercase cursor-pointer"
                  >
                    {fileTreeCollapsed ? "Show Files" : "Hide Files"}
                  </button>
                  <span className="text-[10px] font-mono text-muted/40">App.js</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <CustomMonacoEditor fontSize={13} />
              </div>
            </div>
          </div>

          {/* Drag handle */}
          <div
            onPointerDown={onEditorDrag}
            title="Drag to resize output width"
            role="separator"
            aria-orientation="vertical"
            className="hidden md:block w-1.5 shrink-0 cursor-col-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors"
          />

          {/* Column 3: Output Pane (25% screen width) */}
          <div className="flex-1 h-full flex flex-col bg-bg overflow-hidden min-w-0">
            {outputView === "preview" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface/30">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
                    <Monitor className="w-3.5 h-3.5 text-accent animate-pulse" />
                    Browser Preview
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted/40 mr-1 hidden sm:inline">localhost:3000</span>
                    <button
                      type="button"
                      onClick={handleRefreshPreview}
                      title="Run / Refresh Preview"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/20 bg-accent/10 hover:bg-accent hover:text-bg text-accent hover:border-accent text-[9px] font-black uppercase tracking-wider transition cursor-pointer shadow-[0_0_8px_rgba(255,230,0,0.1)] active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Run Code
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <SandpackPreview
                    showNavigator={false}
                    showOpenInCodeSandbox={false}
                    showRefreshButton={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
              </div>
            )}

            {outputView === "console" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface/30">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
                    <Terminal className="w-3.5 h-3.5 text-accent animate-pulse" />
                    Console
                  </span>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {/* Keep preview mounted but hidden in background so bundler stays active */}
                  <div style={{ display: "none" }}>
                    <SandpackPreview
                      showNavigator={false}
                      showOpenInCodeSandbox={false}
                      showRefreshButton={false}
                    />
                  </div>
                  <div className="absolute inset-0 bg-bg">
                    <SandpackConsole resetOnPreviewRestart style={{ height: "100%" }} />
                  </div>
                </div>
              </div>
            )}

            {outputView === "both" && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Preview pane */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface/30">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
                      <Monitor className="w-3.5 h-3.5 text-accent animate-pulse" />
                      Browser Preview
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted/40 mr-1 hidden sm:inline">localhost:3000</span>
                      <button
                        type="button"
                        onClick={handleRefreshPreview}
                        title="Run / Refresh Preview"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/20 bg-accent/10 hover:bg-accent hover:text-bg text-accent hover:border-accent text-[9px] font-black uppercase tracking-wider transition cursor-pointer shadow-[0_0_8px_rgba(255,230,0,0.1)] active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Run Code
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 relative">
                    <SandpackPreview
                      showNavigator={false}
                      showOpenInCodeSandbox={false}
                      showRefreshButton={true}
                      style={{ height: "100%", width: "100%" }}
                    />
                  </div>
                </div>

                {/* Horizontal Drag Divider */}
                <div
                  onPointerDown={onConsoleDrag}
                  title="Drag to resize console height"
                  role="separator"
                  aria-orientation="horizontal"
                  className="h-1.5 shrink-0 cursor-row-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors"
                />

                {/* Console pane */}
                <div
                  className="flex flex-col min-h-0 border-t border-border bg-bg"
                  style={{ height: `${consoleH}px` }}
                >
                  <div className="h-9 shrink-0 flex items-center gap-1.5 px-3 border-b border-border bg-surface/30 text-[10px] font-black uppercase tracking-wider text-muted">
                    <Terminal className="w-3 h-3 text-accent animate-pulse" />
                    Console
                  </div>
                  <div className="flex-1 min-h-0">
                    <SandpackConsole resetOnPreviewRestart style={{ height: "100%" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <ConsoleSurface language={round.language ?? "node"} kind={round.kind as "backend" | "dsa"} onRun={onRun} />
      )}
    </SandpackProvider>
  );
}

/**
 * Lives inside a round's SandpackProvider and mirrors the virtual FS up to the
 * parent on every edit, so the chat/submit paths always have current code.
 */
function SurfaceBridge({
  roundId,
  onFilesChange,
}: {
  roundId: string;
  onFilesChange: (roundId: string, files: Record<string, string>) => void;
}) {
  const { sandpack } = useSandpack();
  useEffect(() => {
    onFilesChange(roundId, extractCodeMap(sandpack.files));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files, roundId]);
  return null;
}

/**
 * Backend/DSA coding surface: a Monaco editor bound to the shared Sandpack
 * virtual FS plus a Run button that executes server-side on Piston.
 */
function ConsoleSurface({
  language,
  kind,
  onRun,
}: {
  language: string;
  kind: "backend" | "dsa";
  onRun?: (out: { stdout?: string; stderr?: string }) => void;
}) {
  const { sandpack } = useSandpack();
  const { resolvedTheme } = useTheme();
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ stdout?: string; stderr?: string; error?: string; timeMs?: number } | null>(null);

  const lang = SURFACE_LANG[language] ?? { monaco: "plaintext", exec: language };

  const SOURCE_EXT: Record<string, string[]> = {
    javascript: [".js"],
    typescript: [".ts"],
    python: [".py"],
    go: [".go"],
    java: [".java"],
    cpp: [".cpp", ".cc"],
    rust: [".rs"],
  };
  const exts = SOURCE_EXT[lang.exec] ?? [];
  const paths = Object.keys(sandpack.files);
  const activePath =
    paths.find((p) => exts.some((e) => p.endsWith(e))) ??
    paths.find((p) => !p.endsWith("package.json") && !p.endsWith(".css") && !p.endsWith(".html")) ??
    paths[0] ??
    "/main";
  const fileObj = sandpack.files[activePath];
  const code = typeof fileObj === "string" ? fileObj : fileObj?.code ?? "";

  async function run() {
    if (!code.trim()) {
      toast.error("Write some code first.");
      return;
    }
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: lang.exec, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOutput({ error: data?.error ?? `Run failed (HTTP ${res.status})` });
        return;
      }
      setOutput({ stdout: data.stdout, stderr: data.stderr, timeMs: data.timeMs });
      onRun?.({ stdout: data.stdout, stderr: data.stderr });
    } catch (e) {
      setOutput({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-full flex-col md:flex-row min-h-0">
      <div className="flex-1 min-w-0 h-full flex flex-col border-r border-border bg-bg">
        <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface/30">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {kind === "dsa" ? "DSA Workpad" : "Backend Workpad"} · {language}
          </span>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-accent text-bg text-[10px] font-bold uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Run
          </button>
        </div>
        <div className="flex-1 min-h-0 relative">
          <RawMonacoEditor
            height="100%"
            language={lang.monaco}
            theme={resolvedTheme === "light" ? "light" : "vs-dark"}
            value={code}
            onChange={(v) => sandpack.updateFile(activePath, v ?? "")}
            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }}
          />
        </div>
      </div>

      <div className="w-full md:w-[48%] h-full flex flex-col bg-bg">
        <div className="h-10 shrink-0 flex items-center gap-1.5 px-3 border-b border-border bg-surface/30">
          <Terminal className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span className="text-[10px] font-black uppercase text-fg tracking-wider">Console Output</span>
          {output?.timeMs != null && <span className="ml-auto text-[10px] font-mono text-muted/40">{output.timeMs}ms</span>}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
          {!output && !running && <p className="text-muted/50">Click Run to execute your code on the server.</p>}
          {running && <p className="text-muted/70 inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Running…</p>}
          {output?.error && <pre className="whitespace-pre-wrap text-rose-400">{output.error}</pre>}
          {output?.stdout && <pre className="whitespace-pre-wrap text-fg/90">{output.stdout}</pre>}
          {output?.stderr && <pre className="whitespace-pre-wrap text-amber-400 mt-2">{output.stderr}</pre>}
          {output && !output.error && !output.stdout && !output.stderr && (
            <p className="text-muted/50">(no output)</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pre-process markdown into a clean spoken narrative for the voice mode. */
function cleanSpokenText(rawText: string): string {
  let cleaned = rawText;
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/\|[\s\S]*?\|\r?\n/g, "");
  cleaned = cleaned.replace(/[*#_\-\[\]()~]/g, " ");
  cleaned = cleaned
    .replace(/\bIP-(\d+)\b/gi, "ticket I.P. $1")
    .replace(/\bSQLite\b/gi, "S.Q.L. Lite")
    .replace(/\bSQL\b/gi, "S.Q.L.")
    .replace(/\bDB\b/gi, "database")
    .replace(/\bRAG\b/gi, "rag")
    .replace(/\bAPI\b/gi, "A.P.I.")
    .replace(/\bAPIs\b/gi, "A.P.I.s")
    .replace(/\bHITL\b/gi, "human in the loop")
    .replace(/\bUI\b/gi, "U.I.")
    .replace(/\bUX\b/gi, "U.X.")
    .replace(/\bSTT\b/gi, "speech to text")
    .replace(/\bTTS\b/gi, "text to speech")
    .replace(/\bVS\b/gi, "versus")
    .replace(/\bauth\b/gi, "authentication");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  const maxChars = 320;
  if (cleaned.length > maxChars) {
    const subset = cleaned.slice(0, maxChars);
    const lastBoundary = Math.max(subset.lastIndexOf("."), subset.lastIndexOf("?"), subset.lastIndexOf("!"));
    if (lastBoundary > 60) {
      cleaned = subset.slice(0, lastBoundary + 1);
    } else {
      const lastSpace = subset.lastIndexOf(" ");
      cleaned = subset.slice(0, lastSpace > 0 ? lastSpace : maxChars) + "...";
    }
  }
  return cleaned;
}
