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

interface RunnableSnippetProps {
  code: string;
  language: string;
}

type Template = "vanilla" | "vanilla-ts" | "react" | "react-ts";

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
    case "typescript":
    case "ts":
      return { template: "vanilla-ts", fileName: "index.ts", kind: "console" };
    case "javascript":
    case "js":
    default:
      return { template: "vanilla", fileName: "index.js", kind: "console" };
  }
}

export default function RunnableSnippet({ code, language }: RunnableSnippetProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="my-8 rounded-xl h-32 animate-pulse bg-surface/30" />
    );
  }

  const { template, fileName, kind } = resolveTemplate(language);

  // Auto-size editor to roughly fit the code. ~22px per line of CodeMirror,
  // plus a little chrome; clamp so tiny snippets aren't ugly and huge ones
  // don't fill the viewport.
  const lineCount = Math.max(1, code.split("\n").length);
  const editorHeight = Math.min(480, Math.max(96, lineCount * 22 + 28));

  return (
    <div className="my-8 rounded-xl overflow-hidden">
      <SandpackProvider
        template={template}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        files={{ [`/${fileName}`]: code }}
        options={{
          // Lazy init: bundler doesn't even load until the user clicks Run.
          autorun: false,
          autoReload: true,
          initMode: "lazy",
          recompileMode: "delayed",
          recompileDelay: 300,
        }}
      >
        <PlaygroundBody language={language} kind={kind} editorHeight={editorHeight} />
      </SandpackProvider>
    </div>
  );
}

/**
 * Inner body that owns the "running" state. Lives inside SandpackProvider so it
 * can call `runSandpack()` (which boots the bundler on demand).
 */
function PlaygroundBody({
  language,
  kind,
  editorHeight,
}: {
  language: string;
  kind: "console" | "preview";
  editorHeight: number;
}) {
  const { sandpack } = useSandpack();
  const [running, setRunning] = useState(false);

  function handleRun() {
    sandpack.runSandpack();
    setRunning(true);
  }

  function handleHide() {
    setRunning(false);
  }

  // Output column has a small header strip; subtract its height so the
  // overall column matches the editor next to it.
  const OUTPUT_HEADER_PX = 28;
  const outputHeight = Math.max(40, editorHeight - OUTPUT_HEADER_PX);

  return (
    <div className="flex flex-col">
      {/* Single top toolbar — label on left, run/reset on right */}
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between bg-panel/40">
        <div className="flex items-center gap-2 min-w-0">
          <Play className="w-3 h-3 text-accent fill-current shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">
            Playground
          </span>
          <span className="text-[10px] font-mono text-muted/60 lowercase truncate">
            {language}
          </span>
        </div>
        <button
          onClick={handleRun}
          aria-label={running ? "Re-run" : "Run"}
          title={running ? "Re-run" : "Run"}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition ${
            running
              ? "text-muted hover:text-fg hover:bg-elevated"
              : "text-accent hover:bg-accent/10"
          }`}
        >
          {running ? <RotateCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
      </div>

      {/* Editor + (optional) output */}
      <div className="flex flex-col md:flex-row">
        <div
          className={`min-w-0 transition-all duration-300 ${
            running ? "md:w-1/2 w-full" : "w-full"
          }`}
        >
          <SandpackCodeEditor
            showLineNumbers
            showTabs={false}
            showRunButton={false}
            wrapContent
            style={{ height: editorHeight }}
          />
        </div>

        {running && (
          <div
            className="min-w-0 md:w-1/2 w-full border-t md:border-t-0 md:border-l border-border
                       animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-right-4 duration-300"
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-panel/30">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                <Terminal className="w-2.5 h-2.5" />
                {kind === "preview" ? "Preview" : "Console"}
              </div>
              <button
                onClick={handleHide}
                title="Hide output"
                className="w-5 h-5 rounded text-muted hover:text-fg hover:bg-elevated transition flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div style={{ height: outputHeight }} className="overflow-hidden">
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
        For console-only playgrounds (vanilla JS/TS), we still need the iframe
        client to be mounted somewhere so that code actually executes —
        SandpackConsole only displays messages, it doesn't run anything.
        Render a zero-size, off-screen Preview as the iframe host.
      */}
      {kind === "console" && running && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <SandpackPreview showOpenInCodeSandbox={false} />
        </div>
      )}
    </div>
  );
}
