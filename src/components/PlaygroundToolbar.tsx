"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Pencil, 
  Sparkles, 
  Play, 
  Save, 
  ChevronDown, 
  Zap, 
  Rocket, 
  Eye, 
  Layout as LayoutIcon, 
  Terminal,
  MoreHorizontal,
  Type,
  Minus,
  Plus,
  Check
} from "lucide-react";
import { TemplateLogo } from "@/lib/icons";
import ChallengeTimer from "./ChallengeTimer";
import type { Snippet, Visibility } from "./Playground";

/* ────────────────────────────────────────────────────────────────
   3D Toolbar Styles — injected once
──────────────────────────────────────────────────────────────── */

const toolbarCSS = `
  .toolbar-3d {
    background: linear-gradient(180deg, #141416 0%, #0D0D0F 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 0 rgba(0,0,0,0.4),
      0 4px 12px -2px rgba(0,0,0,0.3);
    position: relative;
    z-index: 50;
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
      rgba(255,230,0,0.08) 20%,
      rgba(255,230,0,0.12) 50%,
      rgba(255,230,0,0.08) 80%,
      transparent 100%
    );
  }

  /* 3D embossed button base */
  .tb-btn {
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 2px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.15s ease;
  }
  .tb-btn:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
    border-color: rgba(255,255,255,0.10);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 2px 6px rgba(0,0,0,0.3);
  }
  .tb-btn:active {
    background: rgba(255,255,255,0.02);
    box-shadow:
      inset 0 1px 3px rgba(0,0,0,0.3),
      0 0 0 rgba(0,0,0,0);
    transform: translateY(0.5px);
  }

  /* 3D Run button — glowing raised */
  .tb-run {
    background: linear-gradient(180deg, #FFE600 0%, #E6CF00 50%, #D4BF00 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.4),
      inset 0 -1px 0 rgba(0,0,0,0.1),
      0 2px 8px rgba(255,230,0,0.25),
      0 4px 16px -4px rgba(255,230,0,0.3);
    border: none;
    text-shadow: 0 1px 0 rgba(255,255,255,0.2);
    transition: all 0.2s ease;
  }
  .tb-run:hover {
    background: linear-gradient(180deg, #FFF033 0%, #FFE600 50%, #E6CF00 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 -1px 0 rgba(0,0,0,0.1),
      0 4px 16px rgba(255,230,0,0.35),
      0 8px 24px -4px rgba(255,230,0,0.3);
    transform: translateY(-0.5px);
  }
  .tb-run:active {
    background: linear-gradient(180deg, #D4BF00 0%, #C4B000 100%);
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.15),
      0 1px 4px rgba(255,230,0,0.15);
    transform: translateY(0.5px);
  }

  /* AI button 3D */
  .tb-ai {
    background: linear-gradient(180deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.06) 100%);
    box-shadow:
      inset 0 1px 0 rgba(99,102,241,0.15),
      0 1px 3px rgba(0,0,0,0.2);
    border: 1px solid rgba(99,102,241,0.20);
    transition: all 0.2s ease;
  }
  .tb-ai:hover {
    background: linear-gradient(180deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.10) 100%);
    box-shadow:
      inset 0 1px 0 rgba(99,102,241,0.20),
      0 2px 10px rgba(99,102,241,0.15),
      0 4px 16px -4px rgba(99,102,241,0.2);
    border-color: rgba(99,102,241,0.30);
    transform: translateY(-0.5px);
  }

  /* 3D inset stepper */
  .tb-stepper {
    background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%);
    box-shadow:
      inset 0 1px 3px rgba(0,0,0,0.3),
      0 1px 0 rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .tb-stepper button {
    transition: all 0.1s ease;
  }
  .tb-stepper button:hover {
    background: rgba(255,255,255,0.06);
  }
  .tb-stepper button:active {
    background: rgba(255,255,255,0.02);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
  }

  /* 3D separator — subtle groove */
  .tb-sep {
    width: 1px;
    height: 20px;
    background: linear-gradient(180deg,
      transparent 0%,
      rgba(0,0,0,0.4) 20%,
      rgba(0,0,0,0.4) 80%,
      transparent 100%
    );
    box-shadow: 1px 0 0 rgba(255,255,255,0.04);
    margin: 0 6px;
    flex-shrink: 0;
  }

  /* Icon button — ghost style with 3D hover */
  .tb-icon-btn {
    transition: all 0.15s ease;
  }
  .tb-icon-btn:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 1px 2px rgba(0,0,0,0.2);
  }
`;

/* ────────────────────────────────────────────────────────────────
   Toolbar Dropdown — 3D elevated
──────────────────────────────────────────────────────────────── */

