"use client";

import { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useTheme } from "next-themes";
import { Play, RotateCw, X, Terminal } from "lucide-react";
import MonacoEditor from "./MonacoEditor";

interface RunnableSnippetProps {
  code: string;
  language: string;
  autorun?: boolean;
}

type Template = "vanilla" | "vanilla-ts" | "react" | "react-ts" | "static";

function resolveTemplate(language: string): {
  template: Template;
  fileName: string;
  kind: "console" | "preview";
} {
  switch (language) {
    case "react":
    case "jsx":
      return { template: "react", fileName: "App.js", kind: "preview" };
    case "react-ts":
    case "tsx":
      return { template: "react-ts", fileName: "App.tsx", kind: "preview" };
    case "html":
      return { template: "static", fileName: "index.html", kind: "preview" };
    case "css":
      return { template: "static", fileName: "styles.css", kind: "preview" };
    case "typescript":
    case "ts":
      return { template: "vanilla-ts", fileName: "index.ts", kind: "console" };
    case "javascript":
    case "js":
    default:
      return { template: "vanilla", fileName: "index.js", kind: "console" };
  }
}

const nbpDarkTheme = {
  colors: {
    surface1: "#0a0b10",
    surface2: "#11131a",
    surface3: "#181c26",
    clickable: "#7b8496",
    base: "#e8ebf2",
    disabled: "#3f4451",
    hover: "#FFE600",
    accent: "#FFE600",
    error: "#ff4d4d",
    errorSurface: "#1a0000",
  },
  syntax: {
    plain: "#e8ebf2",
    comment: { color: "#6b7280", fontStyle: "italic" as const },
    keyword: "#D2A8FF",
    tag: "#D2A8FF",
    punctuation: "#7b8496",
    definition: "#FFE600",
    property: "#FFE600",
    static: "#FF9B71",
    string: "#A5D6FF",
  },
  font: {
    body: 'var(--font-sans), Inter, sans-serif',
    mono: 'var(--font-mono), "Fira Code", monospace',
    size: "13px",
    lineHeight: "1.6",
  },
};

const nbpLightTheme = {
  colors: {
    surface1: "#ffffff",
    surface2: "#f8fafc",
    surface3: "#f1f5f9",
    clickable: "#64748b",
    base: "#1e293b",
    disabled: "#94a3b8",
    hover: "#f87171",
    accent: "#f87171",
    error: "#ef4444",
    errorSurface: "#fef2f2",
  },
  syntax: {
    plain: "#1e293b",
    comment: { color: "#94a3b8", fontStyle: "italic" as const },
    keyword: "#be185d",
    tag: "#be185d",
    punctuation: "#64748b",
    definition: "#0369a1",
    property: "#92400e",
    static: "#c2410c",
    string: "#15803d",
  },
  font: {
    body: 'var(--font-sans), Inter, sans-serif',
    mono: 'var(--font-mono), "Fira Code", monospace',
    size: "13px",
    lineHeight: "1.6",
  },
};

export default function RunnableSnippet({ code, language, autorun = false }: RunnableSnippetProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="my-10 rounded-2xl h-48 animate-pulse bg-surface/30 border border-border/20" />
    );
  }

  const { template, fileName, kind } = resolveTemplate(language);

  // Auto-size editor to roughly fit the code.
  const lineCount = Math.max(1, code.split("\n").length);
  const editorHeight = Math.min(600, Math.max(120, lineCount * 24 + 48));

  return (
    <div className={`my-12 rounded-2xl overflow-hidden transition-all duration-500 group/snippet border ${
      isDark
        ? "border-accent/25 bg-white/[0.04] shadow-xl shadow-black/40"
        : "border-accent/30 bg-[#fcfdfe] shadow-lg shadow-black/5"
    }`}>
      <SandpackProvider
        template={template}
        theme={isDark ? nbpDarkTheme : nbpLightTheme}
        files={{ 
          [`/${fileName}`]: code,
          ...(language === "html" || language === "css" ? { "/index.js": { code: "// HTML/CSS mode: disable default JS", hidden: true } } : {})
        }}
        options={{
          activeFile: `/${fileName}`,
          autorun: autorun,
          autoReload: true,
          initMode: "lazy",
          recompileMode: "delayed",
          recompileDelay: 300,
        }}
      >
        <PlaygroundBody language={language} kind={kind} editorHeight={editorHeight} isDark={isDark} autorun={autorun} />
      </SandpackProvider>
    </div>
  );
}

/**
 * Inner body that owns the "running" state.
 */
