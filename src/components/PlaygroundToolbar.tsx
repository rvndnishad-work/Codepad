"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Bot,
  Play,
  Save,
  Square,
  Timer,
  Columns2,
  Rows2,
  PanelLeft,
  Eye,
  Terminal,
  MoreHorizontal,
  Type,
  Minus,
  Plus,
  GitFork,
  Link as LinkIcon,
  LogOut,
  Code2,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { TemplateLogo } from "@/lib/icons";
import ChallengeTimer, { useChallengeTimer, type ChallengeTimerController } from "./ChallengeTimer";
import type { Snippet, Visibility } from "./Playground";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   3D Toolbar Styles â€” injected once
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const toolbarCSS = `
  .toolbar-3d {
    background: var(--surface);
    box-shadow:
      inset 0 1px 0 var(--border),
      0 2px 12px -2px rgba(0,0,0,0.08);
    position: relative;
    z-index: 50;
  }
  .dark .toolbar-3d {
    background: linear-gradient(180deg, #141416 0%, #0D0D0F 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 0 rgba(0,0,0,0.4),
      0 4px 12px -2px rgba(0,0,0,0.3);
  }
  .toolbar-3d::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(var(--accent-rgb),0.08) 20%,
      rgba(var(--accent-rgb),0.12) 50%,
      rgba(var(--accent-rgb),0.08) 80%,
      transparent 100%
    );
  }

  /* 3D embossed button base */
  .tb-btn {
    background: var(--surface);
    box-shadow:
      inset 0 1px 0 var(--border),
      0 1px 2px rgba(0,0,0,0.05);
    border: 1px solid var(--border);
    transition: all 0.15s ease;
    color: var(--muted);
  }
  .dark .tb-btn {
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 2px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.6);
  }
  .tb-btn:hover {
    background: var(--elevated);
    border-color: var(--border-strong);
    color: var(--fg);
  }
  .dark .tb-btn:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
    border-color: rgba(255,255,255,0.10);
  }
  .tb-btn:active {
    background: var(--surface);
    transform: translateY(0.5px);
  }

  /* 3D Run button â€” glowing raised, uses accent across themes */
  .tb-run {
    background: linear-gradient(180deg, var(--accent) 0%, var(--accent-soft) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.3),
      inset 0 -1px 0 rgba(0,0,0,0.08),
      0 2px 8px rgba(var(--accent-rgb),0.25),
      0 4px 16px -4px rgba(var(--accent-rgb),0.3);
    border: none;
    color: var(--bg);
    font-weight: 700;
    transition: all 0.2s ease;
  }
  .tb-run:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--accent-rgb),0.3);
  }
  .tb-run:active {
    transform: translateY(1px);
  }

  /* AI button 3D â€” uses accent across themes */
  .tb-ai {
    background: linear-gradient(180deg, rgba(var(--accent-rgb),0.12) 0%, rgba(var(--accent-rgb),0.06) 100%);
    box-shadow:
      inset 0 1px 0 rgba(var(--accent-rgb),0.15),
      0 1px 3px rgba(0,0,0,0.15);
    border: 1px solid rgba(var(--accent-rgb),0.20);
    transition: all 0.2s ease;
  }
  .tb-ai:hover {
    background: linear-gradient(180deg, rgba(var(--accent-rgb),0.18) 0%, rgba(var(--accent-rgb),0.10) 100%);
    box-shadow:
      inset 0 1px 0 rgba(var(--accent-rgb),0.20),
      0 2px 10px rgba(var(--accent-rgb),0.15),
      0 4px 16px -4px rgba(var(--accent-rgb),0.2);
    border-color: rgba(var(--accent-rgb),0.30);
    transform: translateY(-0.5px);
  }

  /* Numeric Stepper Inset */
  .tb-stepper {
    background: var(--bg);
    border: 1px solid var(--border);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
  }
  .dark .tb-stepper {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.04);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
  .tb-stepper button {
    transition: all 0.1s ease;
  }
  .tb-stepper button:hover {
    background: var(--elevated);
  }
  .dark .tb-stepper button:hover {
    background: rgba(255,255,255,0.06);
  }
  .tb-stepper button:active {
    background: var(--surface);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
  }
  .dark .tb-stepper button:active {
    background: rgba(255,255,255,0.02);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
  }

  /* 3D separator â€” subtle groove */
  .tb-sep {
    width: 1px;
    height: 20px;
    background: var(--border);
    margin: 0 6px;
    flex-shrink: 0;
  }
  .dark .tb-sep {
    background: linear-gradient(180deg,
      transparent 0%,
      rgba(0,0,0,0.4) 20%,
      rgba(0,0,0,0.4) 80%,
      transparent 100%
    );
    box-shadow: 1px 0 0 rgba(255,255,255,0.04);
  }

  /* Segmented tabs â€” used for the View Layout selector on lg+ screens */
  .tb-tabs {
    background: var(--bg);
    border: 1px solid var(--border);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
  }
  .dark .tb-tabs {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.04);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
  .tb-tab {
    transition: all 0.12s ease;
    color: var(--muted);
  }
  .tb-tab:hover {
    color: var(--fg);
  }
  .tb-tab[data-active="true"] {
    color: var(--fg);
    background: var(--surface);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
  .dark .tb-tab[data-active="true"] {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 2px rgba(0,0,0,0.2);
  }
  .tb-tab[data-active="true"] .tb-tab-icon {
    color: var(--accent);
  }

  /* Icon button â€” ghost style with 3D hover */
  .tb-icon-btn {
    transition: all 0.15s ease;
    color: var(--muted);
  }
  .tb-icon-btn:hover {
    background: var(--elevated);
    color: var(--fg);
  }
  .dark .tb-icon-btn:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 2px rgba(0,0,0,0.2);
  }

  /* ── WOW reskin: glass command bar + neon accents ────────────────────
     Unlayered CSS beats Tailwind utilities, so this whole pass applies
     without touching a single line of JSX or behavior below. */
  .toolbar-3d {
    background: linear-gradient(180deg, #101322 0%, #0b0d16 100%);
    border-bottom: 1px solid rgba(139, 147, 255, 0.14);
    box-shadow: 0 10px 36px -14px rgba(0, 0, 0, 0.65);
  }
  .toolbar-3d::after {
    height: 2px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(139, 147, 255, 0.55) 22%,
      rgba(255, 47, 179, 0.55) 50%,
      rgba(34, 211, 238, 0.55) 78%,
      transparent 100%
    );
  }
  .tb-btn {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.09);
    color: rgba(255, 255, 255, 0.65);
  }
  .tb-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(139, 147, 255, 0.45);
    color: #fff;
    box-shadow: 0 0 18px -6px rgba(139, 147, 255, 0.6);
  }
  .tb-run {
    border-radius: 999px;
    background: linear-gradient(135deg, #8b93ff 0%, #ff2fb3 100%);
    color: #fff;
    border: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 4px 18px -4px rgba(255, 47, 179, 0.65),
      0 2px 8px -2px rgba(139, 147, 255, 0.5);
  }
  .tb-run:hover {
    opacity: 1;
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 8px 26px -6px rgba(255, 47, 179, 0.8),
      0 4px 14px -4px rgba(139, 147, 255, 0.6);
    filter: brightness(1.08);
  }
  .tb-ai {
    border-radius: 999px;
    background: rgba(139, 147, 255, 0.12);
    border-color: rgba(139, 147, 255, 0.35);
  }
  .tb-ai:hover {
    background: rgba(139, 147, 255, 0.2);
    border-color: rgba(139, 147, 255, 0.6);
    box-shadow: 0 0 20px -6px rgba(139, 147, 255, 0.7);
    transform: translateY(-0.5px);
  }
  .tb-tabs {
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .tb-tab[data-active="true"] {
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(139, 147, 255, 0.9), rgba(255, 47, 179, 0.9));
    color: #fff;
    box-shadow: 0 2px 12px -4px rgba(255, 47, 179, 0.6);
  }
  .tb-tab[data-active="true"] .tb-tab-icon {
    color: #fff;
  }
  .tb-stepper {
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .tb-sep {
    background: linear-gradient(180deg, transparent, rgba(139, 147, 255, 0.35) 30%, rgba(139, 147, 255, 0.35) 70%, transparent);
  }
  .tb-icon-btn {
    border-radius: 999px;
  }
  .tb-icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    box-shadow: 0 0 16px -6px rgba(139, 147, 255, 0.6);
  }
  /* Techy corner-bracket frame for control groups */
  .tb-frame {
    --tb-c: rgba(139, 147, 255, 0.5);
    background:
      linear-gradient(var(--tb-c), var(--tb-c)) left top / 10px 2px,
      linear-gradient(var(--tb-c), var(--tb-c)) left top / 2px 10px,
      linear-gradient(var(--tb-c), var(--tb-c)) right top / 10px 2px,
      linear-gradient(var(--tb-c), var(--tb-c)) right top / 2px 10px,
      linear-gradient(var(--tb-c), var(--tb-c)) left bottom / 10px 2px,
      linear-gradient(var(--tb-c), var(--tb-c)) left bottom / 2px 10px,
      linear-gradient(var(--tb-c), var(--tb-c)) right bottom / 10px 2px,
      linear-gradient(var(--tb-c), var(--tb-c)) right bottom / 2px 10px;
    background-repeat: no-repeat;
    border-radius: 8px;
    padding: 3px 10px;
  }
`;

