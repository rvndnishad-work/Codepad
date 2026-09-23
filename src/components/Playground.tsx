"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { SandpackProvider, type SandpackFiles } from "@codesandbox/sandpack-react";
import { PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import FileExplorer from "./FileExplorer";
import type { ExplorerOps } from "./FileExplorer";
import { ErrorBridge, ErrorOverlay, type ErrorData } from "./ErrorOverlay";
import PromptSidebar from "./PromptSidebar";
import { useResizable } from "@/hooks/useResizable";
import { useResizableHeight } from "@/hooks/useResizableHeight";
import { templatesById, supportsV2Bundler, V2_BUNDLER_URL, type TemplateDef } from "@/lib/templates";
import { buildNodeBuiltinShims } from "@/lib/node-builtin-shims";
import { MissingDepBridge } from "./bridges/MissingDepBridge";
import { decodePlaygroundCode, decodePlaygroundFiles } from "@/lib/playground-handoff";
import { getSandpackTheme } from "@/lib/sandpack-theme";
import { BACKEND_LANGUAGES } from "@/lib/playground-languages";
import { snapshotFiles } from "@/lib/file-dirty";
import { PREF_KEYS } from "@/lib/prefs";
import {
  applyDraft,
  codeLinkUrl,
  draftAgeLabel,
  LONG_LINK_CHARS,
  visibleFiles,
} from "@/lib/playground-draft";
import type { FormatResult } from "./bridges/FormatBridge";
import MonacoEditor from "./MonacoEditor";
import ShortcutsModal, { openShortcuts } from "./ShortcutsModal";
import PlaygroundToolbar from "./PlaygroundToolbar";
import { FilesBridge } from "./bridges/FilesBridge";
import { SandpackPreviewWithLoader } from "./PreviewLoadingOverlay";
import { RunBridge } from "./bridges/RunBridge";
import { ConsoleEntryBridge } from "./bridges/ConsoleEntryBridge";
import { ConsoleClearBridge } from "./bridges/ConsoleClearBridge";
import { FormatBridge } from "./bridges/FormatBridge";
import {
  MobileSplitHandle,
  ReadOnlyBar,
  ResizeHandle,
  RestoreDraftBar,
  StatusBar,
  useVerticalSplit,
} from "./playground/Chrome";
import { OutputPane } from "./playground/OutputPane";
import { PlaygroundProvider, type PlaygroundContextValue, type ViewMode } from "./playground/PlaygroundContext";
import { useEditorPrefs } from "./playground/useEditorPrefs";
import { useGuestDraft } from "./playground/useGuestDraft";
import { usePlaygroundDoc, type Snippet } from "./playground/usePlaygroundDoc";
import { useRunner } from "./playground/useRunner";

export type { Snippet, Visibility } from "./playground/usePlaygroundDoc";

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

const MOBILE_BREAKPOINT = 768;

function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const getSnap = () => (typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  const subscribe = (cb: () => void) => {
    window.addEventListener("resize", cb);
    return () => window.removeEventListener("resize", cb);
  };
  return useSyncExternalStore(subscribe, getSnap, () => false);
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

function hideFile(files: SandpackFiles, path: string) {
  const f = files[path];
  files[path] = f === undefined ? { code: "", hidden: true } : typeof f === "string" ? { code: f, hidden: true } : { ...f, hidden: true };
}

/**
 * The file the tab strip opens with. Prefers package.json's "main", then
 * common entry names, then the first visible file. Other files become tabs
 * only when the user opens them from the explorer.
 */
function pickEntryFile(f: SandpackFiles): string[] {
  const keys = Object.keys(f);
  const isHidden = (k: string) => {
    const v = f[k];
    return typeof v === "object" && (v as { hidden?: boolean }).hidden === true;
  };
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
  const CANDIDATES = [
    "/src/App.tsx", "/src/App.jsx", "/App.tsx", "/App.jsx",
    "/src/index.tsx", "/src/index.jsx", "/src/index.ts", "/src/index.js",
    "/index.tsx", "/index.jsx", "/index.ts", "/index.js",
  ];
  for (const c of CANDIDATES) {
    if (f[c] && !isHidden(c)) return [c];
  }
  const firstVisible = keys.find((k) => !isHidden(k));
  return firstVisible ? [firstVisible] : keys.slice(0, 1);
}

/**
 * Guard for unknown template ids. It lives in its own component so the
 * editor below always calls the same hooks in the same order.
 */
export default function Playground(props: Props) {
  const tpl = templatesById[props.templateId];
  if (!tpl) {
    return <div className="p-8">Unknown template: {props.templateId}</div>;
  }
  return <PlaygroundEditor {...props} tpl={tpl} />;
}

function PlaygroundEditor({
  templateId,
  initialTitle,
  initialFiles,
  snippet,
  signedIn,
  isOwner = !snippet,
  embed = false,
  previewOnly = false,
  backHref,
  tpl,
}: Props & { tpl: TemplateDef }) {
  const { resolvedTheme } = useTheme();
  // The site renders dark; only an explicit light theme gets light Sandpack.
  const sandpackTheme = useMemo(() => getSandpackTheme(resolvedTheme !== "light"), [resolvedTheme]);

  const isBackend = BACKEND_LANGUAGES.has(templateId);
  const editable = isOwner || !snippet;
  const isMobile = useIsMobile();
  const prefs = useEditorPrefs();

  const [view, setView] = useState<ViewMode>(tpl.mode === "console" ? "console" : "preview");
  const [bundlerError, setBundlerError] = useState<ErrorData | null>(null);
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  // Bumped to remount Sandpack with new files (restoring a draft).
  const [restoreKey, setRestoreKey] = useState(0);

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
    if (isBackend) {
      // Browser scaffolding never applies to server-run languages. index.js
      // stays visible for the node template, where it is the program.
      const next = { ...files };
      hideFile(next, "/index.html");
      hideFile(next, "/styles.css");
      if (templateId !== "node") hideFile(next, "/index.js");
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
  }, [initialFiles, templateId, isBackend, tpl.files, tpl.dependencies, prefillCode, prefillFiles]);

  const initialFilesRef = useRef<SandpackFiles>(cleanFiles);
  const filesRef = useRef<SandpackFiles>(cleanFiles);
  const activeFileRef = useRef<string>("");
  const explorerOpsRef = useRef<ExplorerOps | null>(null);
  const formatRef = useRef<((opts?: { quiet?: boolean }) => Promise<FormatResult | null>) | null>(null);
  // Last-saved code snapshot for per-tab dirty dots. Seeded from the initial
  // files so a fresh playground starts clean; refreshed on every save.
  const savedSnapshotRef = useRef<SandpackFiles | null>(null);
  if (savedSnapshotRef.current === null) {
    savedSnapshotRef.current = snapshotFiles(initialFilesRef.current);
  }
  const customSetup = useMemo(() => (tpl.dependencies ? { dependencies: tpl.dependencies } : {}), [tpl]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialVisibleFiles = useMemo(() => pickEntryFile(initialFilesRef.current), [restoreKey]);
  useEffect(() => {
    if (initialVisibleFiles[0]) activeFileRef.current = initialVisibleFiles[0];
  }, [initialVisibleFiles]);

  const doc = usePlaygroundDoc({
    templateId,
    defaultTitle: tpl.title,
    snippet,
    initialTitle,
    signedIn,
    editable,
    filesRef,
    activeFileRef,
    formatRef,
    formatOnSave: prefs.formatOnSave,
    savedSnapshotRef,
  });

  const runner = useRunner({ templateId, isBackend, signedIn, filesRef, activeFileRef });

  const draft = useGuestDraft({
    templateId,
    enabled: editable && !doc.snippetId && !previewOnly && !embed,
    skipRestore: Boolean(prefillCode || prefillFiles),
    templateFiles: cleanFiles,
    filesRef,
    title: doc.title,
  });
  const hasSnippet = Boolean(doc.snippetId);
  useEffect(() => {
    if (hasSnippet) draft.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSnippet]);

  const restoreDraft = () => {
    const d = draft.take();
    if (!d) return;
    const files = applyDraft(cleanFiles, d.files);
    initialFilesRef.current = files;
    filesRef.current = files;
    doc.setTitle(d.title);
    doc.setDirty(true);
    setBundlerError(null);
    setRestoreKey((k) => k + 1);
  };

  const copyCodeLink = useCallback(async () => {
    const url = codeLinkUrl(window.location.origin, templateId, visibleFiles(filesRef.current));
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link with code copied", {
        description:
          url.length > LONG_LINK_CHARS
            ? "This link is long. Some chat apps may cut it off."
            : "Anyone who opens it gets their own copy. No account needed.",
      });
    } catch {
      toast(url);
    }
  }, [templateId]);

  // Default the editor to half of what the explorer leaves; a width the user
  // dragged to is persisted and wins.
  const [defaultEditorW] = useState(() =>
    typeof window === "undefined" ? 500 : Math.max(200, Math.floor((window.innerWidth - 280) * 0.5)),
  );
  // Default wide enough for the "Files" label + all header buttons to show.
  const explorer = useResizable(280, 200, 400, false, PREF_KEYS.layout("explorer"));
  const editor = useResizable(defaultEditorW, 200, 2000, false, PREF_KEYS.layout("editor"));
  const prompt = useResizable(384, 280, 640, false, PREF_KEYS.layout("prompt"));
  const consoleH = useResizableHeight(300, 120, 900, PREF_KEYS.layout("consoleH"));
  const consoleW = useResizable(420, 240, 900, true, PREF_KEYS.layout("consoleW"));
  // Phone stacked-pane splits: editor/output, then preview/console.
  const mobileSplit = useVerticalSplit(55);
  const mobileInnerSplit = useVerticalSplit(60);

  // When the AI panel docks, steal its width from explorer + editor
  // proportionally so the output pane keeps a usable share. Widths are
  // restored when it closes. Below lg the panel overlays content flow, so
  // no redistribution happens there.
  const prevWidths = useRef<{ explorer: number; editor: number } | null>(null);
  useEffect(() => {
    if (window.innerWidth < 1024) return;
    if (promptOpen) {
      if (prevWidths.current) return;
      prevWidths.current = { explorer: explorer.width, editor: editor.width };
      const freed = Math.min(prompt.width, window.innerWidth - 900);
      const total = Math.max(1, explorer.width + editor.width);
      explorer.setWidth(Math.max(200, Math.round(explorer.width - freed * (explorer.width / total))));
      editor.setWidth(Math.max(200, Math.round(editor.width - freed * (editor.width / total))));
    } else if (prevWidths.current) {
      explorer.setWidth(prevWidths.current.explorer);
      editor.setWidth(prevWidths.current.editor);
      prevWidths.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptOpen]);

  // Strip the one-shot #code= handoff from the URL once it's been applied, so a
  // refresh, save, or fork doesn't re-inject it and the address bar stays clean.
  useEffect(() => {
    if (/[#&](code|files)=/.test(window.location.hash)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  const handleRunRef = useRef(runner.handleRun);
  useEffect(() => {
    handleRunRef.current = runner.handleRun;
  });
  const { setFontSize } = prefs;
  const { handleSaveRef } = doc;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // F2 renames the active file from anywhere (VS Code parity) — it has
      // no text-editing meaning in inputs, so it runs ahead of the guard.
      if (e.key === "F2") {
        e.preventDefault();
        explorerOpsRef.current?.renameActiveFile();
        return;
      }
      const target = e.target as HTMLElement | null;
      const mod = e.ctrlKey || e.metaKey;
      // Run, save and format are editor commands, so they work while typing
      // in the editor (Monaco's input is a textarea). Run also works from
      // the stdin box. Without this, Ctrl+S in the editor opened the
      // browser's own "Save page" dialog.
      const inEditor = Boolean(target?.closest?.(".monaco-editor"));
      if (mod && e.key === "Enter" && (inEditor || target?.getAttribute("aria-label") === "Program input text")) {
        e.preventDefault();
        void handleRunRef.current();
        return;
      }
      if (inEditor && mod && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSaveRef.current({ silent: true });
        return;
      }
      if (inEditor && mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        void formatRef.current?.();
        return;
      }
      // Other shortcuts must not fire while typing in the title, the prompt
      // box or the editor itself.
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
        void handleRunRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        void formatRef.current?.();
      }
      // Ctrl/⌘ + = / - are deliberately NOT captured: they are the browser's
      // page zoom, which low-vision users rely on. Editor font size lives in
      // the More menu and on Ctrl+wheel over the editor.
    };

    const onWheel = (e: WheelEvent) => {
      // Only over the code editor (VS Code parity). Anywhere else Ctrl+wheel
      // and trackpad pinch stay the browser's page zoom.
      const overEditor = (e.target as Element | null)?.closest?.(".monaco-editor");
      if (overEditor && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        setFontSize((f) => (e.deltaY < 0 ? Math.min(32, f + 1) : Math.max(10, f - 1)));
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [setFontSize, handleSaveRef]);

  // Drawers close on Escape like any other sheet.
  useEffect(() => {
    if (!mobileFilesOpen && !promptOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileFilesOpen(false);
      if (isMobile) setPromptOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileFilesOpen, promptOpen, isMobile]);

  const onFilesChange = useCallback(() => {
    if (previewOnly) return;
    doc.setDirty(true);
    runner.scheduleSpeculative();
    draft.noteChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOnly, doc.setDirty, runner.scheduleSpeculative, draft.noteChange]);

  const dismissError = () => {
    setBundlerError(null);
    runner.runRef.current?.();
  };

  const ctx: PlaygroundContextValue = {
    templateId,
    templateTitle: tpl.title,
    templateMode: tpl.mode,
    isBackend,
    signedIn,
    editable,
    snippet,
    backHref,
    isMobile,
    doc,
    prefs,
    running: runner.running,
    run: () => void runner.handleRun(),
    view,
    setView,
    toggleFiles: () => setMobileFilesOpen((v) => !v),
    togglePrompt: () => setPromptOpen((v) => !v),
    copyCodeLink: () => void copyCodeLink(),
    openShortcuts,
  };

  const saveState: "saving" | "unsaved" | "saved" | "local" = doc.saving
    ? "saving"
    : doc.snippetId
      ? doc.dirty
        ? "unsaved"
        : "saved"
      : doc.dirty && editable
        ? "local"
        : "unsaved";

  const entryName = (initialVisibleFiles[0] ?? "your code").replace(/^\//, "");
  const showChrome = !embed && !previewOnly;

  return (
    <PlaygroundProvider value={ctx}>
      <div className="pg-root relative flex flex-1 flex-col">
        {showChrome && <PlaygroundToolbar />}
        {showChrome && draft.pending && (
          <RestoreDraftBar age={draftAgeLabel(draft.pending.at)} onRestore={restoreDraft} onDismiss={draft.dismiss} />
        )}

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <SandpackProvider
              key={`${templateId}:${restoreKey}`}
              theme={{
                ...sandpackTheme,
                font: {
                  ...sandpackTheme.font,
                  mono: 'var(--font-mono), "Fira Code", monospace',
                  size: "14px",
                },
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
                autorun: isBackend ? false : prefs.autoRun,
                autoReload: isBackend ? false : prefs.autoRun,
                initMode: "immediate" as const,
                recompileMode: isBackend ? "immediate" : "delayed",
                recompileDelay: isBackend ? 0 : 300,
                visibleFiles: initialVisibleFiles,
                activeFile: initialVisibleFiles[0],
                externalResources: [
                  "data:text/css,.react-error-overlay,#webpack-dev-server-client-overlay,.sp-overlay{display:none!important}#ignore.css",
                ],
              }}
            >
              {isMobile && mobileFilesOpen && (
                <div className="fixed inset-0 z-[100] flex bg-bg/70 backdrop-blur-sm">
                  <div
                    role="dialog"
                    aria-label="Files"
                    className="flex h-full w-4/5 max-w-sm flex-col border-r border-border bg-surface shadow-[var(--shadow-panel)] pg-sheet-left"
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <FileExplorer
                        templateId={templateId}
                        readOnly={!editable}
                        onCollapse={() => setMobileFilesOpen(false)}
                        opsRef={explorerOpsRef}
                      />
                    </div>
                  </div>
                  <div className="flex-1" onClick={() => setMobileFilesOpen(false)} aria-hidden />
                </div>
              )}
              {isMobile && promptOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-bg/70 backdrop-blur-sm">
                  <div className="flex-1" onClick={() => setPromptOpen(false)} aria-hidden />
                  <div
                    role="dialog"
                    aria-label="AI assist"
                    className="h-full w-4/5 max-w-sm border-l border-border bg-surface shadow-[var(--shadow-panel)] pg-sheet-right"
                  >
                    <PromptSidebar onClose={() => setPromptOpen(false)} contextLabel={doc.title} signedIn={signedIn} />
                  </div>
                </div>
              )}

              {previewOnly ? (
                <div className="pg-panel relative h-full w-full">
                  <SandpackPreviewWithLoader
                    title={tpl.title}
                    showNavigator
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    style={{ height: "100%", width: "100%" }}
                  />
                  <ErrorOverlay error={bundlerError} onDismiss={dismissError} />
                </div>
              ) : (
                // One pane model for every width. Children keep fixed slots
                // (prompt, explorer, editor, handle, output) so crossing the
                // phone breakpoint only restyles them: the editor keeps its
                // undo history and the preview does not reload.
                <div className={`flex h-full w-full overflow-hidden ${isMobile ? "flex-col" : "flex-row"}`}>
                  {!isMobile && promptOpen ? (
                    <>
                      <div style={{ width: prompt.width }} className="h-full min-w-0 shrink-0">
                        <PromptSidebar onClose={() => setPromptOpen(false)} contextLabel={doc.title} signedIn={signedIn} />
                      </div>
                      <ResizeHandle
                        orientation="vertical"
                        label="Resize AI assist"
                        value={prompt.width}
                        min={280}
                        max={640}
                        onPointerDown={prompt.onPointerDown}
                        onResize={prompt.setWidth}
                      />
                    </>
                  ) : null}
                  {isMobile ? null : explorerCollapsed ? (
                    <div className="flex h-full w-10 shrink-0 flex-col items-center border-r border-border bg-surface py-2">
                      <button
                        type="button"
                        onClick={() => setExplorerCollapsed(false)}
                        className="grid h-8 w-8 place-items-center rounded-md text-subtle transition hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        title="Show files"
                        aria-label="Show files"
                      >
                        <PanelLeftOpen className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: explorer.width }} className="pg-panel flex h-full min-w-0 shrink-0 flex-col">
                        <FileExplorer
                          templateId={templateId}
                          readOnly={!editable}
                          onCollapse={() => setExplorerCollapsed(true)}
                          opsRef={explorerOpsRef}
                        />
                      </div>
                      <ResizeHandle
                        orientation="vertical"
                        label="Resize file explorer"
                        value={explorer.width}
                        min={200}
                        max={400}
                        onPointerDown={explorer.onPointerDown}
                        onResize={explorer.setWidth}
                      />
                    </>
                  )}

                  <div
                    style={isMobile ? { flex: `0 0 ${mobileSplit.split}%` } : { width: editor.width }}
                    className="pg-panel flex min-h-0 min-w-0 shrink-0 flex-col"
                  >
                    <div className="min-h-0 flex-1">
                      <MonacoEditor
                        fontSize={prefs.fontSize}
                        readOnly={!editable}
                        savedSnapshotRef={savedSnapshotRef}
                        themeId={prefs.editorThemeId}
                      />
                    </div>
                    {!editable && <ReadOnlyBar />}
                  </div>

                  {isMobile ? (
                    <MobileSplitHandle label="Resize editor and output" split={mobileSplit} />
                  ) : (
                    <ResizeHandle
                      orientation="vertical"
                      label="Resize editor"
                      value={editor.width}
                      min={200}
                      max={2000}
                      onPointerDown={editor.onPointerDown}
                      onResize={editor.setWidth}
                    />
                  )}

                  <OutputPane
                    view={view}
                    isBackend={isBackend}
                    isMobile={isMobile}
                    templateTitle={tpl.title}
                    fileName={entryName}
                    runner={runner}
                    bundlerError={bundlerError}
                    onDismissError={dismissError}
                    consoleWidth={{
                      value: consoleW.width,
                      min: 240,
                      max: 900,
                      set: consoleW.setWidth,
                      onPointerDown: consoleW.onPointerDown,
                    }}
                    consoleHeight={{
                      value: consoleH.height,
                      min: 120,
                      max: 900,
                      set: consoleH.setHeight,
                      onPointerDown: consoleH.onPointerDown,
                    }}
                    mobileSplit={mobileInnerSplit}
                  />
                </div>
              )}
              <FilesBridge
                templateId={templateId}
                filesRef={filesRef}
                activeFileRef={activeFileRef}
                templateFiles={cleanFiles}
                onChange={onFilesChange}
              />
              <ErrorBridge onError={setBundlerError} />
              <MissingDepBridge enabled={editable && !isBackend} />
              <RunBridge
                runRef={runner.runRef}
                onStatusChange={(s) => {
                  if (s === "idle" || s === "done") runner.setRunning(false);
                }}
              />
              <ConsoleEntryBridge active={tpl.mode === "console"} isBackend={isBackend} />
              <ConsoleClearBridge onClear={runner.clearConsole} />
              <FormatBridge formatRef={formatRef} />
            </SandpackProvider>
          </div>
        </div>
        {showChrome && (
          <StatusBar templateTitle={tpl.title} saveState={saveState} isBackend={isBackend} running={runner.running} />
        )}
        {showChrome && <ShortcutsModal showTrigger={false} />}
      </div>
    </PlaygroundProvider>
  );
}
