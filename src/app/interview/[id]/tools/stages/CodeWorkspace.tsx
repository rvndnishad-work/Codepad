"use client";

/**
 * The code editor once a stack is picked: file tabs, the shared Monaco
 * editor, and the stack's output beside it (below it on narrow stages).
 *
 * - Server stacks: Run sends the files to /api/execute. The result is put in
 *   the shared document, so both sides see the same output.
 * - Browser stacks: each browser bundles the shared files itself (like the
 *   rounds' live preview), so the preview never depends on the other side.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileCode2, Loader2, Play } from "lucide-react";
import { SandpackPreview, type SandpackFiles } from "@codesandbox/sandpack-react";
import type * as Y from "yjs";
import SharedSandpack from "@/components/SharedSandpack";
import { BackendConsole, JsConsole } from "@/components/playground/Consoles";
import type { BackendLog } from "@/components/playground/useRunner";
import { templatesById, type TemplateDef } from "@/lib/templates";
import { extColorFor } from "@/lib/monaco-langs";
import { seedDoc } from "@/lib/interview/relay-seed";
import { codeOutputFor, codeRunKey, codeText } from "@/lib/interview/code-stacks";
import { getLanguageFromPath } from "@/lib/playground-languages";
import { describeExecution, formatRunMeta, summarizeRun, type RunSummary } from "@/lib/exec-result";
import { executeBodyForFiles, postExecute } from "@/lib/execute-client";
import SharedMonaco from "../SharedMonaco";
import type { ToolProps } from "../types";

/** A server run, shared through the document so both sides see it. */
type SharedRun = {
  status: "running" | "done";
  by: "interviewer" | "candidate";
  at: number;
  file: string;
  logs?: BackendLog[];
  summary?: RunSummary | null;
  meta?: string | null;
};

function codeOf(f: SandpackFiles[string]): string {
  return typeof f === "string" ? f : (f?.code ?? "");
}
function isHidden(f: SandpackFiles[string]): boolean {
  return typeof f !== "string" && !!f?.hidden;
}

/** Files people edit (visible in the template); the rest stay fixed. */
function splitFiles(t: TemplateDef): { visible: string[]; fixed: SandpackFiles } {
  const visible: string[] = [];
  const fixed: SandpackFiles = {};
  for (const [path, f] of Object.entries(t.files)) {
    if (isHidden(f) || /(^|\/)package\.json$/.test(path)) fixed[path] = f;
    else visible.push(path);
  }
  return { visible, fixed };
}