type ToolbarDropdownProps<T extends string> = {
  value: T;
  options: { value: T; label: string; icon?: React.ElementType }[];
  onChange: (v: T) => void;
  icon: React.ElementType;
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
        className={`tb-btn flex items-center gap-2 px-2.5 h-7 rounded-md ${
          open ? "text-fg" : "text-white/60 hover:text-fg"
        } ${disabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Icon className={`w-3.5 h-3.5 ${open ? "text-accent" : ""}`} />
        <span className="text-[11px] font-medium">{selected?.label}</span>
        <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-44 py-1 rounded-xl z-[100] animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            background: "linear-gradient(180deg, #1A1A1C 0%, #141416 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 1px 0 rgba(255,255,255,0.06) inset"
          }}
        >
          {label && (
            <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-white/20 border-b border-white/[0.04] mb-1">
              {label}
            </div>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-all duration-100 ${
                opt.value === value 
                  ? "text-accent bg-accent/[0.06]" 
                  : "text-white/60 hover:text-fg hover:bg-white/[0.04]"
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

/* ────────────────────────────────────────────────────────────────
   Numeric Stepper — 3D inset
──────────────────────────────────────────────────────────────── */

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
  icon?: React.ElementType;
}) {
  return (
    <div className="tb-stepper flex items-center gap-0.5 rounded-md h-7">
      <button 
        onClick={onDecrease} 
        className="w-6 h-full flex items-center justify-center text-white/30 hover:text-fg rounded-l-md"
      >
        <Minus className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-1 px-1.5 min-w-[36px] justify-center">
        {Icon && <Icon className="w-3 h-3 text-white/25" />}
        <span className="text-[11px] font-mono font-medium text-fg/80 tabular-nums">{value}{suffix}</span>
      </div>
      <button 
        onClick={onIncrease} 
        className="w-6 h-full flex items-center justify-center text-white/30 hover:text-fg rounded-r-md"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main Toolbar — 3D elevated surface
──────────────────────────────────────────────────────────────── */

export default function PlaygroundToolbar({
  templateId, tplTitle, title, setTitle, setDirty, dirty, saving, signedIn, isOwner, editable,
  editor, setEditor, fontSize, setFontSize, view, setView,
  visibility, setVisibility, snippet, snippetId, forking,
  handleSave, handleRun, running, onTogglePrompt, tplMode,
  uiScale, setUiScale
}: any) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: toolbarCSS }} />
      <div className="toolbar-3d h-14 px-4 flex items-center justify-between">
        {/* ── Left: Identity + Run ── */}
        <div className="flex items-center gap-3">
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
            {editable && <Pencil className="w-2.5 h-2.5 text-white/10 group-hover/meta:text-white/25 transition-colors flex-shrink-0" />}
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${saving ? "bg-white/20 animate-pulse" : dirty ? "bg-amber-400/70" : "bg-emerald-400/50"}`}
              title={saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}
            />
          </div>

          <div className="tb-sep" />

          {/* Run Button — 3D raised */}
          <button 
            onClick={handleRun}
            disabled={running}
            className={`h-8 px-4 rounded-lg flex items-center gap-2 ${
              running 
                ? "tb-btn text-white/40 cursor-wait" 
                : "tb-run text-black"
            }`}
          >
            {running ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="text-[12px] font-bold">{running ? "Running" : "Run"}</span>
          </button>
        </div>

        {/* ── Center: Editor Config ── */}
        <div className="hidden xl:flex items-center gap-1.5">
          <ToolbarDropdown
            label="Editor Engine"
            value={editor}
            onChange={setEditor}
            icon={editor === "sandpack" ? Zap : Rocket}
            options={[
              { value: "sandpack", label: "Basic", icon: Zap },
              { value: "monaco", label: "Monaco", icon: Rocket }
            ]}
          />

          <div className="tb-sep" />

          <NumericStepper
            value={String(fontSize)}
            onDecrease={() => setFontSize(Math.max(10, fontSize - 1))}
            onIncrease={() => setFontSize(Math.min(32, fontSize + 1))}
            suffix="px"
          />

          <div className="tb-sep" />

          <ToolbarDropdown
            label="View Layout"
            value={view}
            onChange={setView}
            disabled={tplMode === "console"}
            icon={view === "preview" ? Eye : view === "both" ? LayoutIcon : Terminal}
            options={[
              { value: "preview", label: "Preview", icon: Eye },
              { value: "both", label: "Split", icon: LayoutIcon },
              { value: "console", label: "Console", icon: Terminal }
            ]}
          />

          <div className="tb-sep" />

          <NumericStepper
            value={`${Math.round(uiScale * 100)}%`}
            onDecrease={() => setUiScale(Math.max(0.8, uiScale - 0.1))}
            onIncrease={() => setUiScale(Math.min(1.5, uiScale + 0.1))}
            icon={Type}
          />
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-2">
          {/* AI Assist — 3D indigo */}
          <button 
            onClick={onTogglePrompt}
            className="tb-ai h-8 px-3 rounded-lg flex items-center gap-1.5 text-indigo-400 group/ai"
          >
            <Sparkles className="w-3.5 h-3.5 group-hover/ai:scale-110 transition-transform" />
            <span className="text-[11px] font-semibold tracking-wide">AI</span>
          </button>

          {/* Challenge Timer */}
          <div className="hidden lg:block">
            <ChallengeTimer />
          </div>

          <div className="tb-sep" />

          {/* Save + More — ghost with 3D hover */}
          <div className="flex items-center gap-1">
            {editable && signedIn && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="tb-icon-btn w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-fg"
                title="Save (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
            <button 
              className="tb-icon-btn w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-fg"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
