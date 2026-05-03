"use client";

import React from "react";
import {
  GitFork,
  Save,
  Share2,
  Eye,
  Terminal,
  Lock,
  Code2,
  Pencil,
  Play,
  PanelBottom,
  Code,
  ExternalLink,
  Tag,
  X as XIcon,
  PanelLeft,
  Sparkles,
  Zap,
  Rocket,
  Layout,
} from "lucide-react";
import { TemplateLogo } from "@/lib/icons";
import ShortcutsModal from "./ShortcutsModal";
import type { Snippet, Visibility } from "./Playground";

type ControlButtonsProps = {
  editor: "sandpack" | "monaco";
  setEditor: (v: "sandpack" | "monaco") => void;
  fontSize: number;
  setFontSize: (v: number | ((prev: number) => number)) => void;
  view: "preview" | "console" | "both";
  setView: (v: "preview" | "console" | "both") => void;
  editable: boolean;
  signedIn: boolean;
  snippetId: string | null;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  snippet: Snippet | null | undefined;
  isOwner: boolean;
  saving: boolean;
  forking: boolean;
  onSave: () => void;
  onFork: () => void;
  onShare: () => void;
  onCopyEmbed: () => void;
  onPopout: () => void;
  onRun: () => void;
  running: boolean;
  compact: boolean;
  onTogglePrompt?: () => void;
  autoRun: boolean;
  setAutoRun: (v: boolean) => void;
  mode?: "browser" | "console";
};

function SegBtn({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${active
          ? "bg-[#FFE600] text-black shadow-[0_0_20px_rgba(255,230,0,0.25)] scale-105 z-10"
          : "text-white/40 hover:text-white hover:bg-white/5"
        }`}
    >
      {children}
    </button>
  );
}

function ControlButtons({
  editor, setEditor, fontSize, setFontSize, view, setView,
  editable, signedIn, snippetId, visibility, setVisibility,
  snippet, isOwner, saving, forking,
  onSave, onFork, onShare, onCopyEmbed, onPopout, onRun, running, compact, onTogglePrompt,
  autoRun, setAutoRun, mode
}: ControlButtonsProps) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2 lg:gap-3' : 'gap-4'}`}>
      {/* Group: AI & Execution */}
      <div className={`flex items-center gap-2 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md`}>
          <button
            onClick={onTogglePrompt}
            title="AI Assistant"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className={compact ? "hidden xl:inline" : "inline"}>AI Assistant</span>
          </button>

        <div className="flex items-stretch rounded-xl border border-[#9DFF00]/30 bg-[#9DFF00]/5 overflow-hidden text-xs transition-all hover:border-[#9DFF00]/50 group/run">
          <button
            onClick={onRun}
            disabled={running}
            title="Run code (Ctrl/Cmd + Enter)"
            className={`inline-flex items-center gap-2 px-4 py-2 hover:bg-[#9DFF00]/10 text-[#9DFF00] disabled:opacity-70 transition-all ${running ? '' : 'run-pulse'}`}
          >
            {running ? (
              <span className="w-3.5 h-3.5 inline-block rounded-full border-2 border-[#9DFF00]/40 border-t-[#9DFF00] animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-[#9DFF00]" />
            )}
            <span className={`font-black uppercase tracking-widest text-[10px] ${compact ? "hidden xl:inline" : "inline"}`}>
              {running ? "Running…" : "Run"}
            </span>
          </button>
          <div className="w-[1px] bg-[#9DFF00]/20" />
          <button
            onClick={() => setAutoRun(!autoRun)}
            title={autoRun ? "Disable auto-run on type" : "Enable auto-run on type"}
            className={`inline-flex flex-col items-center justify-center px-3 py-1 transition-all ${autoRun
              ? "bg-[#9DFF00]/10 text-[#9DFF00] hover:bg-[#9DFF00]/20"
              : "text-[#9DFF00]/20 hover:text-[#9DFF00] hover:bg-[#9DFF00]/5"
              }`}
          >
            <span className="text-[7px] font-black uppercase tracking-tighter leading-tight">Auto</span>
            <span className="text-[8px] font-bold leading-tight opacity-80">{autoRun ? "On" : "Off"}</span>
          </button>
        </div>
      </div>

      {/* Group: Editor Config */}
      <div className={`flex items-center gap-2 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md`}>
        <div className="flex p-1 gap-1 rounded-xl bg-black/20">
          <SegBtn active={editor === "sandpack"} onClick={() => setEditor("sandpack")} title="CodeMirror (lightweight)">
            <Zap className="w-3.5 h-3.5" />
            <span className={compact ? "hidden xl:inline" : "inline"}>Basic</span>
          </SegBtn>
          <SegBtn active={editor === "monaco"} onClick={() => setEditor("monaco")} title="Monaco (VS Code engine)">
            <Rocket className="w-3.5 h-3.5" />
            <span className={compact ? "hidden xl:inline" : "inline"}>Monaco</span>
          </SegBtn>
        </div>

        <div className="flex items-center rounded-xl bg-black/20 h-9 px-2 gap-2 border border-white/5">
          <button onClick={() => setFontSize(f => Math.max(10, f - 1))} className="w-6 h-6 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition flex items-center justify-center font-black" title="Decrease">-</button>
          <div className="flex flex-col items-center justify-center min-w-[24px]">
             <span className="text-[10px] font-black text-[#FFE600] tabular-nums leading-none">{fontSize}</span>
             <span className="text-[6px] font-bold text-white/20 uppercase tracking-tighter">px</span>
          </div>
          <button onClick={() => setFontSize(f => Math.min(24, f + 1))} className="w-6 h-6 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition flex items-center justify-center font-black" title="Increase">+</button>
        </div>
      </div>

      {/* Group: Layout */}
      <div className={`flex items-center ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md`}>
        <div className="flex p-1 gap-1 rounded-xl bg-black/20">
          <SegBtn active={view === "preview"} onClick={() => setView("preview")} title={mode === "console" ? "Not applicable for console templates" : "Browser Preview"}>
            <div className={`flex items-center gap-1.5 ${mode === "console" ? "opacity-30 pointer-events-none" : ""}`}>
              <Eye className="w-3.5 h-3.5" />
              <span className={compact ? "hidden xl:inline" : "inline"}>Preview</span>
            </div>
          </SegBtn>
          <SegBtn active={view === "both"} onClick={() => setView("both")} title={mode === "console" ? "Not applicable for console templates" : "Split View"}>
            <div className={`flex items-center gap-1.5 ${mode === "console" ? "opacity-30 pointer-events-none" : ""}`}>
              <Layout className="w-3.5 h-3.5" />
              <span className={compact ? "hidden xl:inline" : "inline"}>Both</span>
            </div>
          </SegBtn>
          <SegBtn active={view === "console"} onClick={() => setView("console")} title="Console Output">
            <Terminal className="w-3.5 h-3.5" />
            <span className={compact ? "hidden xl:inline" : "inline"}>Console</span>
          </SegBtn>
        </div>
      </div>

    </div>
  );
}

