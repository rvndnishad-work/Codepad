"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import {
  Sparkles,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Terminal,
  Send,
  Shield,
  RefreshCw,
  AlertTriangle,
  Ban,
  Archive,
  Check,
  X,
  ClipboardList,
  FileText,
  Cpu,
  History,
  Info,
  Maximize2,
  Eye,
  ExternalLink,
  Loader2,
  UserCheck,
  Star,
  StarOff,
  MessageSquareX,
  Send as SendIcon,
  EyeOff,
  ArrowRight,
  Layers,
} from "lucide-react";
import {
  banUserAction,
  unbanUserAction,
  archiveSessionAction,
  bulkArchiveStalledSessionsAction,
  approveBlogPostAction,
  rejectBlogPostAction,
  featureBlogPostAction,
  unfeatureBlogPostAction,
  deleteCommentAction,
  publishChallengeAction,
  unpublishChallengeAction,
  setTodoStatusAction,
  dismissAlertAction,
  createTodoFromAlertAction,
} from "./actions";
import GemmaMark from "./GemmaMark";
import JarvisCore from "./JarvisCore";
import { toast } from "sonner";

/**
 * Union of every HITL action Gemma can propose. Keep this in sync with
 * PROPOSABLE_ACTION_TYPES in src/app/api/admin/copilot/route.ts — the route
 * validates against the same list before writing a GemmaAlert.
 */
type ProposedActionType =
  | "BAN_USER"
  | "UNBAN_USER"
  | "ARCHIVE_SESSION"
  | "BULK_ARCHIVE_SESSIONS"
  | "MODERATE_BLOG"
  | "FEATURE_BLOG"
  | "UNFEATURE_BLOG"
  | "DELETE_COMMENT"
  | "PUBLISH_CHALLENGE"
  | "UNPUBLISH_CHALLENGE"
  | "UPDATE_TODO_STATUS"
  | "CREATE_TODO";

interface ProposedAction {
  actionType: ProposedActionType;
  targetId: string;
  meta?: Record<string, any>;
}

interface AlertItem {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  proposedAction: ProposedAction | null;
  targetId: string | null;
  createdAt: string;
}

