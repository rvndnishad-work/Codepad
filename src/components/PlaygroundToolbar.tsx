"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Bot,
  Play,
  Save,
  Check,
  Square,
  Timer,
  Columns2,
  Rows2,
  PanelLeft,
  AppWindow,
  Terminal,
  Palette,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pin,
  MoreHorizontal,
  Type,
  Minus,
  Plus,
  GitFork,
  Link as LinkIcon,
  LogOut,
  Code2,
  ExternalLink,
  ArrowLeft,
  Zap,
  Wand2,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { TemplateLogo } from "@/lib/icons";
import LogoDynamic from "./LogoDynamic";
import {
  EDITOR_THEMES,
  editorThemeById,
  DEFAULT_EDITOR_THEME_ID,
  type EditorThemeDef,
} from "@/lib/editor-themes";
import { readBoolPref, writeBoolPref, PREF_KEYS } from "@/lib/prefs";
import { useChallengeTimer, type ChallengeTimerController } from "./ChallengeTimer";
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
  /* Per-tab identity tints — mirrors the output pane headers (indigo
     Preview, cyan Console) so the control reads as the same system */
  .tb-tab[data-kind="preview"][data-active="true"] {
    background: linear-gradient(135deg, rgba(139, 147, 255, 0.95), rgba(99, 102, 241, 0.95));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 2px 14px -4px rgba(139, 147, 255, 0.8);
  }
  .tb-tab[data-kind="console"][data-active="true"] {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.9), rgba(59, 130, 246, 0.9));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 2px 14px -4px rgba(34, 211, 238, 0.8);
  }
  .tb-tab[data-kind="preview"]:not([data-active="true"]) .tb-tab-icon {
    color: rgba(170, 176, 255, 0.8);
  }
  .tb-tab[data-kind="console"]:not([data-active="true"]) .tb-tab-icon {
    color: rgba(103, 232, 249, 0.75);
  }
  /* Split-direction toggles — active gets an accent ring + glow */
  .tb-dir {
    border: 1px solid transparent;
  }
  .tb-dir[data-active="true"] {
    background: rgba(139, 147, 255, 0.18);
    border-color: rgba(139, 147, 255, 0.5);
    color: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 0 12px -4px rgba(139, 147, 255, 0.8);
  }
  .tb-dir-slot {
    width: 60px;
    overflow: hidden;
    visibility: hidden;
    flex-shrink: 0;
    transition: visibility 0s 0.28s;
  }
  .tb-dir-slot[data-open="true"] {
    visibility: visible;
    transition: none;
  }
  .tb-dir-track {
    display: flex;
    align-items: center;
    gap: 3px;
    width: max-content;
    transform: translateX(14px);
    opacity: 0;
    transition:
      transform 0.28s cubic-bezier(0.32, 0.72, 0, 1),
      opacity 0.18s ease;
  }
  .tb-dir-slot[data-open="true"] .tb-dir-track {
    transform: translateX(0);
    opacity: 1;
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
  /* Brand lockup — hover wash only; the mark's own motion
     (orbit, caret, hover tilt) lives in LogoDynamic */
  .tb-brand {
    border-radius: 999px;
    transition: all 0.15s ease;
  }
  .tb-brand:hover {
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 16px -6px rgba(139, 147, 255, 0.6);
  }
  /* Exit — solid destructive red, unmistakable next to the ghost buttons */
  .tb-exit {
    border-radius: 999px;
    background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 4px 16px -6px rgba(220, 38, 38, 0.8);
    transition: all 0.15s ease;
  }
  .tb-exit:hover {
    filter: brightness(1.12);
    transform: translateY(-0.5px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 6px 22px -6px rgba(220, 38, 38, 0.9);
  }
  .tb-exit:active {
    transform: translateY(0.5px);
  }
  /* Save — labeled pill; accent-charged while there is work to do,
     settled emerald once everything is persisted */
  .tb-save {
    border-radius: 999px;
    border: 1px solid rgba(139, 147, 255, 0.45);
    background: linear-gradient(180deg, rgba(139, 147, 255, 0.22) 0%, rgba(139, 147, 255, 0.10) 100%);
    color: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 12px -4px rgba(139, 147, 255, 0.7);
    transition: all 0.15s ease;
  }
  .tb-save:hover {
    background: linear-gradient(180deg, rgba(139, 147, 255, 0.32) 0%, rgba(139, 147, 255, 0.16) 100%);
    border-color: rgba(139, 147, 255, 0.7);
    transform: translateY(-0.5px);
  }
  .tb-save:active {
    transform: translateY(0.5px);
  }
  .tb-save:disabled {
    cursor: default;
    transform: none;
  }
  .tb-save[data-state="saved"] {
    border-color: rgba(52, 211, 153, 0.35);
    background: rgba(52, 211, 153, 0.08);
    color: rgba(255, 255, 255, 0.55);
    box-shadow: none;
  }
  /* Drill-in sub-view (Facebook-style): slides in from the option side
     over the root menu when a row with children opens. */
  .tb-subview {
    border-radius: 16px;
    animation: tb-subview-in 0.24s cubic-bezier(0.32, 0.72, 0, 1);
  }
  @keyframes tb-subview-in {
    from { transform: translateX(56px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
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
      className={`tb-tabs flex h-7 shrink-0 items-center gap-0.5 rounded-md p-0.5 ${disabled ? "opacity-30 pointer-events-none" : ""
        }`}
      role="tablist"
      aria-label="View layout"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "preview"}
        data-active={value === "preview"}
        data-kind="preview"
        onClick={() => onChange("preview")}
        disabled={disabled}
        title="Preview only"
        className="tb-tab h-6 px-1.5 min-[480px]:px-2.5 rounded-sm flex items-center gap-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap"
      >
        <AppWindow className="tb-tab-icon w-3 h-3 shrink-0 opacity-90" />
        <span className="hidden min-[480px]:inline">Preview</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "both" || value === "columns"}
        data-active={value === "both" || value === "columns"}
        data-kind="console"
        onClick={() => onChange(lastSplit)}
        disabled={disabled}
        title="Split: preview + console"
        className="tb-tab h-6 px-1.5 min-[480px]:px-2.5 rounded-sm flex items-center gap-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap"
      >
        <Terminal className="tb-tab-icon w-3 h-3 shrink-0 opacity-90" />
        <span className="hidden min-[480px]:inline">Console</span>
      </button>
      {/* Direction slot is always mounted at a fixed width — the tabs
            never shift when split opens. The track slides in from the
            console side via .tb-dir-slot[data-open] (see toolbarCSS). */}
      <div
        className="tb-dir-slot"
        data-open={(value === "both" || value === "columns") && showDirectionToggle}
        aria-hidden={!((value === "both" || value === "columns") && showDirectionToggle)}
      >
        <div className="tb-dir-track">
          <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />
          <button
            type="button"
            onClick={() => onChange("both")}
            disabled={disabled}
            title="Stacked: preview above console"
            aria-pressed={value === "both"}
            data-active={value === "both"}
            className="tb-dir grid h-6 w-6 shrink-0 place-items-center rounded-sm transition text-white/40 hover:text-white"
          >
            <Rows2 className="h-3 w-3 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => onChange("columns")}
            disabled={disabled}
            title="Side by side"
            aria-pressed={value === "columns"}
            data-active={value === "columns"}
            className="tb-dir grid h-6 w-6 shrink-0 place-items-center rounded-sm transition text-white/40 hover:text-white"
          >
            <Columns2 className="h-3 w-3 shrink-0" />
          </button>
        </div>
      </div>
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

function ThemeSwatch({ theme, large }: { theme: EditorThemeDef; large?: boolean }) {
  return (
    <span
      className="flex shrink-0 items-stretch overflow-hidden rounded-full border border-white/15"
      aria-hidden
    >
      {theme.swatch.map((c) => (
        <span
          key={c}
          style={{ background: c }}
          className={large ? "h-5 w-3" : "h-4 w-2"}
        />
      ))}
    </span>
  );
}

function ThemeOptionsList({
  activeId,
  onPick,
}: {
  activeId: string;
  onPick: (id: string) => void;
}) {
  return (
    <>
      {EDITOR_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="option"
          aria-selected={t.id === activeId}
          onClick={() => onPick(t.id)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
        >
          <ThemeSwatch theme={t} large />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold text-white/85">
              {t.label}
            </span>
            <span className="block truncate text-[11px] text-white/40">
              {t.blurb}
            </span>
          </span>
          {t.id === activeId && (
            <Check className="h-3.5 w-3.5 shrink-0 text-[#8b93ff]" aria-hidden />
          )}
        </button>
      ))}
    </>
  );
}

function EditorThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = editorThemeById(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Editor theme"
        className="tb-btn flex h-9 items-center gap-1.5 rounded-full py-0 pl-2.5 pr-2"
      >
        <Palette className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden />
        <span className="hidden text-[11px] font-black uppercase tracking-wider text-white/80 xl:inline">
          {active.label}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Editor theme"
          className="absolute right-0 top-full z-[100] mt-2 w-64 rounded-2xl border border-white/10 bg-[#12141f]/95 py-1.5 backdrop-blur-xl"
          style={{
            boxShadow: "0 24px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset"
          }}
        >
          <p className="px-3 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Editor theme
          </p>
          <div className="px-1.5">
            <ThemeOptionsList
              activeId={active.id}
              onPick={(id) => {
                onChange?.(id);
                setOpen(false);
              }}
            />
          </div>
          <p className="px-3 pb-2 pt-1 text-[10px] leading-relaxed text-white/30">
            Applies to the code editor in dark mode.
          </p>
        </div>
      )}
    </div>
  );
}