/** Current text of the stack's shared files, re-read on every change. */
function useFiles(doc: Y.Doc, stack: string, paths: string[]): Record<string, string> {
  const texts = useMemo(() => paths.map((p) => [p, doc.getText(codeText(stack, p))] as const), [doc, stack, paths]);
  const read = useCallback(() => Object.fromEntries(texts.map(([p, t]) => [p, t.toString()])), [texts]);
  const [v, setV] = useState(read);
  useEffect(() => {
    setV(read());
    const on = () => setV(read());
    for (const [, t] of texts) t.observe(on);
    return () => {
      for (const [, t] of texts) t.unobserve(on);
    };
  }, [texts, read]);
  return v;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const short = (p: string) => p.replace(/^\//, "");

export default function CodeWorkspace({ room, isInterviewer, readOnly, dark, stack }: ToolProps & { stack: string }) {
  const { doc } = room;
  const t = templatesById[stack];
  const { visible, fixed } = useMemo(() => splitFiles(t), [t]);
  const output = codeOutputFor(stack);

  // Starter code, written once per stack by whoever gets here first (the
  // seed is identical on every browser, so it never doubles).
  useEffect(() => {
    if (!room.synced || readOnly) return;
    seedDoc(doc, `code-seed:${stack}`, Object.fromEntries(visible.map((p) => [p, codeOf(t.files[p])])), (p) => codeText(stack, p));
  }, [room.synced, readOnly, doc, stack, visible, t]);

  const [file, setFile] = useState(() => visible.find((p) => /(^|\/)(App|index|main|Main)\.[a-z]+$/.test(p)) ?? visible[0] ?? "");
  const files = useFiles(doc, stack, visible);

  // Server runs.
  const runs = useMemo(() => doc.getMap<string>("codeRuns"), [doc]);
  const [shared, setShared] = useState<SharedRun | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const raw = runs.get(codeRunKey(stack));
        setShared(raw ? (JSON.parse(raw) as SharedRun) : null);
      } catch {
        setShared(null);
      }
    };
    read();
    runs.observe(read);
    return () => runs.unobserve(read);
  }, [runs, stack]);
  const [running, setRunning] = useState(false);
  const filesRef = useRef(files);
  filesRef.current = files;

  const runCode = useCallback(async () => {
    if (output !== "run" || running || readOnly) return;
    setRunning(true);
    const by = isInterviewer ? "interviewer" : "candidate";
    const entry = visible[0] ?? file;
    const put = (r: SharedRun) => runs.set(codeRunKey(stack), JSON.stringify(r));
    put({ status: "running", by, at: Date.now(), file: short(entry) });
    try {
      const { status, data } = await postExecute(
        executeBodyForFiles({ language: getLanguageFromPath(entry, stack), activeFilePath: entry, files: filesRef.current, speculative: false }),
      );
      const logs = describeExecution(status, data).map((l) => ({ method: l.method, data: [l.text], ...(l.stream ? { stream: l.stream } : {}) }));
      put({ status: "done", by, at: Date.now(), file: short(entry), logs: logs.slice(-300), summary: summarizeRun(status, data), meta: formatRunMeta(data) });
    } catch {
      put({ status: "done", by, at: Date.now(), file: short(entry), logs: [{ method: "error", data: ["Could not reach the runner. Check your connection and run again."] }], summary: { tone: "error", text: "Could not run" } });
    }
    setRunning(false);
  }, [output, running, readOnly, isInterviewer, visible, file, runs, stack]);

  const [box, width] = useWidth<HTMLDivElement>();
  const side = width >= 900;
  const busy = running || shared?.status === "running";

  const editor = !room.synced ? (
    <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Opening the shared editor
    </div>
  ) : file ? (
    <SharedMonaco
      key={`${file}-${dark}-${readOnly}`}
      text={doc.getText(codeText(stack, file))}
      textName={codeText(stack, file)}
      path={file}
      modelPath={`file:///room/${stack}${file}`}
      awareness={room.awareness}
      dark={dark}
      readOnly={readOnly}
      label={`Shared editor, ${short(file)}`}
      onRun={output === "run" ? () => void runCode() : undefined}
    />
  ) : null;

  const out =
    output === "run" ? (
      <RunPane shared={shared} busy={busy} file={short(visible[0] ?? file)} />
    ) : (
      <BrowserPane t={t} fixed={fixed} files={files} output={output} dark={dark} ready={room.synced && Object.values(files).some(Boolean)} />
    );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="h-11 shrink-0 flex items-center gap-1 px-2 border-b border-border">
        <div role="tablist" aria-label="Files" className="flex items-center gap-1 overflow-x-auto min-w-0">
          {visible.map((p) => (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={p === file}
              onClick={() => setFile(p)}
              className={`h-8 px-2.5 rounded-md text-[12.5px] font-mono whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${p === file ? "bg-panel text-fg ring-1 ring-inset ring-border-strong" : "text-muted hover:text-fg hover:bg-panel/60"}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: extColorFor(p) }} aria-hidden />
              {short(p)}
            </button>
          ))}
          {!visible.length && (
            <span className="px-2 text-[12.5px] text-muted inline-flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5" aria-hidden /> No files
            </span>
          )}
        </div>
        {output === "run" && !readOnly && (
          <button
            type="button"
            onClick={() => void runCode()}
            disabled={busy || !room.synced}
            title="Run (Ctrl or Cmd + Enter)"
            className="ml-auto shrink-0 h-8 px-3.5 rounded-lg bg-success text-bg text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Play className="w-3.5 h-3.5 fill-current" aria-hidden />}
            Run
          </button>
        )}
      </div>
      <div ref={box} className={`flex-1 min-h-0 grid ${side ? "grid-cols-[minmax(0,1fr)_minmax(300px,42%)]" : "grid-rows-[minmax(0,1fr)_minmax(0,40%)]"}`}>
        <div className="min-h-0 min-w-0 relative">{editor}</div>
        <div className={`min-h-0 min-w-0 ${side ? "border-l" : "border-t"} border-border bg-surface`}>{out}</div>
      </div>
    </div>
  );
}

function PaneHead({ children }: { children: React.ReactNode }) {
  return <div className="h-10 shrink-0 flex items-center gap-1 px-2 border-b border-border text-[12.5px]">{children}</div>;
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`h-7 px-2.5 rounded-md font-medium transition-colors ${on ? "bg-panel text-fg ring-1 ring-inset ring-border-strong" : "text-muted hover:text-fg"}`}
    >
      {children}
    </button>
  );
}

function RunPane({ shared, busy, file }: { shared: SharedRun | null; busy: boolean; file: string }) {
  const history = useMemo(
    () => (shared?.status === "done" && shared.logs ? [{ id: shared.at, at: shared.at, file: shared.file, logs: shared.logs, summary: shared.summary ?? { tone: "ok" as const, text: "Finished" }, meta: shared.meta ?? null }] : []),
    [shared],
  );
  return (
    <div className="h-full flex flex-col" aria-live="polite">
      <PaneHead>
        <span className="px-2 font-medium">Output</span>
        {busy ? (
          <span className="text-muted inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> Running{shared?.status === "running" ? ` for the ${shared.by}` : ""}
          </span>
        ) : shared?.status === "done" ? (
          <span className="text-muted truncate">
            Run by the {shared.by} at {new Date(shared.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </PaneHead>
      <div className="flex-1 min-h-0">
        <BackendConsole logs={shared?.status === "done" ? (shared.logs ?? []) : []} meta={shared?.meta} summary={shared?.summary} history={history} fileName={file} />
      </div>
    </div>
  );
}

function BrowserPane({
  t,
  fixed,
  files,
  output,
  dark,
  ready,
}: {
  t: TemplateDef;
  fixed: SandpackFiles;
  files: Record<string, string>;
  output: "console" | "both";
  dark: boolean;
  ready: boolean;
}) {
  const [tab, setTab] = useState<"preview" | "console">(output === "console" ? "console" : "preview");
  const resetRef = useRef<(() => void) | null>(null);
  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Getting the {output === "console" ? "console" : "preview"} ready
      </div>
    );
  }
  return (
    <SharedSandpack template={t.base} dependencies={t.dependencies} fixed={fixed} files={files} dark={dark}>
      <div className="h-full flex flex-col">
        <PaneHead>
          <div role="tablist" aria-label="Output" className="flex items-center gap-1">
            {output === "both" && (
              <Tab on={tab === "preview"} onClick={() => setTab("preview")}>
                Preview
              </Tab>
            )}
            <Tab on={tab === "console"} onClick={() => setTab("console")}>
              Console
            </Tab>
          </div>
          <span className="ml-auto pr-1 text-[12px] text-subtle truncate">Updates as you type</span>
        </PaneHead>
        {/* The preview runs the code, so it stays mounted behind the console. */}
        <div className={`${tab === "preview" ? "flex-1" : "h-0 overflow-hidden"} min-h-0 [&_.sp-preview-container]:h-full [&_.sp-preview]:h-full`} aria-hidden={tab !== "preview"}>
          <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} showRefreshButton />
        </div>
        {/* Mounted throughout so it keeps the logs from before it was opened. */}
        <div className={`${tab === "console" ? "flex-1" : "hidden"} min-h-0`}>
          <JsConsole resetRef={resetRef} />
        </div>
      </div>
    </SharedSandpack>
  );
}
