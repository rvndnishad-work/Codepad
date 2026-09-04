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
  PanelLeft,
  PanelRight,
  AlignCenter,
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
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import ShimmedSandpackProvider from "@/components/ShimmedSandpackProvider";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { getSandpackTheme } from "@/lib/sandpack-theme";
import { speakNaturally, cancelSpeak, updateSpeechConfig, pickBestVoice, configureCloudTTS, OPENAI_CLOUD_VOICES, OPENAI_CLOUD_VOICE_LABELS } from "@/lib/copilot-tts";
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

/** Shape of GET /api/ai-interview/status — the honest health probe. */
type AiStatus = {
  ai: { configured: boolean; model: string };
  credits: { required: number; balance: number; sufficient: boolean } | null;
  deadline: string | null;
  expired: boolean;
  finished: boolean;
  engagementLevel: string;
};

/** Metadata appended by /api/ai-interview/message on every turn. */
type MessageTurnMeta = {
  aiProvider?: "together" | "gemini" | "mock";
  degraded?: boolean;
  degradedReason?: string | null;
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
  const [chatDock, setChatDock] = useState<"left" | "center" | "right">("center");
  // Hydrate dock position from localStorage without hydration mismatch
  useEffect(() => {
    try {
      const v = localStorage.getItem("interview_chat_dock");
      if (v === "left" || v === "right" || v === "center") setChatDock(v);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("interview_chat_dock", chatDock); } catch {}
  }, [chatDock]);
  const [showControls, setShowControls] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [selectedCloudVoice, setSelectedCloudVoice] = useState<string>(() => {
    if (typeof window === "undefined") return "alloy";
    return localStorage.getItem("jarvis_cloud_voice") || "alloy";
  });
  const [speechRate, setSpeechRate] = useState<number>(0.97);
  // Real AI health, probed on mount and refreshed after failed turns. Drives
  // the status chip + banners so the candidate always knows whether the
  // interviewer is live, degraded (offline mode), or paused (no credits).
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [degradedTurn, setDegradedTurn] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { width: chatW, onPointerDown: onChatDrag } = useResizable(340, 260, 560);
  // Track the viewport so fixed-width panes can never push the coding surface
  // off-screen (the old fixed 450px question pane + 840px editor overflowed
  // common laptop widths and crushed/misaligned the browser preview).
  const [viewportW, setViewportW] = useState(0);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Question pane may claim at most ~26% of the viewport.
  const effChatW = viewportW
    ? Math.min(chatW, Math.max(260, Math.round(viewportW * 0.26)))
    : chatW;

  const activeRound = rounds.find((r) => r.roundId === activeRoundId) ?? rounds[0];
  const activeFiles = roundFiles[activeRoundId] ?? {};
  const isMultiRound = rounds.length > 1;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── AI health derivation ────────────────────────────────────────────────
  const outOfCredits = !!aiStatus?.credits && !aiStatus.credits.sufficient;
  const aiConfigured = aiStatus ? aiStatus.ai.configured : true;
  const offlineMode = degradedTurn || !aiConfigured;

  const refreshAiStatus = () => {
    fetch(`/api/ai-interview/status?inviteToken=${encodeURIComponent(session.inviteToken)}`)
      .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : null))
      .then((d) => {
        if (d) setAiStatus(d);
      })
      .catch(() => {
        /* probe is best-effort — banners just stay on last known state */
      });
  };
  useEffect(() => {
    refreshAiStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.inviteToken]);

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
    const savedCloud = localStorage.getItem("jarvis_cloud_voice");
    if (savedCloud) {
      setSelectedCloudVoice(savedCloud);
      updateSpeechConfig({ cloudVoice: savedCloud });
    } else {
      updateSpeechConfig({ cloudVoice: selectedCloudVoice });
    }
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

  const handleCloudVoiceChange = (voiceName: string) => {
    setSelectedCloudVoice(voiceName);
    updateSpeechConfig({ cloudVoice: voiceName });
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
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // FIX: the timer used to vanish for a candidate's FIRST visit because
  // `session.startedAt` came from the initial server render (null until their
  // first message) and never updated client-side. Now: once started, the
  // server timestamp wins; before that, the clock starts from mount time so
  // the countdown is ALWAYS visible (the greeting fires on load anyway).
  const [mountedAt] = useState<number>(() => Date.now());
  const startedAtMs = session.startedAt ? new Date(session.startedAt).getTime() : mountedAt;

  // Authoritative deadline after a successful extension; local math otherwise.
  const [serverDeadlineAt, setServerDeadlineAt] = useState<string | null>(null);
  const [extensionsRemaining, setExtensionsRemaining] = useState<number | null>(null);
  const [extensionMinutesEach, setExtensionMinutesEach] = useState<number>(5);
  const [timeSpentSec, setTimeSpentSec] = useState<number | null>(null);

  // Presence heartbeat: banks time-spent while the tab is visible (30s cadence,
  // paused when hidden). Feeds the recruiter's "time spent" readout.
  useEffect(() => {
    if (!session.startedAt) return;
    let stopped = false;
    const ping = () => {
      if (document.visibilityState !== "visible" || stopped) return;
      fetch("/api/ai-interview/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: session.inviteToken, seconds: 30 }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.ok && typeof d.timeSpentSec === "number") setTimeSpentSec(d.timeSpentSec);
        })
        .catch(() => {});
    };
    ping();
    const id = setInterval(ping, 30_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [session.inviteToken, session.startedAt]);
  useEffect(() => {
    // Pull the recruiter's policy once the session status probe lands.
    fetch(`/api/ai-interview/status?inviteToken=${encodeURIComponent(session.inviteToken)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.extensions) {
          setExtensionsRemaining(d.extensions.remaining);
          setExtensionMinutesEach(d.extensions.minutesEach ?? 5);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.inviteToken]);

  const baseMinutes = Math.max(1, session.estimatedMinutes || 30);
  const [localExtraMin, setLocalExtraMin] = useState(0);
  const deadlineMs =
    serverDeadlineAt !== null
      ? new Date(serverDeadlineAt).getTime()
      : startedAtMs + (baseMinutes + localExtraMin) * 60_000;
  const remainingMs = deadlineMs - now;
  const isExpired = remainingMs <= 0;
  const isLowTime = remainingMs < 5 * 60_000;

  const [extendingTime, setExtendingTime] = useState(false);
  const handleExtendTimer = async () => {
    if (extendingTime) return;
    setExtendingTime(true);
    try {
      const res = await fetch("/api/ai-interview/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: session.inviteToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error ?? "Could not extend time.");
        if (data?.error === "No extensions remaining") setExtensionsRemaining(0);
        return;
      }
      setServerDeadlineAt(data.deadlineAt);
      setExtensionsRemaining(data.extensionsRemaining);
      toast.success(`+${data.extraMinutes >= 0 ? "" : ""}Time extended — good luck!`);
    } catch {
      toast.error("Network error while extending time.");
    } finally {
      setExtendingTime(false);
    }
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

  // Auto-scroll chat window — now most recent is on TOP, so scroll to top on new messages.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat, sending]);

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

  // Native Speech Recognition — continuous + debounced send so natural pauses don't cut you off.
  // Previous: continuous=false + instant send on first result => half-sentence cut on 600ms pause.
  // Now: interim results stream live into the input, auto-send only after 1.4s of silence.
  const interimTranscriptRef = useRef("");
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      shouldRestartRef.current = true;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      // Don't clear input completely — keep any typed draft, append dictation after it
      toast.success("Listening… pause 1.4s to send, or tap mic to finish.");
    };

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript: string = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      interimTranscriptRef.current = interim;
      const combined = (finalTranscriptRef.current + interim).trim();
      if (combined) setInput(combined);

      // Debounce: only send after silence
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const toSend = (finalTranscriptRef.current + interimTranscriptRef.current).trim();
        if (!toSend) return;
        console.log("Voice dictation commit (silence):", toSend);
        // Lock restart so onend doesn't loop
        shouldRestartRef.current = false;
        finalTranscriptRef.current = "";
        interimTranscriptRef.current = "";
        setInput("");
        handleSendTextRef.current(toSend);
      }, 1400);
    };

    rec.onerror = (err: any) => {
      console.error("Dictation failure:", err);
      // no-speech / audio-capture are transient — keep listening instead of hard stop
      if (err?.error === "no-speech" || err?.error === "audio-capture") return;
      setIsListening(false);
      isListeningRef.current = false;
      shouldRestartRef.current = false;
      toast.error("Speech recognition failed. Please try again.");
    };

    rec.onend = () => {
      // Browser auto-stops after ~10s of silence or on network blip — restart if user still intends to speak
      if (shouldRestartRef.current && isListeningRef.current) {
        try { rec.start(); } catch { setIsListening(false); isListeningRef.current = false; }
        return;
      }
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = rec;
    return () => {
      shouldRestartRef.current = false;
      try { rec.stop(); } catch {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) {
      toast.error("Native voice dictation is not supported in this browser. Try using Chrome or Edge.");
      return;
    }
    if (isListeningRef.current) {
      // Manual stop — commit whatever is in the buffer/input immediately
      shouldRestartRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { recognitionRef.current.stop(); } catch {}
      const toSend = (finalTranscriptRef.current + interimTranscriptRef.current).trim() || input.trim();
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      setInput("");
      if (toSend) {
        // Give onend a tick to settle UI before sending
        setTimeout(() => handleSendTextRef.current(toSend), 80);
      } else {
        setIsListening(false);
        isListeningRef.current = false;
      }
    } else {
      cancelSpeak();
      setIsAISpeaking(false);
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      shouldRestartRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("rec.start failed", e);
        toast.error("Could not start listening. Try again.");
      }
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
        const data = (await res.json()) as { chatHistory: Message[] } & MessageTurnMeta;
        setChat(data.chatHistory);
        setDegradedTurn(data.degraded === true);
        speakResponse(data.chatHistory[data.chatHistory.length - 1]?.text);
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "The interviewer could not start. Please refresh the page.");
        refreshAiStatus();
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not reach the interviewer. Check your connection and try again.");
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
        // 402 = the workspace ran out of AI credits mid-interview. Re-probe so
        // the "paused" banner appears immediately instead of just a toast.
        refreshAiStatus();
        throw new Error(data.error || "Failed to dispatch message");
      }
      const data = (await res.json()) as { chatHistory: Message[] } & MessageTurnMeta;
      setChat(data.chatHistory);
      setDegradedTurn(data.degraded === true);
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
          {mounted && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                  completed
                    ? "hidden"
                    : isExpired
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse"
                    : isLowTime
                    ? "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
                    : "bg-surface border-border text-slate-700 dark:text-slate-300"
                }`}
                title="Time remaining on this screening"
              >
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>{completed ? "—" : formatRemaining(remainingMs)}</span>
              </div>

              {/* Candidate time extension — policy set by the recruiter
                  (maxExtensions × extensionMinutes). Persisted server-side so
                  it survives refresh and binds every deadline check. */}
              {!completed && (extensionsRemaining ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={handleExtendTimer}
                  disabled={extendingTime}
                  title={`Add ${extensionMinutesEach} more minute${extensionMinutesEach === 1 ? "" : "s"} — ${extensionsRemaining} extension${extensionsRemaining === 1 ? "" : "s"} left`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-black tracking-wider transition cursor-pointer shrink-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm tabular-nums"
                >
                  {extendingTime ? "…" : `+${extensionMinutesEach}m`}
                  {(extensionsRemaining ?? 0) > 0 && (
                    <span className="text-[9px] opacity-70">×{extensionsRemaining}</span>
                  )}
                </button>
              )}
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
          style={{ width: chatCollapsed ? "0px" : `${effChatW}px` }}
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

          {/* Active round banner — h-14 so its baseline matches the question
              pane header on the left and the panes read as one aligned row. */}
          <div className="h-14 px-4 border-b border-border bg-surface/40 flex items-center gap-2 shrink-0">
            <span className="text-accent">{ROUND_ICON[activeRound.kind]}</span>
            <span className="text-[11px] font-bold text-fg truncate">{activeRound.title}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted bg-bg border border-border px-1.5 py-0.5 rounded ml-1">
              {activeRound.kind}
              {activeRound.language ? ` · ${activeRound.language}` : ""}
            </span>
          </div>

          {/* AI health banner — always visible so the candidate knows whether
              the interviewer is live, degraded, or paused, before they type. */}
          {(outOfCredits || offlineMode || aiStatus?.expired) && (
            <div
              className={`px-4 py-2 border-b border-border flex items-center gap-2 shrink-0 text-[11px] font-bold ${
                outOfCredits || aiStatus?.expired
                  ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-400"
              }`}
              role="status"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  outOfCredits || aiStatus?.expired ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {outOfCredits
                ? "Interviewer paused — this workspace is out of AI interview credits. Please contact your recruiter."
                : aiStatus?.expired
                  ? "Time is up for this session — submit your assessment to finish."
                  : "The AI interviewer is temporarily in offline mode — replies come from a limited script and may not fit your answers."}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <RoundSurface
              key={activeRound.roundId}
              round={activeRound}
              files={roundFiles[activeRound.roundId] ?? activeRound.files}
              onFilesChange={updateRoundFiles}
              onRun={(o) => setLastRun(o)}
              outputView={outputView}
              setOutputView={setOutputView}
              reservedLeft={chatCollapsed ? 0 : effChatW + 6}
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
          /* Thinking: slow amber pulse with breathing — clearly distinct from talking */
          @keyframes thinking-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 14px 2px rgba(245,158,11,0.38), 0 0 24px 4px rgba(251,113,133,0.18); }
            50% { transform: scale(1.07); box-shadow: 0 0 26px 6px rgba(245,158,11,0.58), 0 0 38px 8px rgba(251,113,133,0.28); }
          }
          @keyframes thinking-dot {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
          /* Listening: emerald breathing — mic active */
          @keyframes listening-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 14px 2px rgba(16,185,129,0.38), 0 0 24px 4px rgba(52,211,153,0.18); }
            50% { transform: scale(1.07); box-shadow: 0 0 26px 6px rgba(16,185,129,0.58), 0 0 38px 8px rgba(52,211,153,0.28); }
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

        {/* AI Orb — 4 distinct states:
              idle (soft-glow violet) | thinking (amber pulse + dots) | speaking (eq-shake violet/cyan) | listening (emerald pulse) */}
        {(() => {
          const orbState =
            isListening ? "listening" :
            isAISpeaking ? "speaking" :
            sending ? "thinking" : "idle";
          const orbAnim =
            orbState === "listening" ? "animate-[listening-pulse_1.4s_infinite_ease-in-out]" :
            orbState === "speaking" ? "animate-[eq-shake_0.55s_infinite_ease-in-out]" :
            orbState === "thinking" ? "animate-[thinking-pulse_1.3s_infinite_ease-in-out]" :
            "animate-[soft-glow_3s_infinite_ease-in-out]";
          const orbGradient =
            orbState === "thinking" ? "from-amber-500 via-orange-500 to-yellow-500" :
            orbState === "listening" ? "from-emerald-500 via-teal-500 to-cyan-500" :
            "from-indigo-500 via-violet-500 to-fuchsia-500";
          const ringClass =
            orbState === "thinking" ? "bg-amber-400/30 animate-ping" :
            orbState === "listening" ? "bg-emerald-400/30 animate-ping" :
            orbState === "speaking" ? "bg-fuchsia-400/30 animate-ping" :
            "bg-violet-400/15";
          const label =
            orbState === "thinking" ? "AI is thinking…" :
            orbState === "speaking" ? "AI is speaking" :
            orbState === "listening" ? "Listening…" : "Toggle Chat Control Panel";
          return (
            <div
              onClick={() => setFloatingChatOpen(!floatingChatOpen)}
              className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${orbGradient} flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 ${orbAnim}`}
              title={label}
            >
              {/* Pulse ring — color matches state */}
              <span className={`absolute inset-0 rounded-full ${ringClass}`} />

              {/* Speaking: equalizer bars behind icon */}
              {orbState === "speaking" && (
                <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1.5 opacity-55 pointer-events-none">
                  <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-1_1s_infinite_ease-in-out]" />
                  <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-2_1s_infinite_ease-in-out]" style={{ animationDelay: "100ms" }} />
                  <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-3_1s_infinite_ease-in-out]" style={{ animationDelay: "200ms" }} />
                  <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-4_1s_infinite_ease-in-out]" style={{ animationDelay: "150ms" }} />
                  <div className="w-0.5 rounded-full bg-white animate-[bounce-eq-5_1s_infinite_ease-in-out]" style={{ animationDelay: "50ms" }} />
                </div>
              )}

              {/* Thinking: three amber dots pulsing sequentially */}
              {orbState === "thinking" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-90 pointer-events-none">
                  <span className="w-1 h-1 rounded-full bg-white animate-[thinking-dot_1.2s_infinite_ease-in-out]" />
                  <span className="w-1 h-1 rounded-full bg-white animate-[thinking-dot_1.2s_infinite_ease-in-out]" style={{ animationDelay: "200ms" }} />
                  <span className="w-1 h-1 rounded-full bg-white animate-[thinking-dot_1.2s_infinite_ease-in-out]" style={{ animationDelay: "400ms" }} />
                </div>
              )}

              {/* Listening: mic cue top-right */}
              {orbState === "listening" && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-surface flex items-center justify-center pointer-events-none">
                  <Mic className="w-1.5 h-1.5 text-white" />
                </span>
              )}

              {/* Bot icon — always on top, slightly dimmed while thinking */}
              <Bot className={`w-5 h-5 text-white relative z-10 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] ${orbState === "thinking" ? "opacity-90" : ""}`} />
            </div>
          );
        })()}

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

          {/* Cloud voice select — now controls OpenAI TTS (alloy/coral/etc.) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              AI Voice Profile <span className="normal-case font-normal text-[10px] text-accent">(Cloud)</span>
            </label>
            <div className="relative">
              <select
                value={selectedCloudVoice}
                onChange={(e) => handleCloudVoiceChange(e.target.value)}
                className="w-full text-xs bg-panel/50 border border-border rounded-xl px-3 py-2 text-fg outline-none focus:border-accent/40 cursor-pointer appearance-none pr-8 transition"
              >
                {OPENAI_CLOUD_VOICES.map((v) => (
                  <option key={v} value={v}>
                    {OPENAI_CLOUD_VOICE_LABELS[v] ?? v}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted select-none text-[8px]">
                ▼
              </div>
            </div>
            <p className="text-[10px] text-muted leading-tight">Cloud voice via OpenAI. Falls back to system voice if cloud is unavailable.</p>
          </div>

          {/* Local fallback voice — used only when cloud 503s */}
          <details className="group">
            <summary className="text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer list-none flex items-center justify-between">
              Fallback System Voice
              <span className="text-[10px] group-open:rotate-180 transition">▼</span>
            </summary>
            <div className="relative mt-2">
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
          </details>

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

      {/* Floating Chat Overlay Panel — user choosable dock: left / center / right */}
      {floatingChatOpen && (
        <div
          style={{ boxShadow: "0 24px 64px rgba(0, 0, 0, 0.3)" }}
          className={`fixed bottom-24 z-50 w-[400px] max-w-[92vw] h-[560px] bg-surface/95 border border-border/80 backdrop-blur-lg rounded-3xl flex flex-col min-w-0 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 overflow-hidden ${
            chatDock === "left" ? "left-6" : chatDock === "right" ? "right-6" : "left-1/2 -translate-x-1/2"
          }`}
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
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#101424] ${
                    outOfCredits
                      ? "bg-rose-500"
                      : offlineMode
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  } ${sending ? "animate-ping" : ""}`}
                />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-accent tracking-widest block">AI Interviewer</span>
                <span className="text-xs font-bold text-fg">
                  {sending
                    ? "Thinking…"
                    : outOfCredits
                      ? "Paused · No credits"
                      : offlineMode
                        ? "Offline mode"
                        : "Live"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Dock position switcher — moves chat aside from editor */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg border border-border/60 mr-1">
                <button
                  type="button"
                  onClick={() => setChatDock("left")}
                  title="Dock left"
                  aria-pressed={chatDock === "left"}
                  className={`p-1.5 rounded-md transition cursor-pointer ${chatDock === "left" ? "bg-accent text-bg shadow-sm" : "text-muted hover:text-fg hover:bg-surface"}`}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setChatDock("center")}
                  title="Dock center"
                  aria-pressed={chatDock === "center"}
                  className={`p-1.5 rounded-md transition cursor-pointer ${chatDock === "center" ? "bg-accent text-bg shadow-sm" : "text-muted hover:text-fg hover:bg-surface"}`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setChatDock("right")}
                  title="Dock right"
                  aria-pressed={chatDock === "right"}
                  className={`p-1.5 rounded-md transition cursor-pointer ${chatDock === "right" ? "bg-accent text-bg shadow-sm" : "text-muted hover:text-fg hover:bg-surface"}`}
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFloatingChatOpen(false)}
                className="text-xs font-bold text-muted hover:text-fg p-1.5 rounded-lg hover:bg-bg transition cursor-pointer"
              >
                Hide
              </button>
            </div>
          </div>

          {/* Chat input — moved to TOP directly under header so it's adjacent to most recent message */}
          <form onSubmit={handleSend} className="p-3 border-b border-border bg-surface/80 shrink-0">
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

          {/* Chat messages list — most recent on TOP so candidate sees latest without scrolling */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4 custom-scrollbar max-w-full">
            {sending && (
              <div className="flex gap-2.5 max-w-[88%]">
                <div className="w-7 h-7 rounded-lg shrink-0 bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 mr-1">Thinking</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-150" />
                </div>
              </div>
            )}

            {[...chat].reverse().map((msg, revIdx) => {
              const isAI = msg.role === "assistant";
              const origIdx = chat.length - 1 - revIdx;
              return (
                <div key={origIdx} className={`flex gap-2.5 max-w-[88%] ${isAI ? "" : "ml-auto flex-row-reverse"}`}>
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                    isAI ? "bg-accent/10 border border-accent/25 text-accent" : "bg-elevated/40 border border-border text-muted"
                  }`}>
                    {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3 rounded-2xl border text-xs leading-relaxed font-medium break-words [overflow-wrap:anywhere] max-w-full overflow-hidden ${
                    isAI ? "bg-surface/80 border-border/80 text-fg" : "bg-surface border-border/40 text-muted"
                  }`}>
                    {isAI ? (
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

            <div ref={chatEndRef} className="h-0" />
          </div>
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
  reservedLeft,
}: {
  round: RoundView;
  files: Record<string, string>;
  onFilesChange: (roundId: string, files: Record<string, string>) => void;
  onRun: (out: { stdout?: string; stderr?: string }) => void;
  outputView: "preview" | "both" | "console";
  setOutputView: (val: "preview" | "both" | "console") => void;
  /** Width already consumed left of this surface (question pane + handles). */
  reservedLeft: number;
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
  const { width: editorW, onPointerDown: onEditorDrag } = useResizable(600, 380, 1200);
  const { height: consoleH, onPointerDown: onConsoleDrag } = useResizableHeight(180, 80, 700);

  // Keep the editor from starving the preview: clamp to what's actually
  // available after the question pane, file tree, drag handles, and a minimum
  // ~320px preview. Without this the fixed editor width overflowed laptops
  // and pushed/misaligned the Browser Preview off-screen.
  const [surfaceVpW, setSurfaceVpW] = useState(0);
  useEffect(() => {
    const onResize = () => setSurfaceVpW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const treeW = fileTreeCollapsed ? 48 : 192;
  const effEditorW = surfaceVpW
    ? Math.min(
        editorW,
        Math.max(380, surfaceVpW - reservedLeft - treeW - 12 - 320)
      )
    : editorW;

  // Capture initial files on mount of this round to keep SandpackProvider stable!
  const initialFilesRef = useRef(files);

  const [previewKey, setPreviewKey] = useState(0);
  const handleRefreshPreview = () => {
    initialFilesRef.current = files;
    setPreviewKey((prev) => prev + 1);
    toast.success("Preview recompiled and refreshed");
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden ai-surface">
      <ShimmedSandpackProvider
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
              style={{ "--ide-editor-w": `${effEditorW}px` } as React.CSSProperties}
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
      </ShimmedSandpackProvider>
    </div>
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
