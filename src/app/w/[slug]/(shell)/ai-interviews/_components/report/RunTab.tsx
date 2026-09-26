"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { SandpackPreview } from "@codesandbox/sandpack-react";
import { Loader2, Play, RotateCcw } from "lucide-react";
import ShimmedSandpackProvider from "@/components/ShimmedSandpackProvider";
import { BackendConsole, JsConsole, RUN_SHORTCUT, StdinBar } from "@/components/playground/Consoles";
import type { BackendLog, RunRecord } from "@/components/playground/useRunner";
import { executeBodyForFiles, postExecute } from "@/lib/execute-client";
import { V2_BUNDLER_URL } from "@/lib/templates";
import { describeExecution, formatRunMeta, summarizeRun, type RunSummary } from "@/lib/exec-result";
import type { ReportRound } from "@/lib/ai-interview/console-server";
import { languageFor } from "@/lib/monaco-langs";
import { EDITOR_THEME, FileSelect, FileTab, FilesPane, IdeFrame, READ_ONLY_OPTIONS, ReadOnlyTag, Seg, beforeMount, shortPath } from "./ide";

/** Round language → the id /api/execute runs (same map as the candidate workspace). */
const EXEC_LANG: Record<string, string> = {
  node: "javascript",
  javascript: "javascript",
  "ts-node": "typescript",
  typescript: "typescript",
  python: "python",
  go: "go",
  java: "java",
  cpp: "cpp",
  rust: "rust",
};
const SOURCE_EXT: Record<string, string[]> = {
  javascript: [".js"],
  typescript: [".ts"],
  python: [".py"],
  go: [".go"],
  java: [".java"],
  cpp: [".cpp", ".cc"],
  rust: [".rs"],
};
const RUNTIME_LABEL: Record<string, string> = {
  javascript: "JavaScript, Node",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  java: "Java",
  cpp: "C++",
  rust: "Rust",
};

type Source = "candidate" | "starter";

function visibleFiles(files: Record<string, string>): string[] {
  return Object.keys(files)
    .filter((p) => !/(^|\/)package-lock\.json$/.test(p))
    .sort((a, b) => weight(a) - weight(b) || a.localeCompare(b));
}
function weight(p: string): number {
  if (/\/App\.(j|t)sx?$/.test(p)) return 0;
  if (/package\.json$|index\.html$|sandbox\.config/.test(p)) return 3;
  if (/\.(css|scss)$/.test(p)) return 2;
  return 1;
}

export default function RunTab({ round }: { round: ReportRound | undefined }) {
  const [source, setSource] = useState<Source>("candidate");
  if (!round) return null;
  const files = source === "candidate" ? round.files : round.starter;
  if (!Object.keys(files).length) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">There is no code to run for this round yet.</div>;
  }
  const sourceToggle = (
    <Seg
      label="Which code"
      value={source}
      onChange={setSource}
      items={[
        { id: "candidate", label: "Candidate code" },
        { id: "starter", label: "Starter code" },
      ]}
    />
  );
  return round.kind === "frontend" ? (
    <FrontendRun key={source} round={round} files={files} source={source} sourceToggle={sourceToggle} />
  ) : (
    <BackendRun key={source} round={round} files={files} source={source} sourceToggle={sourceToggle} />
  );
}

function CodePane({ path, code }: { path: string; code: string }) {
  return (
    <div className="flex-1 min-w-0 bg-bg">
      <Editor
        path={`run:${path}`}
        value={code}
        language={languageFor(path)}
        theme={EDITOR_THEME}
        beforeMount={beforeMount}
        options={READ_ONLY_OPTIONS}
        loading={<div className="h-full bg-bg" />}
      />
    </div>
  );
}

/* ── Frontend: Sandpack preview and live console ─────────────────────────── */

