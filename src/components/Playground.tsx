"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useTheme } from "next-themes";

function useIsMobile(breakpoint = 768) {
  const getSnap = () => (typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  const subscribe = (cb: () => void) => {
    window.addEventListener("resize", cb);
    return () => window.removeEventListener("resize", cb);
  };
  return useSyncExternalStore(subscribe, getSnap, () => false);
}
import {
  SandpackProvider,
  SandpackLayout,
  useSandpack,
  useSandpackConsole,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import FileExplorer from "./FileExplorer";
import type { ExplorerOps } from "./FileExplorer";
import { ErrorBridge, ErrorOverlay, type ErrorData } from "./ErrorOverlay";
import PromptSidebar from "./PromptSidebar";
import { useResizable } from "@/hooks/useResizable";
import { useResizableHeight } from "@/hooks/useResizableHeight";
import { toast } from "sonner";
import {
  GitFork,
  Save,
  Share2,
  Eye,
  Terminal,
  AppWindow,
  Lock,
  Globe,
  Code2,
  Pencil,
  Play,
  PanelBottom,
  Code,
  ExternalLink,
  Tag,
  X as XIcon,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import { templatesById, supportsV2Bundler, V2_BUNDLER_URL } from "@/lib/templates";
import { buildNodeBuiltinShims } from "@/lib/node-builtin-shims";
import { MissingDepBridge } from "./bridges/MissingDepBridge";
import { decodePlaygroundCode, decodePlaygroundFiles } from "@/lib/playground-handoff";
import { getSandpackTheme } from "@/lib/sandpack-theme";
import { TemplateLogo } from "@/lib/icons";
import {
  BACKEND_LANGUAGES,
  getLanguageFromPath,
  isBackendLanguage,
} from "@/lib/playground-languages";
import { describeExecution, formatRunMeta } from "@/lib/exec-result";
import { stdinKey } from "@/lib/run-payload";
import { postExecute, executeBodyForFiles } from "@/lib/execute-client";
import { snapshotFiles } from "@/lib/file-dirty";
import { readBoolPref, writeBoolPref, readPref, writePref, PREF_KEYS } from "@/lib/prefs";
import {
  DEFAULT_EDITOR_THEME_ID,
  editorThemeById,
} from "@/lib/editor-themes";
import type { FormatResult } from "./bridges/FormatBridge";
import MonacoEditor from "./MonacoEditor";
import ShortcutsModal from "./ShortcutsModal";
import PlaygroundToolbar from "./PlaygroundToolbar";
import { FilesBridge } from "./bridges/FilesBridge";
import {
  PaneTitle,
  LiveBadge,
  UrlPill,
  ClearButton,
  RefreshPreviewButton,
} from "./OutputPaneChrome";
import { SandpackPreviewWithLoader } from "./PreviewLoadingOverlay";
import { RunBridge } from "./bridges/RunBridge";
import { ConsoleEntryBridge } from "./bridges/ConsoleEntryBridge";
import { ConsoleClearBridge } from "./bridges/ConsoleClearBridge";
import { FormatBridge } from "./bridges/FormatBridge";

export type Visibility = "private" | "public";

export type Snippet = {
  id: string;
  slug: string;
  title: string;
  template: string;
  files: SandpackFiles;
  visibility: Visibility;
  tags?: string[];
};

type Props = {
  templateId: string;
  initialTitle?: string;
  initialFiles?: SandpackFiles;
  snippet?: Snippet | null;
  signedIn: boolean;
  isOwner?: boolean;
  embed?: boolean;
  previewOnly?: boolean;
  backHref?: string;
};

function ReadOnlyToolbar({ editable }: { editable: boolean }) {
  if (editable) return null;
  return (
    <div className="flex items-center justify-between px-3 h-8 bg-accent/10 border-t border-accent/20 shrink-0 select-none">
      <div className="flex items-center gap-1.5 text-accent">
        <Lock className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Read-only Mode</span>
      </div>
      <span className="text-[10px] font-medium text-accent/70 tracking-wide">Fork to edit this snippet</span>
    </div>
  );
}

function StatusDot() {
  const { sandpack } = useSandpack();
  const status = sandpack.status;
  const error = sandpack.error;

  let color = "bg-emerald-400/70";
  if (status === "running" || status === "initial") color = "bg-amber-400/70 animate-pulse";
  if (error) color = "bg-red-500/80";

  return <div className={`w-1.5 h-1.5 rounded-full ${color} transition-colors duration-300`} />;
}

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Dependency names declared in a file map's /package.json, so we never shadow a
 * real npm package the user installed under a Node-builtin name (`events`,
 * `buffer`, `url`, `path`… all exist on npm).
 */
function readDeclaredDependencies(files: SandpackFiles): string[] {
  const pkg = files["/package.json"];
  if (!pkg) return [];
  const code = typeof pkg === "string" ? pkg : (pkg as { code: string }).code;
  try {
    const parsed = JSON.parse(code);
    return Object.keys(parsed?.dependencies ?? {});
  } catch {
    return [];
  }
}

/**
 * Percentage-based vertical split for the stacked mobile layout (<768px).
 * The px-based useResizableHeight hook doesn't fit small screens, and the
 * mobile panes previously had no drag handle at all (fixed 55/45). Tracks a
 * pointer drag as a % of the container height so it works with mouse AND
 * touch (the handle itself carries `touch-none` so the browser doesn't steal
 * the gesture for scrolling).
 */
function useVerticalSplit(initialPct: number, min = 12, max = 88) {
  const [split, setSplit] = useState(initialPct);
  const splitRef = useRef(initialPct);
  splitRef.current = split;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const container = e.currentTarget.parentElement;
      if (!container) return;
      e.preventDefault();
      const total = container.getBoundingClientRect().height;
      const startY = e.clientY;
      const startSplit = splitRef.current;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture unsupported — document listeners still track */
      }

      const onPointerMove = (ev: globalThis.PointerEvent) => {
        const pct = startSplit + ((ev.clientY - startY) / Math.max(1, total)) * 100;
        const next = Math.min(max, Math.max(min, pct));
        splitRef.current = next;
        setSplit(next);
      };
      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        document.body.style.userSelect = "";
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
      document.body.style.userSelect = "none";
    },
    [min, max]
  );

  return { split, onPointerDown };
}

/** Visible grab handle between stacked mobile panes — a bottom-sheet style grip. */
function MobileSplitHandle({ onPointerDown, label }: { onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void; label: string }) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      title="Drag to resize"
      className="flex h-7 shrink-0 cursor-row-resize touch-none select-none items-center justify-center bg-[#0d0f16] transition-colors active:bg-[#8b93ff]/20"
    >
      <span className="h-1 w-12 rounded-full bg-white/20" aria-hidden />
    </div>
  );
}