function PlaygroundBody({
  language,
  kind,
  editorHeight,
  isDark,
  autorun,
}: {
  language: string;
  kind: "console" | "preview";
  editorHeight: number;
  isDark: boolean;
  autorun: boolean;
}) {
  const { sandpack } = useSandpack();
  const [running, setRunning] = useState(autorun);

  function handleRun() {
    sandpack.runSandpack();
    setRunning(true);
  }

  function handleHide() {
    setRunning(false);
  }

  const OUTPUT_HEADER_PX = 36;
  const outputHeight = Math.max(40, editorHeight - OUTPUT_HEADER_PX);

  return (
    <div className="flex flex-col h-full">
      {/* Single top toolbar */}
      <div className={`px-6 py-4 border-b flex items-center justify-between ${
        isDark ? "border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent" : "border-black/5 bg-gradient-to-b from-black/[0.01] to-transparent"
      }`}>
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex gap-2 shrink-0">
            <div className={`w-3 h-3 rounded-full bg-[#ff5f56] ${isDark ? "shadow-[0_0_8px_rgba(255,95,86,0.2)]" : ""}`} />
            <div className={`w-3 h-3 rounded-full bg-[#ffbd2e] ${isDark ? "shadow-[0_0_8px_rgba(255,189,46,0.2)]" : ""}`} />
            <div className={`w-3 h-3 rounded-full bg-[#27c93f] ${isDark ? "shadow-[0_0_8px_rgba(39,201,63,0.2)]" : ""}`} />
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-[11px] font-black uppercase tracking-[0.3em] font-sans ${isDark ? "text-accent/80" : "text-accent"}`}>
              Playground
            </span>
            <div className={`h-4 w-px mx-1 ${isDark ? "bg-white/10" : "bg-black/10"}`} />
            <span className={`text-[10px] font-mono lowercase truncate px-2.5 py-1 rounded-md border ${
              isDark ? "text-white/30 bg-white/[0.03] border-white/5" : "text-black/40 bg-black/[0.03] border-black/5"
            }`}>
              {language}
            </span>
          </div>
        </div>
        <button
          onClick={handleRun}
          aria-label={running ? "Re-run" : "Run"}
          title={running ? "Re-run" : "Run"}
          // h-9 pinned on both states so only the WIDTH animates as the button
          // morphs between "Run Snippet" pill (idle) and the round Reset icon
          // (running). Without this, the running state was 4px taller and the
          // whole toolbar reflowed vertically during the 500ms transition,
          // producing a visible header shrink/expand wobble.
          className={`group relative h-9 shrink-0 flex items-center justify-center transition-all duration-500 overflow-hidden ${
            running
              ? `w-9 rounded-full border ${isDark ? "text-white/40 hover:text-white hover:bg-white/10 border-white/5" : "text-black/40 hover:text-black hover:bg-black/5 border-black/5"}`
              : "px-6 rounded-full bg-gradient-to-r from-accent to-accent-soft text-bg font-black text-[11px] uppercase tracking-widest shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95"
          }`}
        >
          {running ? (
            <RotateCw className="w-4 h-4" />
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current mr-2 relative z-10" />
              <span className="relative z-10">Run Snippet</span>
              {/* Press/hover sheen — black/10 reads cleanly against both the
                  yellow (dark) and red (light) accents; white/20 was washed
                  on top of the yellow gradient in dark mode. */}
              <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </>
          )}
        </button>
      </div>

      {/* Editor + (optional) output */}
      <div className={`flex flex-col md:flex-row relative ${!isDark && "bg-surface/50"}`}>
        <div
          className={`min-w-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] relative ${
            running ? "md:w-1/2 w-full" : "w-full"
          }`}
          style={{ height: editorHeight }}
        >
          <MonacoEditor fontSize={13} readOnly={false} />
        </div>

        {running && (
          <div
            className={`min-w-0 md:w-1/2 w-full border-t md:border-t-0 md:border-l
                       animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-right-12 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                         isDark ? "border-white/10" : "border-black/10"
                       }`}
          >
            <div className={`flex items-center justify-between px-4 py-1.5 border-b ${
              isDark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-black/[0.01]"
            }`}>
              <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] ${
                isDark ? "text-white/50" : "text-black/50"
              }`}>
                <Terminal className={`w-3 h-3 ${isDark ? "text-accent/40" : "text-accent/40"}`} />
                {kind === "preview" ? "Preview" : "Console"}
              </div>
              <button
                onClick={handleHide}
                title="Hide output"
                className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                  isDark ? "text-white/10 hover:text-white hover:bg-white/5" : "text-black/10 hover:text-black hover:bg-black/5"
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div style={{ height: outputHeight }} className={`overflow-hidden ${isDark ? "bg-bg/60" : "bg-white"}`}>
              {kind === "preview" ? (
                <SandpackPreview
                  showOpenInCodeSandbox={false}
                  showRefreshButton
                  style={{ height: "100%" }}
                />
              ) : (
                <SandpackConsole style={{ height: "100%" }} resetOnPreviewRestart />
              )}
            </div>
          </div>
        )}
      </div>

      {/*
        Console host for vanilla JS / TS playgrounds. Always mounted (not
        gated on `running`) so the Sandpack bundler can register the iframe
        client up-front; when the user clicks Run, `runSandpack()` then has a
        registered client to boot. Gating mount on `running` created a race
        where runSandpack() fired before the iframe existed and the bundler
        never started.
      */}
      {kind === "console" && (
        <div
          aria-hidden
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
        >
          <SandpackPreview showOpenInCodeSandbox={false} />
        </div>
      )}
    </div>
  );
}