function TimerChip({ t }: { t: ChallengeTimerController }) {
  const frac = t.total > 0 ? Math.max(0, Math.min(1, t.timeLeft / t.total)) : 0;
  const R = 9;
  const C = 2 * Math.PI * R;
  const ring =
    t.isFinished ? "#34d399" : t.isCritical && t.isRunning ? "#fb7185" : "#8b93ff";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-1.5 transition-colors ${t.isFinished
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
      <span className={`font-mono text-[12px] font-bold tabular-nums ${t.isFinished ? "text-emerald-300" : t.isCritical && t.isRunning ? "text-red-300" : "text-white/85"
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

/* ── Main Toolbar ── */
export default function PlaygroundToolbar({
  templateId, tplTitle, title, setTitle, setDirty, dirty, saving, signedIn, isOwner, editable,
  fontSize, setFontSize, view, setView,
  visibility, setVisibility, snippet, snippetId, forking,
  handleSave, handleFork, handleShare, handleCopyEmbed, handlePopout,
  handleRun, running, onTogglePrompt, tplMode, showRun = true,
  showDirectionToggle = true,
  backHref, onToggleFiles,
  autoRun, setAutoRun, formatOnSave, setFormatOnSave,
  editorThemeId = DEFAULT_EDITOR_THEME_ID,
  setEditorThemeId,
}: any) {
  const [actionsOpen, setActionsOpen] = useState(false);
  // Drill-in sub-view inside the More menu ("theme" today). Resets to root
  // whenever the menu closes so it always reopens at the top level.
  const [menuView, setMenuView] = useState<"root" | "theme">("root");
  useEffect(() => {
    if (!actionsOpen) setMenuView("root");
  }, [actionsOpen ]);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsBtnRef = useRef<HTMLButtonElement>(null);
  // First-save naming dialog: a playground only lands on the dashboard once
  // explicitly saved, and that moment asks for its name. Re-saves bypass
  // the dialog (the inline title input renames from then on).
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const saveInputRef = useRef<HTMLInputElement>(null);
  const requestSave = () => {
    if (snippetId) {
      handleSave();
      return;
    }
    setSaveName(title);
    setSaveOpen(true);
  };
  // Ctrl+S is file-level (silent persist, never dashboard) and never
  // reaches this dialog — it opens only from the Save button below.
  useEffect(() => {
    if (saveOpen) {
      const t = setTimeout(() => {
        saveInputRef.current?.focus();
        saveInputRef.current?.select();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [saveOpen]);
  const confirmSave = () => {
    const name = saveName.trim();
    if (!name || saving) return;
    setSaveOpen(false);
    handleSave({ title: name });
  };
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
  // Theme picker pin: visible on the toolbar by default (current behavior);
  // unpinning hides it from the bar and it lives in the menu below instead.
  // Inverted default versus the flags above: only an explicit "0" hides it.
  const [showTheme, setShowTheme] = useState(() => {
    try {
      return typeof window === "undefined" ? true : window.localStorage.getItem("play:tb:theme") !== "0";
    } catch {
      return true;
    }
  });
  // Delete confirmation (default on). Shares its pref with the explorer's
  // "Do not ask me again" checkbox, which is the off-ramp back here.
  const [confirmDelete, setConfirmDelete] = useState(
    () => !readBoolPref(PREF_KEYS.skipDeleteConfirm, false),
  );
  const toggleConfirmDelete = () => {
    setConfirmDelete((v) => {
      writeBoolPref(PREF_KEYS.skipDeleteConfirm, v);
      return !v;
    });
  };
  const toggleExtra = (which: "timer" | "ai" | "theme") => {
    const flip = (v: boolean) => {
      try {
        window.localStorage.setItem(`play:tb:${which}`, v ? "0" : "1");
      } catch {
        /* private mode / blocked storage — preference just won't persist */
      }
      return !v;
    };
    if (which === "timer") setShowTimer(flip);
    else if (which === "ai") setShowAi(flip);
    else setShowTheme(flip);
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
      if (e.key === "Escape") {
        setActionsOpen(false);
        setSaveOpen(false);
      }
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
          {/* Brand — same lockup as the homepage navbar (mark + wordmark),
              compact mark on small screens. Home is the way out to the
              marketing site; Exit (right) returns to the sandbox browser. */}
          <Link
            href="/"
            className="tb-brand group/logo flex center shrink-0 items-center rounded-full py-1 pl-1 pr-1 md:pr-2"
            title="Interviewpad home"
            aria-label="Interviewpad home"
          >
            <span className="hidden md:block [&_svg]:h-[30px] [&_svg]:w-[30px] [&_svg]:translate-y-[1px] [&_.ld-word]:text-[15px]">
              <LogoDynamic tone="accent" showSub={false} />
            </span>
            <span className="md:hidden [&_svg]:h-7 [&_svg]:w-7">
              <LogoDynamic tone="accent" compact />
            </span>
          </Link>
          <div className="tb-sep hidden shrink-0 sm:block" aria-hidden />
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
            <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${saving ? "animate-pulse bg-white/20" : !snippetId || dirty ? "bg-amber-400/80" : "bg-emerald-400/70"}`}
              title={saving ? "Saving…" : !snippetId || dirty ? "Unsaved" : "Saved"}
            />
          </div>

          {/* Run Button â€” 3D raised */}
          {showRun && (
            <button
              onClick={handleRun}
              disabled={running}
              aria-live="polite"
              aria-busy={running}
              className={`tb-run flex h-9 min-w-[108px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 tabular-nums ${running
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
          {/* AI Assist is login-only (the /api/playground/assist route 401s
              anonymous calls) — anonymous users never see the pinned button. */}
          {showAi && signedIn && (
            <button
              onClick={onTogglePrompt}
              className="tb-ai group/ai flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-white/85"
              title="AI Assist"
            >
              <Bot className="h-3.5 w-3.5 transition-transform group-hover/ai:scale-110" />
              <span className="hidden text-[11px] font-black uppercase tracking-wider md:inline">AI Assist</span>
            </button>
          )}
          {/* Save — labeled pill with persistence state. The state is
              dashboard persistence, NOT file edits: an unsaved playground
              always offers "Save" (accent), and only a snippet with no
              pending edits settles to emerald "Saved". */}
          <div className="flex items-center gap-1">
            {editable && signedIn && (
              <button
                onClick={requestSave}
                disabled={saving}
                data-state={saving ? "saving" : !snippetId || dirty ? "dirty" : "saved"}
                className="tb-save flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5"
                title={saving ? "Saving…" : !snippetId ? "Save playground to your dashboard" : dirty ? "Save (Ctrl+S) — unsaved changes" : "Saved — nothing to save"}
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                ) : !snippetId || dirty ? (
                  <Save className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className="hidden text-[11px] font-black uppercase tracking-wider md:inline">
                  {saving ? "Saving" : !snippetId || dirty ? "Save" : "Saved"}
                </span>
                {dirty && !saving && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" title="Unsaved changes" aria-hidden />
                )}
              </button>
            )}
            {showTheme && (
              <EditorThemePicker value={editorThemeId} onChange={setEditorThemeId} />
            )}
            <div className="relative" ref={actionsRef}>
              <button
                ref={actionsBtnRef}
                onClick={() => setActionsOpen(!actionsOpen)}
                aria-expanded={actionsOpen}
                aria-haspopup="menu"
                className={`tb-btn flex h-9 w-9 items-center justify-center rounded-full transition-all ${actionsOpen ? "text-white" : ""
                  }`}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {actionsOpen && (
                <div className="absolute right-0 top-full z-[100] mt-2 w-64 animate-in overflow-hidden rounded-2xl border border-white/10 bg-[#12141f]/95 py-1.5 backdrop-blur-xl duration-150 fade-in slide-in-from-top-1"
                  style={{
                    boxShadow: "0 24px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset"
                  }}
                >
                  {/* Toolbar extras — pin timer / AI / theme to the bar
                      (persisted). Auto-run and format-on-save live here too:
                      their state + persistence live in Playground, the menu
                      only flips them. The theme row drills into a sub-view
                      instead of bloating this list. AI Assist is login-only,
                      so anonymous users get a sign-in row instead of the
                      toggle (the assist route 401s without a session). */}
                  <div className="space-y-1 border-b border-white/10 px-3 pb-2 pt-1">
                    {(
                      [
                        { key: "timer", label: "Timer", icon: Timer, on: showTimer, toggle: () => toggleExtra("timer") },
                        { key: "theme", label: "Editor theme", icon: Palette, on: showTheme, toggle: () => toggleExtra("theme") },
                        { key: "ai", label: "AI Assist", icon: Bot, on: showAi, toggle: () => toggleExtra("ai") },
                        { key: "autorun", label: "Auto-run", icon: Zap, on: autoRun, toggle: () => setAutoRun(!autoRun) },
                        { key: "format", label: "Format on save", icon: Wand2, on: formatOnSave, toggle: () => setFormatOnSave(!formatOnSave) },
                        { key: "confirm", label: "Confirm before delete", icon: ShieldAlert, on: confirmDelete, toggle: toggleConfirmDelete },
                      ] as const
                    )
                      .filter((row) => signedIn || row.key !== "ai")
                      .map((row) => (
                      <React.Fragment key={row.key}>
                        {row.key === "theme" ? (
                          <button
                            type="button"
                            onClick={() => setMenuView("theme")}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                          >
                            <row.icon className="h-3.5 w-3.5 text-[#8b93ff]" />
                            <span className="flex-1 text-left">{row.label}</span>
                            <span className="text-[11px] font-medium text-white/40">
                              {editorThemeById(editorThemeId).label}
                            </span>
                            <ChevronRight
                              className="h-3.5 w-3.5 shrink-0 text-white/30"
                              aria-hidden
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={row.toggle}
                            aria-pressed={row.on}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                          >
                            <row.icon className="h-3.5 w-3.5 text-[#8b93ff]" />
                            <span className="flex-1 text-left">{row.label}</span>
                            <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${row.on ? "bg-[#8b93ff]" : "bg-white/10"}`}>
                              <span className={`absolute top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-all ${row.on ? "left-[18px]" : "left-0.5"}`} />
                            </span>
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                    {!signedIn && (
                      <Link
                        href="/login"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                      >
                        <Bot className="h-3.5 w-3.5 text-[#8b93ff]" />
                        <span className="flex-1 text-left">AI Assist</span>
                        <span className="text-[11px] font-medium text-white/40">
                          Sign in
                        </span>
                      </Link>
                    )}
                  </div>
                  {/* Editor font size */}
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
                  {/* Theme drill-in sub-view (Facebook-style): slides over the
                      root menu with a back header, pin switch, and options. */}
                  {menuView === "theme" && (
                    <div className="tb-subview absolute inset-0 flex flex-col bg-[#12141f]/95 backdrop-blur-xl">
                      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => setMenuView("root")}
                          aria-label="Back to options"
                          title="Back"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="flex-1 truncate text-[13px] font-black tracking-tight text-white">
                          Editor theme
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExtra("theme")}
                          aria-pressed={showTheme}
                          title={showTheme ? "Pinned to toolbar" : "Pin to toolbar"}
                          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                            showTheme
                              ? "border-[#8b93ff]/50 bg-[#8b93ff]/15 text-white"
                              : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          <Pin
                            className="h-3 w-3"
                            aria-hidden
                          />
                          {showTheme ? "Pinned" : "Pin"}
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                        <ThemeOptionsList
                          activeId={editorThemeById(editorThemeId).id}
                          onPick={(id) => setEditorThemeId?.(id)}
                        />
                        <p className="px-3 pb-1 pt-2 text-[10px] leading-relaxed text-white/30">
                          Applies to the code editor in dark mode.
                        </p>
                      </div>
                    </div>
                  )}
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
              className="tb-exit flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden text-[11px] font-black uppercase tracking-wider sm:inline">Exit</span>
            </Link>
          </div>
        </div>
      </div>
      {/* First-save naming dialog — the moment a playground earns its place
          on the dashboard. Backdrop click / Escape cancels; Enter confirms. */}
      {saveOpen && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSaveOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Save playground"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#12141f] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <h2 className="text-sm font-black tracking-tight text-white">
              Save playground
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Give it a name — it will show up on your dashboard under this title.
            </p>
            <label
              htmlFor="tb-save-name"
              className="mt-4 block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/45"
            >
              Playground name
            </label>
            <input
              id="tb-save-name"
              ref={saveInputRef}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSave();
              }}
              placeholder="Untitled sandbox"
              maxLength={80}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#8b93ff]/60"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-bold text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={!saveName.trim() || saving}
                className="tb-run rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save playground"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
