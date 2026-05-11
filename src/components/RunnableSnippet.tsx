"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import { useTheme } from "next-themes";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";

interface RunnableSnippetProps {
  code: string;
  language: string;
}

export default function RunnableSnippet({ code, language }: RunnableSnippetProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="my-10 rounded-[32px] border border-border bg-panel/30 h-[400px] animate-pulse flex items-center justify-center">
       <span className="text-[10px] font-black uppercase tracking-widest text-muted">Loading Playground...</span>
    </div>
  );
  
  // Map common languages to Sandpack templates
  let template: "vanilla" | "react" | "vue" | "svelte" | "vanilla-ts" | "react-ts" = "vanilla";
  let fileName = "index.js";

  if (language === "javascript" || language === "js") {
    template = "vanilla";
    fileName = "index.js";
  } else if (language === "typescript" || language === "ts") {
    template = "vanilla-ts";
    fileName = "index.ts";
  } else if (language === "react" || language === "jsx") {
    template = "react";
    fileName = "App.js";
  } else if (language === "react-ts" || language === "tsx") {
    template = "react-ts";
    fileName = "App.tsx";
  }

  return (
    <div className="my-10 rounded-[32px] overflow-hidden border border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-panel group">
      <div className="px-6 py-4 border-b border-border bg-panel/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
            <Play className="w-3.5 h-3.5 text-accent fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Live Playground</span>
            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{language} mode active</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
        </div>
      </div>
      
      <div className="relative">
        <Sandpack
          template={template}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          files={{
            [`/${fileName}`]: code,
          }}
          options={{
            showConsole: true,
            showConsoleButton: true,
            editorHeight: 400,
            showLineNumbers: true,
            closableTabs: false,
            autorun: false,
          }}
        />
      </div>
      
      <div className="px-6 py-3 bg-panel/30 border-t border-border flex items-center justify-between">
        <p className="text-[10px] font-medium text-muted/60 italic">
          Try editing the code above and click "Run" to see the results.
        </p>
      </div>
    </div>
  );
}
