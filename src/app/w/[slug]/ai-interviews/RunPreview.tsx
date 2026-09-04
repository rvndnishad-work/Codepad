"use client";

import { useState } from "react";
import { SandpackPreview } from "@codesandbox/sandpack-react";
import ShimmedSandpackProvider from "@/components/ShimmedSandpackProvider";
import { RotateCcw, Loader2 } from "lucide-react";

/**
 * Live runner for a candidate's submitted workspace. Recruiters can execute
 * the exact code that was graded instead of reading static text.
 */
export default function RunPreview({ files }: { files: Record<string, string> }) {
  const [runKey, setRunKey] = useState(0);
  const isReact = Object.keys(files).some((f) => f.endsWith(".jsx") || /from ["']react["']/.test(files[f] ?? ""));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
          Live execution of submitted code
        </span>
        <button
          type="button"
          onClick={() => setRunKey((k) => k + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:bg-elevated hover:border-accent/40 text-[10px] font-bold text-muted hover:text-fg transition cursor-pointer"
        >
          Re-run
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border border-border bg-[#0d1117] h-[420px] relative">
        <ShimmedSandpackProvider
          key={runKey}
          template={isReact ? "react" : "vanilla"}
          theme="dark"
          files={files}
          options={{
            initMode: "immediate",
            recompileMode: "delayed",
            recompileDelay: 500,
          }}
        >
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ height: "100%" }}
          />
        </ShimmedSandpackProvider>
      </div>
    </div>
  );
}
