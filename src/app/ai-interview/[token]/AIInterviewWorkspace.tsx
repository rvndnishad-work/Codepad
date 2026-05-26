"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Play,
  Clock,
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
  SandpackLayout, 
  SandpackCodeEditor, 
  SandpackPreview, 
  useSandpack 
} from "@codesandbox/sandpack-react";
import { toast } from "sonner";
import {
  MAX_FILES_JSON_BYTES,
  FILES_JSON_WARN_BYTES,
} from "@/lib/ai-interview/files-size";

type Message = {
  role: "user" | "assistant";
  text: string;
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
  };
  initialFiles: Record<string, string>;
  initialChat: Message[];
};

export default function AIInterviewWorkspace(props: Props) {
  return (
    <SandpackProvider
      template="react"
      files={props.initialFiles}
      options={{
        initMode: "immediate",
        recompileMode: "delayed",
        recompileDelay: 300,
      }}
    >
      <WorkspaceInner {...props} />
    </SandpackProvider>
  );
}

function WorkspaceInner({
  session,
  initialChat,
}: Props) {
  const { sandpack } = useSandpack();
  const [chat, setChat] = useState<Message[]>(initialChat);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(session.status === "COMPLETED");
  // Track the current files payload size so we can warn the candidate before
  // the server-side cap kicks in and rejects their message.
  const [filesBytes, setFilesBytes] = useState(0);

  // Voice Speech Synthesis Mode (B2B premium feature)
  const [voiceMode, setVoiceMode] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Countdown timer derived from session.startedAt + estimatedMinutes. The
  // server is the source of truth on expiry (returns 410 on /message after
  // deadline) — this UI is purely UX, with a small grace buffer that matches
  // the server's so we don't show "0:00" while the server still accepts a turn.
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (!session.startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);
  const deadlineMs = session.startedAt
    ? new Date(session.startedAt).getTime() + session.estimatedMinutes * 60_000
    : null;
  const remainingMs = deadlineMs ? deadlineMs - now : null;
  const isExpired = remainingMs !== null && remainingMs <= 0;
  const isLowTime = remainingMs !== null && remainingMs < 5 * 60_000;

  // Auto-submit once the timer hits zero. Guarded against double-fires by the
  // server-side finishedAt idempotency check and by the submitting/completed
  // state here.
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (isExpired && !autoSubmittedRef.current && !completed && !submitting) {
      autoSubmittedRef.current = true;
      toast.warning("Time's up — auto-submitting your assessment.");
      void handleSubmitAssessment({ auto: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpired, completed, submitting]);

  // Integrity telemetry — paste and tab-blur events. Buffered client-side,
  // sent to the server only at submit time so we don't add per-keystroke
  // network load. Compatible with the existing analyzeTelemetry() signal set.
  const sessionStartRef = useRef<number>(Date.now());
  const telemetryRef = useRef<Array<{ t: number; type: string; payload: unknown }>>([]);
  useEffect(() => {
    const recordPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      telemetryRef.current.push({
        t: Date.now() - sessionStartRef.current,
        type: "paste",
        payload: { length: text.length },
      });
    };
    const recordBlur = () => {
      telemetryRef.current.push({
        t: Date.now() - sessionStartRef.current,
        type: "blur",
        payload: {},
      });
    };
    const recordFocus = () => {
      telemetryRef.current.push({
        t: Date.now() - sessionStartRef.current,
        type: "focus",
        payload: {},
      });
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

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Initial greeting if history is empty
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      
      if (chat.length === 0) {
        void sendInitialGreeting();
      }

      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      };
    } else {
      if (chat.length === 0) {
        void sendInitialGreeting();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendInitialGreeting() {
    setSending(true);
    try {
      const res = await fetch("/api/ai-interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: session.inviteToken,
          message: "hello",
          files: extractFilesCode(),
        }),
      });
      if (res.ok) {
        const data = await res.json() as { chatHistory: Message[] };
        setChat(data.chatHistory);
        speakResponse(data.chatHistory[data.chatHistory.length - 1]?.text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  // Extract plain code string map from Sandpack files object
  const extractFilesCode = () => {
    const codeMap: Record<string, string> = {};
    for (const [path, fileObj] of Object.entries(sandpack.files)) {
      if (typeof fileObj === "string") {
        codeMap[path] = fileObj;
      } else if (fileObj && "code" in fileObj) {
        codeMap[path] = fileObj.code;
      }
    }
    // Side effect: keep the size indicator in sync so the candidate sees a
    // warning as they approach the limit (not just at submit time).
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(codeMap)).length;
      setFilesBytes(bytes);
    } catch {
      // ignore — size widget falls back to last known value
    }
    return codeMap;
  };

  // Pre-process raw markdown texts to create clean, human-like spoken narratives
  const cleanSpokenText = (rawText: string): string => {
    let cleaned = rawText;

    // 1. Remove code blocks entirely (anything between triple backticks)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

    // 2. Remove inline code backticks
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    // 3. Remove markdown tables entirely as they are impossible to read naturally
    cleaned = cleaned.replace(/\|[\s\S]*?\|\r?\n/g, "");

    // 4. Clean standard markdown symbols (*, #, _, -, etc.)
    cleaned = cleaned.replace(/[*#_\-\[\]()~]/g, " ");

    // 5. Expand abbreviations for fluent, human-like voice synthesis
    cleaned = cleaned
      .replace(/\bIP-(\d+)\b/ig, "ticket I.P. $1")
      .replace(/\bSQLite\b/ig, "S.Q.L. Lite")
      .replace(/\bSQL\b/ig, "S.Q.L.")
      .replace(/\bDB\b/ig, "database")
      .replace(/\bRAG\b/ig, "rag")
      .replace(/\bAPI\b/ig, "A.P.I.")
      .replace(/\bAPIs\b/ig, "A.P.I.s")
      .replace(/\bHITL\b/ig, "human in the loop")
      .replace(/\bUI\b/ig, "U.I.")
      .replace(/\bUX\b/ig, "U.X.")
      .replace(/\bSTT\b/ig, "speech to text")
      .replace(/\bTTS\b/ig, "text to speech")
      .replace(/\bVS\b/ig, "versus")
      .replace(/\bauth\b/ig, "authentication");

    // 6. Clean double spaces and trim
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // 7. Find a natural sentence boundary (., ?, !) close to 300-350 chars
    // so we don't chop words or end mid-sentence
    const maxChars = 320;
    if (cleaned.length > maxChars) {
      const subset = cleaned.slice(0, maxChars);
      const lastBoundary = Math.max(
        subset.lastIndexOf("."),
        subset.lastIndexOf("?"),
        subset.lastIndexOf("!")
      );
      
      if (lastBoundary > 60) {
        cleaned = subset.slice(0, lastBoundary + 1);
      } else {
        const lastSpace = subset.lastIndexOf(" ");
        cleaned = subset.slice(0, lastSpace > 0 ? lastSpace : maxChars) + "...";
      }
    }

    return cleaned;
  };

  const speakResponse = (text: string | undefined) => {
    if (!voiceMode || !text || typeof window === "undefined" || !window.speechSynthesis) return;

    // Halt any active speech first
    window.speechSynthesis.cancel();

    // Preprocess text to sound fluent, warm, and highly professional
    const cleanText = cleanSpokenText(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Natural, fluent, warm speech parameters
    utterance.rate = 0.98; // Warm, confident conversational speed (not rushed)
    utterance.pitch = 1.0; // Clear, crisp, natural pitch

    // Query standard premium/natural/neural English voice if accessible
    const voices = window.speechSynthesis.getVoices();
    
    // Strict, ordered priority list to guarantee 100% voice/gender consistency.
    // Jarvis will search this list in exact order and bind to the first match.
    const priorityVoiceNames = [
      "google us english",
      "microsoft aria online (natural)",
      "samantha",
      "microsoft zira",
      "karen",
      "hazel",
      "daniel",
      "microsoft david"
    ];
    
    let voice: SpeechSynthesisVoice | undefined;
    for (const namePattern of priorityVoiceNames) {
      voice = voices.find(v => v.lang.startsWith("en-") && v.name.toLowerCase().includes(namePattern));
      if (voice) break;
    }
    
    // Fallback if none of our preferred voices are registered
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith("en-"));
    }
    
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setSending(true);

    // Optimistically push candidate message to view instantly
    setChat((prev) => [...prev, { role: "user", text: userMessage }]);

    try {
      const currentFiles = extractFilesCode();
      const res = await fetch("/api/ai-interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: session.inviteToken,
          message: userMessage,
          files: currentFiles,
        }),
      });

      if (!res.ok) {
        // Surface server-side errors (out of credits, already submitted, etc.)
        // so the candidate isn't left guessing why the AI went silent.
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to dispatch message");
      }
      const data = await res.json() as { chatHistory: Message[] };
      setChat(data.chatHistory);
      speakResponse(data.chatHistory[data.chatHistory.length - 1]?.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Interviewer failed to respond.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmitAssessment = async (opts?: { auto?: boolean }) => {
    if (submitting) return;

    if (!opts?.auto) {
      const confirmSubmit = confirm("Are you sure you want to finalize your code and submit the interview? The AI will compile your grading scorecards instantly.");
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const currentFiles = extractFilesCode();
      const res = await fetch("/api/ai-interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: session.inviteToken,
          files: currentFiles,
          telemetry: telemetryRef.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Grading engine failure");
      }
      toast.success("Assessment graded successfully!");
      setCompleted(true);
      window.speechSynthesis.cancel();
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
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-accent/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px]" />

        <div className="w-full max-w-md bg-surface/60 border border-border backdrop-blur-md rounded-3xl p-8 text-center space-y-6 shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-md">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Interview Completed</h2>
            <p className="text-xs text-muted leading-relaxed">
              Thank you for completing the technical round, <span className="font-bold text-fg">{session.candidateName}</span>. Your interview logs and React code implementation have been successfully graded by the AI Agent.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-bg border border-border text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-muted">Target Position:</span>
              <span className="font-bold text-fg">{session.positionTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Candidate Email:</span>
              <span className="font-mono text-fg">{session.candidateEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Evaluation:</span>
              <span className="font-black text-emerald-400 uppercase">GRADED & SYNCED</span>
            </div>
          </div>

          <p className="text-[10px] text-muted/60 leading-normal">
            No further action is required. Your composite score matrix has been synced directly to the recruiter's recommendation backups pipeline.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-fg text-bg hover:bg-fg/90 text-xs font-bold transition-all shadow-soft active:scale-95"
          >
            Exit Workspace
            <LogOut className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-fg font-sans overflow-hidden">
      
      {/* Workspace Header top bar */}
      <header className="h-14 border-b border-border bg-surface/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-4 min-w-0">
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

        {/* Global actions and submit button */}
        <div className="flex items-center gap-3">
          {filesBytes > FILES_JSON_WARN_BYTES && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                filesBytes > MAX_FILES_JSON_BYTES
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse"
                  : "bg-amber-500/15 border-amber-500/35 text-amber-300"
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
          {remainingMs !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                isExpired
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse"
                  : isLowTime
                  ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                  : "bg-surface border-border text-muted"
              }`}
              title="Time remaining on this screening"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRemaining(remainingMs)}</span>
            </div>
          )}
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className={`p-2 rounded-xl border transition-all ${
              voiceMode
                ? "bg-accent/15 border-accent/25 text-accent"
                : "bg-surface border-border text-muted hover:text-fg"
            }`}
            title={voiceMode ? "Mute AI Voice" : "Enable AI Voice Mode"}
          >
            {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleSubmitAssessment()}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider transition shadow-lg active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            <span>Complete Assessment</span>
          </button>
        </div>
      </header>

      {/* Main split-pane workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Left Pane: AI Agent Chat hub (40% width) */}
        <div className="w-[38%] border-r border-border bg-surface/40 flex flex-col min-w-0">
          
          {/* AI Status Banner */}
          <div className="px-5 py-3.5 border-b border-border bg-surface/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
                  <Bot className="w-4 h-4" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#101424] ${sending ? 'animate-ping' : ''}`} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-accent tracking-widest block">AI Interviewer</span>
                <span className="text-xs font-bold text-fg">Agent Active</span>
              </div>
            </div>
            {voiceMode && (
              <span className="text-[9px] font-black bg-accent/15 border border-accent/25 text-accent px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                Voice Live
              </span>
            )}
          </div>

          {/* Messages Scroll Feed */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {chat.map((msg, idx) => {
              const isAI = msg.role === "assistant";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${isAI ? "" : "ml-auto flex-row-reverse"}`}
                >
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                    isAI 
                      ? "bg-accent/10 border border-accent/25 text-accent" 
                      : "bg-elevated/40 border border-border text-muted"
                  }`}>
                    {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 font-medium ${
                    isAI 
                      ? "bg-surface/80 border-border/80 text-fg" 
                      : "bg-surface border-border/40 text-muted"
                  }`}>
                    {/* Render chat text line breaks and blocks cleanly */}
                    <div className="whitespace-pre-line">{msg.text}</div>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-lg shrink-0 bg-accent/10 border border-accent/25 text-accent flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-4 rounded-2xl border border-border/80 bg-surface/80 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce delay-150" />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Message input dispatch container */}
          <form onSubmit={handleSend} className="p-4 border-t border-border bg-surface/60 shrink-0">
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

        {/* Right Pane: Sandpack Coding editor and live output preview (60% width) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Editor Surface */}
            <div className="flex-1 min-w-0 h-full flex flex-col border-r border-border bg-bg">
              <div className="px-4 py-2 border-b border-border bg-panel/40 flex items-center justify-between shrink-0 h-9">
                <span className="text-[10px] font-black uppercase text-muted tracking-wider">Monaco Workpad</span>
                <span className="text-[10px] font-mono text-muted/40">App.js</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                <SandpackCodeEditor style={{ height: "100%", width: "100%" }} />
              </div>
            </div>

            {/* Browser compiler output preview */}
            <div className="w-full md:w-[48%] h-full flex flex-col bg-bg">
              <div className="px-4 py-2 border-b border-border bg-panel/40 flex items-center justify-between shrink-0 h-9">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black uppercase text-muted tracking-wider">Compiler Output</span>
                </div>
                <span className="text-[10px] font-mono text-muted/40">localhost:3000</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                <SandpackPreview showNavigator={false} showOpenInCodeSandbox={false} showRefreshButton={true} style={{ height: "100%", width: "100%" }} />
              </div>
            </div>
          </div>
        </div>

      </main>

    </div>
  );
}
