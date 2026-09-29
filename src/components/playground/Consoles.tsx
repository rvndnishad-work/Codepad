"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useSandpackConsole } from "@codesandbox/sandpack-react";
import { AlertTriangle, ChevronRight, Copy, History, Info, Terminal, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatConsoleArgs } from "@/lib/console-value";
import type { RunSummary } from "@/lib/exec-result";
import { ConsoleArgTree } from "./ConsoleValue";
import type { BackendLog, RunRecord } from "./useRunner";

/** Most rows a console renders; older entries drop off the top. */
const MAX_ROWS = 300;

export const RUN_SHORTCUT =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘↵" : "Ctrl+↵";

type Level = "error" | "warn" | "info" | "log";
type Filter = "all" | "error" | "warn" | "log";

function levelOf(method: string): Level {
  if (method === "error") return "error";
  if (method === "warn") return "warn";
  if (method === "info" || method === "debug") return "info";
  return "log";
}

const ROW_STYLE: Record<Level, { row: string; icon: ReactNode }> = {
  error: {
    row: "border-l-2 border-danger bg-danger/[0.06] text-danger",
    icon: <XCircle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-danger" aria-label="Error" />,
  },
  warn: {
    row: "border-l-2 border-warning bg-warning/[0.06] text-warning",
    icon: <AlertTriangle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-warning" aria-label="Warning" />,
  },
  info: {
    row: "border-l-2 border-secondary/60",
    icon: <Info className="mt-[3px] h-3.5 w-3.5 shrink-0 text-secondary" aria-label="Info" />,
  },
  log: {
    row: "border-l-2 border-transparent",
    icon: <ChevronRight className="mt-[3px] h-3 w-3 shrink-0 text-subtle" aria-hidden />,
  },
};

/** Calm empty state shared by both consoles. */
export function ConsoleEmpty({ title, hint }: { title: string; hint: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
      <Terminal className="h-5 w-5 text-subtle" aria-hidden />
      <p className="text-[14px] font-medium text-fg">{title}</p>
      <p className="max-w-[280px] text-[13px] leading-relaxed text-subtle">{hint}</p>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border-strong bg-panel px-1 py-px font-mono text-[12px] text-muted">
      {children}
    </kbd>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Output copied");
  } catch {
    toast.error("Could not copy. Select the text instead.");
  }
}

/** Follow the tail like a real console, unless the reader scrolled up. */
function useTailScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [dep]);
  const onScroll = () => {
    const el = ref.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };
  return { ref, onScroll };
}

/** Segmented filter with counts; only levels that occur are offered. */
function FilterBar({
  counts,
  value,
  onChange,
  actions,
}: {
  counts: Record<Filter, number>;
  value: Filter;
  onChange: (f: Filter) => void;
  actions?: ReactNode;
}) {
  const options: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "error", label: "Errors" },
    { id: "warn", label: "Warnings" },
    { id: "log", label: "Logs" },
  ];
  return (
    <div className="flex h-8 shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-border bg-bg px-2">
      <div role="radiogroup" aria-label="Filter console output" className="flex items-center gap-0.5">
        {options
          .filter((o) => o.id === "all" || counts[o.id] > 0)
          .map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={value === o.id}
              onClick={() => onChange(o.id)}
              className={`flex h-6 items-center gap-1 whitespace-nowrap rounded px-2 text-[12px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                value === o.id ? "bg-panel text-fg" : "text-subtle hover:text-fg"
              }`}
            >
              {o.label}
              <span className="tabular-nums text-subtle">{counts[o.id]}</span>
            </button>
          ))}
      </div>
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy output"
      aria-label="Copy output"
      className="grid h-6 w-6 place-items-center rounded text-subtle transition hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

// The evergreen Sandpack bundler doesn't recognize the vanilla "parcel" preset
// and emits "Unknown preset parcel, falling back to React". That fallback is
// harmless — it's exactly what gives us modern-JS (ES2020 ??/?.) support — but
// it's noise in a candidate-facing JS console, so hide just that one warning.
function isBundlerNoise(data: unknown): boolean {
  const text = Array.isArray(data) ? data.map((d) => (typeof d === "string" ? d : "")).join(" ") : "";
  const t = text.trim().toLowerCase();
  return t.startsWith("unknown preset") && t.includes("falling back");
}