interface Telemetry {
  totalUsers: number;
  bannedUsers: number;
  stalledSessionsCount: number;
  suspiciousAttemptsCount: number;
  pendingBlogsCount: number;
  healthyRate: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

/**
 * Per-request model toggle. Default is Gemma (free) — admins can flip to
 * Gemini Flash if Gemma is rate-limited or struggling on a particular query.
 * The route validates against an allowlist; anything not in this list will
 * be rejected server-side and silently fall back to the env default.
 */
type CopilotModel = "gemma-3-27b-it" | "gemini-2.5-flash";
const MODEL_OPTIONS: { id: CopilotModel; label: string; tier: string }[] = [
  { id: "gemma-3-27b-it", label: "Gemma 3 27B", tier: "free" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "credit" },
];

const COMMAND_PRESETS = [
  { label: "🔍 Audit Health", prompt: "Run an operational database audit. Summarize recent proctoring anomalies, stalled sessions, and pending moderations." },
  { label: "⏳ Stalled Sessions", prompt: "Query stalled interview sessions. Show details of candidates stuck in-progress for more than 6 hours." },
  { label: "📝 Blog Review", prompt: "Scan the pending blog moderation queue. Check if any posts violate our guidelines or contain suspicious links." },
  { label: "📋 Backlog Priority", prompt: "Review unresolved Admin Todos. Recommend a priority checklist for internal operations." }
];

export default function GemmaConsole({
  initialAlerts,
  telemetry
}: {
  initialAlerts: AlertItem[];
  telemetry: Telemetry;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { resolvedTheme } = useTheme();
  const isLightTheme = mounted && resolvedTheme === "light";
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "assistant", text: "Gemma Operational Copilot active. Direct read-only database RAG console ready. Ask me to query system telemetry, audit suspicious activity, or compile backlog plans." }
  ]);
  const [promptInput, setPromptInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [blogFeedbackInput, setBlogFeedbackInput] = useState<Record<string, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Model toggle — defaults to Gemma (free) per the dev-version directive.
  const [activeModel, setActiveModel] = useState<CopilotModel>("gemma-3-27b-it");

  // Blog comparison modal: when set, opens a side-by-side view of the post
  // content vs. the Gemma compliance audit. Keyed by alert id so the active
  // alert stays in sync with the modal.
  const [compareAlertId, setCompareAlertId] = useState<string | null>(null);

  // Reference for scrolling history log
  const historyEndRef = useRef<HTMLDivElement>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);

  // Poll window.speechSynthesis to synchronize visual mouth movement in real-time
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const checkSpeaking = () => {
      setIsSpeaking(window.speechSynthesis.speaking);
    };
    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  const renderRobotFace = (state: "idle" | "listening" | "thinking" | "speaking", size: "sm" | "lg") => {
    const isSm = size === "sm";
    
    // Custom face styles based on system health (alerts.length) adapting to theme when idle
    const isLight = isLightTheme;
    let screenBg = "";
    let glowShadow = "";
    let eyeColor = "";
    let eyeGlow = "";
    
    if (alerts.length > 0) {
      // Alerts pending: soft warm amber/gold screen background (no hostile red)
      screenBg = isLight ? "bg-amber-50/75 border-amber-200/40" : "bg-amber-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(217,119,6,0.12),0_0_8px_rgba(217,119,6,0.08)] border-amber-200/35"
        : "shadow-[inset_0_0_15px_rgba(245,158,11,0.35),0_0_10px_rgba(245,158,11,0.25)] border-amber-500/25";
      eyeColor = isLight ? "#d97706" : "#fbbf24"; // saturated amber vs soft gold
      eyeGlow = isLight ? "url(#eye-glow-amber-console-light)" : "url(#eye-glow-amber-console)";
    } else {
      // Stable platform: soft green screen background
      screenBg = isLight ? "bg-emerald-50/70 border-emerald-200/40" : "bg-emerald-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(5,150,105,0.12),0_0_8px_rgba(5,150,105,0.08)] border-emerald-200/30"
        : "shadow-[inset_0_0_15px_rgba(16,185,129,0.35),0_0_10px_rgba(16,185,129,0.25)] border-emerald-500/25";
      eyeColor = isLight ? "#059669" : "#34d399"; // saturated green vs soft green
      eyeGlow = isLight ? "url(#eye-glow-green-console-light)" : "url(#eye-glow-green-console)";
    }
    
    if (state === "listening") {
      screenBg = isLight ? "bg-cyan-100/35 border-cyan-200/40" : "bg-cyan-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(8,145,178,0.15),0_0_8px_rgba(8,145,178,0.1)] border-cyan-300/40"
        : "shadow-[inset_0_0_15px_rgba(6,182,212,0.6),0_0_12px_rgba(6,182,212,0.4)] border-cyan-400/40";
      eyeColor = isLight ? "#0891b2" : "#22d3ee"; // saturated cyan vs electric cyan
      eyeGlow = isLight ? "url(#eye-glow-cyan-console-light)" : "url(#eye-glow-cyan-console)";
    } else if (state === "thinking") {
      screenBg = isLight ? "bg-amber-100/35 border-amber-200/40" : "bg-amber-950/20";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_0_8px_rgba(217,119,6,0.1)] border-amber-300/40"
        : "shadow-[inset_0_0_15px_rgba(245,158,11,0.6),0_0_12px_rgba(245,158,11,0.4)] border-amber-400/40";
      eyeColor = isLight ? "#d97706" : "#fbbf24"; // saturated orange vs warm amber
      eyeGlow = isLight ? "url(#eye-glow-amber-console-light)" : "url(#eye-glow-amber-console)";
    } else if (state === "speaking") {
      screenBg = isLight ? "bg-fuchsia-100/35 border-fuchsia-200/40" : "bg-fuchsia-950/25";
      glowShadow = isLight 
        ? "shadow-[inset_0_0_15px_rgba(192,38,211,0.2),0_0_10px_rgba(192,38,211,0.15)] border-fuchsia-300/40 animate-pulse"
        : "shadow-[inset_0_0_18px_rgba(232,121,249,0.7),0_0_15px_rgba(232,121,249,0.5)] border-fuchsia-400/50 animate-pulse";
      eyeColor = isLight ? "#c026d3" : "#f472b6"; // saturated fuchsia vs bright pink
      eyeGlow = isLight ? "url(#eye-glow-fuchsia-console-light)" : "url(#eye-glow-fuchsia-console)";
    }

    // Dynamic eyes SVG elements
    const renderEyes = () => {
      switch (state) {
        case "listening":
          return (
            <>
              <circle cx="35" cy="40" r="7" fill={eyeColor} filter={eyeGlow} className="animate-[listening-eyes_1.5s_infinite_ease-in-out]" />
              <circle cx="65" cy="40" r="7" fill={eyeColor} filter={eyeGlow} className="animate-[listening-eyes_1.5s_infinite_ease-in-out_0.2s]" />
            </>
          );
        case "thinking":
          return (
            <>
              <rect x="27" y="38" width="16" height="4" rx="2" fill={eyeColor} filter={eyeGlow} className="animate-[thinking-eyes_1.2s_infinite_ease-in-out]" />
              <rect x="57" y="38" width="16" height="4" rx="2" fill={eyeColor} filter={eyeGlow} className="animate-[thinking-eyes_1.2s_infinite_ease-in-out_0.2s]" />
            </>
          );
        case "speaking":
          return (
            <>
              <path d="M 28 44 Q 35 34 42 44" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} />
              <path d="M 58 44 Q 65 34 72 44" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} />
            </>
          );
        case "idle":
        default:
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
          return (
            <circle cx="50" cy="68" r="4" fill={eyeColor} filter={eyeGlow} className="animate-[listening-mouth_1s_infinite_ease-in-out]" />
          );
        case "thinking":
          return (
            <line x1="42" y1="68" x2="58" y2="68" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" filter={eyeGlow} />
          );
        case "speaking":
          return (
            <path d="M 38 68 Q 50 82 62 68" fill="none" stroke={eyeColor} strokeWidth="4.5" strokeLinecap="round" filter={eyeGlow} className="animate-[speaking-mouth_0.25s_infinite_alternate_ease-in-out]" style={{ transformOrigin: "50px 72px" }} />
          );
        case "idle":
        default:
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
            <filter id="eye-glow-purple-console" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-cyan-console" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-amber-console" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-fuchsia-console" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-red-console" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-green-console" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Light Theme optimized tight halo/shadow filters */}
            <filter id="eye-glow-purple-console-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-cyan-console-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-amber-console-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-fuchsia-console-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-red-console-light" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eye-glow-green-console-light" x="-20%" y="-20%" width="140%" height="140%">
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

  useEffect(() => {
    if (showHistoryDrawer) {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [showHistoryDrawer, chatHistory]);

  const activeAssistantMessage = [...chatHistory].reverse().find(m => m.role === "assistant")?.text || "";

  // Execute an operations prompt via backend
  const handleSendPrompt = async (text: string) => {
    const promptToSend = text.trim();
    if (!promptToSend) return;

    setPromptInput("");
    setChatHistory(prev => [...prev, { role: "user", text: promptToSend }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/admin/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToSend, history: chatHistory, model: activeModel })
      });

      if (!res.ok) throw new Error("API route rejected prompt");
      const data = await res.json();
      
      if (data.error) {
        setChatHistory(prev => [...prev, { role: "assistant", text: `⚠️ Telemetry Error: ${data.error}` }]);
        toast.error("Telemetry query failed.");
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", text: data.text }]);
        toast.success("Cognitive RAG update received.");
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: "assistant", text: `❌ Network connection failed. Verify SQLite status and key configurations.` }]);
      toast.error("Network connection failed.");
    } finally {
      setIsTyping(false);
    }
  };

  // Perform operational Intervention approval.
  // Each proposedAction.actionType routes to the matching server action.
  // Keep the switch exhaustive — TypeScript will warn if a new type is added
  // to ProposedActionType without a corresponding handler here.
  const handleApproveAction = async (alert: AlertItem) => {
    if (!alert.proposedAction) return;
    setActionInProgress(alert.id);
    const { actionType, targetId, meta } = alert.proposedAction;

    try {
      let success = false;
      let toastMsg = "Intervention applied.";

      switch (actionType) {
        case "BAN_USER":
          await banUserAction(targetId, alert.id);
          toastMsg = "User banned.";
          success = true;
          break;
        case "UNBAN_USER":
          await unbanUserAction(targetId, alert.id);
          toastMsg = "Ban lifted.";
          success = true;
          break;
        case "ARCHIVE_SESSION":
          await archiveSessionAction(targetId, alert.id);
          toastMsg = "Session marked abandoned.";
          success = true;
          break;
        case "BULK_ARCHIVE_SESSIONS": {
          const res = await bulkArchiveStalledSessionsAction(alert.id);
          toastMsg = `Bulk-archived ${res.archived ?? 0} stalled session(s).`;
          success = true;
          break;
        }
        case "MODERATE_BLOG":
          await approveBlogPostAction(targetId, alert.id);
          toastMsg = "Blog post approved and published.";
          success = true;
          break;
        case "FEATURE_BLOG":
          await featureBlogPostAction(targetId, alert.id);
          toastMsg = "Blog post featured.";
          success = true;
          break;
        case "UNFEATURE_BLOG":
          await unfeatureBlogPostAction(targetId, alert.id);
          toastMsg = "Featured flag removed.";
          success = true;
          break;
        case "DELETE_COMMENT":
          await deleteCommentAction(targetId, alert.id);
          toastMsg = "Comment deleted.";
          success = true;
          break;
        case "PUBLISH_CHALLENGE":
          await publishChallengeAction(targetId, alert.id);
          toastMsg = "Challenge published.";
          success = true;
          break;
        case "UNPUBLISH_CHALLENGE":
          await unpublishChallengeAction(targetId, alert.id);
          toastMsg = "Challenge taken offline.";
          success = true;
          break;
        case "UPDATE_TODO_STATUS": {
          const newStatus = (meta?.newStatus as string) || "TODO";
          await setTodoStatusAction(targetId, newStatus, alert.id);
          toastMsg = `Todo moved to ${newStatus}.`;
          success = true;
          break;
        }
        case "CREATE_TODO": {
          const m = meta || {};
          await createTodoFromAlertAction(
            m.title || alert.title,
            m.body || alert.body,
            m.priority || "HIGH",
            m.category || "AI Alert",
            alert.id
          );
          toastMsg = "Created ticket in Admin Todos.";
          success = true;
          break;
        }
        default: {
          // Exhaustiveness guard: if a new ProposedActionType is added but
          // unmapped here, TS will surface it on this assertion.
          const _exhaustive: never = actionType;
          toast.error(`Unknown action type: ${_exhaustive}`);
        }
      }

      if (success) {
        toast.success(`Intervention successful: ${toastMsg}`);
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      }
    } catch (err: any) {
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject blog post with custom feedback notes
  const handleRejectBlog = async (alert: AlertItem) => {
    if (!alert.proposedAction || alert.proposedAction.actionType !== "MODERATE_BLOG") return;
    setActionInProgress(alert.id);
    const targetId = alert.proposedAction.targetId;
    const notes = blogFeedbackInput[alert.id] || "Formatting/policy guidelines violation. Please review promotional links rule.";

    try {
      await rejectBlogPostAction(targetId, alert.id, notes);
      toast.success(`Feedback dispatched to author. Blog post flagged.`);
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      setShowRejectForm(null);
    } catch (err: any) {
      toast.error(`Reject failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Dismiss/mute alert in the feed
  const handleDismissAlert = async (alertId: string) => {
    setActionInProgress(alertId);
    try {
      await dismissAlertAction(alertId);
      toast.success("Alert muted and cleared.");
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err: any) {
      toast.error(`Mute failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Severity style mappings
  const severityColors = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "border-red-500/30 bg-red-500/[0.03] hover:border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.02)]";
      case "HIGH": return "border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.02)]";
      case "MEDIUM": return "border-violet-500/30 bg-violet-500/[0.03] hover:border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.02)]";
      default: return "border-border bg-panel/20 hover:border-border-strong";
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-500/10 border-red-500/35 text-red-400";
      case "HIGH": return "bg-amber-500/10 border-amber-500/35 text-amber-400";
      case "MEDIUM": return "bg-violet-500/10 border-violet-500/35 text-violet-400";
      default: return "bg-panel border-border text-muted";
    }
  };

  const getConsoleState = () => {
    if (isTyping) return "thinking";
    if (isSpeaking) return "speaking";
    return "idle";
  };
  const consoleState = getConsoleState();

  return (
    <div className="space-y-8">
      {/* Custom Styles Injection for Jarvis Core Holographic Keyframes */}
      <style jsx global>{`
        @keyframes jarvis-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jarvis-spin-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes jarvis-core-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; filter: drop-shadow(0 0 15px rgba(139,92,246,0.5)); }
          50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 35px rgba(139,92,246,0.85)); }
        }
        @keyframes jarvis-core-pulse-active {
          0%, 100% { transform: scale(1); opacity: 0.9; filter: drop-shadow(0 0 20px rgba(245,158,11,0.6)); }
          50% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 45px rgba(245,158,11,0.95)); }
        }
        @keyframes sound-wave-active {
          0%, 100% { height: 6px; }
          50% { height: 28px; }
        }
        @keyframes jarvis-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
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
        .jarvis-cw { animation: jarvis-spin-cw 15s linear infinite; }
        .jarvis-ccw { animation: jarvis-spin-ccw 10s linear infinite; }
        .jarvis-pulse { animation: jarvis-core-pulse 3s ease-in-out infinite; }
        .jarvis-pulse-active { animation: jarvis-core-pulse-active 1.2s ease-in-out infinite; }
        .wave-bar {
          width: 4px;
          border-radius: 4px;
          transition: height 0.15s ease;
        }
      `}</style>

      {/* Dynamic Glassmorphic Alert Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/[0.08] via-panel/30 to-panel/20 backdrop-blur-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          {/* Brand glyph — reacts to copilot state. Idle drifts, thinking spins, speaking pulses. */}
          <GemmaMark size={52} state={consoleState === "thinking" ? "thinking" : consoleState === "speaking" ? "speaking" : "idle"} />
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-400">Autonomous Operations active</div>
            <h2 className="text-xl font-black tracking-tight text-fg mt-0.5">Gemma Autonomous Command Room</h2>
            <p className="text-xs text-muted mt-0.5">Real-time database querying, telemetry anomaly detection, and HITL execution.</p>
          </div>
        </div>
        
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 text-[10px] font-black uppercase tracking-wider shrink-0 relative z-10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Platform Fully Stable
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/35 text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0 relative z-10">
            <AlertTriangle className="w-3.5 h-3.5" />
            {alerts.length} Intervention Proposals
          </div>
        )}
      </div>

      {/* Telemetry Indicator Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* System Health */}
        <div className="rounded-xl border border-border bg-panel/30 backdrop-blur-sm p-4 relative group hover:border-violet-500/25 transition duration-300">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Health Telemetry</span>
            <Activity className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-fg">{telemetry.healthyRate}%</div>
          <div className="text-[10px] text-muted mt-1">active sessions optimal</div>
        </div>

        {/* Proctoring Anomalies */}
        <div className="rounded-xl border border-border bg-panel/30 backdrop-blur-sm p-4 relative group hover:border-red-500/25 transition duration-300">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Proctoring Flags</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-fg">{telemetry.suspiciousAttemptsCount}</div>
          <div className="text-[10px] text-muted mt-1">integrity violations (score &gt;= 60)</div>
        </div>

        {/* Content Reviews */}
        <div className="rounded-xl border border-border bg-panel/30 backdrop-blur-sm p-4 relative group hover:border-amber-500/25 transition duration-300">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Blogs</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-fg">{telemetry.pendingBlogsCount}</div>
          <div className="text-[10px] text-muted mt-1">submissions awaiting review</div>
        </div>

        {/* Stalled Sessions */}
        <div className="rounded-xl border border-border bg-panel/30 backdrop-blur-sm p-4 relative group hover:border-blue-500/25 transition duration-300">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stalled Sessions</span>
            <Archive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-fg">{telemetry.stalledSessionsCount}</div>
          <div className="text-[10px] text-muted mt-1">sessions stuck &gt; 6 hours</div>
        </div>

      </div>

      {/* Main Splits layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: HITL Operations Proposals Center */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Shield className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-fg">Intervention Control Center</h3>
            <span className="text-[10px] font-mono bg-panel border px-2 py-0.5 rounded-full text-muted ml-auto">
              {alerts.length} Proposals
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl py-14 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-fg">All Operational Telemetry Clean</h4>
              <p className="text-xs text-muted max-w-xs mx-auto mt-1">Gemma is scanning in the background. No anomalous behaviors or pending alerts were flagged.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-5 rounded-2xl border transition duration-300 relative overflow-hidden ${severityColors(alert.severity)}`}
                >
                  {actionInProgress === alert.id && (
                    <div className="absolute inset-0 bg-bg/75 backdrop-blur-sm z-20 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded border uppercase ${severityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-muted font-mono">Type: {alert.type}</span>
                      </div>
                      <h4 className="text-sm font-bold text-fg">{alert.title}</h4>
                      <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{alert.body}</p>
                    </div>

                    <button 
                      onClick={() => handleDismissAlert(alert.id)}
                      className="p-1 hover:bg-panel border border-transparent hover:border-border rounded-lg text-muted hover:text-fg transition shrink-0"
                      title="Mute Alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions mapping based on Proposed Interventions */}
                  {alert.proposedAction && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                      <div className="text-[10px] text-violet-400 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Gemma Action Proposal: Approval Required (HITL)
                      </div>

                      {showRejectForm === alert.id ? (
                        <div className="space-y-3">
                          <textarea
                            className="w-full bg-bg border border-border rounded-xl p-3 text-xs focus:border-violet-500 outline-none text-fg"
                            placeholder="Enter rejection / changes feedback to the author..."
                            rows={3}
                            value={blogFeedbackInput[alert.id] || ""}
                            onChange={(e) => setBlogFeedbackInput(prev => ({ ...prev, [alert.id]: e.target.value }))}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setShowRejectForm(null)}
                              className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold text-muted uppercase hover:text-fg transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectBlog(alert)}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-bg text-[10px] font-black uppercase hover:opacity-90 transition"
                            >
                              Dispatch Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {alert.proposedAction.actionType === "BAN_USER" && (
                            <button
                              onClick={() => handleApproveAction(alert)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/35 hover:bg-red-500 text-red-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Approve User Ban
                            </button>
                          )}

                          {alert.proposedAction.actionType === "ARCHIVE_SESSION" && (
                            <button
                              onClick={() => handleApproveAction(alert)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/35 hover:bg-amber-500 text-amber-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Approve Session Archive
                            </button>
                          )}

                          {alert.proposedAction.actionType === "MODERATE_BLOG" && (
                            <>
                              <button
                                onClick={() => setCompareAlertId(alert.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/35 hover:bg-violet-500 text-violet-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Review Post
                              </button>
                              <button
                                onClick={() => handleApproveAction(alert)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/35 hover:bg-emerald-500 text-emerald-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve & Publish
                              </button>
                              <button
                                onClick={() => setShowRejectForm(alert.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/35 hover:bg-red-500 text-red-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                Needs Changes
                              </button>
                            </>
                          )}

                          {alert.proposedAction.actionType === "CREATE_TODO" && (
                            <button
                              onClick={() => handleApproveAction(alert)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/35 hover:bg-violet-500 text-violet-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              Convert to Operations Ticket
                            </button>
                          )}

                          {alert.proposedAction.actionType === "UNBAN_USER" && (
                            <ProposalButton
                              tone="emerald"
                              icon={<UserCheck className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Approve Unban
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "BULK_ARCHIVE_SESSIONS" && (
                            <ProposalButton
                              tone="amber"
                              icon={<Layers className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Bulk Archive All Stalled
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "FEATURE_BLOG" && (
                            <ProposalButton
                              tone="violet"
                              icon={<Star className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Feature Post
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "UNFEATURE_BLOG" && (
                            <ProposalButton
                              tone="slate"
                              icon={<StarOff className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Unfeature Post
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "DELETE_COMMENT" && (
                            <ProposalButton
                              tone="red"
                              icon={<MessageSquareX className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Delete Comment
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "PUBLISH_CHALLENGE" && (
                            <ProposalButton
                              tone="emerald"
                              icon={<SendIcon className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Publish Challenge
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "UNPUBLISH_CHALLENGE" && (
                            <ProposalButton
                              tone="slate"
                              icon={<EyeOff className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Unpublish Challenge
                            </ProposalButton>
                          )}

                          {alert.proposedAction.actionType === "UPDATE_TODO_STATUS" && (
                            <ProposalButton
                              tone="violet"
                              icon={<ArrowRight className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveAction(alert)}
                            >
                              Move to {alert.proposedAction.meta?.newStatus ?? "TODO"}
                            </ProposalButton>
                          )}

                          <button
                            onClick={() => handleDismissAlert(alert.id)}
                            className="px-3.5 py-2 rounded-xl border border-border hover:bg-panel text-muted hover:text-fg text-[10px] font-black uppercase tracking-wider transition"
                          >
                            Dismiss Proposal
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Jarvis Agentic Holographic HUD Console */}
        <div className="lg:col-span-5 flex flex-col h-[580px] border border-violet-500/25 rounded-2xl overflow-hidden bg-gradient-to-b from-panel/30 via-bg/40 to-panel/10 backdrop-blur-md relative shadow-2xl group/hud">
          
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          
          {/* Holographic scanner beam line */}
          {isTyping && (
            <div className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_15px_rgba(139,92,246,0.8)] z-10 top-0 animate-[jarvis-scan_2.5s_infinite_linear]" style={{
              animation: "jarvis-scan 3s infinite linear"
            }} />
          )}

          {/* HUD Header */}
          <div className="px-4 py-3 border-b border-border bg-panel/30 flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-violet-400 uppercase tracking-widest">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              Gemma NeuroCore v2.5
            </div>
            <div className="flex items-center gap-2">
              {/* Model toggle — flips between Gemma (free) and Gemini Flash (credit). */}
              <div className="flex items-center gap-0.5 rounded-md bg-panel border border-border p-0.5" role="group" aria-label="Copilot model">
                {MODEL_OPTIONS.map((opt) => {
                  const active = activeModel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setActiveModel(opt.id)}
                      disabled={isTyping}
                      title={`${opt.label} — ${opt.tier === "free" ? "Free tier (default)" : "Credit-based"}`}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                        active
                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-[0_0_6px_rgba(139,92,246,0.3)]"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      {opt.id.startsWith("gemma") ? "Gemma" : "Flash"}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className="w-6 h-6 rounded bg-panel border border-border flex items-center justify-center text-muted hover:text-violet-400 transition"
                title="Cognitive Log History"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <span className={`w-2 h-2 rounded-full ${isTyping ? "bg-amber-500 animate-pulse" : "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"}`} />
            </div>
          </div>

          {/* Quick presets buttons */}
          <div className="p-3 border-b border-border bg-panel/10 flex flex-wrap gap-1.5 relative z-10">
            {COMMAND_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(preset.prompt)}
                disabled={isTyping}
                className="text-[8px] font-mono font-bold px-2 py-1 rounded bg-panel/60 border border-violet-500/10 hover:border-violet-500/40 text-muted hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* MAIN HOLOGRAPHIC JARVIS INTERFACE VIEWPORT */}
          <div className="flex-1 flex flex-col justify-between p-5 relative z-10 overflow-hidden">
            
            {showHistoryDrawer ? (
              // Cognitive Log History Drawer
              <div className="flex-1 flex flex-col h-full font-mono text-[11px] text-muted space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex items-center gap-2 border-b border-border/40 pb-1.5 text-[9px] text-violet-400 font-bold uppercase tracking-wider">
                  <History className="w-3 h-3" />
                  Cognitive Log Feed
                  <button 
                    onClick={() => setShowHistoryDrawer(false)}
                    className="ml-auto text-muted hover:text-fg text-[9px]"
                  >
                    [Close]
                  </button>
                </div>
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[9px] font-bold text-muted/40 uppercase">
                      {msg.role === "user" ? "► directive" : "◀ neural_feedback"}
                    </div>
                    <div className={`p-2.5 rounded-xl border leading-relaxed ${
                      msg.role === "user" 
                        ? isLightTheme
                          ? "bg-violet-50/70 border-violet-200 text-violet-900"
                          : "bg-violet-500/[0.04] border-violet-500/20 text-violet-300/90" 
                        : "bg-panel/20 border-border/40 text-muted"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={historyEndRef} />
              </div>
            ) : (
              // Holographic Jarvis Agent Core Visualizer
              <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
                
                {/* SVG Holographic Ring System */}
                <div className="w-48 h-48 relative flex items-center justify-center mb-6">
                  
                  {/* Outer Dashed Diagnostic Reticle */}
                  <svg className="absolute w-full h-full jarvis-cw" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke={isLightTheme ? "rgba(109,40,217,0.18)" : "rgba(139,92,246,0.15)"} strokeWidth="1" strokeDasharray="3, 4" />
                  </svg>
                  
                  {/* Middle Intercept Rotator Ring */}
                  <svg className="absolute w-[92%] h-[92%] jarvis-ccw" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke={isLightTheme ? "rgba(109,40,217,0.28)" : "rgba(139,92,246,0.25)"} strokeWidth="1.5" strokeDasharray="15, 6, 2, 6" />
                    <circle cx="50" cy="50" r="43" fill="none" stroke={isLightTheme ? "rgba(109,40,217,0.1)" : "rgba(139,92,246,0.08)"} strokeWidth="0.5" />
                  </svg>
                  
                  {/* Inner Orbital Rings */}
                  <svg className="absolute w-[82%] h-[82%] jarvis-cw" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke={isLightTheme ? "rgba(109,40,217,0.35)" : "rgba(139,92,246,0.3)"} strokeWidth="1" strokeDasharray="45, 45" />
                  </svg>

                  {/* AI core visualizer — replaces the old smiley face.
                      State drives the overlay (idle pulse, thinking scan-beam,
                      speaking equalizer); severity tints the idle hue. */}
                  <div className="z-10 relative w-28 h-28">
                    <JarvisCore
                      state={consoleState}
                      severity={alerts.length > 0 ? "alert" : "stable"}
                      variant="lg"
                      isLight={isLightTheme}
                    />
                  </div>

                  {/* Holographic Ambient Back-Glow */}
                  <div className={`absolute w-32 h-32 rounded-full blur-2xl opacity-40 transition-all duration-500 ${
                    consoleState === "thinking" ? "bg-amber-500/50 scale-110" : 
                    consoleState === "speaking" ? "bg-fuchsia-500/50 scale-110" :
                    isLightTheme ? "bg-violet-400/30" : "bg-violet-500/40"
                  }`} />

                </div>

                {/* Simulated Audio/Cognitive Waveform Oscilloscope */}
                <div className="flex items-center gap-1 h-8 justify-center mb-4">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const animationDelay = `${i * 0.1}s`;
                    const barColor = isTyping ? "bg-amber-400/80" : "bg-violet-400/80";
                    const glowColor = isTyping ? "shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "shadow-[0_0_8px_rgba(139,92,246,0.5)]";
                    
                    return (
                      <div 
                        key={i}
                        className={`wave-bar ${barColor} ${glowColor}`}
                        style={{
                          height: isTyping ? "10px" : "6px",
                          animation: isTyping ? `sound-wave-active 0.8s ease-in-out infinite alternate` : "none",
                          animationDelay: isTyping ? animationDelay : "0s"
                        }}
                      />
                    );
                  })}
                </div>

                {/* Holographic Output Readout display */}
                <div className="w-full text-center space-y-1 z-10 max-h-[140px] overflow-y-auto px-2 custom-scrollbar">
                  <div className="text-[9px] font-mono font-bold tracking-widest text-violet-400 uppercase">System Vocalization</div>
                  <p className="text-xs font-mono font-black text-fg text-center leading-relaxed antialiased">
                    {isTyping 
                      ? "Cognitive networks parsing SQLite logs... Executing read-only diagnostics..."
                      : activeAssistantMessage || "Operations unit online. Fully synchronized."
                    }
                  </p>
                </div>

              </div>
            )}

            {/* Futuristic holographic terminal prompt input */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendPrompt(promptInput); }}
              className="mt-auto border border-violet-500/25 bg-violet-500/[0.04] p-1.5 rounded-xl flex gap-2 relative z-10"
            >
              <input
                type="text"
                disabled={isTyping}
                className={`flex-1 bg-transparent outline-none rounded-lg px-3 py-1.5 text-xs font-mono placeholder:text-violet-500/40 disabled:opacity-50 ${
                  isLightTheme ? "text-violet-900" : "text-violet-300"
                }`}
                placeholder="PROMPT DIRECTIVE >_ "
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={isTyping || !promptInput.trim()}
                className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center text-bg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-lg shadow-violet-500/30"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

          {/* Futuristic diagnostic coordinates footer */}
          <div className="px-4 py-2 border-t border-border bg-panel/30 flex items-center justify-between font-mono text-[8px] text-muted/40">
            <span>GRID_LOC: SUB_SYS_OP_CENTER</span>
            <span>SECURE_SHELL_TLS_AES256</span>
          </div>

        </div>

      </div>

      {/* Side-by-side blog comparison modal — opens from a MODERATE_BLOG
          alert's "Review Post" button. Lets the admin read the original
          content alongside Gemma's compliance audit before approving. */}
      {compareAlertId && (() => {
        const alert = alerts.find((a) => a.id === compareAlertId);
        if (!alert) return null;
        return (
          <BlogComparisonModal
            alert={alert}
            onClose={() => setCompareAlertId(null)}
            onApprove={async () => {
              await handleApproveAction(alert);
              setCompareAlertId(null);
            }}
            onReject={async (notes) => {
              setBlogFeedbackInput((prev) => ({ ...prev, [alert.id]: notes }));
              await handleRejectBlog(alert);
              setCompareAlertId(null);
            }}
            inProgress={actionInProgress === alert.id}
          />
        );
      })()}
    </div>
  );
}

