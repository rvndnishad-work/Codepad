"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Cpu,
  Send,
  X,
  Activity,
  Terminal,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Paperclip,
  Eye,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import GemmaMark from "./copilot/GemmaMark";
import JarvisCore from "./copilot/JarvisCore";
import { speakNaturally, cancelSpeak } from "@/lib/copilot-tts";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface AttachedImage {
  mimeType: string;
  data: string; // Base64 data
  url: string;  // Data URL for preview thumbnail
}

const getCleanRouteDisplayName = (path: string): string => {
  if (path === "/admin") return "Main Dashboard";
  const segments = path.split("/").filter(s => s && s !== "admin");
  if (segments.length === 0) return "Main Dashboard";
  
  const isId = (seg: string) => {
    return (
      !isNaN(Number(seg)) || 
      seg.length > 15 || 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || 
      /^[0-9a-fA-F]{24}$/.test(seg) || 
      (seg.includes("-") && /\d/.test(seg))
    );
  };
  
  const validSegments = segments.filter(seg => !isId(seg));
  if (validSegments.length === 0) return "Main Dashboard";
  
  const lastSegment = validSegments[validSegments.length - 1];
  switch (lastSegment.toLowerCase()) {
    case "copilot": return "Copilot Command Center";
    case "inbox": return "Moderation Inbox";
    case "todos": return "Admin Backlog";
    case "users": return "User Directory";
    case "blogs": return "Blog Reviews";
    default: 
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/[-_]/g, " ");
  }
};