type PlaygroundToolbarProps = {
  templateId: string;
  tplTitle: string;
  title: string;
  setTitle: (v: string) => void;
  dirty: boolean;
  setDirty: (v: boolean) => void;
  editable: boolean;
  signedIn: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  editor: "sandpack" | "monaco";
  setEditor: (v: "sandpack" | "monaco") => void;
  fontSize: number;
  setFontSize: (v: number | ((prev: number) => number)) => void;
  view: "preview" | "console" | "both";
  setView: (v: "preview" | "console" | "both") => void;
  autoRun: boolean;
  setAutoRun: (v: boolean) => void;
  snippetId: string | null;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  snippet: Snippet | null | undefined;
  isOwner: boolean;
  forking: boolean;
  handleSave: () => void;
  handleFork: () => void;
  handleShare: () => void;
  handleCopyEmbed: () => void;
  handlePopout: () => void;
  handleRun: () => void;
  running: boolean;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  tagInput: string;
  setTagInput: (v: string) => void;
  onToggleFiles?: () => void;
  onTogglePrompt?: () => void;
  tplMode?: "browser" | "console";
};

export default function PlaygroundToolbar({
  templateId, tplTitle, title, setTitle, dirty, setDirty,
  editable, signedIn, saving, lastSavedAt,
  editor, setEditor, fontSize, setFontSize, view, setView,
  snippetId, visibility, setVisibility, snippet, isOwner, forking,
  handleSave, handleFork, handleShare, handleCopyEmbed, handlePopout, handleRun, running,
  tags, setTags, tagInput, setTagInput, onToggleFiles, onTogglePrompt,
  autoRun, setAutoRun, tplMode
}: PlaygroundToolbarProps) {
  return (
    <div className="relative group/toolbar px-4 py-2 md:h-16 flex flex-col md:flex-row items-center gap-4 bg-[#050505]/60 backdrop-blur-3xl sticky top-0 z-[50]">
      {/* Visual Separator Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFE600]/20 to-transparent opacity-50" />
      
      {/* Group: Meta & Project Info */}
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-2xl shrink-0 min-w-[200px]">
        <div className="w-9 h-9 rounded-xl grid place-items-center bg-black/40 border border-white/5 shadow-inner group-hover/toolbar:border-[#FFE600]/30 transition-colors">
          <TemplateLogo id={templateId} size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              disabled={!editable}
              className="bg-transparent outline-none font-black text-sm tracking-tight text-white hover:text-[#FFE600] transition-colors focus:text-[#FFE600] w-[120px] lg:w-[180px]"
            />
            {editable && <Pencil className="w-3 h-3 text-white/20 group-hover/toolbar:text-[#FFE600]/40" />}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{tplTitle}</span>
            <span className="text-white/10 text-[9px]">•</span>
            {editable && signedIn && (
              <span className={`text-[9px] font-black uppercase tracking-tighter ${saving ? "text-white/20" : dirty ? "text-amber-400" : "text-[#9DFF00]"}`}>
                {saving ? "Syncing…" : dirty ? "Modified" : "Synced"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Controls (Desktop) */}
      <div className="hidden md:flex flex-1 items-center justify-center gap-4 min-w-0">
        <ControlButtons
          editor={editor} setEditor={setEditor}
          fontSize={fontSize} setFontSize={setFontSize}
          view={view} setView={setView}
          editable={editable} signedIn={signedIn} snippetId={snippetId}
          visibility={visibility} setVisibility={(v) => { setVisibility(v); setDirty(true); }}
          snippet={snippet} isOwner={isOwner}
          saving={saving} forking={forking}
          onSave={handleSave} onFork={handleFork} onShare={handleShare} onCopyEmbed={handleCopyEmbed} onPopout={handlePopout} onRun={handleRun} running={running}
          compact={true}
          onTogglePrompt={onTogglePrompt}
          autoRun={autoRun} setAutoRun={setAutoRun}
          mode={tplMode}
        />
      </div>

      {/* Right Section: Actions & Settings */}
      <div className="ml-auto flex items-center gap-3 shrink-0">
         <div className="hidden lg:flex items-center gap-3 border-r border-white/10 pr-3 mr-1">
            {/* Visibility Pill */}
            {editable && snippetId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 group-hover/toolbar:border-white/10 transition-colors">
                 <Lock className="w-3 h-3 text-white/20" />
                 <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                    className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <option value="private" className="bg-[#0A0A0A]">Private</option>
                    <option value="public" className="bg-[#0A0A0A]">Public</option>
                  </select>
              </div>
            )}

            {/* Tags */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <Tag className="w-3 h-3 text-white/20" />
              <div className="flex items-center gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="text-[9px] font-bold text-[#FFE600]/60 hover:text-[#FFE600] transition-colors cursor-default">#{t}</span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const v = tagInput.trim().replace(/^#/, "");
                      if (v && !tags.includes(v)) { setTags(prev => [...prev, v]); setDirty(true); }
                      setTagInput("");
                    }
                  }}
                  placeholder="+ tag"
                  className="bg-transparent outline-none text-[9px] font-bold text-white/20 placeholder:text-white/10 w-12 focus:w-20 transition-all"
                />
              </div>
            </div>
         </div>

         <div className="flex items-center gap-2">
           <ShortcutsModal />

           {snippetId && (
              <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
                <button
                  onClick={handleShare}
                  title="Copy shareable link"
                  className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyEmbed}
                  title="Copy embed iframe code"
                  className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>
           )}

           {snippet && !isOwner && (
              <button
                onClick={handleFork}
                disabled={forking}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFE600] text-black text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,230,0,0.2)]"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{forking ? "Forking…" : "Fork"}</span>
              </button>
           )}

           <button
              onClick={handleSave}
              disabled={saving}
              title={signedIn ? "Save (Ctrl/Cmd+S)" : "Sign in to save"}
              className={`relative group/save overflow-hidden inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 ${signedIn
                  ? "bg-[#FFE600] text-black shadow-[0_0_20px_rgba(255,230,0,0.3)] hover:scale-105 active:scale-95"
                  : "bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                }`}
            >
              <Save className={`w-4 h-4 ${signedIn ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{saving ? "Saving…" : signedIn ? "Save" : "Sign in"}</span>
              {signedIn && (
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/save:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
              )}
            </button>

           <button
              onClick={handlePopout}
              title="New Tab"
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-all"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
         </div>
      </div>

      {/* Mobile Control Bridge */}
      <div className="md:hidden flex items-center gap-2 px-4 pb-2 w-full">
         <button onClick={onToggleFiles} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 shrink-0"><PanelLeft className="w-4 h-4" /></button>
         <div className="flex-1 overflow-x-auto no-scrollbar">
            <ControlButtons
              editor={editor} setEditor={setEditor}
              fontSize={fontSize} setFontSize={setFontSize}
              view={view} setView={setView}
              editable={editable} signedIn={signedIn} snippetId={snippetId}
              visibility={visibility} setVisibility={(v) => { setVisibility(v); setDirty(true); }}
              snippet={snippet} isOwner={isOwner}
              saving={saving} forking={forking}
              onSave={handleSave} onFork={handleFork} onShare={handleShare} onCopyEmbed={handleCopyEmbed} onPopout={handlePopout} onRun={handleRun} running={running}
              compact
              onTogglePrompt={onTogglePrompt}
              autoRun={autoRun} setAutoRun={setAutoRun}
            />
         </div>
      </div>
    </div>
  );
}