/* View Layout selector — unified responsive segmented control (same on all breakpoints). */

type ViewValue = "preview" | "both" | "columns" | "console";

function ViewLayoutControl({
  value,
  onChange,
  disabled,
  showDirectionToggle = true,
}: {
  value: ViewValue;
  onChange: (v: ViewValue) => void;
  disabled?: boolean;
  /** Hidden on mobile/tablet stacked layout — console is always bottom
      there, so the rows/columns switch has no visible effect. */
  showDirectionToggle?: boolean;
}) {
  // Console remembers its last split direction (rows vs columns) so the
  // Console button returns to it instead of always resetting to rows.
  const [lastSplit, setLastSplit] = useState<"both" | "columns">("both");
  useEffect(() => {
    if (value === "both" || value === "columns") setLastSplit(value);
  }, [value]);
  // Single responsive control on every breakpoint: icon-only on phones,
  // labels from ~480px up. Previously <lg used a dropdown with different
  // option names (Split/Columns/Console) than desktop — now identical.
  return (
    <div
      className={`tb-tabs flex h-7 shrink-0 items-center gap-0.5 rounded-md p-0.5 ${
        disabled ? "opacity-30 pointer-events-none" : ""
      }`}
      role="tablist"
      aria-label="View layout"
    >
        <button
          type="button"
          role="tab"
          aria-selected={value === "preview"}
          data-active={value === "preview"}
          onClick={() => onChange("preview")}
          disabled={disabled}
          title="Preview only"
          className="tb-tab h-6 px-1.5 min-[480px]:px-2.5 rounded-sm flex items-center gap-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap"
        >
          <Eye className="tb-tab-icon w-3 h-3 shrink-0 opacity-70" />
          <span className="hidden min-[480px]:inline">Preview</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "both" || value === "columns"}
          data-active={value === "both" || value === "columns"}
          onClick={() => onChange(lastSplit)}
          disabled={disabled}
          title="Split: preview + console"
          className="tb-tab h-6 px-1.5 min-[480px]:px-2.5 rounded-sm flex items-center gap-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap"
        >
          <Terminal className="tb-tab-icon w-3 h-3 shrink-0 opacity-70" />
          <span className="hidden min-[480px]:inline">Console</span>
        </button>
        {(value === "both" || value === "columns") && showDirectionToggle && (
          <>
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />
            <button
              type="button"
              onClick={() => onChange("both")}
              disabled={disabled}
              title="Stacked: preview above console"
              aria-pressed={value === "both"}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-sm transition ${value === "both" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
            >
              <Rows2 className="h-3 w-3 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onChange("columns")}
              disabled={disabled}
              title="Side by side"
              aria-pressed={value === "columns"}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-sm transition ${value === "columns" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
            >
              <Columns2 className="h-3 w-3 shrink-0" />
            </button>
          </>
        )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Numeric Stepper â€” 3D inset
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function NumericStepper({ 
  value, 
  onDecrease, 
  onIncrease, 
  suffix = "",
  icon: Icon,
}: {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="tb-stepper flex items-center gap-0.5 rounded-md h-7">
      <button
        onClick={onDecrease}
        className="w-6 h-full flex items-center justify-center text-muted/30 hover:text-fg rounded-l-md"
      >
        <Minus className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-1 px-1.5 min-w-[36px] justify-center">
        {Icon && <Icon className="w-3 h-3 text-muted/25" />}
        <span className="text-[11px] font-mono font-medium text-fg/80 tabular-nums">{value}{suffix}</span>
      </div>
      <button
        onClick={onIncrease}
        className="w-6 h-full flex items-center justify-center text-muted/30 hover:text-fg rounded-r-md"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ── Persistent timer chip: live readout + stop only ── */

function TimerChip({ t }: { t: ChallengeTimerController }) {
  const frac = t.total > 0 ? Math.max(0, Math.min(1, t.timeLeft / t.total)) : 0;
  const R = 9;
  const C = 2 * Math.PI * R;
  const ring =
    t.isFinished ? "#34d399" : t.isCritical && t.isRunning ? "#fb7185" : "#8b93ff";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-1.5 transition-colors ${
        t.isFinished
          ? "border-emerald-400/40 bg-emerald-400/10"
          : t.isCritical && t.isRunning
            ? "border-red-400/40 bg-red-400/10"
            : "border-white/10 bg-white/5"
      }`}
      title={t.isFinished ? "Time's up" : t.isRunning ? "Timer running" : "Timer idle"}
    >
      <span className="relative grid h-6 w-6 place-items-center">
        <svg viewBox="0 0 22 22" className="h-6 w-6 -rotate-90">
          <circle cx="11" cy="11" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
          <circle
            cx="11" cy="11" r={R} fill="none" stroke={ring} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className={`absolute h-1 w-1 rounded-full ${t.isRunning ? "animate-pulse bg-white" : "bg-white/40"}`} />
      </span>
      <span className={`font-mono text-[12px] font-bold tabular-nums ${
        t.isFinished ? "text-emerald-300" : t.isCritical && t.isRunning ? "text-red-300" : "text-white/85"
      }`}>
        {t.minutes}:{t.seconds.toString().padStart(2, "0")}
      </span>
      <button
        type="button"
        onClick={t.pause}
        disabled={!t.isRunning && !t.isFinished && t.timeLeft === t.total}
        className="grid h-5 w-5 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
        title="Pause timer"
      >
        <Square className="h-2.5 w-2.5 fill-current" />
      </button>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Main Toolbar â€” 3D elevated surface
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function PlaygroundToolbar({
  templateId, tplTitle, title, setTitle, setDirty, dirty, saving, signedIn, isOwner, editable,
  fontSize, setFontSize, view, setView,
  visibility, setVisibility, snippet, snippetId, forking,
  handleSave, handleFork, handleShare, handleCopyEmbed, handlePopout,
  handleRun, running, onTogglePrompt, tplMode, showRun = true,
  showDirectionToggle = true,
  uiScale, setUiScale, backHref, onToggleFiles
}: any) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsBtnRef = useRef<HTMLButtonElement>(null);
  // Toolbar extras are opt-in (persisted): the bar stays minimal until the
  // user pins the timer and/or AI assist from the popover.
  const readFlag = (key: string) => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  };
  const [showTimer, setShowTimer] = useState(() => readFlag("play:tb:timer"));
  const [showAi, setShowAi] = useState(() => readFlag("play:tb:ai"));
  const toggleExtra = (which: "timer" | "ai") => {
    if (which === "timer") {
      setShowTimer((v) => {
        try {
          window.localStorage.setItem("play:tb:timer", v ? "0" : "1");
        } catch {
          /* private mode / blocked storage — preference just won't persist */
        }
        return !v;
      });
    } else {
      setShowAi((v) => {
        try {
          window.localStorage.setItem("play:tb:ai", v ? "0" : "1");
        } catch {
          /* private mode / blocked storage — preference just won't persist */
        }
        return !v;
      });
    }
  };
  // Shared countdown brain: the toolbar chip below and the full controls in
  // the popover drink from this one instance, so closing the menu never
  // kills a running timer.
  const challengeTimer = useChallengeTimer();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActionsOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: toolbarCSS }} />
      <div className="toolbar-3d relative flex h-14 items-center justify-between gap-2 overflow-visible px-2 sm:px-4">
        {/* â”€â”€ Left: Identity + Run â”€â”€ */}
        <div className="flex items-center gap-3">
          {onToggleFiles && (
            <button
              onClick={onToggleFiles}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-[#8b93ff]/50 hover:text-white md:hidden"
              title="Files"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          {/* Back to the originating question (only when arrived from there) */}
          {backHref && (
            <Link
              href={backHref}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-[#8b93ff]/50 hover:text-white"
              title="Back to question"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          {/* Project Identity — responsive: truncate aggressively on small */}
          <div className="group/meta flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
            <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-white/10 bg-black/40">
              <TemplateLogo id={templateId} size={14} />
            </div>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              disabled={!editable}
              placeholder="Untitled sandbox"
              className="w-20 min-w-0 truncate bg-transparent text-[13px] font-semibold text-white/90 outline-none transition-colors placeholder:text-white/30 hover:text-white focus:text-white sm:w-28 lg:w-32 xl:w-40"
            />
            {editable && <Pencil className="hidden h-2.5 w-2.5 flex-shrink-0 text-white/10 transition-colors group-hover/meta:text-white/30 sm:block" />}
            <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${saving ? "animate-pulse bg-white/20" : dirty ? "bg-amber-400/80" : "bg-emerald-400/70"}`}
              title={saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}
            />
          </div>

          {/* Run Button â€” 3D raised */}
          {showRun && (
          <button
            onClick={handleRun}
            disabled={running}
            aria-live="polite"
            aria-busy={running}
            className={`tb-run flex h-9 min-w-[108px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 tabular-nums ${
              running
                ? "cursor-wait opacity-80"
                : ""
            }`}
          >
            {running ? (
              <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            ) : (
              <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
            )}
            <span className="inline-block min-w-[54px] text-center text-[12px] font-black uppercase tracking-wider">{running ? "Running" : "Run"}</span>
          </button>
          )}
        </div>

        {/* â”€â”€ Center: Editor Config â”€â”€
            View Layout is the only control visible at every breakpoint
            (dropdown < lg, segmented tabs â‰¥ lg). Font size + UI scale are
            secondary, so they stay gated to xl+ to keep narrower toolbars
            uncluttered. The Editor Engine selector is gone â€” Monaco is the
            sole editor now. */}
        <div className="tb-frame flex min-w-0 flex-shrink-0 items-center gap-1 sm:gap-1.5">
          <ViewLayoutControl
            value={view}
            onChange={setView}
            disabled={tplMode === "console"}
            showDirectionToggle={showDirectionToggle}
          />
        </div>

        {/* â”€â”€ Right: Actions â”€â”€ */}
        <div className="flex items-center gap-2">
          {showTimer && <TimerChip t={challengeTimer} />}
          {showAi && (
          <button
            onClick={onTogglePrompt}
            className="tb-ai group/ai flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-white/85"
            title="AI Assist"
          >
            <Bot className="h-3.5 w-3.5 transition-transform group-hover/ai:scale-110" />
            <span className="hidden text-[11px] font-black uppercase tracking-wider md:inline">AI Assist</span>
          </button>
          )}
          {/* Save + More + Exit */}
          <div className="flex items-center gap-1">
            {editable && signedIn && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="tb-icon-btn grid h-9 w-9 place-items-center rounded-full text-white/40 hover:text-white"
                title="Save (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
            <div className="relative" ref={actionsRef}>
              <button
                ref={actionsBtnRef}
                onClick={() => setActionsOpen(!actionsOpen)}
                aria-expanded={actionsOpen}
                aria-haspopup="menu"
                className={`tb-btn flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                  actionsOpen ? "text-white" : ""
                }`}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {actionsOpen && (
                <div className="absolute right-0 top-full z-[100] mt-2 w-64 animate-in rounded-2xl border border-white/10 bg-[#12141f]/95 py-1.5 backdrop-blur-xl duration-150 fade-in slide-in-from-top-1"
                  style={{
                    boxShadow: "0 24px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset"
                  }}
                >
                  {/* Toolbar extras — pin timer / AI to the bar (persisted) */}
                  <div className="space-y-1 border-b border-white/10 px-3 pb-2 pt-1">
                    {(
                      [
                        { key: "timer", label: "Timer", icon: Timer, on: showTimer },
                        { key: "ai", label: "AI Assist", icon: Bot, on: showAi },
                      ] as const
                    ).map((row) => (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => toggleExtra(row.key)}
                        aria-pressed={row.on}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <row.icon className="h-3.5 w-3.5 text-[#8b93ff]" />
                        <span className="flex-1 text-left">{row.label}</span>
                        <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${row.on ? "bg-[#8b93ff]" : "bg-white/10"}`}>
                          <span className={`absolute top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-all ${row.on ? "left-[18px]" : "left-0.5"}`} />
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* Editor controls — font, zoom, AI assist, timer */}
                  <div className="space-y-2 border-b border-white/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/50"><Type className="w-3 h-3" /> Font</span>
                      <NumericStepper
                        value={String(fontSize)}
                        onDecrease={() => setFontSize(Math.max(10, fontSize - 1))}
                        onIncrease={() => setFontSize(Math.min(32, fontSize + 1))}
                        suffix="px"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/50"><Type className="w-3 h-3" /> Zoom</span>
                      <NumericStepper
                        value={`${Math.round(uiScale * 100)}%`}
                        onDecrease={() => setUiScale(Math.max(0.8, Math.round((uiScale - 0.1) * 10) / 10))}
                        onIncrease={() => setUiScale(Math.min(2, Math.round((uiScale + 0.1) * 10) / 10))}
                        icon={Type}
                      />
                    </div>
                  </div>
                  <div className="flex justify-center border-b border-white/10 px-3 py-2">
                    <ChallengeTimer controller={challengeTimer} />
                  </div>
                  <button
                    onClick={() => { handleFork(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/60 hover:text-white hover:bg-white/5 rounded-xl mx-1.5 transition-all"
                  >
                    <GitFork className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Fork Snippet</span>
                  </button>
                  
                  <div className="h-px bg-white/10 my-1 mx-2" />

                  <button
                    onClick={() => { handleShare(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/60 hover:text-white hover:bg-white/5 rounded-xl mx-1.5 transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Copy Public Link</span>
                  </button>

                  <button
                    onClick={() => { handleCopyEmbed(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/60 hover:text-white hover:bg-white/5 rounded-xl mx-1.5 transition-all"
                  >
                    <Code2 className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Copy Embed Link</span>
                  </button>

                  <div className="h-px bg-white/10 my-1 mx-2" />

                  <button
                    onClick={() => { handlePopout(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/60 hover:text-white hover:bg-white/5 rounded-xl mx-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Pop out Preview</span>
                  </button>
                </div>
              )}
            </div>
            {/* Exit — the global nav is hidden inside the IDE, so this is the
                way back to the sandbox browser. Styled as an explicit red
                exit action (not a generic close X) so its meaning is clear. */}
            <div className="h-5 w-px shrink-0 bg-gradient-to-b from-transparent via-white/15 to-transparent" aria-hidden />
            <Link
              href="/playgrounds"
              onClick={(e) => {
                if (dirty && !window.confirm("Unsaved changes will be lost. Exit anyway?")) e.preventDefault();
              }}
              aria-label="Exit to playgrounds"
              title="Exit to playgrounds"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/10 px-3 text-red-300 transition hover:border-red-400/60 hover:bg-red-500/20 hover:text-red-200"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden text-[11px] font-black uppercase tracking-wider sm:inline">Exit</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
