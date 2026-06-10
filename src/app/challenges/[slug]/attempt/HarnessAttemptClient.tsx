"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Play, Send, CheckCircle2, XCircle, Loader2, EyeOff, Clock, LogOut, FileCode, Terminal } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ThemeToggle from "@/components/ThemeToggle";
import { useResizable } from "@/hooks/useResizable";
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
  easy: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  hard: "text-rose-500 bg-rose-500/10 border-rose-500/30",
};

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
};

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

  // Drag-resizable panels (desktop): problem-statement width + output height.
  const { width: descW, onPointerDown: onDescDrag } = useResizable(420, 300, 760);
  const { height: outputH, onPointerDown: onOutputDrag } = useResizableHeight(230, 120, 640);

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
      {/* Top toolbar — consistent with the unit-js / frontend attempt surface. */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface shrink-0">
          <button
            type="button"
            onClick={handleExit}
            title="Exit the assessment"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 text-xs font-bold transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <h2 className="font-black text-sm truncate">{title}</h2>
            <span
              className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                DIFFICULTY_CHIP[difficulty] ?? DIFFICULTY_CHIP.easy
              }`}
            >
              {difficulty}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2.5 shrink-0">
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-bg text-muted font-mono tabular-nums text-sm"
              title="Elapsed time"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDuration(elapsedSec)}</span>
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-accent shrink-0"
            >
              {languages.map((l) => (
                <option key={l} value={l}>{LANG_LABELS[l] ?? l}</option>
              ))}
            </select>

            <ThemeToggle />

            <button
              onClick={() => run(true)}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-fg text-xs font-bold hover:border-border-strong transition disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />}
              Run
            </button>
            <button
              onClick={() => run(false)}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition disabled:opacity-50 whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)]"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit
            </button>
          </div>
      </header>

      {/* Body: problem statement | editor + output — IDE-style full-height
          split, drag-resizable on desktop, stacked on mobile. */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ── Left: problem statement + sample cases ── */}
        <aside
          className="w-full lg:w-[var(--harness-desc-w)] lg:shrink-0 overflow-y-auto border-b lg:border-b-0 border-border bg-bg max-h-[38vh] lg:max-h-none lg:h-full"
          style={{ "--harness-desc-w": `${descW}px` } as React.CSSProperties}
        >
          <div className="p-5">
            <h1 className="text-lg font-black tracking-tight">{title}</h1>
            <code className="mt-2 inline-block max-w-full overflow-x-auto rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-mono text-muted whitespace-nowrap">
              {signatureStr}
            </code>
            <div className="mt-4">
              <MarkdownRenderer content={description} />
            </div>

            {publicCases.length > 0 && (
              <div className="mt-6">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-2">Sample cases</div>
                <div className="space-y-2">
                  {publicCases.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-2.5 text-xs font-mono">
                      <div className="text-muted/70">{c.name}</div>
                      <div className="mt-1"><span className="text-muted/50">in </span>{c.argsJson}</div>
                      <div><span className="text-muted/50">out </span><span className="text-emerald-500">{c.expectedJson}</span></div>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <div className="text-[11px] text-muted/60 inline-flex items-center gap-1.5">
                      <EyeOff className="w-3 h-3" /> + {hiddenCount} hidden case{hiddenCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Drag handle: description ↔ editor (desktop) */}
        <div
          onPointerDown={onDescDrag}
          title="Drag to resize"
          role="separator"
          aria-orientation="vertical"
          className="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors"
        />

        {/* ── Right: editor on top, output docked below ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-[18rem] lg:min-h-0 flex flex-col overflow-hidden">
            {/* Editor file header — gives the panel an IDE feel. */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface text-[11px] font-mono text-muted shrink-0">
              <FileCode className="w-3.5 h-3.5 text-accent/70" />
              solution.{LANG_EXT[language] ?? "txt"}
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={MONACO_LANG[language] ?? "plaintext"}
                theme={resolvedTheme === "light" ? "light" : "vs-dark"}
                value={code}
                onChange={(v) => setCodeByLang((m) => ({ ...m, [language]: v ?? "" }))}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13.5,
                  lineHeight: 21,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 14, bottom: 14 },
                  renderLineHighlight: "all",
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  fontLigatures: true,
                  fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
                  roundedSelection: true,
                  scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Drag handle: editor ↔ output (desktop) */}
          <div
            onPointerDown={onOutputDrag}
            title="Drag to resize"
            role="separator"
            aria-orientation="horizontal"
            className="hidden lg:block h-1.5 shrink-0 cursor-row-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors"
          />

          {/* Output / results — fixed resizable height, scrolls internally. */}
          <section
            className="shrink-0 flex flex-col min-h-0 border-t border-border lg:border-t-0 bg-bg h-56 lg:h-[var(--harness-out-h)]"
            style={{ "--harness-out-h": `${outputH}px` } as React.CSSProperties}
          >
            <div className="h-10 shrink-0 flex items-center justify-between gap-2 px-3 border-b border-border bg-surface/30">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
                <Terminal className="w-3 h-3 text-accent" />
                Output
              </span>
              {result && !result.compileError && (
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-black ${
                      result.passed === result.total && result.total > 0 ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {result.passed}/{result.total} passed
                  </span>
                  <span className="text-xs font-bold text-muted">
                    Score: <span className="text-fg">{result.score}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <OutputBody result={result} busy={running || submitting} />
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
          <div key={i} className="rounded-lg border border-border bg-elevated/40 p-2 text-xs">
            <div className="flex items-center gap-2">
              {r.status === "pass" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
              <span className="font-bold text-fg">{r.name}</span>
              {r.isHidden && <span className="text-[9px] text-muted/50 uppercase font-black inline-flex items-center gap-1"><EyeOff className="w-3 h-3" />hidden</span>}
              <span className="ml-auto text-[10px] uppercase font-black text-muted">{r.status}</span>
            </div>
            {!r.isHidden && r.status !== "pass" && (
              <div className="mt-1 font-mono text-[11px] text-muted/80 space-y-0.5">
                {r.error ? (
                  <div className="text-rose-400">{r.error}</div>
                ) : (
                  <>
                    <div><span className="text-muted/50">expected </span><span className="text-emerald-500">{r.expected}</span></div>
                    <div><span className="text-muted/50">got </span><span className="text-rose-400">{r.got}</span></div>
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
