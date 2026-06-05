"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  SandpackPreview,
  SandpackConsole,
  useSandpack,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import FileExplorer from "./FileExplorer";
import { ErrorBridge, ErrorOverlay, type ErrorData } from "./ErrorOverlay";
import PromptSidebar from "./PromptSidebar";
import { useResizable } from "@/hooks/useResizable";
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
import { getSandpackTheme } from "@/lib/sandpack-theme";
import { TemplateLogo } from "@/lib/icons";
import { describeExecution } from "@/lib/exec-result";
import MonacoEditor from "./MonacoEditor";
import ShortcutsModal from "./ShortcutsModal";
import PlaygroundToolbar from "./PlaygroundToolbar";
import { FilesBridge } from "./bridges/FilesBridge";
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
        ? "bg-accent text-bg"
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

/** Languages that execute server-side via /api/execute */
const BACKEND_LANGUAGES = new Set(["python", "go", "java", "cpp", "rust", "node", "ts-node"]);

function getLanguageFromPath(filePath: string, fallback: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "java") return "java";
  if (ext === "cpp" || ext === "h" || ext === "hpp") return "cpp";
  if (ext === "rs") return "rust";
  if (ext === "js" || ext === "jsx") return fallback === "node" ? "node" : "javascript";
  if (ext === "ts" || ext === "tsx") return fallback === "ts-node" ? "typescript" : "typescript";
  return fallback;
}

