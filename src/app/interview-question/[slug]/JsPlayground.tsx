"use client";

import { useRef, useState } from "react";
import { Play, RotateCcw, Loader2, ChevronRight, Trash2, ExternalLink } from "lucide-react";
import CodeMirrorEditor from "./CodeMirrorEditor";
import { playgroundFilesHref } from "@/lib/playground-handoff";

type LogLine = { type: "log" | "warn" | "error"; text: string };

/**
 * An editable, runnable JavaScript snippet. Code executes inside a Web Worker
 * (no DOM access) with a hard timeout, so an accidental infinite loop in an
 * edited example terminates instead of freezing the tab. console.* output is
 * captured and shown below. UI follows the app's light/dark theme.
 */
const WORKER_SRC = `
self.onmessage = function (e) {
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v); }
    catch (_) { return String(v); }
  }
  function send(type, args) {
    self.postMessage({ kind: 'log', type: type, text: Array.prototype.map.call(args, fmt).join(' ') });
  }
  var sandbox = {
    log:   function () { send('log', arguments); },
    info:  function () { send('log', arguments); },
    debug: function () { send('log', arguments); },
    warn:  function () { send('warn', arguments); },
    error: function () { send('error', arguments); },
  };
  try {
    var fn = new Function('console', e.data);
    var result = fn(sandbox);
    if (result !== undefined) send('log', ['=> ' + fmt(result)]);
  } catch (err) {
    self.postMessage({ kind: 'log', type: 'error', text: fmt(err) });
  }
  self.postMessage({ kind: 'syncDone' });
};
`;

/** Build a practice stub from the question's title and description. */
function buildPracticeStub(title: string, description: string): string {
  // Wrap the description as a JSDoc-style comment block
  const descLines = description
    .split("\n")
    .map((line) => ` * ${line}`)
    .join("\n");
  return [
    `/**`,
    ` * ${title}`,
    ` *`,
    descLines,
    ` */`,
    ``,
    `// Write your solution below:`,
    ``,
  ].join("\n");
}

export default function JsPlayground({
  code,
  label,
  title,
  description,
  backFrom,
}: {
  code: string;
  label?: string;
  /** Question title — used to build the practice stub. */
  title?: string;
  /** Question description / problem statement — used to build the practice stub. */
  description?: string;
  /** The originating question URL so the playground shows a "Back" button. */
  backFrom?: string;
}) {
  const [src, setSrc] = useState(code.trim());
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  function cleanup() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  function run() {
    cleanup();
    setLogs([]);
    setHasRun(true);
    setRunning(true);
    const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    const collected: LogLine[] = [];
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (extra?: LogLine) => {
      if (extra) collected.push(extra);
      cleanup();
      if (graceTimer) clearTimeout(graceTimer);
      clearTimeout(hardTimer);
      setLogs(collected.length ? [...collected] : [{ type: "log", text: "(no output)" }]);
      setRunning(false);
    };

    // Hard cap: kills infinite loops (the worker thread can't report back).
    const hardTimer = setTimeout(() => finish({ type: "warn", text: "⏱ stopped after 3s" }), 3000);

    worker.onmessage = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.kind === "log") {
        collected.push({ type: m.type, text: m.text });
        setLogs([...collected]);
      } else if (m.kind === "syncDone") {
        // Let pending async (timeouts/promises) emit briefly, then stop.
        graceTimer = setTimeout(() => finish(), 1200);
      }
    };
    worker.onerror = (e) => finish({ type: "error", text: e.message });
    worker.postMessage(src);
  }

  const logColor = (t: LogLine["type"]) =>
    t === "error"
      ? "text-rose-600 dark:text-rose-400"
      : t === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-border bg-bg/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-amber-400/15 text-amber-500 border border-amber-400/20">
            <span className="w-1.5 h-1.5 rounded-sm bg-amber-400" /> JS
          </span>
          {label && <span className="text-xs font-bold text-muted truncate">{label}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setSrc(code.trim()); setLogs([]); setHasRun(false); }}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition"
            title="Reset to original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {title && description && (
            <a
              href={playgroundFilesHref(
                {
                  "/index.js": buildPracticeStub(title, description),
                  "/solution.js": code.trim(),
                },
                "empty-js",
                backFrom,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 text-accent text-xs font-black uppercase tracking-wider hover:bg-accent/10 transition shadow-sm"
              title="Open in playground with a practice stub to solve"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Practice
            </a>
          )}
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-60 shadow-sm"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run
          </button>
        </div>
      </div>

      {/* Editor — surface + theme match CodeExample's static .iq-hl block */}
      <div>
        <CodeMirrorEditor value={src} onChange={setSrc} />
      </div>

      {/* Output console */}
      {hasRun && (
        <div className="border-t border-border bg-bg/60">
          <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted">
              <ChevronRight className="w-3 h-3" /> Console
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => { setLogs([]); setHasRun(false); }}
                className="text-muted/70 hover:text-fg transition"
                title="Clear output"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="px-3.5 py-2.5 font-mono text-[12px] leading-relaxed space-y-0.5 max-h-60 overflow-auto">
            {running && logs.length === 0 ? (
              <div className="text-muted flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> running…</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={`whitespace-pre-wrap ${logColor(l.type)}`}>{l.text}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