function FrontendRun({
  round,
  files,
  source,
  sourceToggle,
}: {
  round: ReportRound;
  files: Record<string, string>;
  source: Source;
  sourceToggle: React.ReactNode;
}) {
  const paths = useMemo(() => visibleFiles(files), [files]);
  const [active, setActive] = useState(paths[0] ?? "");
  const [runKey, setRunKey] = useState(0);
  const [pane, setPane] = useState<"preview" | "console">("preview");
  const resetRef = useRef<(() => void) | null>(null);
  const isReact = Object.keys(files).some((f) => /\.(jsx|tsx)$/.test(f) || /from ["']react["']/.test(files[f] ?? ""));

  return (
    <ShimmedSandpackProvider
      key={runKey}
      template={isReact ? "react" : "vanilla"}
      theme="dark"
      files={files}
      options={{ initMode: "immediate", recompileMode: "delayed", recompileDelay: 500, ...(isReact ? { bundlerURL: V2_BUNDLER_URL } : {}) }}
    >
      <IdeFrame
        height={640}
        toolbar={
          <>
            <FileSelect files={paths} active={active} onPick={setActive} />
            <span className="hidden sm:inline-flex">{active && <FileTab path={active} />}</span>
            <span className="flex-1" />
            {sourceToggle}
            <span className="lg:hidden">
              <Seg
                label="Output"
                value={pane}
                onChange={setPane}
                items={[
                  { id: "preview", label: "Preview" },
                  { id: "console", label: "Console" },
                ]}
              />
            </span>
            <button
              type="button"
              onClick={() => {
                resetRef.current?.();
                setRunKey((k) => k + 1);
              }}
              aria-label="Restart preview"
              title="Restart preview"
              className="w-8 h-8 rounded-md inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        }
        status={
          <>
            <span>{round.label}</span>
            <span>{source === "candidate" ? "Candidate code, read only" : "Starter code, read only"}</span>
            <span className="flex-1" />
            <span>Runs in your browser</span>
          </>
        }
      >
        <FilesPane active={active} onPick={setActive} groups={[{ files: paths.map((p) => ({ path: p })) }]} width={190} />
        <div className="hidden md:flex flex-1 min-w-0">
          <CodePane path={active} code={files[active] ?? ""} />
        </div>
        <div className="w-full md:w-[400px] shrink-0 border-l border-border flex flex-col min-h-0">
          <div className={`${pane === "preview" ? "flex" : "hidden"} lg:flex flex-col flex-1 min-h-0`}>
            <div className="flex items-center gap-2 h-9 px-3.5 border-b border-border text-sm font-medium text-fg shrink-0">Preview</div>
            <div className="flex-1 min-h-0 bg-white">
              <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%" }} />
            </div>
          </div>
          <div className={`${pane === "console" ? "flex" : "hidden"} lg:flex flex-col lg:h-52 flex-1 lg:flex-none min-h-0 border-t border-border`}>
            <div className="flex items-center gap-2 h-9 px-3.5 border-b border-border text-sm font-medium text-fg shrink-0">Console</div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <JsConsole resetRef={resetRef} />
            </div>
          </div>
        </div>
      </IdeFrame>
    </ShimmedSandpackProvider>
  );
}

/* ── Backend and algorithms: run on the server, with stdin ───────────────── */

function BackendRun({
  round,
  files,
  source,
  sourceToggle,
}: {
  round: ReportRound;
  files: Record<string, string>;
  source: Source;
  sourceToggle: React.ReactNode;
}) {
  const lang = EXEC_LANG[round.language ?? ""] ?? "javascript";
  const paths = useMemo(() => visibleFiles(files), [files]);
  const entry = useMemo(() => {
    const exts = SOURCE_EXT[lang] ?? [];
    return paths.find((p) => exts.some((e) => p.endsWith(e))) ?? paths.find((p) => !/\.(json|css|html|md)$/.test(p)) ?? paths[0] ?? "";
  }, [paths, lang]);
  const [active, setActive] = useState(entry);
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<BackendLog[]>([]);
  const [meta, setMeta] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const runId = useRef(0);

  const run = useCallback(async () => {
    if (running || !entry) return;
    setRunning(true);
    setLogs([]);
    setSummary(null);
    setMeta(null);
    try {
      const { status, data } = await postExecute(
        executeBodyForFiles({ language: lang, activeFilePath: entry, files, speculative: false, stdin: stdin || undefined }),
      );
      const lines: BackendLog[] = describeExecution(status, data).map((l) => ({ method: l.method, data: [l.text], stream: l.stream }));
      const s = summarizeRun(status, data);
      const m = formatRunMeta(data);
      setLogs(lines);
      setSummary(s);
      setMeta(m);
      runId.current += 1;
      setHistory((h) => [{ id: runId.current, at: Date.now(), file: entry, logs: lines, summary: s, meta: m }, ...h].slice(0, 5));
    } catch {
      const s: RunSummary = { tone: "error", text: "Could not run" };
      setLogs([{ method: "error", data: ["The runner could not be reached. Try again."] }]);
      setSummary(s);
    } finally {
      setRunning(false);
    }
  }, [running, entry, lang, files, stdin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void run();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [run]);

  return (
    <div className="flex flex-col gap-3">
      <IdeFrame
        height={620}
        toolbar={
          <>
            <FileSelect files={paths} active={active} onPick={setActive} />
            <span className="hidden sm:inline-flex">{active && <FileTab path={active} />}</span>
            <span className="flex-1" />
            {sourceToggle}
            <button
              type="button"
              onClick={() => void run()}
              disabled={running}
              className="inline-flex items-center gap-2 h-8 px-3.5 rounded-md bg-[#ffe600] text-[#111] text-[13px] font-semibold hover:brightness-95 disabled:opacity-60"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Play className="w-3.5 h-3.5" aria-hidden />}
              Run
              <span className="font-normal opacity-70 hidden sm:inline">{RUN_SHORTCUT}</span>
            </button>
          </>
        }
        status={
          <>
            <span>{RUNTIME_LABEL[lang] ?? round.label}</span>
            <span>Runs {shortPath(entry)}</span>
            <span className="flex-1" />
            <span>{source === "candidate" ? "Candidate code, read only" : "Starter code, read only"}</span>
            <span>Runs on the server</span>
          </>
        }
      >
        <FilesPane active={active} onPick={setActive} groups={[{ files: paths.map((p) => ({ path: p })) }]} width={190} />
        <div className="hidden md:flex flex-1 min-w-0">
          <CodePane path={active} code={files[active] ?? ""} />
        </div>
        <div className="w-full md:w-[420px] shrink-0 border-l border-border flex flex-col min-h-0">
          <StdinBar value={stdin} open={stdinOpen} onToggle={() => setStdinOpen((o) => !o)} onChange={setStdin} />
          <div className="flex-1 min-h-0 overflow-hidden">
            <BackendConsole logs={logs} meta={meta} summary={summary} history={history} fileName={shortPath(entry)} />
          </div>
        </div>
      </IdeFrame>
      <p className="text-xs text-subtle">
        Run executes the code as submitted, with the same runner candidates use. Test results per round are not recorded yet, so there is no Tests pane.
      </p>
    </div>
  );
}