export default function Playground({
  templateId,
  initialTitle,
  initialFiles,
  snippet,
  signedIn,
  isOwner = !snippet,
  embed = false,
  previewOnly = false,
  backHref,
}: Props) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const sandpackTheme = useMemo(() => getSandpackTheme(isDark), [isDark]);

  const tpl = templatesById[templateId];
  if (!tpl) {
    return <div className="p-8">Unknown template: {templateId}</div>;
  }

  const [title, setTitle] = useState(initialTitle ?? tpl.title);
  const [visibility, setVisibility] = useState<Visibility>(snippet?.visibility ?? "private");
  const [saving, setSaving] = useState(false);
  const [forking, setForking] = useState(false);
  const [view, setView] = useState<"preview" | "console" | "both" | "columns">(
    tpl.mode === "console" ? "console" : "preview"
  );
  const [fontSize, setFontSize] = useState(14);
  // Gallery theme for the Monaco panes (dark only) — validated against the
  // catalog so a stale/foreign stored id falls back to the default.
  const [editorThemeId, setEditorThemeId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_EDITOR_THEME_ID;
    return editorThemeById(readPref(PREF_KEYS.editorTheme)).id;
  });
  useEffect(() => {
    writePref(PREF_KEYS.editorTheme, editorThemeId);
  }, [editorThemeId]);
  const [snippetId, setSnippetId] = useState<string | null>(snippet?.id ?? null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(snippet?.slug ?? null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    snippet ? Date.now() : null
  );
  const [tags, setTags] = useState<string[]>(snippet?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [running, setRunning] = useState(false);
  const [backendLogs, setBackendLogs] = useState<{ method: string; data: string[] }[]>([]);
  // Provenance of the last explicit run for the console footer.
  const [runMeta, setRunMeta] = useState<string | null>(null);
  // Program input for backend runs. Local-only draft per template — it rides
  // the run request but never enters saved snippets.
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const stdinRef = useRef("");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(stdinKey(templateId));
      setStdin(saved ?? "");
      stdinRef.current = saved ?? "";
      // A restored draft opens the bar so the applied input is visible.
      if (saved && saved.trim()) setStdinOpen(true);
    } catch {
      /* private mode — run without a draft */
    }
  }, [templateId]);
  useEffect(() => {
    stdinRef.current = stdin;
    try {
      window.localStorage.setItem(stdinKey(templateId), stdin);
    } catch {
      /* ignore */
    }
  }, [stdin, templateId]);
  const [bundlerError, setBundlerError] = useState<ErrorData | null>(null);
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  // Format-on-save is opt-in (default off): rewriting code on save must be
  // the user's explicit choice, never a surprise.
  const [formatOnSave, setFormatOnSave] = useState(false);
  // Handle the hook's own reset() drains the client's log store directly,
  // so clearing can never desync from what the bundler holds.
  const consoleResetRef = useRef<(() => void) | null>(null);

  // Console clear that actually works: JsConsole registers the Sandpack
  // hook's own reset() here, which drains the client's log store directly.
  // (Index baselines were tried and abandoned — they race the async
  // bundler and can hide fresh output after a manual Run.)
  const clearConsole = useCallback(() => {
    consoleResetRef.current?.();
    setBackendLogs([]);
  }, []);
  const [uiScale, setUiScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  // One-shot code handoff from an "Open in Playground" link (#code=… in the
  // URL hash). Read once on mount; the hash is then cleared (effect below) so a
  // save/fork/refresh doesn't keep re-injecting it.
  const prefillCode = useMemo(
    () => (typeof window === "undefined" ? null : decodePlaygroundCode(window.location.hash)),
    [],
  );
  // Multi-file handoff (#files=…): a path -> source map merged over the template,
  // so a solution can be split component-wise (e.g. /App.js + /src/Otp.js).
  const prefillFiles = useMemo(
    () => (typeof window === "undefined" ? null : decodePlaygroundFiles(window.location.hash)),
    [],
  );

  const cleanFiles = useMemo(() => {
    let files = initialFiles ?? tpl.files;
    // Multi-file handoff wins: merge the supplied files over the template ones
    // (overrides /App.js, adds /src/* which then show in the file explorer).
    if (prefillFiles && Object.keys(prefillFiles).length > 0) {
      files = { ...files, ...prefillFiles };
    } else if (prefillCode) {
      const entry =
        Object.keys(files).find((k) => {
          const v = files[k];
          return !(typeof v === "object" && (v as { hidden?: boolean }).hidden === true);
        }) ?? Object.keys(files)[0];
      if (entry) files = { ...files, [entry]: prefillCode };
    }
    const isBackend = ["python", "go", "java", "cpp", "rust", "node", "ts-node"].includes(templateId);
    if (isBackend) {
      const next = { ...files };
      // Always hide index.html and styles.css for backend
      if (next["/index.html"]) {
        next["/index.html"] = typeof next["/index.html"] === "string"
          ? { code: next["/index.html"], hidden: true }
          : { ...(next["/index.html"] as any), hidden: true };
      } else {
        next["/index.html"] = { code: "", hidden: true };
      }
      if (next["/styles.css"]) {
        next["/styles.css"] = typeof next["/styles.css"] === "string"
          ? { code: next["/styles.css"], hidden: true }
          : { ...(next["/styles.css"] as any), hidden: true };
      } else {
        next["/styles.css"] = { code: "", hidden: true };
      }
      // Hide index.js for everything except node template
      if (templateId !== "node") {
        if (next["/index.js"]) {
          next["/index.js"] = typeof next["/index.js"] === "string"
            ? { code: next["/index.js"], hidden: true }
            : { ...(next["/index.js"] as any), hidden: true };
        } else {
          next["/index.js"] = { code: "", hidden: true };
        }
      }
      return next;
    }
    // Everything below bundles in-browser through Sandpack's v2 bundler, which
    // ships no Node core polyfills AND eagerly resolves the dependencies of
    // every installed package (not just the ones the user imports). So a single
    // `npm i axios` used to kill the preview with
    //   Cannot find module 'http' from '/node_modules/follow-redirects/index.js'
    // even with no `import axios` anywhere. Ship hidden shim packages so every
    // Node builtin at least resolves. See lib/node-builtin-shims.ts.
    const declaredDeps = [
      ...Object.keys(tpl.dependencies ?? {}),
      ...readDeclaredDependencies(files),
    ];
    // Shims go first so a real user file at the same path always wins.
    return { ...buildNodeBuiltinShims(declaredDeps), ...files };
  }, [initialFiles, templateId, tpl.files, tpl.dependencies, prefillCode, prefillFiles]);

  const initialFilesRef = useRef<SandpackFiles>(cleanFiles);
  const filesRef = useRef<SandpackFiles>(cleanFiles);
  const activeFileRef = useRef<string>("");
  const saveSeqRef = useRef(0);
  const committedSeqRef = useRef(0);
  const backendFetchRef = useRef(false);
  const runRef = useRef<(() => void) | null>(null);
  // One-time hint teaching the save model (silent persists never land on
  // the dashboard) — shown on the first Ctrl+S of an unsaved playground.
  const saveHintShownRef = useRef(false);
  const explorerOpsRef = useRef<ExplorerOps | null>(null);
  const formatRef = useRef<
    ((opts?: { quiet?: boolean }) => Promise<FormatResult | null>) | null
  >(null);
  // Last-saved code snapshot for per-tab dirty dots. Seeded from the initial
  // files so a fresh playground starts clean; refreshed on every save.
  const savedSnapshotRef = useRef<SandpackFiles | null>(null);
  if (savedSnapshotRef.current === null) {
    savedSnapshotRef.current = snapshotFiles(initialFilesRef.current);
  }
  const customSetup = useMemo(() => {
    const setup: any = tpl.dependencies ? { dependencies: tpl.dependencies } : {};
    return setup;
  }, [tpl]);

  // Initial tab strip is just the entry file. Other files appear as tabs only
  // when the user clicks them in the explorer (which calls sandpack.openFile).
  // Entry detection prefers package.json's "main" field, then falls back to
  // common entry names, then the first non-hidden file.
  const initialVisibleFiles = useMemo(() => {
    const f = initialFilesRef.current;
    const keys = Object.keys(f);
    const isHidden = (k: string) => {
      const v = f[k];
      return typeof v === "object" && (v as { hidden?: boolean }).hidden === true;
    };
    // 1. package.json "main"
    const pkgRaw = f["/package.json"];
    if (pkgRaw) {
      const code = typeof pkgRaw === "string" ? pkgRaw : (pkgRaw as { code: string }).code;
      try {
        const main = JSON.parse(code).main;
        if (typeof main === "string") {
          const normalized = main.startsWith("/") ? main : `/${main}`;
          if (f[normalized] && !isHidden(normalized)) return [normalized];
        }
      } catch {
        // fall through
      }
    }
    // 2. Common entry names
    const CANDIDATES = [
      "/src/App.tsx", "/src/App.jsx", "/App.tsx", "/App.jsx",
      "/src/index.tsx", "/src/index.jsx", "/src/index.ts", "/src/index.js",
      "/index.tsx", "/index.jsx", "/index.ts", "/index.js",
    ];
    for (const c of CANDIDATES) {
      if (f[c] && !isHidden(c)) return [c];
    }
    // 3. First non-hidden file
    const firstVisible = keys.find((k) => !isHidden(k));
    return firstVisible ? [firstVisible] : keys.slice(0, 1);
  }, []);

  useEffect(() => {
    if (initialVisibleFiles && initialVisibleFiles[0]) {
      activeFileRef.current = initialVisibleFiles[0];
    }
  }, [initialVisibleFiles]);

  const editable = isOwner || !snippet;
  const isMobile = useIsMobile(768);
  // Default wide enough for the "Files" label + all header buttons (new file,
  // new folder, deps, sort, download, divider, close) to show without clipping.
  const { width: explorerW, onPointerDown: onExplorerDrag, setWidth: setExplorerW } = useResizable(280, 200, 400, false, PREF_KEYS.layout("explorer"));
  const { width: editorW, onPointerDown: onEditorDrag, setWidth: setEditorW } = useResizable(500, 200, 2000, false, PREF_KEYS.layout("editor"));
  const { width: promptW, onPointerDown: onPromptDrag } = useResizable(384, 280, 640, false, PREF_KEYS.layout("prompt"));
  const { height: consoleH, onPointerDown: onConsoleDrag } = useResizableHeight(300, 120, 900, PREF_KEYS.layout("consoleH"));
  const { width: consoleW, onPointerDown: onConsoleColDrag } = useResizable(420, 240, 900, true, PREF_KEYS.layout("consoleW"));
  // Mobile stacked-pane splits (editor/output 55%, preview/console 60%).
  const { split: mobileSplit, onPointerDown: onMobileSplitDrag } = useVerticalSplit(55);
  const { split: mobileInnerSplit, onPointerDown: onMobileInnerSplitDrag } = useVerticalSplit(60);

  useEffect(() => {
    // A persisted editor width is the user's explicit choice — keep it.
    if (typeof window !== "undefined") {
      try {
        if (window.localStorage.getItem(PREF_KEYS.layout("editor")) !== null) return;
      } catch {
        /* fall through to defaults */
      }
      const explorerWidth = explorerCollapsed ? 40 : explorerW;
      const remainingW = window.innerWidth - explorerWidth;
      setEditorW(Math.max(200, Math.floor(remainingW * 0.5)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the AI panel docks, steal its width from explorer + editor
  // proportionally so the output pane keeps a usable share. Widths are
  // restored when it closes. Below lg the panel overlays content flow, so
  // no redistribution happens there.
  const prevWidths = useRef<{ explorer: number; editor: number } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    if (promptOpen) {
      if (prevWidths.current) return;
      prevWidths.current = { explorer: explorerW, editor: editorW };
      const freed = Math.min(promptW, window.innerWidth - 900);
      const total = Math.max(1, explorerW + editorW);
      setExplorerW(Math.max(200, Math.round(explorerW - freed * (explorerW / total))));
      setEditorW(Math.max(200, Math.round(editorW - freed * (editorW / total))));
    } else if (prevWidths.current) {
      setExplorerW(prevWidths.current.explorer);
      setEditorW(prevWidths.current.editor);
      prevWidths.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptOpen]);

  // Whether this template runs code server-side (Python, Go, Java, etc.)
  const isBackend = useMemo(() => BACKEND_LANGUAGES.has(templateId), [templateId]);

  const effectiveView = isBackend ? "console" : view;

  // Speculative pre-compilation — only for backend languages
  useEffect(() => {
    if (!dirty || !templateId || !isBackend) return;
    // No background executor spend for background tabs.
    if (typeof document !== "undefined" && document.hidden) return;

    const timer = setTimeout(async () => {
      try {
        const activeFilePath = activeFileRef.current || (filesRef.current ? Object.keys(filesRef.current)[0] : "/index.ts");
        const fileObj = filesRef.current?.[activeFilePath];
        const activeCode = typeof fileObj === "string"
          ? fileObj
          : (fileObj as { code: string } | undefined)?.code ?? "";

        if (!activeCode || !activeCode.trim()) return;

        const hashHex = simpleHash(activeCode);
        const executionLanguage = getLanguageFromPath(activeFilePath, templateId);

        // Only pre-compile backend languages
        if (!isBackendLanguage(executionLanguage, templateId)) return;

        // Warm the same cache key the explicit run will read: siblings ride
        // along so the pre-compiled result matches a multi-file run.
        await postExecute(
          executeBodyForFiles({
            language: executionLanguage,
            activeFilePath,
            files: filesRef.current,
            speculative: true,
            codeHash: hashHex,
            stdin: stdinRef.current,
          }),
        );
      } catch (err) {
        console.warn("[Speculative] Pre-compilation background warning:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [dirty, templateId, isBackend]);

  async function handleRun() {
    if (backendFetchRef.current) return; // rapid clicks: one execution at a time
    setRunning(true);
    try {
      const activeFilePath = activeFileRef.current || (filesRef.current ? Object.keys(filesRef.current)[0] : "/index.ts");
      const fileObj = filesRef.current?.[activeFilePath];
      const activeCode = typeof fileObj === "string"
        ? fileObj
        : (fileObj as { code: string } | undefined)?.code ?? "";

      const executionLanguage = getLanguageFromPath(activeFilePath, templateId);

      // Backend languages (Python, Go, Java, C++, Rust) execute server-side
      if (activeCode.trim() && isBackendLanguage(executionLanguage, templateId)) {
        const hashHex = simpleHash(activeCode);

        // Clear console before execution
        setBackendLogs([]);
        setRunMeta(null);
        backendFetchRef.current = true;

        // Multi-file workspaces travel whole: sibling modules ride as Piston
        // extra files so imports resolve server-side.
        const { status, data: runResult } = await postExecute(
          executeBodyForFiles({
            language: executionLanguage,
            activeFilePath,
            files: filesRef.current,
            speculative: false,
            codeHash: hashHex,
            stdin,
          }),
        );
        setRunMeta(formatRunMeta(runResult));
        setBackendLogs(
          describeExecution(status, runResult).map((line) => ({
            method: line.method,
            data: [line.text],
          }))
        );
      } else {
        // Frontend languages (JS, TS, React, etc.) — use Sandpack's in-browser bundler
        clearConsole();
        runRef.current?.();
      }
    } catch (err) {
      console.error("Run execution error:", err);
      window.postMessage({
        type: "console",
        codesandbox: true,
        log: { method: "error", data: [String(err)] }
      }, "*");
    } finally {
      backendFetchRef.current = false;
      setRunning(false);
    }
  }

  async function handleSave(opts: { silent?: boolean; title?: string } = {}) {
    if (!signedIn) {
      if (opts.silent) return;
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?next=${next}`);
      return;
    }
    if (!editable) return;
    // Silent saves (background auto-save, Ctrl+S) persist working files
    // only — they never create dashboard entries. A playground appears on
    // the dashboard/profile exclusively via an explicit Save click.
    if (opts.silent && !snippetId) {
      if (!saveHintShownRef.current) {
        saveHintShownRef.current = true;
        toast.info("Click Save to keep this playground on your dashboard.");
      }
      return;
    }
    // First-save naming: the toolbar's save dialog hands the chosen name
    // here. Sync it into the title input so bar, payload, and toast agree.
    const saveTitle = (opts.title ?? title).trim() || "Untitled";
    if (opts.title !== undefined && opts.title !== title) setTitle(opts.title);
    // Overlapping saves (manual Ctrl+S racing the silent auto-save) resolve
    // in any order — only the latest finisher may clear dirty/saving, so a
    // stale response can never wipe a newer edit.
    const seq = ++saveSeqRef.current;
    // Background auto-saves must stay invisible: the Save button is
    // exclusively the "keep on dashboard" action, so it never spins for
    // silent persists — only explicit user saves animate it.
    if (!opts.silent) setSaving(true);
    try {
      // Format-on-save formats the active file first. The formatted code is
      // folded into the payload directly: the bridge sync back to filesRef is
      // async, so reading filesRef here would save the unformatted code.
      let files: SandpackFiles = filesRef.current;
      if (formatOnSave) {
        try {
          const formatted = await formatRef.current?.({ quiet: true });
          const atPath = activeFileRef.current || Object.keys(files)[0];
          if (formatted?.changed && atPath) {
            files = { ...files, [atPath]: formatted.code };
          }
        } catch {
          /* formatting is best-effort — never block a save */
        }
      }
      const payload: Record<string, unknown> = {
        title: saveTitle,
        template: templateId,
        files,
        visibility,
      };
      if (tags.length > 0) payload.tags = tags;
      const url = snippetId ? `/api/snippets/${snippetId}` : "/api/snippets";
      const method = snippetId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      if (!opts.silent) {
        toast.success(snippetId ? "Snippet updated" : "Snippet saved", {
          description: saveTitle,
        });
      }
      if (!snippetId && data?.id) {
        setSnippetId(data.id);
        setCurrentSlug(data.slug);
        window.history.replaceState(null, "", `/play/${data.slug}`);
      }
      committedSeqRef.current = seq;
      if (saveSeqRef.current === seq) {
        setDirty(false);
        setLastSavedAt(Date.now());
        savedSnapshotRef.current = snapshotFiles(files);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!opts.silent) toast.error("Save failed", { description: msg });
    } finally {
      if (!opts.silent && saveSeqRef.current === committedSeqRef.current) setSaving(false);
    }
  }

  async function handleFork() {
    if (!signedIn) {
      toast.error("Sign in to fork.");
      return;
    }
    const targetId = snippetId ?? snippet?.id;
    if (!targetId) {
      toast.info("Save first to fork.");
      return;
    }
    if (forking || saving) return;
    setForking(true);
    try {
      const res = await fetch(`/api/snippets/${targetId}/fork`, { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      toast.success("Fork created â€” openingâ€¦");
      window.location.href = `/play/${data.slug}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Fork failed", { description: msg });
      setForking(false);
    }
  }

  async function handleShare() {
    if (!snippetId || !currentSlug) {
      toast.info("Save first to get a shareable link.");
      return;
    }
    if (editable && visibility !== "public") {
      try {
        const res = await fetch(`/api/snippets/${snippetId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visibility: "public" }),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        setVisibility("public");
      } catch {
        toast.error("Couldn't update visibility.");
        return;
      }
    }
    const url = `${window.location.origin}/play/${currentSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied", { description: url });
    } catch {
      toast(url);
    }
  }

  function handlePopout() {
    if (!currentSlug) {
      toast.info("Save first to pop out the preview.");
      return;
    }
    window.open(
      `${window.location.origin}/play/${currentSlug}?view=preview`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleCopyEmbed() {
    if (!snippetId || !currentSlug) {
      toast.info("Save first to get an embed code.");
      return;
    }
    if (editable && visibility !== "public") {
      try {
        const res = await fetch(`/api/snippets/${snippetId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visibility: "public" }),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        setVisibility("public");
      } catch {
        toast.error("Couldn't update visibility.");
        return;
      }
    }
    const url = `${window.location.origin}/embed/${currentSlug}`;
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Embed code copied", { description: url });
    } catch {
      toast(code);
    }
  }

  useEffect(() => { setMounted(true); }, []);

  // Strip the one-shot #code= handoff from the URL once it's been applied, so a
  // refresh, save, or fork doesn't re-inject it and the address bar stays clean.
  useEffect(() => {
    if (typeof window !== "undefined" && /[#&](code|files)=/.test(window.location.hash)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // ── Persistence: Editor Settings ──
  useEffect(() => {
    const savedFontSize = localStorage.getItem("interviewpad_fontSize");
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 32) setFontSize(parsed);
    }

    const savedAutoRun = localStorage.getItem("interviewpad_autoRun");
    if (savedAutoRun !== null) setAutoRun(savedAutoRun === "true");

    setFormatOnSave(readBoolPref(PREF_KEYS.formatOnSave, false));
  }, []);

  useEffect(() => {
    localStorage.setItem("interviewpad_fontSize", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("interviewpad_autoRun", autoRun.toString());
  }, [autoRun]);

  useEffect(() => {
    writeBoolPref(PREF_KEYS.formatOnSave, formatOnSave);
  }, [formatOnSave]);

  useEffect(() => {
    const savedUiScale = localStorage.getItem("interviewpad_uiScale");
    if (savedUiScale) {
      const parsed = parseFloat(savedUiScale);
      if (!isNaN(parsed) && parsed >= 0.8 && parsed <= 2) setUiScale(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("interviewpad_uiScale", uiScale.toString());
    document.documentElement.style.setProperty("--ui-scale", uiScale.toString());
  }, [uiScale]);

  const handleSaveRef = useRef(handleSave);
  const handleRunRef = useRef(handleRun);
  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleRunRef.current = handleRun;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // F2 renames the active file from anywhere (VS Code parity) — it has
      // no text-editing meaning in inputs, so it runs ahead of the guard.
      if (e.key === "F2") {
        e.preventDefault();
        explorerOpsRef.current?.renameActiveFile();
        return;
      }
      // Let text fields handle their own keys — shortcuts must not fire
      // while typing in the title, tags, prompt box or the editor itself.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        // File-level save: silent persist of working files, never the
        // dashboard naming dialog (only the Save button creates/renames).
        void handleSaveRef.current({ silent: true });
      }
      // Delete removes the active file (files only — folders stay on the
      // context menu). Guarded by the text-field check above so typing,
      // including Monaco's own textarea, is never affected.
      if (e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        explorerOpsRef.current?.deleteActiveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        void formatRef.current?.();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.code === "Equal" || e.code === "NumpadAdd")) {
        e.preventDefault();
        e.stopPropagation();
        setFontSize((f) => Math.min(32, f + 1));
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.code === "Minus" || e.code === "NumpadSubtract")) {
        e.preventDefault();
        e.stopPropagation();
        setFontSize((f) => Math.max(10, f - 1));
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY < 0) {
          setFontSize((f) => Math.min(32, f + 1));
        } else {
          setFontSize((f) => Math.max(10, f - 1));
        }
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, []);

  // Auto-save: debounced silent PATCH for existing snippets
  useEffect(() => {
    if (!dirty || !signedIn || !editable || !snippetId) return;
    const t = setTimeout(() => {
      void handleSave({ silent: true });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, visibility, tags, snippetId, signedIn, editable]);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const dynamicStyles = useMemo(() => {
    return `
      .cm-editor { font-size: ${fontSize}px !important; } 
      .cm-line { line-height: ${Math.round(fontSize * 1.5)}px !important; }
      /* Hide Sandpack's built-in error overlay — our custom ErrorOverlay component handles errors */
      .sp-overlay,
      .sp-error-indicator,
      iframe html .sp-overlay,
      iframe html .sp-error-indicator {
        display: none !important;
      }

      /* Nano Banana Pro Custom Styles */
      .playground-container {
        overflow: hidden;
        background: var(--bg);
      }

      /* Seamless panels — no margins, no rounded corners, no visible borders */
      .ide-panel {
        overflow: hidden;
        background: var(--bg);
      }

      /* Thin divider between panels — indigo flare on grab */
      .ide-divider {
        background: rgba(255, 255, 255, 0.07);
        transition: background 0.2s ease, box-shadow 0.2s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }
      .ide-divider:hover {
        background: linear-gradient(180deg, #8b93ff, #ff2fb3);
        opacity: 1;
        box-shadow: 0 0 14px rgba(139, 147, 255, 0.65);
      }
      /* Horizontal divider between preview (top) and console (bottom) */
      .ide-divider-h {
        background: rgba(255, 255, 255, 0.07);
        transition: background 0.2s ease, box-shadow 0.2s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }
      .ide-divider-h:hover {
        background: linear-gradient(90deg, #8b93ff, #ff2fb3);
        opacity: 1;
        box-shadow: 0 0 14px rgba(139, 147, 255, 0.65);
      }
      /* Sonar rings for standby empty states. Decorative only: the ping
         radiates past its box and must never steal taps from nearby
         controls (on small screens the standby art overflows its pane). */
      .ide-sonar { position: relative; pointer-events: none; }
      .ide-sonar::before, .ide-sonar::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: 9999px;
        border: 1px solid rgba(139, 147, 255, 0.55);
        animation: ide-sonar-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      .ide-sonar::after { animation-delay: 1.2s; }
      @keyframes ide-sonar-ping {
        0% { transform: scale(0.55); opacity: 0.9; }
        100% { transform: scale(1.9); opacity: 0; }
      }
      /* Custom Scrollbar */
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { 
        background: var(--muted);
        opacity: 0.1;
        border-radius: 10px; 
      }
      ::-webkit-scrollbar-thumb:hover { 
        background: var(--muted);
        opacity: 0.2;
      }

      /* Sandpack Internal Overrides */
      .sp-layout {
        background: transparent !important;
        border: none !important;
      }
      .sp-stack {
        background: transparent !important;
      }
      .sp-console {
        background: transparent !important;
      }
      .sp-preview-container {
        background: transparent !important;
      }
    `;
  }, [fontSize]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <div className="flex-1 flex flex-col bg-bg">
        <div className="flex-1 playground-container flex flex-col relative overflow-hidden">
          {!embed && !previewOnly && (
            <PlaygroundToolbar
              backHref={backHref}
              templateId={templateId} tplTitle={tpl.title} title={title} setTitle={setTitle}
              dirty={dirty} setDirty={setDirty} editable={editable} signedIn={signedIn}
              saving={saving} lastSavedAt={lastSavedAt}
              fontSize={fontSize} setFontSize={setFontSize} view={view} setView={setView}
              snippetId={snippetId} visibility={visibility} setVisibility={setVisibility}
              snippet={snippet} isOwner={isOwner} forking={forking}
              handleSave={(opts?: { silent?: boolean; title?: string }) => handleSave(opts ?? {})} handleFork={handleFork} handleShare={handleShare}
              editorThemeId={editorThemeId} setEditorThemeId={setEditorThemeId}
              handleCopyEmbed={handleCopyEmbed} handlePopout={handlePopout} handleRun={handleRun}
              running={running} showRun={isBackend} showDirectionToggle={!isMobile} tags={tags} setTags={setTags} tagInput={tagInput} setTagInput={setTagInput}
              onToggleFiles={() => setMobileFilesOpen((prev) => !prev)}
              onTogglePrompt={() => setPromptOpen((prev) => !prev)}
              autoRun={autoRun} setAutoRun={setAutoRun}
              formatOnSave={formatOnSave} setFormatOnSave={setFormatOnSave}
              uiScale={uiScale} setUiScale={setUiScale}
              tplMode={tpl.mode}
            />
          )}

          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0">
              {!mounted ? (
                <div className="flex items-center justify-center h-full w-full">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : (
                <SandpackProvider
                  key={templateId}
                  theme={{
                    ...sandpackTheme,
                    font: {
                      ...sandpackTheme.font,
                      mono: 'var(--font-mono), "Fira Code", monospace',
                      size: "14px",
                    }
                  }}
                  template={tpl.base}
                  files={initialFilesRef.current}
                  customSetup={customSetup}
                  options={{
                    // The version-pinned default (v1) bundler ships an old parser
                    // that throws "Unexpected token" on ES2020 syntax (??, ?.),
                    // so React/Solid point at the evergreen v2 (esbuild) bundler.
                    // But v2 only ships React/Solid transformers — Vue/Svelte
                    // fail with "No transformer for *.vue/*.svelte" and Angular
                    // fails with "decorators isn't currently enabled". Those
                    // bases must fall back to the default v1 bundler, which is
                    // the only one with their transformers.
                    ...(supportsV2Bundler(tpl.base) ? { bundlerURL: V2_BUNDLER_URL } : {}),
                    autorun: isBackend ? false : autoRun,
                    autoReload: isBackend ? false : autoRun,
                    initMode: "immediate" as const,
                    recompileMode: isBackend ? "immediate" : "delayed",
                    recompileDelay: isBackend ? 0 : 300,
                    // Open just the entry file in the tab strip. Additional
                    // files become tabs only when the user clicks them in the
                    // explorer (via sandpack.openFile).
                    visibleFiles: initialVisibleFiles,
                    activeFile: initialVisibleFiles[0],
                    externalResources: [
                      "data:text/css,.react-error-overlay,#webpack-dev-server-client-overlay,.sp-overlay{display:none!important}#ignore.css"
                    ]
                  }}
                >
                  {isMobile && mobileFilesOpen && (
                    <div className="fixed inset-0 z-[100] flex bg-black/60 backdrop-blur-sm">
                      <div className="w-4/5 max-w-sm h-full bg-panel border-r border-border shadow-2xl flex flex-col">
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <FileExplorer templateId={templateId} readOnly={!editable} onCollapse={() => setMobileFilesOpen(false)} opsRef={explorerOpsRef} />
                        </div>
                      </div>
                      <div className="flex-1" onClick={() => setMobileFilesOpen(false)} />
                    </div>
                  )}
                  {isMobile && promptOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
                      <div className="flex-1" onClick={() => setPromptOpen(false)} />
                      <div className="h-full w-4/5 max-w-sm border-l border-white/10 bg-[#0d0f16] shadow-2xl">
                        <PromptSidebar onClose={() => setPromptOpen(false)} contextLabel={title} signedIn={signedIn} />
                      </div>
                    </div>
                  )}

                  <div className="flex h-full w-full overflow-hidden relative">
                    <div className="flex-1 min-w-0 h-full">
                      {previewOnly ? (
                        <div className="h-full w-full relative ide-panel">
                          <SandpackPreviewWithLoader title={tpl.title} showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                          <ErrorOverlay error={bundlerError} onDismiss={() => { setBundlerError(null); runRef.current?.(); }} />
                        </div>
                      ) : isMobile ? (
                        <div className="flex flex-col h-full bg-bg">
                          <div style={{ flex: `0 0 ${mobileSplit}%` }} className="min-h-0 overflow-hidden flex flex-col ide-panel">
                            <div className="flex-1 min-h-0">
                              <MonacoEditor fontSize={fontSize} readOnly={!editable} savedSnapshotRef={savedSnapshotRef} themeId={editorThemeId} />
                            </div>
                            <ReadOnlyToolbar editable={editable} />
                          </div>
                          <MobileSplitHandle onPointerDown={onMobileSplitDrag} label="Resize editor and output" />
                          <div className="flex-1 min-h-0 flex flex-col relative ide-panel border-t border-border">
                            <div style={{
                              display: effectiveView === "console" ? "none" : "flex",
                              flex: effectiveView === "both" ? `0 0 ${mobileInnerSplit}%` : 1,
                               minHeight: 0, overflow: "hidden",
                             }}>
                              <SandpackPreviewWithLoader title={tpl.title} showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                            </div>
                            {effectiveView === "both" && (
                              <MobileSplitHandle onPointerDown={onMobileInnerSplitDrag} label="Resize preview and console" />
                            )}
                            <div style={{
                              display: effectiveView === "preview" ? "none" : "flex",
                              flex: 1,
                              minHeight: 0, overflow: "hidden",
                              flexDirection: "column",
                              borderTop: effectiveView === "both" ? "1px solid var(--border)" : undefined,
                            }}>
                              {effectiveView !== "preview" && (
                                <div className="flex h-9 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-white/10 bg-[#0d0f16]/90 px-3">
                                  <PaneTitle icon={Terminal} iconClassName="border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    Console
                                  </PaneTitle>
                                  <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                                    <ClearButton onClear={clearConsole} showLabel={false} />
                                    <LiveBadge />
                                  </div>
                                </div>
                              )}
                              {isBackend && (
                                <StdinBar
                                  value={stdin}
                                  open={stdinOpen}
                                  onToggle={() => setStdinOpen((v) => !v)}
                                  onChange={setStdin}
                                />
                              )}
                              <div className="flex-1 min-h-0">
                                {isBackend ? (
                                  <BackendConsole logs={backendLogs} meta={runMeta} />
                                ) : (
                                  <JsConsole resetRef={consoleResetRef} />
                                )}
                              </div>
                            </div>
                            <ErrorOverlay error={bundlerError} onDismiss={() => { setBundlerError(null); runRef.current?.(); }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full">
                          {promptOpen && (
                            <>
                              <div style={{ width: promptW, minWidth: 0 }} className="h-full shrink-0">
                                <PromptSidebar onClose={() => setPromptOpen(false)} contextLabel={title} signedIn={signedIn} />
                              </div>
                              <div className="ide-divider h-full w-px cursor-col-resize touch-none select-none" onPointerDown={onPromptDrag}>
                                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
                              </div>
                            </>
                          )}
                          {!explorerCollapsed && (
                            <>
                              <div style={{ width: explorerW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel">
                                <FileExplorer templateId={templateId} readOnly={!editable} onCollapse={() => setExplorerCollapsed(true)} opsRef={explorerOpsRef} />
                              </div>
                              <div className="ide-divider h-full w-px cursor-col-resize touch-none select-none" onPointerDown={onExplorerDrag}>
                                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
                              </div>
                            </>
                          )}
                          {explorerCollapsed && (
                            <div className="flex h-full w-10 shrink-0 flex-col items-center border-r border-white/10 bg-[#0d0f16]/90 py-4">
                              <button onClick={() => setExplorerCollapsed(false)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/50 transition hover:border-[#8b93ff]/50 hover:text-white" title="Expand Files">
                                <PanelBottom className="w-4 h-4 rotate-90" />
                              </button>
                            </div>
                          )}
                          <div style={{ width: editorW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel">
                            <div className="flex-1 min-h-0">
                              <div className="h-full w-full min-w-0">
                                <MonacoEditor fontSize={fontSize} readOnly={!editable} savedSnapshotRef={savedSnapshotRef} themeId={editorThemeId} />
                              </div>
                            </div>
                            <ReadOnlyToolbar editable={editable} />
                          </div>
                          <div className="ide-divider h-full w-px cursor-col-resize touch-none select-none" onPointerDown={onEditorDrag}>
                            <div className="absolute inset-y-0 -left-2 -right-2" />
                          </div>
                          <div className="flex-1 min-w-0 h-full flex flex-col relative ide-panel">
                            <div className="flex h-9 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-white/10 bg-[#0d0f16]/90 px-3">
                              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                                {effectiveView === "console" || isBackend ? (
                                  <PaneTitle icon={Terminal} iconClassName="border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    Console
                                  </PaneTitle>
                                ) : (
                                  <>
                                    <PaneTitle icon={AppWindow}>
                                      Preview
                                    </PaneTitle>
                                    <StatusDot />
                                  </>
                                )}
                              </div>
                              {effectiveView === "console" || isBackend ? (
                                <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                                  <ClearButton onClear={clearConsole} />
                                  <div className="h-3 w-px shrink-0 bg-white/10" aria-hidden />
                                  <LiveBadge />
                                </div>
                              ) : (
                                !isBackend && (
                                  <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                                    <UrlPill />
                                    <RefreshPreviewButton onRefresh={() => runRef.current?.()} />
                                  </div>
                                )
                              )}
                            </div>
                            <div className={`flex-1 flex min-h-0 ${effectiveView === "columns" ? "flex-row" : "flex-col"}`}>
                              <div style={{
                                display: effectiveView === "console" ? "none" : "flex",
                                flex: 1,
                                minHeight: 0, minWidth: 0, overflow: "hidden",
                              }}>
                                <SandpackPreviewWithLoader title={tpl.title} showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                              </div>
                              {(effectiveView === "both" || effectiveView === "columns") && (
                                effectiveView === "columns" ? (
                                  <div className="ide-divider h-full w-px cursor-col-resize touch-none select-none" onPointerDown={onConsoleColDrag}>
                                    <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
                                  </div>
                                ) : (
                                  <div className="ide-divider-h w-full h-px cursor-row-resize touch-none select-none" onPointerDown={onConsoleDrag}>
                                    <div className="absolute inset-x-0 -top-1.5 -bottom-1.5" />
                                  </div>
                                )
                              )}
                              <div style={{
                                display: effectiveView === "preview" ? "none" : "flex",
                                ...(effectiveView === "columns"
                                  ? { width: consoleW, minWidth: 0 }
                                  : effectiveView === "both"
                                    ? { height: consoleH }
                                    : { flex: 1 }),
                                minHeight: 0, overflow: "hidden",
                                flexDirection: "column",
                                borderTop: effectiveView === "both" ? "1px solid var(--border)" : undefined,
                              }}>
                                {(effectiveView === "both" || effectiveView === "columns") && (
                                  <div className="flex h-9 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-white/10 bg-[#0d0f16]/90 px-3">
                                    <PaneTitle icon={Terminal} iconClassName="border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                      Console
                                    </PaneTitle>
                                    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                                      <ClearButton onClear={clearConsole} showLabel={false} />
                                      <LiveBadge />
                                    </div>
                                  </div>
                                )}
                                {isBackend && (
                                  <StdinBar
                                    value={stdin}
                                    open={stdinOpen}
                                    onToggle={() => setStdinOpen((v) => !v)}
                                    onChange={setStdin}
                                  />
                                )}
                                <div className="flex-1 min-h-0">
                                  {isBackend ? (
                                    <BackendConsole logs={backendLogs} meta={runMeta} />
                                  ) : (
                                    <JsConsole resetRef={consoleResetRef} />
                                  )}
                                </div>
                              </div>
                            </div>
                            <ErrorOverlay error={bundlerError} onDismiss={() => { setBundlerError(null); runRef.current?.(); }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <FilesBridge templateId={templateId} filesRef={filesRef} activeFileRef={activeFileRef} templateFiles={cleanFiles} onChange={() => { if (!previewOnly) setDirty(true); }} />
                  <ErrorBridge onError={setBundlerError} />
                  <MissingDepBridge enabled={editable && !isBackend} />
                  <RunBridge runRef={runRef} onStatusChange={(s) => { if (s === "idle" || s === "done") setRunning(false); }} />
                  <ConsoleEntryBridge active={tpl.mode === "console"} isBackend={isBackend} />
                  <ConsoleClearBridge onClear={clearConsole} />
                  <FormatBridge formatRef={formatRef} />
                </SandpackProvider>
              )}
            </div>
            {/* Status bar — readonly readout of template, save, runtime, view */}
            <div className="flex h-7 shrink-0 items-center justify-between gap-2 overflow-hidden border-t border-white/10 bg-[#0d0f16] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${running ? "animate-pulse bg-[#8b93ff]" : !snippetId || dirty ? "bg-amber-400/80" : "bg-emerald-400/80"}`} aria-hidden />
                <span className="truncate font-bold text-white/70">{tpl.title}</span>
                <span className="hidden shrink-0 sm:inline">{saving ? "Saving…" : !snippetId || dirty ? "Unsaved" : "Saved"}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
                <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 md:inline">
                  {isBackend ? "JIT runtime" : "Browser runtime"}
                </span>
                <span className="hidden sm:inline">{effectiveView}</span>
                <span aria-live="polite" className={`inline-block min-w-[92px] shrink-0 text-right font-bold tabular-nums ${running ? "animate-pulse text-[#8b93ff]" : "text-emerald-400/80"}`}>
                  {running ? "● Executing" : "○ Ready"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Format a single console argument the way a real devtools console would:
 *  top-level strings unquoted, objects/arrays as compact JSON. */
function formatConsoleArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "bigint") return `${arg}n`;
  if (typeof arg === "object") {
    try {
      return JSON.stringify(arg, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

/** Devtools-style syntax colors for console values. */
const CONSOLE_COLORS = {
  number: "text-sky-400",
  boolean: "text-purple-400",
  nullish: "text-muted/60",
  string: "text-emerald-400",
  key: "text-sky-300",
} as const;

/** Colorize a compact JSON string into devtools-like tokens (keys, strings,
 *  numbers, booleans, null each get their own color). */
function highlightJson(json: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json))) {
    if (m.index > last) out.push(json.slice(last, m.index));
    const tok = m[0];
    let cls: string = CONSOLE_COLORS.number;
    if (tok[0] === '"') {
      cls = /^\s*:/.test(json.slice(re.lastIndex)) ? CONSOLE_COLORS.key : CONSOLE_COLORS.string;
    } else if (tok === "true" || tok === "false") {
      cls = CONSOLE_COLORS.boolean;
    } else if (tok === "null") {
      cls = CONSOLE_COLORS.nullish;
    }
    out.push(
      <span key={i++} className={cls}>
        {tok}
      </span>
    );
    last = re.lastIndex;
  }
  if (last < json.length) out.push(json.slice(last));
  return out;
}

/** Render one console argument with type-based coloring. Top-level strings show
 *  plain (like Chrome devtools); objects/arrays are syntax-highlighted JSON. */
function ConsoleArg({ value }: { value: unknown }): React.ReactNode {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint")
    return <span className={CONSOLE_COLORS.number}>{String(value)}</span>;
  if (typeof value === "boolean")
    return <span className={CONSOLE_COLORS.boolean}>{String(value)}</span>;
  if (value === null) return <span className={CONSOLE_COLORS.nullish}>null</span>;
  if (value === undefined) return <span className={CONSOLE_COLORS.nullish}>undefined</span>;
  if (typeof value === "object") {
    let json: string;
    try {
      json = JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    } catch {
      return String(value);
    }
    return <>{highlightJson(json)}</>;
  }
  return String(value);
}

/** Signature of one console entry, for consecutive-duplicate collapsing. */
function logSignature(log: { method: string; data: unknown }): string {
  try {
    return `${log.method}::${JSON.stringify(log.data)}`;
  } catch {
    return `${log.method}::${String(log.data)}`;
  }
}

/** Console for browser/JS templates. Joins each console call's arguments on a
 *  single line (Sandpack's built-in console splits them per argument) and
 *  syntax-colors values + adds row dividers to feel like a real devtools console.
 *
 *  The Sandpack log store is the single source of truth: Run / Clear drain it
 *  through the hook's own reset(). Auto-wipe on recompile is OFF — wiping on
 *  every keystroke flashed the standby state between updates. Consecutive
 *  identical entries collapse into one row with a ×N badge, exactly like
 *  Chrome DevTools. */
function JsConsole({ resetRef }: { resetRef: React.MutableRefObject<(() => void) | null> }) {
  // NOTE: resetOnPreviewRestart is deliberately OFF. When true, Sandpack
  // emits a "start" message on every keystroke-driven recompile and the hook
  // wipes the store — flashing the standby state between updates. Clearing
  // happens only through reset() (Run / Clear button), so messages stream
  // in seamlessly while typing.
  const { logs, reset } = useSandpackConsole({ resetOnPreviewRestart: false });
  const listRef = useRef<HTMLDivElement>(null);
  // Expose the store's own reset so Run / Clear drain it directly.
  useEffect(() => {
    resetRef.current = reset;
  });
  // The evergreen Sandpack bundler doesn't recognize the vanilla "parcel" preset
  // and emits "Unknown preset parcel, falling back to React". That fallback is
  // harmless — it's exactly what gives us modern-JS (ES2020 ??/?.) support — but
  // it's noise in a candidate-facing JS console, so hide just that one warning.
  const isBundlerNoise = (text: string) => {
    const t = text.trim().toLowerCase();
    return t.startsWith("unknown preset") && t.includes("falling back");
  };
  const visibleLogs = logs.filter((log) => {
    const text = Array.isArray(log.data)
      ? log.data.map((d) => (typeof d === "string" ? d : "")).join(" ")
      : "";
    return !isBundlerNoise(text);
  });

  // The store is the single source of truth — Run / Clear drain it via
  // reset(), restarts drain it via resetOnPreviewRestart. No index math.
  const shown = visibleLogs;

  const rows: { log: (typeof visibleLogs)[number]; count: number }[] = [];
  for (const log of shown) {
    const last = rows[rows.length - 1];
    if (last && logSignature(last.log) === logSignature(log)) last.count += 1;
    else rows.push({ log, count: 1 });
  }
  // Unbounded sessions could grow this list forever — render the tail.
  const renderRows = rows.length > 300 ? rows.slice(-300) : rows;

  // Follow the tail like a real console.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length]);
  if (renderRows.length === 0) {
    return (
      <div className="flex h-full flex-col bg-[#0a0b0d]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span className="ide-sonar grid h-16 w-16 place-items-center" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-[#8b93ff] shadow-[0_0_16px_3px_rgba(139,147,255,0.8)]" />
          </span>
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-white/70">
            Standby
          </p>
          <p className="font-mono text-[11px] text-white/35">awaiting signal — press Run</p>
        </div>
        <div className="flex items-center gap-1.5 border-t border-neutral-900/40 bg-black/20 px-3 py-2 font-mono text-[11px] text-neutral-600 select-none">
          <span className="font-bold text-[#8b93ff]">›</span>
          <span className="h-3 w-1 animate-pulse bg-[#8b93ff]/70" />
          <span className="italic">Console active. Waiting for logs...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-[#0a0b0d] text-[#e3e4e6] font-mono text-[13px] leading-relaxed">
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {renderRows.map(({ log, count }, i) => {
          const args = Array.isArray(log.data) ? log.data : [];
          const isError = log.method === "error";
          const isWarn = log.method === "warn";
          const isInfo = log.method === "info" || log.method === "debug";

          let borderClass = "border-l-[3px] border-transparent hover:bg-white/[0.02]";
          let icon = <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0 mt-0.5" />;
          let rowBg = "";

          if (isError) {
            borderClass = "border-l-[3px] border-red-500 hover:bg-red-500/[0.04]";
            rowBg = "bg-red-500/[0.02]";
            icon = <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />;
          } else if (isWarn) {
            borderClass = "border-l-[3px] border-amber-500 hover:bg-amber-500/[0.04]";
            rowBg = "bg-amber-500/[0.02]";
            icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
          } else if (isInfo) {
            borderClass = "border-l-[3px] border-sky-400 hover:bg-sky-400/[0.04]";
            rowBg = "bg-sky-500/[0.02]";
            icon = <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={`${String((log as { id?: unknown }).id ?? `row-${i}`)}-${count}`}
              className={`px-3 py-1.5 border-b border-neutral-900/40 whitespace-pre-wrap break-words transition-colors flex items-start gap-2.5 ${borderClass} ${rowBg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                {isError || isWarn
                  ? args.map(formatConsoleArg).join(" ")
                  : args.map((arg, idx) => (
                      <span key={idx}>
                        {idx > 0 ? " " : ""}
                        <ConsoleArg value={arg} />
                      </span>
                    ))}
              </div>
              {count > 1 && (
                <span className="mt-0.5 shrink-0 rounded-full border border-[#8b93ff]/40 bg-[#8b93ff]/10 px-1.5 py-px font-mono text-[10px] font-bold tabular-nums text-[#c7d2fe]">
                  ×{count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-neutral-900/40 font-mono text-[11px] text-neutral-600 bg-black/20 select-none">
        <span className="text-accent font-bold">›</span>
        <span className="animate-pulse w-1 h-3 bg-accent/60" />
        <span className="italic">Console active. Ready.</span>
      </div>
    </div>
  );
}

/**
 * Collapsible program-input (stdin) strip above backend consoles.
 * Closed by default unless a draft was restored; the dot shows stdin will
 * ride along on Run. Drafts are local-only and never enter saved snippets.
 */
function StdinBar({
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
    <div className="shrink-0 border-b border-white/10 bg-[#0d0f16]/90">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title="Program input (stdin)"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
      >
        <Terminal className="h-3 w-3 shrink-0 text-white/40" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          Input
        </span>
        {value.trim() ? (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="stdin set" />
        ) : (
          <span className="font-mono text-[10px] text-white/30">stdin — optional</span>
        )}
        <ChevronRight
          className={`ml-auto h-3 w-3 shrink-0 text-white/40 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="program input, fed to stdin on Run…"
            aria-label="Program input text"
            rows={3}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[12px] text-white/85 placeholder:text-white/25 outline-none focus:border-[#8b93ff]/60"
          />
        </div>
      )}
    </div>
  );
}

function BackendConsole({ logs, meta }: { logs: { method: string; data: string[] }[]; meta?: string | null }) {  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);
  if (logs.length === 0) {
    return (
      <div className="flex h-full flex-col bg-[#0a0b0d]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span className="ide-sonar grid h-16 w-16 place-items-center" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-[#22d3ee] shadow-[0_0_16px_3px_rgba(34,211,238,0.8)]" />
          </span>
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-white/70">
            Standby
          </p>
          <p className="font-mono text-[11px] text-white/35">compiler ready — awaiting run</p>
        </div>
        <div className="flex items-center gap-1.5 border-t border-neutral-900/40 bg-black/20 px-3 py-2 font-mono text-[11px] text-neutral-600 select-none">
          <span className="font-bold text-[#8b93ff]">›</span>
          <span className="h-3 w-1 animate-pulse bg-[#8b93ff]/70" />
          <span className="italic">Compiler ready. Waiting for run...</span>
        </div>
      </div>
    );
  }
  // Unbounded sessions could grow this list forever — render the tail,
  // matching the JsConsole cap.
  const renderLogs = logs.length > 300 ? logs.slice(-300) : logs;
  return (
    <div className="flex flex-col h-full bg-[#0a0b0d] text-[#e3e4e6] font-mono text-[13px] leading-relaxed">
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {renderLogs.map((log, i) => {
          const isError = log.method === "error";
          const borderClass = isError ? "border-l-[3px] border-red-500 pl-2.5 bg-red-500/[0.02]" : "pl-2.5 border-l-[3px] border-transparent";
          const textClass = isError ? "text-red-400" : "text-[#e3e4e6]/90";
          return (
            <div key={i} className={`whitespace-pre-wrap flex items-start gap-2 ${borderClass} ${textClass}`}>
              {isError ? (
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">{log.data.join(" ")}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-neutral-900/40 font-mono text-[11px] text-neutral-600 bg-black/20 select-none">
        <span className="text-accent font-bold">›</span>
        <span className="animate-pulse w-1 h-3 bg-accent/60" />
        <span className="italic">Execution complete.</span>
        {meta && (
          <span data-testid="run-meta" className="ml-auto not-italic tabular-nums text-white/40">
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}
