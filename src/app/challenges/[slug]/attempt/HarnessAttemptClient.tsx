"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Play, Send, CheckCircle2, XCircle, Loader2, EyeOff, Clock, LogOut, FileCode, Terminal, Rows2, Columns2, PanelLeftClose, PanelLeftOpen, Minus, Plus } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { defineNanoBananaThemes, WORKBENCH_DARK, WORKBENCH_LIGHT } from "@/lib/monaco-themes";
import "@/lib/monaco-loader";
import { useResizable, RESIZE_RAIL_X, RESIZE_RAIL_Y } from "@/hooks/useResizable";
import { useResizableHeight } from "@/hooks/useResizableHeight";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const MONACO_LANG: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  go: "go",
  java: "java",
  cpp: "cpp",
  rust: "rust",
};
const LANG_LABELS: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript",
  go: "Go", java: "Java", cpp: "C++", rust: "Rust",
};
const LANG_EXT: Record<string, string> = {
  python: "py", javascript: "js", typescript: "ts",
  go: "go", java: "java", cpp: "cpp", rust: "rs",
};

const DIFFICULTY_CHIP: Record<string, string> = {
  easy: "text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
  hard: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
};

/** Candidate function runs once per test case, so one print arrives N times.
 *  Collapse consecutive duplicates so a single print shows once (like /play),
 *  instead of a confusing ×N badge. */
function dedupeConsecutive(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (out.length === 0 || out[out.length - 1] !== line) out.push(line);
  }
  return out;
}

