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
  Settings,
  MoreHorizontal,
  Type
} from "lucide-react";
import { TemplateLogo } from "@/lib/icons";
import ShortcutsModal from "./ShortcutsModal";
import ChallengeTimer from "./ChallengeTimer";
import type { Snippet, Visibility } from "./Playground";

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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${
          open 
            ? "bg-accent/10 border-accent shadow-[0_0_15px_var(--accent-glow)]" 
            : "bg-surface/50 border-border hover:bg-surface hover:border-border-strong"
        } ${disabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Icon className={`w-3.5 h-3.5 ${open ? "text-accent" : "text-muted"}`} />
        <div className="flex flex-col items-start leading-none">
          {label && <span className="text-[6px] font-black uppercase tracking-tighter text-muted/40 mb-0.5">{label}</span>}
          <span className="text-[10px] font-black uppercase tracking-widest text-fg/80">{selected?.label}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-muted/30 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-40 py-1.5 bg-surface border border-border-strong rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                opt.value === value 
                  ? "text-accent bg-accent/5" 
                  : "text-muted hover:text-fg hover:bg-surface/50"
              }`}
            >
              {opt.icon && <opt.icon className={`w-3.5 h-3.5 ${opt.value === value ? "text-accent" : "opacity-40"}`} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlaygroundToolbar({
  templateId, tplTitle, title, setTitle, setDirty, dirty, saving, signedIn, isOwner, editable,
  editor, setEditor, fontSize, setFontSize, view, setView,
  visibility, setVisibility, snippet, snippetId, forking,
  handleSave, handleRun, running, onTogglePrompt, tplMode,
  uiScale, setUiScale
}: any) {
  return (
    <div className="h-16 px-4 flex items-center justify-between bg-surface border-b border-border relative z-[50] group/toolbar">
      {/* Background Accent Glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent opacity-50" />

      {/* Left Section: Identity & Challenge */}
      <div className="flex items-center gap-6">
        {/* Project Info Pill */}
        <div className="flex items-center gap-3 p-1 pr-4 rounded-2xl bg-panel/50 border border-border hover:border-border-strong transition-colors group/meta">
          <div className="w-10 h-10 rounded-xl bg-surface/50 border border-border grid place-items-center shadow-inner">
            <TemplateLogo id={templateId} size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                disabled={!editable}
                className="bg-transparent outline-none font-black text-xs tracking-tight text-fg/90 hover:text-accent transition-colors focus:text-accent w-32"
              />
              {editable && <Pencil className="w-2.5 h-2.5 text-muted/30 group-hover/meta:text-accent/40 transition-colors" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted/40">{tplTitle}</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className={`text-[8px] font-black uppercase tracking-tighter ${saving ? "text-muted/40" : dirty ? "text-amber-500" : "text-emerald-500"}`}>
                {saving ? "Syncing..." : dirty ? "Modified" : "Saved"}
              </span>
            </div>
          </div>
        </div>

        {/* Execution Hub - Moved to Left for better efficiency */}
        <div className="flex items-center p-1 rounded-2xl bg-accent/5 border border-accent/20 h-11">
          <button 
            onClick={handleRun}
            disabled={running}
            className={`h-9 px-5 rounded-xl flex items-center gap-2.5 transition-all ${
              running 
                ? "bg-white/10 text-white/40 cursor-wait" 
                : "bg-accent text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_15px_var(--accent-glow)]"
            }`}
          >
            {running ? (
              <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="text-xs font-black uppercase tracking-wider">Run Code</span>
          </button>
        </div>
      </div>

      {/* Center Section: Config & Tools */}
      <div className="hidden xl:flex items-center gap-3">
        {/* Editor Config */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-panel/50 border border-border">
          <ToolbarDropdown
            label="Engine"
            value={editor}
            onChange={setEditor}
            icon={editor === "sandpack" ? Zap : Rocket}
            options={[
              { value: "sandpack", label: "Basic", icon: Zap },
              { value: "monaco", label: "Monaco", icon: Rocket }
            ]}
          />

          <div className="h-8 w-px bg-border mx-1" />

          {/* Font Size Pill */}
          <div className="flex items-center bg-surface/50 border border-border rounded-xl h-9 px-1.5 gap-2">
             <button onClick={() => setFontSize(Math.max(10, fontSize - 1))} className="w-6 h-6 rounded-lg hover:bg-muted/10 text-muted/40 hover:text-fg transition-all text-xs font-black">-</button>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-accent tabular-nums leading-none">{fontSize}</span>
                <span className="text-[6px] font-black text-muted/40 uppercase tracking-tighter">px</span>
             </div>
             <button onClick={() => setFontSize(Math.min(32, fontSize + 1))} className="w-6 h-6 rounded-lg hover:bg-muted/10 text-muted/40 hover:text-fg transition-all text-xs font-black">+</button>
          </div>
        </div>

        {/* View Config */}
        <div className="flex items-center p-1.5 rounded-2xl bg-panel/50 border border-border">
          <ToolbarDropdown
            label="Layout"
            value={view}
            onChange={setView}
            disabled={tplMode === "console"}
            icon={view === "preview" ? Eye : view === "both" ? LayoutIcon : Terminal}
            options={[
              { value: "preview", label: "Preview", icon: Eye },
              { value: "both", label: "Both", icon: LayoutIcon },
              { value: "console", label: "Console", icon: Terminal }
            ]}
          />
        </div>

        {/* Accessibility */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-panel/50 border border-border">
          {/* UI Scale Switcher */}
          <div className="flex items-center bg-surface border border-border rounded-xl h-9 px-1.5 gap-2 group/scale">
             <button 
                onClick={() => setUiScale(Math.max(0.8, uiScale - 0.1))} 
                className="w-6 h-6 rounded-lg hover:bg-muted/10 text-muted/40 hover:text-fg transition-all text-[10px] font-black"
                title="Decrease UI Scale"
             >-</button>
             <div className="flex flex-col items-center min-w-[32px]">
                <div className="flex items-center gap-1">
                  <Type className="w-2.5 h-2.5 text-accent" />
                  <span className="text-[10px] font-black text-fg tabular-nums leading-none">{Math.round(uiScale * 100)}%</span>
                </div>
                <span className="text-[5px] font-black text-muted/40 uppercase tracking-widest">Accessibility</span>
             </div>
             <button 
                onClick={() => setUiScale(Math.min(1.5, uiScale + 0.1))} 
                className="w-6 h-6 rounded-lg hover:bg-muted/10 text-muted/40 hover:text-fg transition-all text-[10px] font-black"
                title="Increase UI Scale"
             >+</button>
          </div>
        </div>
      </div>

      {/* Right Section: Primary Actions */}
      <div className="flex items-center gap-3">
        {/* AI Action */}
        <button 
          onClick={onTogglePrompt}
          className="h-10 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] group/ai"
        >
          <Sparkles className="w-4 h-4 group-hover/ai:scale-110 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-widest">AI</span>
        </button>

        {/* Challenge Hub (Timer) - Moved to Right */}
        <div className="hidden lg:block h-10">
          <ChallengeTimer />
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 ml-2">
          {editable && signedIn && (
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent/30 transition-all hover:bg-accent/5"
              title="Save Project"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
          <button className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-fg transition-all">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
