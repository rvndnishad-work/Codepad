"use client";

import { useEffect, useRef, useState } from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark, oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { Loader2, Play, ShieldCheck } from "lucide-react";

/**
 * The homepage's "try it before you sign up" editor. This is NOT a simulation:
 * Run posts the buffer to /api/execute, which executes it on the same
 * network-isolated Piston sandbox that grades real interviews. Guests get a
 * small per-minute budget from the API's rate limiter.
 */
const DEFAULT_CODE = `// This runs on Interviewpad's real sandbox — edit me and hit Run
function fib(n) {
  let [a, b] = [0n, 1n];
  while (n-- > 0) [a, b] = [b, a + b];
  return a;
}

console.log("fib(50) =", fib(50).toString());
console.log("Try changing the code ↑");
`;

type RunState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "done"; stdout: string; stderr: string; timeMs: number; cacheHit?: boolean }
  | { phase: "error"; message: string };

export default function HeroRunner() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [run, setRun] = useState<RunState>({ phase: "idle" });

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: DEFAULT_CODE,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript(),
          oneDark,
          syntaxHighlighting(oneDarkHighlightStyle),
          EditorView.theme({
            "&": { fontSize: "13px", backgroundColor: "transparent" },
            ".cm-gutters": { backgroundColor: "transparent", border: "none" },
            ".cm-content": { fontFamily: "var(--font-mono, monospace)" },
            "&.cm-focused": { outline: "none" },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  async function handleRun() {
    if (!viewRef.current || run.phase === "running") return;
    setRun({ phase: "running" });
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: "javascript",
          code: viewRef.current.state.doc.toString(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 429) {
        setRun({ phase: "error", message: "You're running code fast! Give it a minute — or sign up for a bigger budget." });
        return;
      }
      if (!res.ok || !data) {
        setRun({ phase: "error", message: data?.error ?? "The sandbox hiccuped. Try again in a moment." });
        return;
      }
      setRun({
        phase: "done",
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
        timeMs: data.timeMs ?? 0,
        cacheHit: data.cacheHit,
      });
    } catch {
      setRun({ phase: "error", message: "Network error — check your connection and try again." });
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-[#0d1117] shadow-2xl overflow-hidden text-left">
      {/* Chrome bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
        <div className="flex gap-1.5" aria-hidden>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">sandbox.js — live</span>
        <button
          type="button"
          onClick={handleRun}
          disabled={run.phase === "running"}
          className="ml-auto flex items-center gap-1.5 text-bg bg-accent font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md hover:brightness-95 disabled:opacity-60 transition-all"
        >
          {run.phase === "running" ? (
            <>
              Running <Loader2 className="w-3 h-3 animate-spin" />
            </>
          ) : (
            <>
              Run <Play className="w-3 h-3 fill-current" />
            </>
          )}
        </button>
      </div>

      {/* Editor */}
      <div ref={hostRef} className="max-h-[240px] overflow-auto [&_.cm-editor]:bg-transparent" />

      {/* Output */}
      <div className="border-t border-white/10 bg-black/30 px-4 py-3 font-mono text-xs min-h-[84px]">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              run.phase === "running"
                ? "bg-amber-400 animate-pulse"
                : run.phase === "done"
                  ? "bg-emerald-400"
                  : run.phase === "error"
                    ? "bg-rose-400"
                    : "bg-slate-600"
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">Output</span>
          {run.phase === "done" && (
            <span className="ml-auto text-[10px] text-slate-500">
              {run.cacheHit ? "cached" : `${run.timeMs} ms`}
            </span>
          )}
        </div>
        {run.phase === "idle" && <div className="text-slate-500 italic">Press Run — this executes for real.</div>}
        {run.phase === "running" && <div className="text-slate-400">Executing in the sandbox…</div>}
        {run.phase === "error" && <div className="text-rose-300">{run.message}</div>}
        {run.phase === "done" && (
          <div className="space-y-0.5 max-h-[120px] overflow-auto">
            {run.stdout
              .split("\n")
              .filter(Boolean)
              .map((l, i) => (
                <div key={i} className="text-slate-200 whitespace-pre-wrap">{l}</div>
              ))}
            {run.stderr && <div className="text-rose-300 whitespace-pre-wrap">{run.stderr}</div>}
            {!run.stdout && !run.stderr && <div className="text-slate-500 italic">(no output)</div>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 border-t border-white/10 text-[10px] text-slate-500">
        <ShieldCheck className="w-3 h-3 text-emerald-500" aria-hidden />
        Real execution on a network-isolated sandbox — the same runner that grades interviews.
      </div>
    </div>
  );
}
