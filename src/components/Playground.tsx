"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import { snippetCompletion } from "@codemirror/autocomplete";
import { javascriptLanguage } from "@codemirror/lang-javascript";
import { customSnippets } from "@/lib/snippets";
import FileExplorer from "./FileExplorer";
import { ErrorBridge, ErrorOverlay, type ErrorData } from "./ErrorOverlay";
import PromptSidebar from "./PromptSidebar";
import { useResizable } from "@/hooks/useResizable";
import { cobalt2 } from "@codesandbox/sandpack-themes";
import { toast } from "sonner";
import {
  GitFork,
  Save,
  Share2,
  Eye,
  Terminal,
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
  Ban,
} from "lucide-react";
import { templatesById } from "@/lib/templates";
import { TemplateLogo } from "@/lib/icons";
import MonacoEditor from "./MonacoEditor";
import ShortcutsModal from "./ShortcutsModal";
import PlaygroundToolbar from "./PlaygroundToolbar";
import { FilesBridge } from "./bridges/FilesBridge";
import { RunBridge } from "./bridges/RunBridge";
import { ConsoleEntryBridge } from "./bridges/ConsoleEntryBridge";
import { FormatBridge } from "./bridges/FormatBridge";

const nbpTheme = {
  colors: {
    surface1: "#050505",
    surface2: "#0A0A0A",
    surface3: "#111111",
    clickable: "#8b949e",
    base: "#e0e0e0",
    disabled: "#4d4d4d",
    hover: "#FFE600",
    accent: "#FFE600",
    error: "#ff4d4d",
    errorSurface: "#1a0000",
  },
  syntax: {
    plain: "#e0e0e0",
    comment: { color: "#6b7280", fontStyle: "italic" },
    keyword: "#D2A8FF",
    tag: "#D2A8FF",
    punctuation: "#e0e0e0",
    definition: "#FFE600",
    property: "#FFE600",
    static: "#FF9B71",
    string: "#A5D6FF",
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", monospace',
    size: "14px",
    lineHeight: "1.6",
  },
};

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
};