function formatDuration(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Signature = { params: { name: string; type: string }[]; returnType: string };
type PublicCase = { name: string; argsJson: string; expectedJson: string };
type CaseResult = {
  name: string;
  isHidden: boolean;
  status: "pass" | "fail" | "error";
  got?: string;
  expected?: string;
  error?: string;
};
type GradeResponse = {
  dryRun?: boolean;
  status: string;
  score: number;
  passed: number;
  total: number;
  compileError?: boolean;
  stderr?: string;
  results: CaseResult[];
  attemptId?: string;
  /** Captured candidate console output (JS/TS/Python only). */
  console?: string[];
};

/** Languages whose judge driver captures prints into `console`. */
const CONSOLE_LANGUAGES = new Set(["python", "javascript", "typescript", "node"]);

export default function HarnessAttemptClient({
  slug,
  stepId,
  title,
  description,
  difficulty,
  functionName,
  signature,
  languages,
  starterCode,
  publicCases,
  hiddenCount,
  token,
  sessionId,
}: {
  slug: string;
  stepId: string;
  title: string;
  description: string;
  difficulty: string;
  functionName: string;
  signature: Signature;
  languages: string[];
  starterCode: Record<string, string>;
  publicCases: PublicCase[];
  hiddenCount: number;
  token: string | null;
  sessionId: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const [language, setLanguage] = useState(languages[0] ?? "python");
  const [codeByLang, setCodeByLang] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const l of languages) init[l] = starterCode[l] ?? "";
    return init;
  });
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResponse | null>(null);

  // Elapsed-time clock for the toolbar.
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Problem-statement panel collapses to a slim rail on desktop.
  const [descCollapsed, setDescCollapsed] = useState(false);

  // Editor font size — persisted per browser, adjustable from the file
  // header stepper, Ctrl/Cmd + +/-, or Ctrl/Cmd + mouse wheel over the editor.
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window === "undefined") return 13.5;
    const saved = parseFloat(localStorage.getItem("ipad.harness.fontSize") ?? "");
    return Number.isFinite(saved) ? Math.min(24, Math.max(10, saved)) : 13.5;
  });
  useEffect(() => {
    try {
      localStorage.setItem("ipad.harness.fontSize", String(fontSize));
    } catch {
      /* private mode — preference just won't persist */
    }
  }, [fontSize]);

  // Ctrl/Cmd + +/- zooms the editor. Deliberately NOT skipped inside the
  // Monaco textarea (that's exactly where your hands are) — these combos
  // have no text-editing function anywhere, so hijacking is safe. Single-line
  // inputs and selects keep native behavior.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setFontSize((f) => Math.min(24, Math.round((f + 1) * 10) / 10));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setFontSize((f) => Math.max(10, Math.round((f - 1) * 10) / 10));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Editor ↔ output split orientation: "row" (output below editor) or
  // "column" (output beside editor) — mirrors the frontend playground.
  const [outputLayout, setOutputLayout] = useState<"row" | "column">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("ipad.harness.outputLayout");
      if (saved === "row" || saved === "column") return saved;
    }
    return "row";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("ipad.harness.outputLayout", outputLayout);
  }, [outputLayout]);

  // Output panel tab: raw program console first (the daily driver), graded
  // test results second. Console is the default view.
  const [outputTab, setOutputTab] = useState<"results" | "console">("console");
  const consoleSupported = CONSOLE_LANGUAGES.has(language);
  const consoleCount = dedupeConsecutive(result?.console ?? []).length;

  // Drag-resizable panels (desktop): problem-statement width, plus the output
  // pane's height (row layout) or width (column layout). The column handle is
  // inverted because the output sits to the right of it.
  const { width: descW, onPointerDown: onDescDrag } = useResizable(420, 300, 760);
  const { height: outputH, onPointerDown: onOutputDrag } = useResizableHeight(230, 120, 640);
  const { width: outputW, onPointerDown: onOutputWDrag } = useResizable(420, 260, 1100, true);

  function handleExit() {
    if (sessionId) window.location.href = `/interview/${sessionId}`;
    else window.location.href = `/challenges/${slug}`;
  }

  const code = codeByLang[language] ?? "";
  const signatureStr = `${functionName}(${signature.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) → ${signature.returnType}`;

  async function run(dryRun: boolean) {
    if (dryRun) setRunning(true);
    else setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/challenges/${slug}/grade`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepId, language, code, dryRun, token, sessionId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? `Request failed (HTTP ${res.status})`);
        return;
      }
      setResult(data as GradeResponse);
      if (!dryRun) {
        if (data.status === "passed") toast.success(`Passed — score ${data.score}`);
        else toast.warning(`Submitted — score ${data.score} (${data.passed}/${data.total} cases)`);
      }
    } catch (e) {
      toast.error("Could not reach the judge", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Top toolbar — mission-control chrome matching the frontend attempt surface. */}
      <header className="relative flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-border bg-surface shrink-0 overflow-hidden">
        <style>{`
          @property --orb-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
          .chrono-orb { background: conic-gradient(from var(--orb-angle), transparent 0%, rgba(139,147,255,0.55) 18%, rgba(255,47,179,0.55) 32%, transparent 48%); animation: orb-spin 7s linear infinite; }
          @keyframes orb-spin { to { --orb-angle: 360deg; } }
          .spin-slower { animation: spin 9s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .tick-pop { animation: tick-pop 0.35s ease-out; }
          @keyframes tick-pop { 0% { transform: scale(1.18); filter: brightness(1.7); } 100% { transform: scale(1); filter: brightness(1); } }
          .energy-line { background: linear-gradient(90deg, transparent, rgba(139,147,255,0.75), rgba(255,47,179,0.75), rgba(34,211,238,0.75), transparent); background-size: 220% 100%; animation: energy-flow 6s linear infinite; }
          @keyframes energy-flow { from { background-position: 200% 0; } to { background-position: -200% 0; } }
          @media (prefers-reduced-motion: reduce) {
            .chrono-orb, .energy-line, .spin-slower, .tick-pop { animation: none; }
          }
        `}</style>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px">
          <div className="energy-line h-full w-full" />
        </div>
        <button
            type="button"
            onClick={handleExit}
            title="Exit the assessment"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 hover:shadow-[0_0_16px_-4px_rgba(244,63,94,0.6)] text-rose-500 hover:text-rose-400 text-xs font-bold transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="min-w-0 flex items-center gap-2 flex-1">
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted/70 leading-none mb-0.5">Live challenge</p>
              <h2 className="font-black text-sm truncate leading-tight">{title}</h2>
            </div>
            <span
              className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                DIFFICULTY_CHIP[difficulty] ?? DIFFICULTY_CHIP.easy
              }`}
            >
              <span className={`h-1 w-1 rounded-full ${difficulty === "easy" ? "bg-emerald-400" : difficulty === "medium" ? "bg-amber-400" : "bg-rose-400"}`} />
              {difficulty}
            </span>
          </div>

          {/* Center: timer only — true-center on sm+ via absolute positioning; its own
              centered row on mobile */}
          <div className="flex items-center justify-center shrink-0 max-sm:order-3 max-sm:basis-full sm:absolute sm:left-1/2 sm:-translate-x-1/2">
            <div
              className="relative flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] px-3.5 py-1.5 font-mono tabular-nums text-sm text-muted backdrop-blur-sm overflow-hidden dark:border-white/[0.07]"
              title="Elapsed time"
            >
              <span aria-hidden className="chrono-orb pointer-events-none absolute -inset-px rounded-2xl opacity-40" />
              <span className="relative grid h-7 w-7 shrink-0 place-items-center">
                <svg viewBox="0 0 24 24" aria-hidden className="spin-slower absolute inset-0 h-7 w-7 opacity-60">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" />
                </svg>
                <Clock className="h-3 w-3 shrink-0" />
              </span>
              <span className="relative flex items-center gap-1">
                <span key={`m-${Math.floor(elapsedSec / 60)}`} className="tick-pop rounded-lg bg-black/30 px-1.5 py-0.5 text-lg font-bold leading-none tabular-nums shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  {Math.floor(elapsedSec / 60)}
                </span>
                <span aria-hidden className="font-bold text-white/40">:</span>
                <span key={`s-${elapsedSec % 60}`} className="tick-pop rounded-lg bg-black/30 px-1.5 py-0.5 text-lg font-bold leading-none tabular-nums shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  {String(elapsedSec % 60).padStart(2, "0")}
                </span>
              </span>
              <span className="relative text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">Elapsed</span>
            </div>
          </div>

          {/* Right: language + layout + Run + Submit */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 flex-1 justify-end">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Solution language"
              className="rounded-full border border-black/[0.06] bg-[var(--wow-card)] px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#8b93ff]/60 shrink-0 [color-scheme:light] dark:border-white/[0.07] dark:[color-scheme:dark] dark:[&>option]:bg-[#131625] dark:[&>option]:text-white"
            >
              {languages.map((l) => (
                <option key={l} value={l}>{LANG_LABELS[l] ?? l}</option>
              ))}
            </select>

            {/* Output layout toggle — row (below) vs column (beside). Desktop
                only, since the panes always stack on small screens. */}
            <div className="hidden lg:flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-[var(--wow-stage)] p-0.5 shrink-0 dark:border-white/[0.07]">
              {([
                { key: "row", title: "Output below editor", icon: Rows2 },
                { key: "column", title: "Output beside editor", icon: Columns2 },
              ] as const).map(({ key, title, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutputLayout(key)}
                  title={title}
                  aria-pressed={outputLayout === key}
                  className={`grid h-7 w-7 place-items-center rounded-full transition ${
                    outputLayout === key
                      ? "bg-white text-black shadow"
                      : "text-muted hover:text-[var(--wow-fg)]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <button
              onClick={() => run(true)}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.14] text-emerald-700 dark:text-emerald-400 text-xs font-bold transition disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden sm:inline">Run</span>
            </button>
            <button
              onClick={() => run(false)}
              disabled={running || submitting}
              className="group relative overflow-hidden inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-50 whitespace-nowrap shrink-0 shadow-[0_6px_24px_-8px_rgba(16,185,129,0.8)] active:translate-y-px"
            >
              <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit
            </button>
          </div>
      </header>

      {/* Body: problem statement | editor + output — IDE-style full-height
          split, drag-resizable on desktop, stacked on mobile. */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ── Left: problem statement + sample cases ── */}
        {descCollapsed ? (
          <div className="hidden lg:flex w-10 shrink-0 flex-col items-center gap-3 border-r border-border bg-bg py-3">
            <button
              type="button"
              onClick={() => setDescCollapsed(false)}
              title="Show problem statement"
              aria-label="Show problem statement"
              className="grid h-8 w-8 place-items-center rounded-full border border-black/[0.06] text-muted transition hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)] dark:border-white/[0.07]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted/50 [writing-mode:vertical-rl]">
              Brief
            </span>
          </div>
        ) : (
        <aside
          className="w-full lg:w-[var(--harness-desc-w)] lg:shrink-0 flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-border bg-bg max-h-[38vh] lg:max-h-none lg:h-full"
          style={{ "--harness-desc-w": `${descW}px` } as React.CSSProperties}
        >
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-black/[0.06] px-4 dark:border-white/[0.07]">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              Problem brief
            </span>
            <button
              type="button"
              onClick={() => setDescCollapsed(true)}
              title="Hide problem statement"
              aria-label="Hide problem statement"
              className="hidden lg:grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-[var(--wow-fg)] dark:hover:bg-white/10"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5">
            <h1 className="text-lg font-black tracking-tight">{title}</h1>
            <code className="mt-2 inline-block max-w-full overflow-x-auto rounded-lg border border-black/[0.06] bg-[var(--wow-stage)] px-2 py-1 font-mono text-[11px] text-muted dark:border-white/[0.07]">
              {signatureStr}
            </code>
            <div className="mt-4">
              <MarkdownRenderer content={description} />
            </div>

            {publicCases.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Sample cases</div>
                <div className="space-y-2">
                  {publicCases.map((c, i) => (
                    <div key={i} className="rounded-xl border border-black/[0.06] bg-[var(--wow-card)] p-2.5 font-mono text-xs backdrop-blur-sm transition-colors hover:border-[#8b93ff]/30 dark:border-white/[0.07]">
                      <div className="font-bold text-[var(--wow-fg)]">{c.name}</div>
                      <div className="mt-1"><span className="text-muted/50">in </span><span className="text-[var(--wow-fg)]/90">{c.argsJson}</span></div>
                      <div><span className="text-muted/50">out </span><span className="text-emerald-600 dark:text-emerald-400">{c.expectedJson}</span></div>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted/60">
                      <EyeOff className="h-3 w-3" /> + {hiddenCount} hidden case{hiddenCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
        )}

        {/* Drag handle: description ↔ editor (desktop) */}
        <div
          onPointerDown={onDescDrag}
          title="Drag to resize"
          role="separator"
          aria-orientation="vertical"
          className={`hidden lg:block w-1.5 shrink-0 cursor-col-resize touch-none select-none bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors ${RESIZE_RAIL_X}`}
        />

        {/* ── Right: editor + output, docked below (row) or beside (column) ── */}
        <div
          className={`flex-1 min-w-0 flex min-h-0 overflow-hidden flex-col ${
            outputLayout === "column" ? "lg:flex-row" : ""
          }`}
        >
          <div className="flex-1 min-w-0 min-h-[18rem] lg:min-h-0 flex flex-col overflow-hidden">
            {/* Editor file header — file identity + font size stepper. */}
            <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[var(--wow-card)]/60 px-3 py-1.5 font-mono text-[11px] text-muted backdrop-blur-sm shrink-0 dark:border-white/[0.07]">
              <FileCode className="w-3.5 h-3.5 text-[#8b93ff]" />
              solution.{LANG_EXT[language] ?? "txt"}
              <span className="rounded-md border border-black/[0.06] px-1.5 py-px text-[10px] font-bold uppercase tracking-wider dark:border-white/[0.07]">
                {LANG_LABELS[language] ?? language}
              </span>
              <span className="ml-auto flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-[var(--wow-stage)] p-0.5 dark:border-white/[0.07]" role="group" aria-label="Editor font size">
                <button
                  type="button"
                  onClick={() => setFontSize((f) => Math.max(10, Math.round((f - 1) * 10) / 10))}
                  disabled={fontSize <= 10}
                  title="Decrease font size"
                  aria-label="Decrease editor font size"
                  className="grid h-5 w-5 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-[var(--wow-fg)] disabled:opacity-30 dark:hover:bg-white/10"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[42px] text-center text-[10px] font-bold tabular-nums" title="Shortcut: Ctrl/Cmd + +/- · Ctrl + mouse wheel also zooms">
                  {fontSize}px
                </span>
                <button
                  type="button"
                  onClick={() => setFontSize((f) => Math.min(24, Math.round((f + 1) * 10) / 10))}
                  disabled={fontSize >= 24}
                  title="Increase font size"
                  aria-label="Increase editor font size"
                  className="grid h-5 w-5 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-[var(--wow-fg)] disabled:opacity-30 dark:hover:bg-white/10"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={MONACO_LANG[language] ?? "plaintext"}
                theme={resolvedTheme === "light" ? WORKBENCH_LIGHT : WORKBENCH_DARK}
                beforeMount={defineNanoBananaThemes}
                value={code}
                onChange={(v) => setCodeByLang((m) => ({ ...m, [language]: v ?? "" }))}
                options={{
                  minimap: { enabled: false },
                  fontSize: fontSize,
                  lineHeight: Math.round(fontSize * 1.6),
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 14, bottom: 14 },
                  renderLineHighlight: "all",
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  mouseWheelZoom: true,
                  bracketPairColorization: { enabled: true },
                  guides: { bracketPairs: true },
                  fontLigatures: true,
                  fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
                  roundedSelection: true,
                  scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Drag handle: editor ↔ output (desktop) — vertical in column
              layout, horizontal in row layout. */}
          {outputLayout === "column" ? (
            <div
              onPointerDown={onOutputWDrag}
              title="Drag to resize"
              role="separator"
              aria-orientation="vertical"
              className={`hidden lg:block w-1.5 shrink-0 cursor-col-resize touch-none select-none bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors ${RESIZE_RAIL_X}`}
            />
          ) : (
            <div
              onPointerDown={onOutputDrag}
              title="Drag to resize"
              role="separator"
              aria-orientation="horizontal"
              className={`hidden lg:block h-1.5 shrink-0 cursor-row-resize touch-none select-none bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors ${RESIZE_RAIL_Y}`}
            />
          )}

          {/* Output / results — resizable height (row) or width (column),
              scrolls internally. */}
          <section
            className={`shrink-0 flex flex-col min-h-0 min-w-0 border-border bg-bg h-56 ${
              outputLayout === "column"
                ? "lg:h-full lg:w-[var(--harness-out-w)] border-t lg:border-t-0 lg:border-l"
                : "lg:h-[var(--harness-out-h)] border-t lg:border-t-0"
            }`}
            style={
              {
                "--harness-out-h": `${outputH}px`,
                "--harness-out-w": `${outputW}px`,
              } as React.CSSProperties
            }
          >
            <div className="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-black/[0.06] bg-[var(--wow-card)]/60 backdrop-blur-sm dark:border-white/[0.07]">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--wow-fg)]">
                <Terminal className="w-3 h-3 text-[#8b93ff]" />
                Output
              </span>
              <div className="flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-[var(--wow-stage)] p-0.5 dark:border-white/[0.07]" role="tablist" aria-label="Output view">
                {(["console", "results"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={outputTab === t}
                    onClick={() => setOutputTab(t)}
                    className={`relative flex items-center justify-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                      outputTab === t ? "bg-white text-black shadow dark:bg-white" : "text-muted hover:text-[var(--wow-fg)]"
                    }`}
                  >
                    {t === "results" ? "Tests" : "Console"}
                    {t === "console" && consoleCount > 0 && (
                      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#8b93ff]/20 px-1 font-mono text-[9px] tabular-nums text-[#8b93ff]">
                        {consoleCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {result && !result.compileError && outputTab === "results" && (
                <div className="ml-auto flex items-center gap-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-xs font-black tabular-nums ${
                      result.passed === result.total && result.total > 0
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {result.passed}/{result.total} passed
                  </span>
                  <span className="hidden font-mono text-xs font-bold tabular-nums text-muted sm:inline">
                    Score: <span className="text-[var(--wow-fg)]">{result.score}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {outputTab === "console" ? (
                <RunConsole result={result} busy={running || submitting} supported={consoleSupported} language={language} />
              ) : (
                <OutputBody result={result} busy={running || submitting} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OutputBody({ result, busy }: { result: GradeResponse | null; busy: boolean }) {
  if (busy) {
    return (
      <div className="h-full grid place-items-center">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          Running tests…
        </div>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="h-full grid place-items-center px-4 text-center">
        <p className="text-xs text-muted/50 font-mono">Run your code to see test results here.</p>
      </div>
    );
  }
  if (result.compileError) {
    return (
      <div className="p-4">
        <div className="text-sm font-bold text-rose-500 mb-2">Compilation failed</div>
        <pre className="text-[11px] font-mono text-muted whitespace-pre-wrap overflow-x-auto">{result.stderr || "See compiler output."}</pre>
      </div>
    );
  }
  return (
    <div className="p-3">
      <div className="space-y-1.5">
        {result.results.map((r, i) => (
          <div key={i} className="rounded-xl border border-black/[0.06] bg-[var(--wow-card)] p-2.5 text-xs backdrop-blur-sm transition-colors hover:border-[#8b93ff]/30 dark:border-white/[0.07]">
            <div className="flex items-center gap-2">
              {r.status === "pass" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />}
              <span className="font-bold text-[var(--wow-fg)]">{r.name}</span>
              {r.isHidden && <span className="text-[9px] text-muted/50 uppercase font-black inline-flex items-center gap-1"><EyeOff className="w-3 h-3" />hidden</span>}
              <span className={`ml-auto rounded-full border px-2 py-px text-[10px] font-black uppercase tracking-wider shrink-0 ${
                r.status === "pass"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}>{r.status === "pass" ? "Pass" : r.status === "fail" ? "Fail" : "Error"}</span>
            </div>
            {!r.isHidden && r.status !== "pass" && (
              <div className="mt-1.5 rounded-lg bg-black/[0.03] p-2 font-mono text-[11px] space-y-0.5 dark:bg-white/[0.04]">
                {r.error ? (
                  <div className="text-rose-500">{r.error}</div>
                ) : (
                  <>
                    <div><span className="text-muted/50">expected </span><span className="text-emerald-600 dark:text-emerald-400">{r.expected}</span></div>
                    <div><span className="text-muted/50">got </span><span className="text-rose-500">{r.got}</span></div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Raw program console — captured prints from the last run, exactly as the
 *  program wrote them. Separate from grading: this is the "just run my
 *  function and show me what it printed" view. Only JS/TS/Python drivers
 *  capture; other languages explain that inline. */
function RunConsole({ result, busy, supported, language }: { result: GradeResponse | null; busy: boolean; supported: boolean; language: string }) {
  if (busy) {
    return (
      <div className="h-full grid place-items-center">
        <div className="inline-flex items-center gap-2 text-xs text-muted font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[#8b93ff]" />
          Running…
        </div>
      </div>
    );
  }
  if (!supported) {
    return (
      <div className="h-full grid place-items-center px-6 text-center">
        <div className="max-w-xs space-y-2">
          <Terminal className="w-5 h-5 mx-auto text-muted/40" />
          <p className="text-xs leading-relaxed text-muted">
            Console capture isn&apos;t available for {language} yet — your prints still run,
            but only graded test results come back.
          </p>
        </div>
      </div>
    );
  }
  const logs = result?.console ?? [];
  const stderr = result?.stderr;
  if (logs.length === 0 && !stderr) {
    return (
      <div className="h-full grid place-items-center px-6 text-center">
        <div className="max-w-xs space-y-2">
          <Terminal className="w-5 h-5 mx-auto text-muted/40" />
          <p className="text-xs leading-relaxed text-muted">
            No console output yet — add a <code className="rounded bg-black/[0.05] px-1 py-px font-mono text-[var(--wow-fg)]/80 dark:bg-white/[0.07]">print</code> / <code className="rounded bg-black/[0.05] px-1 py-px font-mono text-[var(--wow-fg)]/80 dark:bg-white/[0.07]">console.log</code> and
            hit Run to see it here.
          </p>
        </div>
      </div>
    );
  }
  // The driver runs the function once per test case, so one print arrives N
  // times. Show each distinct line once (like /play) — the old run's output
  // is already cleared by setResult(null) when a new run starts.
  const rows = dedupeConsecutive(logs);
  return (
    <div className="h-full overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-relaxed">
      {stderr && (
        <div className="mb-2 whitespace-pre-wrap break-words rounded-lg border border-rose-500/30 bg-rose-500/[0.07] p-2 text-rose-500">
          {stderr}
        </div>
      )}
      {rows.map((line, i) => (
        <div key={i} className="flex items-start gap-2 border-b border-black/[0.04] py-1.5 whitespace-pre-wrap break-words text-[var(--wow-fg)]/85 dark:border-white/[0.05]">
          <span className="mt-0.5 shrink-0 select-none text-muted/40">›</span>
          <span className="min-w-0 flex-1">{line}</span>
        </div>
      ))}
    </div>
  );
}