/** Signature of one console entry, for consecutive-duplicate collapsing. */
function logSignature(log: { method: string; data?: unknown }): string {
  try {
    return `${log.method}::${JSON.stringify(log.data)}`;
  } catch {
    return `${log.method}::${String(log.data)}`;
  }
}

/**
 * Console for browser templates. Values are decoded from Sandpack's wire
 * format and objects expand like devtools; each call's arguments share one
 * line, consecutive duplicates collapse into a ×N badge, and output can be
 * filtered by level and copied.
 *
 * The Sandpack log store is the single source of truth: Run / Clear drain it
 * through the hook's own reset(). resetOnPreviewRestart stays OFF — when on,
 * every keystroke-driven recompile wipes the store and flashes the empty
 * state between updates.
 */
export function JsConsole({ resetRef }: { resetRef: MutableRefObject<(() => void) | null> }) {
  const { logs, reset } = useSandpackConsole({ resetOnPreviewRestart: false });
  useEffect(() => {
    resetRef.current = reset;
  });
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const out: { log: (typeof logs)[number]; count: number; level: Level }[] = [];
    for (const log of logs) {
      if (log.method === "clear" || isBundlerNoise(log.data)) continue;
      const last = out[out.length - 1];
      if (last && logSignature(last.log) === logSignature(log)) last.count += 1;
      else out.push({ log, count: 1, level: levelOf(log.method) });
    }
    return out;
  }, [logs]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, error: 0, warn: 0, log: 0 };
    for (const r of rows) {
      if (r.level === "error") c.error++;
      else if (r.level === "warn") c.warn++;
      else c.log++;
    }
    return c;
  }, [rows]);

  const shown = rows
    .filter((r) => filter === "all" || r.level === filter || (filter === "log" && r.level === "info"))
    .slice(-MAX_ROWS);
  const { ref, onScroll } = useTailScroll(shown.length);

  if (rows.length === 0) {
    return (
      <ConsoleEmpty
        title="No output yet"
        hint={
          <>
            Anything your code logs with <code className="font-mono text-muted">console.log</code> shows up
            here.
          </>
        }
      />
    );
  }

  const copyAll = () =>
    copyToClipboard(
      shown
        .map((r) => formatConsoleArgs(Array.isArray(r.log.data) ? r.log.data : []) + (r.count > 1 ? ` (×${r.count})` : ""))
        .join("\n"),
    );

  return (
    <div className="flex h-full flex-col bg-bg font-mono text-[13px] leading-relaxed text-fg">
      <FilterBar counts={counts} value={filter} onChange={setFilter} actions={<CopyButton onCopy={copyAll} />} />
      <div
        ref={ref}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Console output"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {shown.map(({ log, count, level }, i) => {
          const args = Array.isArray(log.data) ? log.data : [];
          const style = ROW_STYLE[level];
          return (
            <div
              key={`${String((log as { id?: unknown }).id ?? `row-${i}`)}-${count}`}
              className={`flex items-start gap-2 border-b border-border/60 px-3 py-1 ${style.row}`}
            >
              {style.icon}
              <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {level === "error" || level === "warn"
                  ? formatConsoleArgs(args)
                  : args.map((arg, idx) => (
                      <span key={idx}>
                        {idx > 0 ? " " : ""}
                        <ConsoleArgTree value={arg} />
                      </span>
                    ))}
              </div>
              {count > 1 && (
                <span className="mt-0.5 shrink-0 rounded-full bg-panel px-1.5 font-sans text-[12px] tabular-nums text-muted">
                  ×{count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Collapsible program-input (stdin) strip above backend consoles.
 * Closed by default unless a draft was restored; the dot shows stdin will
 * ride along on Run. Drafts are local-only and never enter saved snippets.
 */
export function StdinBar({
  value,
  open,
  onToggle,
  onChange,
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title="Program input (stdin)"
        className="flex h-8 w-full items-center gap-2 px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-subtle transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="text-[12px] font-medium text-muted">Input</span>
        {value.trim() ? (
          <span className="flex items-center gap-1.5 text-[12px] text-subtle">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            sent to stdin on Run
          </span>
        ) : (
          <span className="text-[12px] text-subtle">stdin, optional</span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Program input, fed to stdin on Run"
            aria-label="Program input text"
            rows={3}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-[13px] text-fg outline-none placeholder:text-subtle focus:border-accent/70"
          />
        </div>
      )}
    </div>
  );
}

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

/** Picker over the last few runs; the newest is the live view. */
function RunHistoryMenu({
  history,
  selectedId,
  onSelect,
}: {
  history: RunRecord[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (history.length < 2) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-6 items-center gap-1 rounded px-1.5 text-[12px] text-subtle transition hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        Runs
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-border-strong bg-surface p-1 font-sans shadow-[var(--shadow-panel)]"
        >
          {history.map((r, i) => {
            const active = selectedId === r.id || (selectedId === null && i === 0);
            return (
              <button
                key={r.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onSelect(i === 0 ? null : r.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition hover:bg-panel ${
                  active ? "bg-panel" : ""
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.summary.tone === "ok" ? "bg-success" : "bg-danger"}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-fg">
                  {i === 0 ? "Latest" : new Date(r.at).toLocaleTimeString([], TIME_FMT)} · {r.file}
                </span>
                <span className="shrink-0 text-[12px] text-subtle">{r.summary.text.replace("Exited with code", "code")}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Console for server-run templates. Each run's stdout and stderr are
 * labelled, the footer names the outcome and runtime, and the last five
 * runs stay one click away for comparison.
 */
export function BackendConsole({
  logs,
  meta,
  summary,
  history,
  fileName,
}: {
  logs: BackendLog[];
  meta?: string | null;
  summary?: RunSummary | null;
  history: RunRecord[];
  fileName: string;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // A new run always returns to the live view.
  const latestId = history[0]?.id ?? 0;
  useEffect(() => setSelectedId(null), [latestId]);
  const past = selectedId !== null ? history.find((r) => r.id === selectedId) ?? null : null;
  const view = past ? { logs: past.logs, meta: past.meta, summary: past.summary } : { logs, meta, summary };
  const shown = view.logs.length > MAX_ROWS ? view.logs.slice(-MAX_ROWS) : view.logs;
  const { ref, onScroll } = useTailScroll(shown.length);
  // Label streams only when both are present; a stdout-only run needs none.
  const mixed = shown.some((l) => l.stream === "stderr") && shown.some((l) => l.stream === "stdout");

  if (shown.length === 0) {
    return (
      <ConsoleEmpty
        title="No output yet"
        hint={
          <>
            Press Run or <Kbd>{RUN_SHORTCUT}</Kbd> to run {fileName}.
          </>
        }
      />
    );
  }

  const copyAll = () => copyToClipboard(shown.map((l) => l.data.join(" ")).join("\n"));

  return (
    <div className="flex h-full flex-col bg-bg font-mono text-[13px] leading-relaxed text-fg">
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-bg px-3 font-sans">
        <span className="truncate text-[12px] text-subtle">
          {past ? `Run at ${new Date(past.at).toLocaleTimeString([], TIME_FMT)}` : "Latest run"}
          {past && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="ml-2 text-accent underline-offset-2 hover:underline"
            >
              Back to latest
            </button>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <RunHistoryMenu history={history} selectedId={selectedId} onSelect={setSelectedId} />
          <CopyButton onCopy={copyAll} />
        </div>
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Program output"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
      >
        {shown.map((log, i) => {
          const level = levelOf(log.method);
          return (
            <div key={i} className={`flex items-start gap-2 whitespace-pre-wrap break-words pl-2 ${ROW_STYLE[level].row}`}>
              {ROW_STYLE[level].icon}
              <div className="min-w-0 flex-1">
                {mixed && log.stream && (
                  <span className="mb-0.5 block font-sans text-[12px] text-subtle">{log.stream}</span>
                )}
                {log.data.join(" ")}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex h-8 shrink-0 items-center gap-2 border-t border-border bg-surface px-3 font-sans text-[12px]">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${view.summary?.tone === "error" ? "bg-danger" : "bg-success"}`}
          aria-hidden
        />
        <span className={view.summary?.tone === "error" ? "text-danger" : "text-muted"}>
          {view.summary?.text ?? "Run finished"}
        </span>
        {view.meta && (
          <span data-testid="run-meta" className="ml-auto tabular-nums text-subtle">
            {view.meta}
          </span>
        )}
      </div>
    </div>
  );
}