function SegBtn({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs transition ${active
          ? "bg-accent text-white"
          : "text-subtle hover:text-fg hover:bg-elevated"
        }`}
    >
      {children}
    </button>
  );
}

function ReadOnlyToolbar({ editable }: { editable: boolean }) {
  if (editable) return null;
  return (
    <div className="flex items-center justify-between px-3 h-8 bg-amber-400/10 border-t border-amber-400/20 shrink-0 select-none">
      <div className="flex items-center gap-1.5 text-amber-400">
        <Lock className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Read-only Mode</span>
      </div>
      <span className="text-[10px] font-medium text-amber-400/70 tracking-wide">Fork to edit this snippet</span>
    </div>
  );
}

const customSnippetExtension = javascriptLanguage.data.of({
  autocomplete: (context: any) => {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: customSnippets.map((s) =>
        snippetCompletion(s.cm6InsertText || s.insertText, {
          label: s.label,
          info: s.documentation,
          type: "keyword",
        })
      ),
    };
  },
});

export default function Playground({
  templateId,
  initialTitle,
  initialFiles,
  snippet,
  signedIn,
  isOwner = !snippet,
  embed = false,
  previewOnly = false,
}: Props) {
  const tpl = templatesById[templateId];
  if (!tpl) {
    return <div className="p-8">Unknown template: {templateId}</div>;
  }

  const [title, setTitle] = useState(initialTitle ?? tpl.title);
  const [visibility, setVisibility] = useState<Visibility>(snippet?.visibility ?? "private");
  const [saving, setSaving] = useState(false);
  const [forking, setForking] = useState(false);
  const [view, setView] = useState<"preview" | "console" | "both">(
    tpl.mode === "console" ? "console" : "preview"
  );
  const [editor, setEditor] = useState<"sandpack" | "monaco">("sandpack");
  const [fontSize, setFontSize] = useState(14);
  const [snippetId, setSnippetId] = useState<string | null>(snippet?.id ?? null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(snippet?.slug ?? null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    snippet ? Date.now() : null
  );
  const [tags, setTags] = useState<string[]>(snippet?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [running, setRunning] = useState(false);
  const [bundlerError, setBundlerError] = useState<ErrorData | null>(null);
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const [consoleKey, setConsoleKey] = useState(0);
  const [uiScale, setUiScale] = useState(1);
  const explorerCollapsedRef = useRef(false);

  const initialFilesRef = useRef<SandpackFiles>(initialFiles ?? tpl.files);
  const filesRef = useRef<SandpackFiles>(initialFiles ?? tpl.files);
  const runRef = useRef<(() => void) | null>(null);
  const formatRef = useRef<(() => Promise<void>) | null>(null);
  const codeChangedRef = useRef(false);
  const customSetup = useMemo(() => {
    const setup: any = tpl.dependencies ? { dependencies: tpl.dependencies } : {};
    return setup;
  }, [tpl]);
  const editable = isOwner || !snippet;
  const isMobile = useIsMobile(768);
  const { width: explorerW, onPointerDown: onExplorerDrag } = useResizable(200, 120, 400);
  const { width: editorW, onPointerDown: onEditorDrag } = useResizable(500, 200, 1200);

  // Sync bundler on editor/template changes
  useEffect(() => {
    // Give the new editor a moment to mount before refreshing the bundler
    const timer = setTimeout(() => {
      runRef.current?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [editor, templateId]);

  function handleRun() {
    setRunning(true);
    runRef.current?.();
    // Failsafe: if the status listener never sees the bundler resolve,
    // clear the spinner after 6s so the button isn't stuck spinning.
    setTimeout(() => setRunning(false), 6000);
  }

  async function handleSave(opts: { silent?: boolean } = {}) {
    if (!signedIn) {
      if (opts.silent) return;
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?next=${next}`);
      return;
    }
    if (!editable) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        template: templateId,
        files: filesRef.current,
        visibility,
      };
      if (snippetId) payload.tags = tags;
      const url = snippetId ? `/api/snippets/${snippetId}` : "/api/snippets";
      const method = snippetId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      if (!opts.silent) {
        toast.success(snippetId ? "Snippet updated" : "Snippet saved", {
          description: title,
        });
      }
      if (!snippetId && data?.id) {
        setSnippetId(data.id);
        setCurrentSlug(data.slug);
        window.history.replaceState(null, "", `/play/${data.slug}`);
      }
      setDirty(false);
      setLastSavedAt(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!opts.silent) toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleFork() {
    if (!signedIn) {
      toast.error("Sign in to fork.");
      return;
    }
    if (!snippet) return;
    setForking(true);
    try {
      const res = await fetch(`/api/snippets/${snippet.id}/fork`, { method: "POST" });
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

  // ── Persistence: Editor Settings ──
  useEffect(() => {
    const savedEditor = localStorage.getItem("codepad_editor");
    if (savedEditor === "sandpack" || savedEditor === "monaco") setEditor(savedEditor);

    const savedFontSize = localStorage.getItem("codepad_fontSize");
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) setFontSize(parsed);
    }

    const savedAutoRun = localStorage.getItem("codepad_autoRun");
    if (savedAutoRun !== null) setAutoRun(savedAutoRun === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("codepad_editor", editor);
  }, [editor]);

  useEffect(() => {
    localStorage.setItem("codepad_fontSize", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("codepad_autoRun", autoRun.toString());
  }, [autoRun]);

  useEffect(() => {
    const savedUiScale = localStorage.getItem("codepad_uiScale");
    if (savedUiScale) {
      const parsed = parseFloat(savedUiScale);
      if (!isNaN(parsed) && parsed >= 0.8 && parsed <= 2) setUiScale(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("codepad_uiScale", uiScale.toString());
    document.documentElement.style.setProperty("--ui-scale", uiScale.toString());
  }, [uiScale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        void formatRef.current?.();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.code === "Equal" || e.code === "NumpadAdd")) {
        e.preventDefault();
        e.stopPropagation();
        setFontSize((f) => Math.min(24, f + 1));
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
          setFontSize((f) => Math.min(24, f + 1));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, snippetId, signedIn, editable, visibility]);

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
        background: #0A0A0A;
      }

      /* Seamless panels — no margins, no rounded corners, no visible borders */
      .ide-panel {
        overflow: hidden;
        background: #0A0A0A;
      }

      /* Thin divider between panels */
      .ide-divider {
        background: rgba(255,255,255,0.04);
        transition: background 0.2s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }
      .ide-divider:hover {
        background: rgba(255,230,0,0.20);
      }
      /* Custom Scrollbar */
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.12); }
    `;
  }, [fontSize]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <div className="flex-1 flex flex-col bg-[#0A0A0A]">
        <div className="flex-1 playground-container flex flex-col relative overflow-hidden">
          {!embed && !previewOnly && (
            <PlaygroundToolbar
              templateId={templateId} tplTitle={tpl.title} title={title} setTitle={setTitle}
              dirty={dirty} setDirty={setDirty} editable={editable} signedIn={signedIn}
              saving={saving} lastSavedAt={lastSavedAt} editor={editor} setEditor={setEditor}
              fontSize={fontSize} setFontSize={setFontSize} view={view} setView={setView}
              snippetId={snippetId} visibility={visibility} setVisibility={setVisibility}
              snippet={snippet} isOwner={isOwner} forking={forking}
              handleSave={() => handleSave()} handleFork={handleFork} handleShare={handleShare}
              handleCopyEmbed={handleCopyEmbed} handlePopout={handlePopout} handleRun={handleRun}
              running={running} tags={tags} setTags={setTags} tagInput={tagInput} setTagInput={setTagInput}
              onToggleFiles={() => setMobileFilesOpen((prev) => !prev)}
              onTogglePrompt={() => setPromptOpen((prev) => !prev)}
              autoRun={autoRun} setAutoRun={setAutoRun}
              uiScale={uiScale} setUiScale={setUiScale}
              tplMode={tpl.mode}
            />
          )}

          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0">
              <SandpackProvider
                key={templateId}
                theme={{
                  ...cobalt2,
                  font: {
                    ...cobalt2.font,
                    mono: "'JetBrains Mono', monospace",
                    size: "14px",
                  }
                }}
                template={tpl.base}
                files={initialFilesRef.current}
                customSetup={customSetup}
                options={{ 
                  recompileMode: autoRun ? "delayed" : "none", 
                  recompileDelay: 150, 
                  autorun: autoRun, 
                  autoReload: autoRun, 
                  initMode: "immediate",
                  showErrorOverlay: false,
                  externalResources: [
                    "data:text/css,.react-error-overlay,#webpack-dev-server-client-overlay,.sp-overlay{display:none!important}#ignore.css"
                  ]
                }}
              >
                {isMobile && mobileFilesOpen && (
                  <div className="fixed inset-0 z-[100] flex bg-black/60 backdrop-blur-sm">
                    <div className="w-4/5 max-w-sm h-full bg-panel border-r border-border shadow-2xl flex flex-col">
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <FileExplorer readOnly={!editable} onCollapse={() => setMobileFilesOpen(false)} />
                      </div>
                    </div>
                    <div className="flex-1" onClick={() => setMobileFilesOpen(false)} />
                  </div>
                )}

                <div className="flex h-full w-full overflow-hidden relative">
                  <div className="flex-1 min-w-0 h-full">
                    {previewOnly ? (
                      <div className="h-full w-full relative ide-panel">
                        <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                        <ErrorOverlay error={bundlerError} onDismiss={() => { setBundlerError(null); runRef.current?.(); }} />
                      </div>
                    ) : isMobile ? (
                      <div className="flex flex-col h-full bg-[#0A0A0A]">
                        <div className="flex-[0_0_55%] min-h-0 overflow-hidden flex flex-col ide-panel">
                          <div className="flex-1 min-h-0">
                            {editor === "sandpack" ? (
                              <SandpackCodeEditor
                                extensions={[customSnippetExtension]}
                                showLineNumbers showTabs closableTabs wrapContent
                                readOnly={!editable} style={{ height: "100%" }}
                              />
                            ) : (
                              <MonacoEditor fontSize={fontSize} readOnly={!editable} />
                            )}
                          </div>
                          <ReadOnlyToolbar editable={editable} />
                        </div>
                        <div className="flex-[0_0_45%] min-h-0 flex flex-col relative ide-panel border-t border-white/[0.04]">
                          <div style={{
                            display: view === "console" ? "none" : "flex",
                            flex: view === "both" ? "0 0 60%" : 1,
                            minHeight: 0, overflow: "hidden",
                          }}>
                            <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                          </div>
                          <div style={{
                            display: view === "preview" ? "none" : "flex",
                            flex: view === "both" ? "0 0 40%" : 1,
                            minHeight: 0, overflow: "hidden",
                            flexDirection: "column",
                            borderTop: view === "both" ? "1px solid rgba(255,255,255,0.05)" : undefined,
                          }}>
                            <div className="flex items-center justify-between px-3 h-9 bg-white/[0.02] shrink-0 border-b border-white/[0.04]">
                              <div className="flex items-center gap-2">
                                <Terminal className="w-3 h-3 text-accent/60" />
                                <span className="text-[11px] font-medium text-white/35 tracking-wide">Console</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setConsoleKey(k => k + 1)} className="p-1 hover:bg-white/[0.06] rounded transition text-white/20 hover:text-fg" title="Clear Console">
                                  <Ban className="w-3 h-3" />
                                </button>
                                <div className="text-[10px] font-normal text-white/15">Live</div>
                              </div>
                            </div>
                            <div className="flex-1 min-h-0">
                              <SandpackConsole key={consoleKey} style={{ height: "100%", width: "100%" }} />
                            </div>
                          </div>
                          <ErrorOverlay error={bundlerError} onDismiss={() => { setBundlerError(null); runRef.current?.(); }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full w-full">
                        {!explorerCollapsed && (
                          <>
                            <div style={{ width: explorerW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel">
                              <FileExplorer readOnly={!editable} onCollapse={() => setExplorerCollapsed(true)} />
                            </div>
                            <div className="ide-divider h-full w-px cursor-col-resize" onPointerDown={onExplorerDrag}>
                               <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
                            </div>
                          </>
                        )}
                        {explorerCollapsed && (
                          <div className="h-full shrink-0 w-10 flex flex-col items-center py-4 bg-[#080808] border-r border-white/[0.04]">
                             <button onClick={() => setExplorerCollapsed(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted transition" title="Expand Files">
                                <PanelBottom className="w-4 h-4 rotate-90" />
                             </button>
                          </div>
                        )}
                        <div style={{ width: editorW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel">
                          <div className="flex-1 min-h-0">
                            {editor === "sandpack" ? (
                              <SandpackCodeEditor
                                extensions={[customSnippetExtension]}
                                showLineNumbers showTabs closableTabs wrapContent
                                readOnly={!editable} style={{ height: "100%" }}
                              />
                            ) : (
                              <div className="h-full w-full min-w-0">
                                <MonacoEditor fontSize={fontSize} readOnly={!editable} />
                              </div>
                            )}
                          </div>
                          <ReadOnlyToolbar editable={editable} />
                        </div>
                        <div className="ide-divider h-full w-px cursor-col-resize" onPointerDown={onEditorDrag}>
                           <div className="absolute inset-y-0 -left-2 -right-2" />
                        </div>
                        <div className="flex-1 min-w-0 h-full flex flex-col relative ide-panel">
                          <div className="flex items-center justify-between px-3 h-9 border-b border-white/[0.04] shrink-0">
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                               <span className="text-[11px] font-medium text-white/35 tracking-wide">Output</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="text-[10px] font-mono text-white/15">localhost:3000</div>
                             </div>
                          </div>
                          <div className="flex-1 flex flex-col min-h-0">
                            <div style={{
                              display: view === "console" ? "none" : "flex",
                              flex: view === "both" ? "0 0 60%" : 1,
                              minHeight: 0, overflow: "hidden",
                            }}>
                              <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                            </div>
                            <div style={{
                              display: view === "preview" ? "none" : "flex",
                              flex: view === "both" ? "0 0 40%" : 1,
                              minHeight: 0, overflow: "hidden",
                              flexDirection: "column",
                              borderTop: view === "both" ? "1px solid rgba(255,255,255,0.04)" : undefined,
                            }}>
                              <div className="flex items-center justify-between px-3 h-9 bg-white/[0.02] shrink-0 border-b border-white/[0.04]">
                                <div className="flex items-center gap-2">
                                  <Terminal className="w-3 h-3 text-accent/60" />
                                  <span className="text-[11px] font-medium text-white/35 tracking-wide">Console</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setConsoleKey(k => k + 1)} className="p-1 hover:bg-white/[0.06] rounded transition text-white/20 hover:text-fg" title="Clear Console">
                                    <Ban className="w-3 h-3" />
                                  </button>
                                  <div className="text-[10px] font-normal text-white/15">Live</div>
                                </div>
                              </div>
                              <div className="flex-1 min-h-0">
                                <SandpackConsole key={consoleKey} style={{ height: "100%", width: "100%" }} />
                              </div>
                            </div>
                          </div>
                          <ErrorOverlay error={bundlerError} onDismiss={() => { setBundlerError(null); runRef.current?.(); }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {promptOpen && <PromptSidebar onClose={() => setPromptOpen(false)} />}
                </div>
                <FilesBridge templateId={templateId} filesRef={filesRef} templateFiles={tpl.files} onChange={() => { setDirty(true); codeChangedRef.current = true; }} />
                <ErrorBridge onError={setBundlerError} />
                <RunBridge runRef={runRef} onStatusChange={(s) => { if (s === "idle" || s === "done") setRunning(false); }} />
                <ConsoleEntryBridge active={tpl.mode === "console"} />
                <FormatBridge formatRef={formatRef} />
              </SandpackProvider>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