export default function FloatingJarvisAgent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { resolvedTheme } = useTheme();
  const isLightTheme = mounted && resolvedTheme === "light";
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  
  // Voice & Multimedia States
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isFirstMount = useRef(true);

  // Push-to-talk plumbing:
  //   • pushToTalkPendingRef — when true, the next final SpeechRecognition
  //     result will auto-submit instead of just populating the input. Set on
  //     keydown, cleared by onresult/onerror.
  //   • handleSendPromptRef — points to the latest handleSendPrompt closure
  //     so the SpeechRecognition handlers (bound once at mount) can call the
  //     current version without re-binding on every render.
  const pushToTalkPendingRef = useRef(false);
  const handleSendPromptRef = useRef<(text: string) => void>(() => {});

  // Initialize Speech Recognition on mount (Browser-native API)
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
          toast.success("Holographic dictation link active. Speak now...");
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (!transcript) return;

          // Snapshot the PTT flag — if this transcription was triggered by
          // holding the push-to-talk key, the final result should both
          // populate the input AND auto-fire send. We clear the flag here
          // so a subsequent click-to-dictate session doesn't accidentally
          // inherit it.
          const wasPushToTalk = pushToTalkPendingRef.current;
          pushToTalkPendingRef.current = false;

          setPromptInput(prev => {
            const base = prev.trim();
            const next = base ? `${base} ${transcript}` : transcript;
            if (wasPushToTalk) {
              // Defer the send so React commits the new promptInput first
              // (some downstream handlers read the input directly).
              setTimeout(() => handleSendPromptRef.current(next), 30);
            }
            return next;
          });
          toast.success(wasPushToTalk ? "Voice directive submitted." : "Voice transcribed successfully.");
        };

        rec.onerror = (err: any) => {
          console.error("Dictation failure:", err);
          setIsListening(false);
          // Clear the PTT flag on error too — otherwise the next legitimate
          // dictation session could spuriously auto-submit.
          pushToTalkPendingRef.current = false;
          toast.error("Speech recognition failed. Try speaking louder or check permissions.");
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  // 1. Initialize chat history on mount (restoring from sessionStorage if available)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Trigger voice pre-loading asynchronously on mount
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        const handleVoicesChanged = () => {
          window.speechSynthesis.getVoices();
        };
        window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      }

      const saved = sessionStorage.getItem("jarvis_chat_history");
      if (saved) {
        try {
          setChatHistory(JSON.parse(saved));
        } catch {
          const greeting = getContextualGreeting(pathname);
          setChatHistory([{ role: "assistant", text: greeting }]);
        }
      } else {
        const greeting = getContextualGreeting(pathname);
        setChatHistory([{ role: "assistant", text: greeting }]);
      }
    }
  }, []);

  // 2. Sync chat history changes to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && chatHistory.length > 0) {
      sessionStorage.setItem("jarvis_chat_history", JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // 3. Handle page navigations - preserve history, notify context change vocally & visually
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const displayName = getCleanRouteDisplayName(pathname);
    
    // Brief vocal alert for context shift
    const spokenGreet = `Scanners adjusted to the ${displayName} context.`;
    speakResponse(spokenGreet);

    // Append context shift alert to chat logs
    setChatHistory(prev => {
      // Prevent consecutive duplicate navigation logs
      const shiftText = `🔄 Context Shift: Navigated to ${displayName}. I am ready to audit this route context.`;
      if (prev.length > 0 && prev[prev.length - 1].text === shiftText) {
        return prev;
      }
      return [...prev, { role: "assistant", text: shiftText }];
    });
  }, [pathname]);

  // Fetch active alerts count for HUD notification badge.
  // Uses the cheap dedicated count endpoint so the badge poll doesn't burn
  // Gemma API calls every 30 seconds.
  useEffect(() => {
    let cancelled = false;
    async function fetchAlertsCount() {
      try {
        const res = await fetch("/api/admin/copilot/alerts-count", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (typeof data?.count === "number") {
          setAlertCount(data.count);
        }
      } catch {
        // Silent fallback — badge just won't update this tick.
      }
    }
    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 30000); // refresh every 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Scroll terminal to bottom
  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isTyping, isOpen]);

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

  const renderRobotFace = (state: "idle" | "listening" | "thinking" | "speaking", size: "sm" | "lg") => {
    const isSm = size === "sm";
    
    // Custom face styles based on system health (alertCount) adapting to theme when idle
    const isLight = isLightTheme;
    let screenBg = "";
    let glowShadow = "";
    let eyeColor = "";
    let eyeGlow = "";
    
    if (alertCount > 0) {
      // Alerts pending: soft warm amber/gold screen background (no hostile red)
      screenBg = isLight ? "bg-amber-50/75 border-amber-200/40" : "bg-amber-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(217,119,6,0.12),0_0_8px_rgba(217,119,6,0.08)] border-amber-200/35"
        : "shadow-[inset_0_0_15px_rgba(245,158,11,0.35),0_0_10px_rgba(245,158,11,0.25)] border-amber-500/25";
      eyeColor = isLight ? "#d97706" : "#fbbf24"; // saturated amber vs soft gold
      eyeGlow = isLight ? "url(#eye-glow-amber-light)" : "url(#eye-glow-amber)";
    } else {
      // Stable platform: soft green screen background
      screenBg = isLight ? "bg-emerald-50/70 border-emerald-200/40" : "bg-emerald-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(5,150,105,0.12),0_0_8px_rgba(5,150,105,0.08)] border-emerald-200/30"
        : "shadow-[inset_0_0_15px_rgba(16,185,129,0.35),0_0_10px_rgba(16,185,129,0.25)] border-emerald-500/25";
      eyeColor = isLight ? "#059669" : "#34d399"; // saturated green vs soft green
      eyeGlow = isLight ? "url(#eye-glow-green-light)" : "url(#eye-glow-green)";
    }
    
    if (state === "listening") {
      screenBg = isLight ? "bg-cyan-100/35 border-cyan-200/40" : "bg-cyan-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(8,145,178,0.15),0_0_8px_rgba(8,145,178,0.1)] border-cyan-300/40"
        : "shadow-[inset_0_0_15px_rgba(6,182,212,0.6),0_0_12px_rgba(6,182,212,0.4)] border-cyan-400/40";
      eyeColor = isLight ? "#0891b2" : "#22d3ee"; // saturated cyan vs electric cyan
      eyeGlow = isLight ? "url(#eye-glow-cyan-light)" : "url(#eye-glow-cyan)";
    } else if (state === "thinking") {
      screenBg = isLight ? "bg-amber-100/35 border-amber-200/40" : "bg-amber-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_0_8px_rgba(217,119,6,0.1)] border-amber-300/40"
        : "shadow-[inset_0_0_15px_rgba(245,158,11,0.6),0_0_12px_rgba(245,158,11,0.4)] border-amber-400/40";
      eyeColor = isLight ? "#d97706" : "#fbbf24"; // saturated orange vs warm amber
      eyeGlow = isLight ? "url(#eye-glow-amber-light)" : "url(#eye-glow-amber)";
    } else if (state === "speaking") {
      screenBg = isLight ? "bg-fuchsia-100/35 border-fuchsia-200/40" : "bg-fuchsia-950/25";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_15px_rgba(192,38,211,0.2),0_0_10px_rgba(192,38,211,0.15)] border-fuchsia-300/40 animate-pulse"
        : "shadow-[inset_0_0_18px_rgba(232,121,249,0.7),0_0_15px_rgba(232,121,249,0.5)] border-fuchsia-400/50 animate-pulse";
      eyeColor = isLight ? "#c026d3" : "#f472b6"; // saturated fuchsia vs bright pink
      eyeGlow = isLight ? "url(#eye-glow-fuchsia-light)" : "url(#eye-glow-fuchsia)";
    }

    // Dynamic eyes SVG elements
    const renderEyes = () => {
      switch (state) {
        case "listening":
          // Eyes turn into circular glowing discs pulsing to listen
          return (
            <>
              <circle cx="35" cy="40" r="7" fill={eyeColor} filter={eyeGlow} className="animate-[listening-eyes_1.5s_infinite_ease-in-out]" />
              <circle cx="65" cy="40" r="7" fill={eyeColor} filter={eyeGlow} className="animate-[listening-eyes_1.5s_infinite_ease-in-out_0.2s]" />
            </>
          );
        case "thinking":
          // Eyes turn into narrow horizontal loading bars bobbing up/down
          return (
            <>
              <rect x="27" y="38" width="16" height="4" rx="2" fill={eyeColor} filter={eyeGlow} className="animate-[thinking-eyes_1.2s_infinite_ease-in-out]" />
              <rect x="57" y="38" width="16" height="4" rx="2" fill={eyeColor} filter={eyeGlow} className="animate-[thinking-eyes_1.2s_infinite_ease-in-out_0.2s]" />
            </>
          );
        case "speaking":
          // Eyes turn into happy arches ^ ^
          return (
            <>
              {/* Left happy curve */}
              <path d="M 28 44 Q 35 34 42 44" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} />
              {/* Right happy curve */}
              <path d="M 58 44 Q 65 34 72 44" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} />
            </>
          );
        case "idle":
        default:
          // Standard pill-shaped capsules blinking every 4s
          return (
            <>
              <rect x="30" y="30" width="8" height="20" rx="4" fill={eyeColor} filter={eyeGlow} className="animate-[blinking-eyes_4s_infinite_linear]" style={{ transformOrigin: "34px 40px" }} />
              <rect x="62" y="30" width="8" height="20" rx="4" fill={eyeColor} filter={eyeGlow} className="animate-[blinking-eyes_4s_infinite_linear]" style={{ transformOrigin: "66px 40px" }} />
            </>
          );
      }
    };

    // Dynamic mouth SVG element
    const renderMouth = () => {
      switch (state) {
        case "listening":
          // Pulsing microphone waveform circle
          return (
            <circle cx="50" cy="68" r="4" fill={eyeColor} filter={eyeGlow} className="animate-[listening-mouth_1s_infinite_ease-in-out]" />
          );
        case "thinking":
          // Flat horizontal concentrated line
          return (
            <line x1="42" y1="68" x2="58" y2="68" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" filter={eyeGlow} />
          );
        case "speaking":
          // Dynamic scaling lip-sync mouth shape
          return (
            <path d="M 38 68 Q 50 82 62 68" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} className="animate-[speaking-mouth_0.25s_infinite_alternate_ease-in-out]" style={{ transformOrigin: "50px 72px" }} />
          );
        case "idle":
        default:
          // Curved happy curved smiling mouth
          return (
            <path d="M 36 64 Q 50 78 64 64" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} />
          );
      }
    };

    return (
      <div className={`relative rounded-[22%] border backdrop-blur-md overflow-hidden transition-all duration-500 flex items-center justify-center ${screenBg} ${glowShadow} ${
        isSm ? "w-full h-full" : "w-28 h-28"
      }`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            {/* Glow Filters for Neon SVG effect */}
            <filter id="eye-glow-purple" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-fuchsia" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-red" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Light Theme optimized tight halo/shadow filters */}
            <filter id="eye-glow-purple-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-cyan-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-amber-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-fuchsia-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-red-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-green-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Diagnostic screen raster scanlines overlay */}
          <g opacity={isLight ? 0.04 : 0.06}>
            <line x1="0" y1="10" x2="100" y2="10" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="20" x2="100" y2="20" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="30" x2="100" y2="30" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="40" x2="100" y2="40" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="60" x2="100" y2="60" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="70" x2="100" y2="70" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="80" x2="100" y2="80" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
            <line x1="0" y1="90" x2="100" y2="90" stroke={isLight ? "#4b5563" : "#fff"} strokeWidth="0.5" />
          </g>

          {renderEyes()}
          {renderMouth()}
        </svg>
      </div>
    );
  };

  // Text-To-Speech Synthesizer (Vocalizing Gemma responses)
  /**
   * Delegate to the shared TTS utility — that module handles cloud-TTS-first
   * with browser fallback, smart voice picking, sentence chunking, and the
   * markdown-stripping preprocessor. We just hook our local isSpeaking flag
   * up to its lifecycle callbacks.
   */
  const speakResponse = (text: string) => {
    if (isMuted || !text) return;
    void speakNaturally(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // Route context descriptions
  const getContextualGreeting = (path: string) => {
    const base = "Jarvis operations assistant online. Scanners active. Direct RAG console synced. ";
    if (path === "/admin") {
      return base + "I am ready to run real-time audits on dashboard telemetry. Type a directive, click Scan Screen, or upload a screenshot.";
    }
    if (path.startsWith("/admin/inbox")) {
      return base + "I have detected the Moderation Inbox environment. I can scan for stalled interview sessions or pending blog reviews from this scope.";
    }
    if (path.startsWith("/admin/todos")) {
      return base + "I have detected the Admin Todos environment. I can prioritize your current backlog or draft new tickets with clear acceptance criteria.";
    }
    if (path.startsWith("/admin/users")) {
      return base + "I have detected the User Management environment. I can list recent signups, calculate activity scores, or flag anomalous proctoring attempts.";
    }
    if (path.startsWith("/admin/blogs")) {
      return base + "I have detected the Blog Moderation environment. I can run compliance reports against affiliate link rules for active drafts.";
    }
    return base + "How may I assist you with platform telemetry controls today?";
  };

  // Get contextual presets
  const getContextualPresets = (path: string) => {
    const defaultPresets = [
      { label: "🔍 Telemetry Scan", prompt: "Run an operational database audit. Summarize recent proctoring anomalies, stalled sessions, and pending moderations." },
      { label: "📋 Prioritize Backlog", prompt: "Review unresolved Admin Todos. Recommend a priority checklist for internal operations." }
    ];
    if (path.startsWith("/admin/inbox")) {
      return [
        { label: "⏳ Stalled Sessions", prompt: "List details of all active interview sessions that are stuck in-progress for more than 6 hours." },
        { label: "📝 Blog Reviews", prompt: "Scan the pending blog moderation queue. Summarize if any violate promotional guidelines." }
      ];
    }
    if (path.startsWith("/admin/todos")) {
      return [
        { label: "⚡ High-Priority Tickets", prompt: "Show all high-priority unresolved Admin Todos. Suggest action items to resolve them." },
        { label: "📋 Backlog Audit", prompt: "Query all active todo rows and categorize them by progress columns." }
      ];
    }
    if (path.startsWith("/admin/users")) {
      return [
        { label: "📊 Anomalous Attempts", prompt: "Scan attempts table for candidate scores exceeding 60% suspicion. Show details." },
        { label: "👤 New Member Cohort", prompt: "Show a summary table of the 5 most recent signups and their roles." }
      ];
    }
    return defaultPresets;
  };

  // Toggle voice dictation microphone
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Native voice recognition is not supported in this browser shell. Try using Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Scrape Page Context from the current DOM
  const handleScanPage = () => {
    if (typeof document === "undefined") return;

    // Grab the main text from content container
    const contentElement = document.querySelector("main") || document.body;
    
    // Scrape all visible innerText, filter whitespace
    const rawText = contentElement.innerText || "";
    const cleanText = rawText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2500); // Truncate safely to fit RAG LLM context window

    toast.success("Holographic screen data scraped and mapped.");
    setPromptInput(`[SCANNED SCREEN CONTENT: "${cleanText}"] Review the content on this active screen and suggest operational feedback or anomalies.`);
  };

  // Handle Vision/Image attachment
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file format. Please attach an image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(",")[1];
      
      setAttachedImage({
        mimeType: file.type,
        data: base64Data,
        url: dataUrl
      });
      toast.success("Multimodal image telemetry attached.");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Keep the ref pointing at the latest handleSendPrompt closure so the
  // SpeechRecognition handler (bound once on mount, line ~108) can invoke
  // the current version without us needing to re-bind onresult every render.
  useEffect(() => {
    handleSendPromptRef.current = (text: string) => {
      void handleSendPrompt(text);
    };
  });

  // Push-to-talk: hold ` (backtick) anywhere on the page to dictate, release
  // to submit. Skipped when focus is in an editable element so a user typing
  // a stray ` doesn't hijack the keystroke. Opens the floating HUD if closed.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const PTT_CODE = "Backquote";
    let pttPressed = false;

    const isEditableTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== PTT_CODE) return;
      if (e.repeat) return; // auto-repeat while held — only react to initial press
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (isEditableTarget(document.activeElement)) return;
      if (!recognitionRef.current) return;

      e.preventDefault();
      pttPressed = true;
      pushToTalkPendingRef.current = true;
      setIsOpen(true);
      try {
        recognitionRef.current.start();
      } catch {
        // SpeechRecognition throws if start() is called while already running.
        // Safe to ignore — the existing session continues.
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== PTT_CODE || !pttPressed) return;
      pttPressed = false;
      e.preventDefault();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };

    // Reset PTT state if focus leaves the window while held (otherwise the
    // keyup would never fire and the next ` press wouldn't behave right).
    const onBlur = () => {
      if (pttPressed) {
        pttPressed = false;
        pushToTalkPendingRef.current = false;
        try {
          recognitionRef.current?.stop();
        } catch { /* ignore */ }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const handleSendPrompt = async (text: string) => {
    const promptToSend = text.trim();
    if (!promptToSend) return;

    setPromptInput("");
    setChatHistory(prev => [...prev, { role: "user", text: promptToSend }]);
    setIsTyping(true);

    const imageToSend = attachedImage ? {
      mimeType: attachedImage.mimeType,
      data: attachedImage.data
    } : null;

    setAttachedImage(null);

    // Formulate a contextual prompt representing the current route scope
    const contextualPrompt = `[Current Context Route: "${pathname}"] ${promptToSend}`;

    try {
      const res = await fetch("/api/admin/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: contextualPrompt, 
          history: chatHistory,
          image: imageToSend
        })
      });

      if (!res.ok) throw new Error("API rejection");
      const data = await res.json();
      
      if (data.error) {
        const errorMsg = `⚠️ Telemetry Error: ${data.error}`;
        setChatHistory(prev => [...prev, { role: "assistant", text: errorMsg }]);
        speakResponse(errorMsg);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", text: data.text }]);
        speakResponse(data.text);
      }
    } catch {
      const failMsg = "❌ Telemetry link failure. Verify Gemini server keys.";
      setChatHistory(prev => [...prev, { role: "assistant", text: failMsg }]);
      speakResponse(failMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const getJarvisState = () => {
    if (isListening) return "listening";
    if (isTyping) return "thinking";
    if (isSpeaking) return "speaking";
    return "idle";
  };
  const activeState = getJarvisState();

  return (
    <>
      {/* Floating Holographic Orb Button (Fixed bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        
        {/* Glowing ambient aura — soft halo only, no rocket exhaust. */}
        <div className={`absolute inset-0 rounded-full blur-2xl scale-110 animate-pulse pointer-events-none ${
          isLightTheme ? "opacity-30 bg-violet-400" : "opacity-50 bg-violet-600"
        }`} />

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-[52px] h-[52px] rounded-[28%] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 group animate-[jarvis-float_3.5s_infinite_ease-in-out] ${
            isLightTheme 
              ? "bg-gradient-to-br from-[#fafafa] via-[#f5f3ff] to-[#e9e3ff] border border-violet-300/40 hover:border-violet-400 shadow-[inset_1.5px_1.5px_0px_rgba(255,255,255,0.9),inset_-1.5px_-1.5px_0px_rgba(0,0,0,0.08),0_10px_20px_rgba(109,40,217,0.12),0_0_10px_rgba(139,92,246,0.1)]"
              : "bg-gradient-to-br from-[#2f1f45] via-[#1c0f32] to-[#0b0318] border border-violet-500/25 hover:border-violet-400/60 shadow-[inset_1.5px_1.5px_0px_rgba(255,255,255,0.08),inset_-1.5px_-1.5px_0px_rgba(0,0,0,0.7),0_10px_25px_rgba(0,0,0,0.65),0_0_15px_rgba(139,92,246,0.2)]"
          }`}
        >
          {/* Beveled metallic screen rim wrapper */}
          <div className={`w-[82%] h-[82%] rounded-[24%] flex items-center justify-center overflow-hidden border ${
            isLightTheme
              ? "border-violet-200 bg-[#fbfbfe] shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)]"
              : "border-black/45 bg-[#070111] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.05)]"
          }`}>
            {/* AI core visualizer (replaces the old smiley face). */}
            <JarvisCore
              state={activeState}
              severity={alertCount > 0 ? "alert" : "stable"}
              variant="sm"
              isLight={isLightTheme}
            />
          </div>
        </button>

        {/* Subtle unresolved-alerts indicator — a small breathing violet dot
            tucked just outside the rim. No count text, no red. Stays quiet
            but lets you sense outstanding work without an iOS-style badge. */}
        {alertCount > 0 && (
          <span
            className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse pointer-events-none"
            title={`${alertCount} unresolved alert${alertCount === 1 ? "" : "s"}`}
          />
        )}
      </div>

      {/* Holographic Floating Companion HUD Console */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] h-[480px] border border-violet-500/25 rounded-2xl overflow-hidden bg-gradient-to-b from-panel/90 via-bg/95 to-panel/75 backdrop-blur-xl shadow-2xl z-50 flex flex-col justify-between animate-[jarvis-mount_0.3s_ease-out]">
          
          {/* Global custom keyframe for mount animation */}
          <style jsx>{`
            @keyframes jarvis-mount {
              from { opacity: 0; transform: translateY(15px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes jarvis-float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-7px); }
            }
            @keyframes thruster-exhaust {
              0% { height: 10px; opacity: 0.65; transform: translateX(-50%) scaleX(0.7); }
              100% { height: 16px; opacity: 0.9; transform: translateX(-50%) scaleX(0.85); }
            }
            @keyframes thruster-exhaust-inner {
              0% { height: 12px; opacity: 0.7; transform: translateX(-50%) scaleX(0.5); }
              100% { height: 20px; opacity: 1; transform: translateX(-50%) scaleX(0.65); }
            }
            @keyframes blinking-eyes {
              0%, 96%, 100% { transform: scaleY(1); }
              98% { transform: scaleY(0.08); }
            }
            @keyframes listening-eyes {
              0%, 100% { r: 6.5; opacity: 0.85; filter: drop-shadow(0 0 2px rgba(6,182,212,0.4)); }
              50% { r: 8.5; opacity: 1; filter: drop-shadow(0 0 8px rgba(6,182,212,0.9)); }
            }
            @keyframes listening-mouth {
              0%, 100% { r: 3.5; opacity: 0.8; }
              50% { r: 6.5; opacity: 1; filter: drop-shadow(0 0 6px rgba(6,182,212,0.8)); }
            }
            @keyframes thinking-eyes {
              0%, 100% { transform: translateY(0); opacity: 0.8; }
              50% { transform: translateY(-3px); opacity: 1; }
            }
            @keyframes speaking-mouth {
              0% { transform: scaleY(0.6); opacity: 0.8; }
              100% { transform: scaleY(1.4); opacity: 1; filter: drop-shadow(0 0 4px rgba(232,121,249,0.8)); }
            }
            @keyframes inner-alert-pulse {
              0% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 2px rgba(239, 68, 68, 0.15), inset 0 1.5px 3px rgba(239, 68, 68, 0.1); }
              100% { border-color: rgba(239, 68, 68, 0.95); box-shadow: 0 0 8px rgba(239, 68, 68, 0.55), inset 0 1.5px 3px rgba(239, 68, 68, 0.25); }
            }
          `}</style>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {/* Telemetry line beam scanner */}
          {isTyping && (
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400 to-transparent z-10 top-0 animate-[jarvis-scan_2.5s_infinite_linear]" style={{
              animation: "jarvis-scan 2.5s infinite linear"
            }} />
          )}

          {/* HUD Header */}
          <div className="px-4 py-3 border-b border-border bg-panel/40 flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-violet-400 uppercase tracking-widest">
              <GemmaMark size={14} state={isTyping ? "thinking" : "idle"} />
              Jarvis Companion
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mute/Unmute Vocal Synthesizer Button */}
              <button
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted) {
                    cancelSpeak();
                    setIsSpeaking(false);
                    toast.success("Vocal synthesizers muted.");
                  } else {
                    toast.success("Vocal synthesizers unmuted.");
                  }
                }}
                className="w-6 h-6 rounded bg-panel border border-border flex items-center justify-center text-muted hover:text-violet-400 transition"
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/25 text-violet-400 uppercase">
                {pathname.split("/").pop() || "CORE"}
              </span>
            </div>
          </div>

          {/* Active Context presets */}
          <div className="p-2.5 border-b border-border bg-panel/10 flex flex-wrap gap-1.5 relative z-10">
            {getContextualPresets(pathname).map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(preset.prompt)}
                disabled={isTyping}
                className="text-[8px] font-mono font-bold px-2 py-0.5 rounded bg-panel/50 border border-violet-500/10 hover:border-violet-500/40 text-muted hover:text-fg transition disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}

            {/* Read-Only Screen Context Scraper trigger */}
            <button
              onClick={handleScanPage}
              disabled={isTyping}
              className="text-[8px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/35 hover:border-violet-500/60 text-violet-400 hover:text-fg transition flex items-center gap-1"
              title="Ground Jarvis in the active page DOM content"
            >
              <Eye className="w-3 h-3" />
              Scan Screen
            </button>
          </div>

          {/* Messages Readout Display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px] text-muted custom-scrollbar relative z-10">
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-[8px] text-muted/40 uppercase">
                  {msg.role === "user" ? "► directive" : "◀ jarvis"}
                </span>
                <div 
                  className={`p-2.5 rounded-xl border leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? isLightTheme
                        ? "bg-violet-50/70 border-violet-200 text-violet-900"
                        : "bg-violet-500/10 border-violet-500/20 text-violet-300"
                      : "bg-panel/40 border-border/80 text-fg"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1 text-violet-400 animate-pulse mt-2 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="text-[9px] font-mono ml-1">querying contextual RAG...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Vision/Image Attachment Preview Area */}
          {attachedImage && (
            <div className="px-4 py-2 border-t border-border bg-panel/30 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded border border-border overflow-hidden bg-bg relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachedImage.url} alt="Attached telemetry" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black uppercase text-violet-400">Attached Telemetry</div>
                <div className="text-[9px] text-muted truncate">Screenshot ready for analysis</div>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-1 hover:bg-panel border border-transparent hover:border-border rounded-lg text-red-400 hover:text-red-300 transition"
                title="Clear attachment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Push-to-talk hint — sits just above the input so users discover
              the hotkey naturally. Disappears while actively listening to keep
              the UI quiet when the bar is the active surface. */}
          {!isListening && (
            <div className="px-3 pt-2 pb-1 text-[9px] font-mono text-muted/60 flex items-center gap-1.5 select-none">
              <span className="opacity-70">Hold</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-panel/60 text-violet-400 text-[10px] leading-none">`</kbd>
              <span className="opacity-70">to push-to-talk</span>
            </div>
          )}

          {/* Holographic terminal prompt input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendPrompt(promptInput); }}
            className="p-3 border-t border-border bg-panel/20 flex gap-2 items-center relative z-10"
          >
            {/* Hidden Multimodal File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* Voice Dictation (Mic) Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isTyping}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition shrink-0 ${
                isListening 
                  ? "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
                  : "bg-panel border-border text-muted hover:text-violet-400 hover:border-violet-500/30"
              }`}
              title={isListening ? "Listening..." : "Vocalize Prompt Directive"}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
              className="w-8 h-8 rounded-lg bg-panel border border-border flex items-center justify-center text-muted hover:text-violet-400 hover:border-violet-500/30 transition shrink-0"
              title="Attach Telemetry Screenshot"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              disabled={isTyping}
              className={`flex-1 bg-bg border border-border focus:border-violet-500 outline-none rounded-xl px-3 py-1.5 text-[11px] font-mono placeholder:text-violet-500/40 disabled:opacity-50 ${
                isLightTheme ? "text-violet-900" : "text-violet-300"
              }`}
              placeholder={isListening ? "LISTENING DIRECTIVE..." : "COMMAND DIR >_ "}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
            />
            
            <button
              type="submit"
              disabled={isTyping || (!promptInput.trim() && !attachedImage)}
              className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center text-bg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Futuristic diagnostic coordinates footer */}
          <div className="px-3.5 py-1.5 border-t border-border bg-panel/30 flex items-center justify-between font-mono text-[7px] text-muted/30 relative z-10">
            <span>SECURE_RAG_HUD</span>
            <span>TLS_ACTIVE</span>
          </div>

        </div>
      )}
    </>
  );
}
