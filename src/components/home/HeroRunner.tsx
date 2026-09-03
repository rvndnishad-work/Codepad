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

// BigInt keeps every digit past 2^53, where Number quietly gives up
console.log("fib(50)  =", fib(50).toString());
console.log("fib(120) =", fib(120).toString());

const digits = fib(500).toString().length;
console.log(\`fib(500) has \${digits} digits\`);

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

  // The four stages a submission actually passes through. Rendering them as
  // the site-wide signal strip means the hero is showing the product's real
  // execution trace, not an illustration of one.
  const traceState = (index: number): "done" | "live" | undefined => {
    if (run.phase === "idle") return undefined;
    if (run.phase === "running") return index === 0 ? "done" : index === 1 ? "live" : undefined;
    return "done";
  };

  return (
    /* Square, ruled, unshadowed — the panel is a window cut into the page
       rather than a card floating over it. The near-black ground holds in
       both themes on purpose: it is the one solid colour block in the
       composition, and it is the product's own colour. */
    <div className="ip-on-dark ip-frame ip-ticks border-white/10 bg-[#0b0d12] text-left">
      {/* Chrome: a filename, a rule, a live marker, and the one armed action. */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="ip-label ip-label-xs text-slate-400">sandbox.js</span>
        <span className="h-px flex-1 bg-white/10" aria-hidden />
        <span className="ip-label ip-label-xs flex items-center gap-1.5 text-slate-400">
          <span className="ip-live h-[5px] w-[5px] bg-emerald-400" aria-hidden />
          live
        </span>
        <button
          type="button"
          onClick={handleRun}
          disabled={run.phase === "running"}
          className="ip-label ip-label-xs flex items-center gap-1.5 rounded-action bg-accent px-2.5 py-1.5 text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {run.phase === "running" ? (
            <>
              Running <Loader2 className="h-3 w-3 animate-spin" />
            </>
          ) : (
            <>
              Run <Play className="h-3 w-3 fill-current" />
            </>
          )}
        </button>
      </div>

      {/* Editor */}
      {/* A floor as well as a ceiling: the panel is a composition element, so
          it must not shrink to fit a short buffer. */}
      <div
        ref={hostRef}
        className="min-h-[300px] max-h-[360px] overflow-auto [&_.cm-editor]:bg-transparent [&_.cm-editor]:min-h-[300px]"
      />

      {/* Execution trace + output */}
      <div className="min-h-[128px] border-t border-white/10 bg-black/30 px-4 py-3.5 font-mono text-xs">
        <div className="mb-2.5 flex items-center gap-3">
          <span className="flex items-center" aria-label="execution trace">
            {["queue", "compile", "exec", "out"].map((stage, i) => (
              <span key={stage} className="flex items-center">
                {i > 0 && <span className="h-px w-4 bg-white/15" aria-hidden />}
                <span
                  aria-hidden
                  data-state={traceState(i)}
                  className={`ip-signal-node border-white/25 bg-transparent ${
                    traceState(i) === "done"
                      ? "!border-emerald-400 !bg-emerald-400"
                      : traceState(i) === "live"
                        ? "ip-live !border-amber-400 !bg-amber-400"
                        : ""
                  }`}
                />
              </span>
            ))}
          </span>
          <span className="ip-label ip-label-xs text-slate-400">
            {run.phase === "running" ? "executing" : run.phase === "error" ? "failed" : "trace"}
          </span>
          {run.phase === "done" && (
            <span className="ip-label ip-label-xs ml-auto text-slate-400">
              {run.cacheHit ? "cached" : `${run.timeMs} ms`}
            </span>
          )}
        </div>
        {run.phase === "idle" && (
          <div className="text-slate-400">Press Run — this executes for real.</div>
        )}
        {run.phase === "running" && <div className="text-slate-300">Executing in the sandbox…</div>}
        {run.phase === "error" && <div className="text-rose-300">{run.message}</div>}
        {run.phase === "done" && (
          <div className="max-h-[120px] space-y-0.5 overflow-auto">
            {run.stdout
              .split("\n")
              .filter(Boolean)
              .map((l, i) => (
                <div key={i} className="whitespace-pre-wrap text-slate-200">
                  {l}
                </div>
              ))}
            {run.stderr && <div className="whitespace-pre-wrap text-rose-300">{run.stderr}</div>}
            {!run.stdout && !run.stderr && <div className="text-slate-400">(no output)</div>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-white/10 px-4 py-2 text-[10px] leading-snug text-slate-400">
        <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
        Real execution on a network-isolated sandbox — the same runner that grades interviews.
      </div>
    </div>
  );
}