interface BlogPreviewPayload {
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
    tags: string | null;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    author: { id: string; name: string | null; email: string | null; joined: string } | null;
  };
  audit: {
    wordCount: number;
    externalLinks: string[];
    affiliateHints: string[];
    promoTerms: string[];
    imageCount: number;
    codeBlockCount: number;
    findings: { severity: "info" | "warn" | "block"; label: string; detail: string }[];
  };
}

/**
 * Two-pane modal: post on the left, Gemma's compliance audit on the right.
 * Approve / Needs-Changes buttons live in the modal footer so an admin can
 * decide entirely from inside the review surface — no context-switching.
 */
function BlogComparisonModal({
  alert,
  onClose,
  onApprove,
  onReject,
  inProgress,
}: {
  alert: AlertItem;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  inProgress: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<BlogPreviewPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectInline, setShowRejectInline] = useState(false);

  useEffect(() => setMounted(true), []);

  // Esc-to-close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch post + audit once the alert id resolves.
  useEffect(() => {
    let cancelled = false;
    const postId = alert.proposedAction?.targetId ?? alert.targetId;
    if (!postId) {
      setLoadError("Alert has no targetId — cannot load post.");
      return;
    }
    setData(null);
    setLoadError(null);
    fetch(`/api/admin/copilot/blog-preview/${encodeURIComponent(postId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Preview load failed (${r.status})`);
        return r.json();
      })
      .then((payload: BlogPreviewPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Failed to load preview.");
      });
    return () => {
      cancelled = true;
    };
  }, [alert]);

  if (!mounted) return null;

  const severityChip = (sev: "info" | "warn" | "block") => {
    switch (sev) {
      case "block":
        return "border-red-500/40 bg-red-500/10 text-red-300";
      case "warn":
        return "border-amber-500/40 bg-amber-500/10 text-amber-300";
      default:
        return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl my-6 bg-surface border border-violet-500/25 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-400">
                Moderation review
              </div>
              <h2 className="text-base font-black tracking-tight text-fg truncate">
                {data?.post.title ?? alert.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-fg"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — two panes */}
        <div className="flex-1 overflow-y-auto">
          {loadError ? (
            <div className="p-10 text-center text-sm text-red-400">{loadError}</div>
          ) : !data ? (
            <div className="p-10 flex items-center justify-center text-muted text-xs">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading post & audit…
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left: original post */}
              <div className="p-6 space-y-4 max-h-[60vh] lg:max-h-[68vh] overflow-y-auto">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted">
                  <FileText className="w-3.5 h-3.5" />
                  Original submission
                  <a
                    href={`/blog/${data.post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 normal-case tracking-normal"
                  >
                    Open live <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {data.post.author && (
                  <div className="text-[11px] text-muted">
                    by{" "}
                    <span className="text-fg font-bold">
                      {data.post.author.name || data.post.author.email}
                    </span>{" "}
                    · submitted {new Date(data.post.createdAt).toLocaleDateString()}
                  </div>
                )}
                {data.post.excerpt && (
                  <p className="text-sm text-fg/80 italic border-l-2 border-violet-500/40 pl-3 leading-relaxed">
                    {data.post.excerpt}
                  </p>
                )}
                <div className="prose prose-invert prose-sm max-w-none text-fg/90 whitespace-pre-wrap leading-relaxed">
                  {data.post.content}
                </div>
              </div>

              {/* Right: Gemma audit */}
              <div className="p-6 space-y-4 max-h-[60vh] lg:max-h-[68vh] overflow-y-auto bg-bg/40">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemma compliance audit
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <AuditStat label="Words" value={data.audit.wordCount} />
                  <AuditStat label="Links" value={data.audit.externalLinks.length} />
                  <AuditStat label="Images" value={data.audit.imageCount} />
                </div>

                <div className="space-y-2">
                  {data.audit.findings.map((f, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-2 ${severityChip(f.severity)}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider">{f.label}</div>
                      <div className="text-[11px] mt-0.5 text-fg/85">{f.detail}</div>
                    </div>
                  ))}
                </div>

                {data.audit.affiliateHints.length > 0 && (
                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-muted hover:text-fg">
                      Affiliate-style links ({data.audit.affiliateHints.length})
                    </summary>
                    <ul className="mt-2 space-y-1 font-mono text-[10px] text-amber-300/90">
                      {data.audit.affiliateHints.map((u, i) => (
                        <li key={i} className="truncate">{u}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted">
                    Alert summary
                  </div>
                  <p className="text-[11px] text-fg/75 whitespace-pre-wrap leading-relaxed">
                    {alert.body}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — actions */}
        <div className="p-4 border-t border-border bg-panel/30 flex flex-col gap-3">
          {showRejectInline ? (
            <div className="space-y-2">
              <textarea
                className="w-full bg-bg border border-border rounded-xl p-3 text-xs focus:border-violet-500 outline-none text-fg"
                placeholder="Feedback to the author (will appear in their inbox)…"
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectInline(false)}
                  disabled={inProgress}
                  className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold text-muted uppercase hover:text-fg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReject(rejectNotes)}
                  disabled={inProgress}
                  className="px-3 py-1.5 rounded-lg bg-red-500 text-bg text-[10px] font-black uppercase hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {inProgress && <Loader2 className="w-3 h-3 animate-spin" />}
                  Dispatch Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg transition"
              >
                Close
              </button>
              <button
                onClick={() => setShowRejectInline(true)}
                disabled={inProgress || !data}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/35 hover:bg-red-500 text-red-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Needs Changes
              </button>
              <button
                onClick={onApprove}
                disabled={inProgress || !data}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/35 hover:bg-emerald-500 text-emerald-400 hover:text-bg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {inProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve & Publish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function AuditStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-panel/40 px-2.5 py-2 text-center">
      <div className="text-lg font-black tabular-nums text-fg">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

/**
 * Tone-styled approval button. Centralizes the colour palette so the eight
 * new action types stay visually consistent with the existing red/amber/
 * emerald palette used for ban/archive/approve. Hover state flips to the
 * fully saturated colour so admin clicks feel decisive.
 */
function ProposalButton({
  tone,
  icon,
  onClick,
  children,
}: {
  tone: "red" | "amber" | "emerald" | "violet" | "slate";
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneClass = {
    red: "bg-red-500/10 border-red-500/35 hover:bg-red-500 text-red-400 hover:text-bg",
    amber: "bg-amber-500/10 border-amber-500/35 hover:bg-amber-500 text-amber-400 hover:text-bg",
    emerald: "bg-emerald-500/10 border-emerald-500/35 hover:bg-emerald-500 text-emerald-400 hover:text-bg",
    violet: "bg-violet-500/10 border-violet-500/35 hover:bg-violet-500 text-violet-400 hover:text-bg",
    slate: "bg-slate-500/10 border-slate-500/35 hover:bg-slate-500 text-slate-300 hover:text-bg",
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${toneClass}`}
    >
      {icon}
      {children}
    </button>
  );
}
