"use client";

/**
 * The code editor once a stack is picked: a files sidebar with the npm
 * panel, the shared Monaco editor and the stack's output, split by drag
 * handles like /play. Both sides share the files, packages included.
 *
 * - Server stacks: Run sends the files to /api/execute. The result is put in
 *   the shared document, so both sides see the same output.
 * - Browser stacks: each browser bundles the shared files itself (like the
 *   rounds' live preview), so the preview never depends on the other side.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileCode2, FolderTree, Loader2, Play } from "lucide-react";
import { SandpackPreview, useSandpack, type SandpackFiles } from "@codesandbox/sandpack-react";
import type * as Y from "yjs";
import SharedSandpack from "@/components/SharedSandpack";
import FileExplorer from "@/components/FileExplorer";
import { SharedFilesBridge } from "@/components/bridges/SharedFilesBridge";
import { ResizeHandle, usePaneSize, type PaneSize } from "@/components/playground/Chrome";
import { readBoolPref, writeBoolPref } from "@/lib/prefs";
import { PACKAGE_JSON, readSharedFiles, seedFs, withSharedText, writeSharedFiles } from "@/lib/interview/shared-fs";

type SharedBase = Parameters<typeof withSharedText>[0];
import { BackendConsole, JsConsole } from "@/components/playground/Consoles";
import type { BackendLog } from "@/components/playground/useRunner";
import { templatesById, type TemplateDef } from "@/lib/templates";
import { extColorFor } from "@/lib/monaco-langs";
import { seedDoc } from "@/lib/interview/relay-seed";
import { codeOutputFor, codeRunKey, codeText, type CodeOutput } from "@/lib/interview/code-stacks";
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

/**
 * Server stacks never bundle in the browser, so Sandpack's page scaffold
 * stays out of the files sidebar (as on /play). index.js is the program
 * for the node stack, so it stays there.
 */
function hideBrowserScaffold(fixed: SandpackFiles, stack: string): SandpackFiles {
  const next = { ...fixed };
  const paths = ["/index.html", "/styles.css", PACKAGE_JSON, ...(stack === "node" ? [] : ["/index.js"])];
  for (const path of paths) {
    const f = next[path];
    next[path] = { code: f === undefined ? "" : codeOf(f), hidden: true };
  }
  return next;
}

/** Current text of the stack's shared files, re-read on every change. */
function useSharedFiles(doc: Y.Doc, stack: string, legacyPaths: string[]): Record<string, string> {
  const read = useCallback(() => readSharedFiles(doc, stack, legacyPaths), [doc, stack, legacyPaths]);
  const [v, setV] = useState(read);
  useEffect(() => {
    let last = JSON.stringify(read());
    setV(read());
    const on = () => {
      const next = read();
      const key = JSON.stringify(next);
      if (key === last) return;
      last = key;
      setV(next);
    };
    doc.on("update", on);
    return () => doc.off("update", on);
  }, [doc, read]);
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
const pickEntry = (paths: string[]) => paths.find((p) => /(^|\/)(App|index|main|Main)\.[a-z]+$/.test(p)) ?? paths[0] ?? "";

export default function CodeWorkspace({ room, isInterviewer, readOnly, dark, stack }: ToolProps & { stack: string }) {
  const { doc } = room;
  const t = templatesById[stack];
  const { visible, fixed } = useMemo(() => splitFiles(t), [t]);
  const output = codeOutputFor(stack);

  // Starter code and the file list, written once per stack by whoever gets
  // here first (each seed is identical on every browser, so it never doubles).
  // package.json is not seeded: Sandpack builds it on each side, and it joins
  // the shared files the first time someone installs a package.
  const [seeded, setSeeded] = useState<string | null>(null);
  useEffect(() => {
    if (!room.synced) return;
    if (!readOnly) {
      seedDoc(doc, `code-seed:${stack}`, Object.fromEntries(visible.map((p) => [p, codeOf(t.files[p])])), (p) => codeText(stack, p));
      seedFs(doc, stack, visible);
    }
    setSeeded(stack);
  }, [room.synced, readOnly, doc, stack, visible, t]);

  const files = useSharedFiles(doc, stack, visible);

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
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const runCode = useCallback(
    async (active: string) => {
      if (output !== "run" || running || readOnly) return;
      setRunning(true);
      const by = isInterviewer ? "interviewer" : "candidate";
      const code = Object.fromEntries(Object.entries(filesRef.current).filter(([p]) => p !== PACKAGE_JSON));
      const entry = visible.find((p) => p in code) ?? active;
      const put = (r: SharedRun) => runs.set(codeRunKey(stack), JSON.stringify(r));
      put({ status: "running", by, at: Date.now(), file: short(entry) });
      try {
        const { status, data } = await postExecute(
          executeBodyForFiles({ language: getLanguageFromPath(entry, stack), activeFilePath: entry, files: code, speculative: false }),
        );
        const logs = describeExecution(status, data).map((l) => ({ method: l.method, data: [l.text], ...(l.stream ? { stream: l.stream } : {}) }));
        put({ status: "done", by, at: Date.now(), file: short(entry), logs: logs.slice(-300), summary: summarizeRun(status, data), meta: formatRunMeta(data) });
      } catch {
        put({ status: "done", by, at: Date.now(), file: short(entry), logs: [{ method: "error", data: ["Could not reach the runner. Check your connection and run again."] }], summary: { tone: "error", text: "Could not run" } });
      }
      setRunning(false);
    },
    [output, running, readOnly, isInterviewer, visible, runs, stack],
  );

  if (!room.synced || seeded !== stack) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Opening the shared editor
      </div>
    );
  }
  return (
    <SharedSandpack
      key={stack}
      template={t.base}
      dependencies={t.dependencies}
      fixed={withSharedText((output === "run" ? hideBrowserScaffold(fixed, stack) : fixed) as SharedBase, readSharedFiles(doc, stack, visible))}
      dark={dark}
      autorun={output !== "run"}
      entry={pickEntry(Object.keys(files).filter((p) => p !== PACKAGE_JSON))}
    >
      <SharedFilesBridge doc={doc} stack={stack} legacyPaths={visible} readOnly={readOnly} />
      <Workspace
        room={room}
        stack={stack}
        output={output}
        dark={dark}
        readOnly={readOnly}
        shared={shared}
        busy={running || shared?.status === "running"}
        runCode={runCode}
        runFile={short(visible.find((p) => p in files) ?? visible[0] ?? "")}
        sharedFiles={files}
        legacyPaths={visible}
      />
    </SharedSandpack>
  );
}