function isBackendLanguage(lang: string, templateId?: string): boolean {
  const l = lang.toLowerCase();
  if (templateId === "ts-node" && l === "typescript") return true;
  return BACKEND_LANGUAGES.has(l);
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
  const [view, setView] = useState<"preview" | "console" | "both">(
    tpl.mode === "console" ? "console" : "preview"
  );
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
  const [backendLogs, setBackendLogs] = useState<{ method: string; data: string[] }[]>([]);
  const [bundlerError, setBundlerError] = useState<ErrorData | null>(null);
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [consoleKey, setConsoleKey] = useState(0);
  const [uiScale, setUiScale] = useState(1);
  const [mounted, setMounted] = useState(false);
  const explorerCollapsedRef = useRef(false);

  const cleanFiles = useMemo(() => {
    const files = initialFiles ?? tpl.files;
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
    return files;
  }, [initialFiles, templateId, tpl.files]);

  const initialFilesRef = useRef<SandpackFiles>(cleanFiles);
  const filesRef = useRef<SandpackFiles>(cleanFiles);
  const activeFileRef = useRef<string>("");
  const runRef = useRef<(() => void) | null>(null);
  const formatRef = useRef<(() => Promise<void>) | null>(null);
  const codeChangedRef = useRef(false);
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
  const { width: explorerW, onPointerDown: onExplorerDrag } = useResizable(280, 200, 400);
  const { width: editorW, onPointerDown: onEditorDrag, setWidth: setEditorW } = useResizable(500, 200, 2000);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const explorerWidth = explorerCollapsed ? 40 : explorerW;
      const remainingW = window.innerWidth - explorerWidth;
      setEditorW(Math.max(200, Math.floor(remainingW * 0.5)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whether this template runs code server-side (Python, Go, Java, etc.)
  const isBackend = useMemo(() => BACKEND_LANGUAGES.has(templateId), [templateId]);

  const effectiveView = isBackend ? "console" : view;

  // Speculative pre-compilation — only for backend languages
  useEffect(() => {
    if (!dirty || !templateId || !isBackend) return;

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

        await fetch("/api/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language: executionLanguage,
            code: activeCode,
            speculative: true,
            codeHash: hashHex,
          }),
        });
      } catch (err) {
        console.warn("[Speculative] Pre-compilation background warning:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [dirty, templateId, isBackend]);

  async function handleRun() {
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

        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language: executionLanguage,
            code: activeCode,
            speculative: false,
            codeHash: hashHex,
          }),
        });

        const runResult = await res.json().catch(() => null);
        setBackendLogs(
          describeExecution(res.status, runResult).map((line) => ({
            method: line.method,
            data: [line.text],
          }))
        );
      } else {
        // Frontend languages (JS, TS, React, etc.) — use Sandpack's in-browser bundler
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
      setRunning(false);
    }
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
        cache: "no-store",
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
      const res = await fetch(`/api/snippets/${snippet.id}/fork`, { method: "POST", cache: "no-store" });
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

  // ── Persistence: Editor Settings ──
  useEffect(() => {
    const savedFontSize = localStorage.getItem("interviewpad_fontSize");
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) setFontSize(parsed);
    }

    const savedAutoRun = localStorage.getItem("interviewpad_autoRun");
    if (savedAutoRun !== null) setAutoRun(savedAutoRun === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("interviewpad_fontSize", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("interviewpad_autoRun", autoRun.toString());
  }, [autoRun]);

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
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSaveRef.current();
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

      /* Thin divider between panels */
      .ide-divider {
        background: var(--border);
        transition: background 0.2s ease;
        flex-shrink: 0;
        position: relative;
        z-index: 10;
      }
      .ide-divider:hover {
        background: var(--accent);
        opacity: 0.4;
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
              templateId={templateId} tplTitle={tpl.title} title={title} setTitle={setTitle}
              dirty={dirty} setDirty={setDirty} editable={editable} signedIn={signedIn}
              saving={saving} lastSavedAt={lastSavedAt}
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
                          <FileExplorer templateId={templateId} readOnly={!editable} onCollapse={() => setMobileFilesOpen(false)} />
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
                        <div className="flex flex-col h-full bg-bg">
                          <div className="flex-[0_0_55%] min-h-0 overflow-hidden flex flex-col ide-panel">
                            <div className="flex-1 min-h-0">
                              <MonacoEditor fontSize={fontSize} readOnly={!editable} />
                            </div>
                            <ReadOnlyToolbar editable={editable} />
                          </div>
                          <div className="flex-[0_0_45%] min-h-0 flex flex-col relative ide-panel border-t border-border">
                            <div style={{
                              display: effectiveView === "console" ? "none" : "flex",
                              flex: effectiveView === "both" ? "0 0 60%" : 1,
                              minHeight: 0, overflow: "hidden",
                            }}>
                              <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                            </div>
                            <div style={{
                              display: effectiveView === "preview" ? "none" : "flex",
                              flex: effectiveView === "both" ? "0 0 40%" : 1,
                              minHeight: 0, overflow: "hidden",
                              flexDirection: "column",
                              borderTop: effectiveView === "both" ? "1px solid var(--border)" : undefined,
                            }}>
                              {effectiveView === "both" && (
                                <div className="flex items-center justify-between px-3 h-9 bg-surface shrink-0 border-b border-border">
                                  <div className="flex items-center gap-2">
                                    <Terminal className="w-3 h-3 text-accent/60" />
                                    <span className="text-[11px] font-medium text-muted tracking-wide">Console</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => { setConsoleKey(k => k + 1); setBackendLogs([]); }} className="p-1 hover:bg-elevated rounded transition text-muted/50 hover:text-fg" title="Clear Console">
                                      <Ban className="w-3 h-3" />
                                    </button>
                                    <div className="text-[10px] font-normal text-muted/30">Live</div>
                                  </div>
                                </div>
                              )}
                              <div className="flex-1 min-h-0">
                                {isBackend ? (
                                  <BackendConsole logs={backendLogs} />
                                ) : (
                                  <SandpackConsole key={consoleKey} style={{ height: "100%", width: "100%" }} />
                                )}
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
                                <FileExplorer templateId={templateId} readOnly={!editable} onCollapse={() => setExplorerCollapsed(true)} />
                              </div>
                              <div className="ide-divider h-full w-px cursor-col-resize" onPointerDown={onExplorerDrag}>
                                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
                              </div>
                            </>
                          )}
                          {explorerCollapsed && (
                            <div className="h-full shrink-0 w-10 flex flex-col items-center py-4 bg-surface border-r border-border">
                              <button onClick={() => setExplorerCollapsed(false)} className="p-2 rounded-xl bg-bg hover:bg-elevated text-muted transition" title="Expand Files">
                                <PanelBottom className="w-4 h-4 rotate-90" />
                              </button>
                            </div>
                          )}
                          <div style={{ width: editorW, minWidth: 0 }} className="h-full shrink-0 flex flex-col ide-panel">
                            <div className="flex-1 min-h-0">
                              <div className="h-full w-full min-w-0">
                                <MonacoEditor fontSize={fontSize} readOnly={!editable} />
                              </div>
                            </div>
                            <ReadOnlyToolbar editable={editable} />
                          </div>
                          <div className="ide-divider h-full w-px cursor-col-resize" onPointerDown={onEditorDrag}>
                            <div className="absolute inset-y-0 -left-2 -right-2" />
                          </div>
                          <div className="flex-1 min-w-0 h-full flex flex-col relative ide-panel">
                            <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
                              <div className="flex items-center gap-2">
                                {isBackend ? <Terminal className="w-3 h-3 text-accent/60" /> : <StatusDot />}
                                <span className="text-[11px] font-medium text-muted tracking-wide">{isBackend ? "Console" : "Output"}</span>
                              </div>
                              {!isBackend && (
                                <div className="flex items-center gap-2">
                                  <div className="text-[10px] font-mono text-muted/30">localhost:3000</div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col min-h-0">
                              <div style={{
                                display: effectiveView === "console" ? "none" : "flex",
                                flex: effectiveView === "both" ? "0 0 60%" : 1,
                                minHeight: 0, overflow: "hidden",
                              }}>
                                <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
                              </div>
                              <div style={{
                                display: effectiveView === "preview" ? "none" : "flex",
                                flex: effectiveView === "both" ? "0 0 40%" : 1,
                                minHeight: 0, overflow: "hidden",
                                flexDirection: "column",
                                borderTop: effectiveView === "both" ? "1px solid var(--border)" : undefined,
                              }}>
                                {effectiveView === "both" && (
                                  <div className="flex items-center justify-between px-3 h-9 bg-surface shrink-0 border-b border-border">
                                    <div className="flex items-center gap-2">
                                      <Terminal className="w-3 h-3 text-accent/60" />
                                      <span className="text-[11px] font-medium text-muted tracking-wide">Console</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button onClick={() => { setConsoleKey(k => k + 1); setBackendLogs([]); }} className="p-1 hover:bg-elevated rounded transition text-muted/50 hover:text-fg" title="Clear Console">
                                        <Ban className="w-3 h-3" />
                                      </button>
                                      <div className="text-[10px] font-normal text-muted/30">Live</div>
                                    </div>
                                  </div>
                                )}
                                <div className="flex-1 min-h-0">
                                  {isBackend ? (
                                    <BackendConsole logs={backendLogs} />
                                  ) : (
                                    <SandpackConsole key={consoleKey} style={{ height: "100%", width: "100%" }} />
                                  )}
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
                  <FilesBridge templateId={templateId} filesRef={filesRef} activeFileRef={activeFileRef} templateFiles={cleanFiles} onChange={() => { setDirty(true); codeChangedRef.current = true; }} />
                  <ErrorBridge onError={setBundlerError} />
                  <RunBridge runRef={runRef} onStatusChange={(s) => { if (s === "idle" || s === "done") setRunning(false); }} />
                  <ConsoleEntryBridge active={tpl.mode === "console"} isBackend={isBackend} />
                  <ConsoleClearBridge onClear={() => setConsoleKey((k) => k + 1)} />
                  <FormatBridge formatRef={formatRef} />
                </SandpackProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function BackendConsole({ logs }: { logs: { method: string; data: string[] }[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted/50 text-[12px] font-medium">
        Ready for execution
      </div>
    );
  }
  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto bg-surface text-fg font-mono text-[13px] p-3 space-y-1">
      {logs.map((log, i) => (
        <div key={i} className={`whitespace-pre-wrap ${log.method === 'error' ? 'text-red-400' : 'text-fg/80'}`}>
          {log.data.join(" ")}
        </div>
      ))}
    </div>
  );
}
