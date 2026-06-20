"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Sparkles,
  Play,
  Save,
  ChevronDown,
  Eye,
  Layout as LayoutIcon,
  Terminal,
  MoreHorizontal,
  Type,
  Minus,
  Plus,
  Check,
  GitFork,
  Link as LinkIcon,
  Code2,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { TemplateLogo } from "@/lib/icons";
import ChallengeTimer from "./ChallengeTimer";
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
`;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Toolbar Dropdown â€” 3D elevated
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

type ToolbarDropdownProps<T extends string> = {
  value: T;
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[];
  onChange: (v: T) => void;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  disabled?: boolean;
  label?: string;
};

function ToolbarDropdown<T extends string>({ 
  value, options, onChange, icon: Icon, disabled, label 
}: ToolbarDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`tb-btn flex items-center gap-2 px-2.5 h-7 rounded-md transition-colors ${
          open ? "text-fg bg-elevated" : "text-muted hover:text-fg"
        } ${disabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Icon className={`w-3.5 h-3.5 ${open ? "text-accent" : "opacity-60"}`} />
        <span className="text-[11px] font-medium">{selected?.label}</span>
        <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-44 py-1 rounded-xl z-[100] animate-in fade-in slide-in-from-top-1 duration-150 border border-border shadow-2xl bg-panel"
          style={{
            boxShadow: "0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px var(--border) inset"
          }}
        >
          {label && (
            <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted/30 border-b border-border mb-1">
              {label}
            </div>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-all duration-100 ${
                opt.value === value 
                  ? "text-accent bg-accent/10" 
                  : "text-muted/60 hover:text-fg hover:bg-elevated"
              }`}
            >
              {opt.icon && <opt.icon className={`w-3.5 h-3.5 ${opt.value === value ? "text-accent" : "opacity-40"}`} />}
              <span className="flex-1 text-left">{opt.label}</span>
              {opt.value === value && <Check className="w-3 h-3 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   View Layout selector â€” segmented tabs on lg+, dropdown below.
   The two variants share the same options list so behavior stays
   identical across breakpoints.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const VIEW_OPTIONS = [
  { value: "preview" as const, label: "Preview", icon: Eye },
  { value: "both" as const, label: "Split", icon: LayoutIcon },
  { value: "console" as const, label: "Console", icon: Terminal },
];

type ViewValue = (typeof VIEW_OPTIONS)[number]["value"];

function ViewLayoutControl({
  value,
  onChange,
  disabled,
}: {
  value: ViewValue;
  onChange: (v: ViewValue) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {/* Dropdown â€” shown below the lg breakpoint (< 1024px) */}
      <div className="lg:hidden">
        <ToolbarDropdown
          label="View Layout"
          value={value}
          onChange={onChange}
          disabled={disabled}
          icon={
            value === "preview" ? Eye : value === "both" ? LayoutIcon : Terminal
          }
          options={VIEW_OPTIONS}
        />
      </div>

      {/* Segmented tabs â€” shown at lg and above (â‰¥ 1024px) */}
      <div
        className={`hidden lg:flex tb-tabs items-center rounded-md h-7 p-0.5 gap-0.5 ${
          disabled ? "opacity-30 pointer-events-none" : ""
        }`}
        role="tablist"
        aria-label="View layout"
      >
        {VIEW_OPTIONS.map((opt) => {
          const active = opt.value === value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active}
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className="tb-tab h-6 px-2.5 rounded-sm flex items-center gap-1.5 text-[11px] font-medium cursor-pointer"
            >
              <Icon className="tb-tab-icon w-3 h-3 opacity-70" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Main Toolbar â€” 3D elevated surface
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function PlaygroundToolbar({
  templateId, tplTitle, title, setTitle, setDirty, dirty, saving, signedIn, isOwner, editable,
  fontSize, setFontSize, view, setView,
  visibility, setVisibility, snippet, snippetId, forking,
  handleSave, handleFork, handleShare, handleCopyEmbed, handlePopout,
  handleRun, running, onTogglePrompt, tplMode,
  uiScale, setUiScale, backHref
}: any) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: toolbarCSS }} />
      <div className="toolbar-3d h-14 px-4 flex items-center justify-between">
        {/* â”€â”€ Left: Identity + Run â”€â”€ */}
        <div className="flex items-center gap-3">
          {/* Back to the originating question (only when arrived from there) */}
          {backHref && (
            <>
              <Link
                href={backHref}
                className="h-8 pl-2 pr-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-medium text-fg/70 hover:text-fg hover:bg-fg/5 transition-colors flex-shrink-0"
                title="Back to question"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to question</span>
              </Link>
              <div className="tb-sep" />
            </>
          )}

          {/* Project Identity */}
          <div className="flex items-center gap-2 group/meta">
            <div className="w-6 h-6 rounded grid place-items-center flex-shrink-0 opacity-60">
              <TemplateLogo id={templateId} size={16} />
            </div>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              disabled={!editable}
              className="bg-transparent outline-none font-medium text-[13px] text-fg/80 hover:text-fg transition-colors w-32 truncate focus:text-accent"
            />
            {editable && <Pencil className="w-2.5 h-2.5 text-muted/10 group-hover/meta:text-muted/25 transition-colors flex-shrink-0" />}
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${saving ? "bg-muted/20 animate-pulse" : dirty ? "bg-amber-400/70" : "bg-emerald-400/50"}`}
              title={saving ? "Savingâ€¦" : dirty ? "Unsaved" : "Saved"}
            />
          </div>

          <div className="tb-sep" />

          {/* Run Button â€” 3D raised */}
          <button
            onClick={handleRun}
            disabled={running}
            className={`h-8 px-4 rounded-lg flex items-center gap-2 ${
              running
                ? "tb-btn text-muted/40 cursor-wait"
                : "tb-run"
            }`}
          >
            {running ? (
              <div className="w-3.5 h-3.5 border-2 border-muted/20 border-t-fg rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="text-[12px] font-bold">{running ? "Running" : "Run"}</span>
          </button>
        </div>

        {/* â”€â”€ Center: Editor Config â”€â”€
            View Layout is the only control visible at every breakpoint
            (dropdown < lg, segmented tabs â‰¥ lg). Font size + UI scale are
            secondary, so they stay gated to xl+ to keep narrower toolbars
            uncluttered. The Editor Engine selector is gone â€” Monaco is the
            sole editor now. */}
        <div className="flex items-center gap-1.5">
          <ViewLayoutControl
            value={view}
            onChange={setView}
            disabled={tplMode === "console"}
          />

          <div className="hidden xl:flex items-center gap-1.5">
            <div className="tb-sep" />

            <NumericStepper
              value={String(fontSize)}
              onDecrease={() => setFontSize(Math.max(10, fontSize - 1))}
              onIncrease={() => setFontSize(Math.min(32, fontSize + 1))}
              suffix="px"
            />

            <div className="tb-sep" />

            <NumericStepper
              value={`${Math.round(uiScale * 100)}%`}
              onDecrease={() => setUiScale(Math.max(0.8, uiScale - 0.1))}
              onIncrease={() => setUiScale(Math.min(1.5, uiScale + 0.1))}
              icon={Type}
            />
          </div>
        </div>

        {/* â”€â”€ Right: Actions â”€â”€ */}
        <div className="flex items-center gap-2">
          {/* AI Assist â€” uses accent */}
          <button
            onClick={onTogglePrompt}
            className="tb-ai h-8 px-3 rounded-lg flex items-center gap-1.5 text-accent group/ai"
          >
            <Sparkles className="w-3.5 h-3.5 group-hover/ai:scale-110 transition-transform" />
            <span className="text-[11px] font-semibold tracking-wide">AI</span>
          </button>

          {/* Challenge Timer */}
          <div className="hidden lg:block">
            <ChallengeTimer />
          </div>

          <div className="tb-sep" />

          {/* Save + More â€” ghost with 3D hover */}
          <div className="flex items-center gap-1">
            {editable && signedIn && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="tb-icon-btn w-8 h-8 rounded-lg flex items-center justify-center text-muted/30 hover:text-fg"
                title="Save (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
            <div className="relative" ref={actionsRef}>
              <button
                ref={actionsBtnRef}
                onClick={() => setActionsOpen(!actionsOpen)}
                className={`tb-btn h-8 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  actionsOpen ? "bg-surface text-fg" : "text-muted hover:text-fg"
                }`}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {actionsOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 py-1 rounded-xl z-[100] animate-in fade-in slide-in-from-top-1 duration-150 border border-border shadow-2xl bg-panel"
                  style={{
                    boxShadow: "0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px var(--border) inset"
                  }}
                >
                  <button
                    onClick={() => { handleFork(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-muted/70 hover:text-fg hover:bg-elevated transition-all"
                  >
                    <GitFork className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Fork Snippet</span>
                  </button>
                  
                  <div className="h-px bg-border my-1 mx-2" />

                  <button
                    onClick={() => { handleShare(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-muted/70 hover:text-fg hover:bg-elevated transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Copy Public Link</span>
                  </button>

                  <button
                    onClick={() => { handleCopyEmbed(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-muted/70 hover:text-fg hover:bg-elevated transition-all"
                  >
                    <Code2 className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Copy Embed Link</span>
                  </button>

                  <div className="h-px bg-border my-1 mx-2" />

                  <button
                    onClick={() => { handlePopout(); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-muted/70 hover:text-fg hover:bg-elevated transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    <span className="flex-1 text-left">Pop out Preview</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