/**
 * Files, editor and output, each resizable by dragging like /play.
 */
function Workspace({
  room,
  stack,
  output,
  dark,
  readOnly,
  shared,
  busy,
  runCode,
  runFile,
  sharedFiles,
  legacyPaths,
}: {
  room: ToolProps["room"];
  stack: string;
  output: CodeOutput;
  dark: boolean;
  readOnly: boolean;
  shared: SharedRun | null;
  busy: boolean;
  runCode: (active: string) => Promise<void>;
  runFile: string;
  sharedFiles: Record<string, string>;
  legacyPaths: string[];
}) {
  const { doc } = room;
  const { sandpack } = useSandpack();
  const file = sandpack.activeFile;
  // Sandpack's own scaffold files (index.js, public/index.html) start out
  // local. Opening one shares it first, so the editor binds to its real text.
  const isShared = !file || file in sharedFiles;
  const localCode = (sandpack.files[file] as { code?: string } | undefined)?.code ?? "";
  useEffect(() => {
    if (isShared || readOnly) return;
    writeSharedFiles(doc, stack, { [file]: localCode }, legacyPaths);
  }, [isShared, readOnly, doc, stack, file, localCode, legacyPaths]);
  const [box, width] = useWidth<HTMLDivElement>();
  // Wide stages put the output beside the editor, medium ones below it; the
  // files sidebar stays beside the editor until the stage is phone-narrow,
  // where it opens as a drawer on demand.
  const wide = width >= 1100;
  const roomy = width >= 640;
  const [sidebarOpen, setSidebarOpen] = useState(() => readBoolPref("room-code:files-open", true));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filesOpen = roomy ? sidebarOpen : drawerOpen;
  // Picking a file in the drawer closes it.
  useEffect(() => setDrawerOpen(false), [file]);
  const toggleFiles = (open: boolean) => {
    if (!roomy) return setDrawerOpen(open);
    setSidebarOpen(open);
    writeBoolPref("room-code:files-open", open);
  };
  const explorer = usePaneSize({ storageKey: "room-code:explorer", initial: 210, min: 160, max: 380 });
  const outW = usePaneSize({ storageKey: "room-code:output-w", initial: 42, min: 22, max: 70, unit: "%", invert: true });
  const outH = usePaneSize({ storageKey: "room-code:output-h", initial: 40, min: 18, max: 75, unit: "%", axis: "y", invert: true });

  const editor = file && !isShared ? (
    readOnly ? (
      <pre className="h-full overflow-auto p-4 text-[13px] font-mono text-muted">{localCode}</pre>
    ) : (
      <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Sharing {short(file)}
      </div>
    )
  ) : file ? (
    <SharedMonaco
      key={`${stack}-${file}-${dark}-${readOnly}`}
      text={doc.getText(codeText(stack, file))}
      textName={codeText(stack, file)}
      path={file}
      modelPath={`file:///room/${stack}${file}`}
      awareness={room.awareness}
      dark={dark}
      readOnly={readOnly}
      label={`Shared editor, ${short(file)}`}
      onRun={output === "run" ? () => void runCode(file) : undefined}
    />
  ) : (
    <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
      <FileCode2 className="w-4 h-4" aria-hidden /> Pick a file
    </div>
  );

  const out = output === "run" ? <RunPane shared={shared} busy={busy} file={runFile} /> : <BrowserPane output={output} />;

  const explorerPanel = (
    <FileExplorer templateId={stack} readOnly={readOnly} showDownload={false} onCollapse={() => toggleFiles(false)} />
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="h-11 shrink-0 flex items-center gap-1 px-2 border-b border-border">
        <button
          type="button"
          onClick={() => toggleFiles(!filesOpen)}
          aria-pressed={filesOpen}
          title={filesOpen ? "Hide files" : "Show files"}
          className={`h-8 px-2.5 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors ${filesOpen ? "bg-panel text-fg ring-1 ring-inset ring-border-strong" : "text-muted hover:text-fg hover:bg-panel/60"}`}
        >
          <FolderTree className="w-3.5 h-3.5" aria-hidden /> Files
        </button>
        {file && (
          <span className="min-w-0 px-2 text-[12.5px] font-mono text-muted truncate inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: extColorFor(file) }} aria-hidden />
            {short(file)}
          </span>
        )}
        {output === "run" && !readOnly && (
          <button
            type="button"
            onClick={() => void runCode(file)}
            disabled={busy}
            title="Run (Ctrl or Cmd + Enter)"
            className="ml-auto shrink-0 h-8 px-3.5 rounded-lg bg-success text-bg text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Play className="w-3.5 h-3.5 fill-current" aria-hidden />}
            Run
          </button>
        )}
      </div>
      <div ref={box} className={`relative flex-1 min-h-0 flex ${wide ? "flex-row" : "flex-col"}`}>
        <div className="relative min-h-0 min-w-0 flex-1 flex flex-row">
          {roomy && filesOpen && (
            <>
              <div style={{ width: explorer.value }} className="h-full min-w-0 shrink-0 flex flex-col bg-surface">
                {explorerPanel}
              </div>
              <ResizeHandle orientation="vertical" label="Resize files" {...handle(explorer)} />
            </>
          )}
          <div className="relative h-full min-w-0 flex-1">{editor}</div>
        </div>
        {wide ? (
          <>
            <ResizeHandle orientation="vertical" label="Resize output" invert {...handle(outW)} />
            <div style={{ width: `${outW.value}%` }} className="h-full min-w-0 shrink-0 bg-surface">
              {out}
            </div>
          </>
        ) : (
          <>
            <ResizeHandle orientation="horizontal" label="Resize output" invert {...handle(outH)} />
            <div style={{ height: `${outH.value}%` }} className="min-h-0 shrink-0 bg-surface">
              {out}
            </div>
          </>
        )}
        {!roomy && filesOpen && (
          <div className="absolute inset-0 z-20 flex bg-bg/60">
            <div role="dialog" aria-label="Files" className="h-full w-4/5 max-w-xs flex flex-col bg-surface border-r border-border shadow-[var(--shadow-panel)]">
              {explorerPanel}
            </div>
            <div className="flex-1" onClick={() => toggleFiles(false)} aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}

/** Props a ResizeHandle needs from a pane size. */
function handle(p: PaneSize) {
  return { value: p.value, min: p.min, max: p.max, onPointerDown: p.onPointerDown, onResize: p.set };
}

function PaneHead({ children }: { children: React.ReactNode }) {
  return <div className="h-10 shrink-0 flex items-center gap-1 px-2 border-b border-border text-[12.5px]">{children}</div>;
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

/** Live preview over the console, split by a drag handle (console only for script stacks). */
function BrowserPane({ output }: { output: "console" | "both" }) {
  const resetRef = useRef<(() => void) | null>(null);
  const consoleH = usePaneSize({ storageKey: "room-code:console-h", initial: 35, min: 15, max: 80, unit: "%", axis: "y", invert: true });
  const preview = (
    <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} showRefreshButton />
  );
  if (output === "console") {
    return (
      <div className="h-full flex flex-col">
        {/* The preview runs the code, so it stays mounted, just out of sight. */}
        <div className="h-0 overflow-hidden" aria-hidden>
          {preview}
        </div>
        <div className="flex-1 min-h-0">
          <JsConsole resetRef={resetRef} />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col">
      <PaneHead>
        <span className="px-2 font-medium">Preview</span>
        <span className="ml-auto pr-1 text-[12px] text-subtle truncate">Updates as you type</span>
      </PaneHead>
      <div className="flex-1 min-h-0 [&_.sp-preview-container]:h-full [&_.sp-preview]:h-full">{preview}</div>
      <ResizeHandle orientation="horizontal" label="Resize console" invert {...handle(consoleH)} />
      <div style={{ height: `${consoleH.value}%` }} className="min-h-0 shrink-0">
        <JsConsole resetRef={resetRef} />
      </div>
    </div>
  );
}
