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
import FileExplorer from "./FileExplorer";
import { atomDark } from "@codesandbox/sandpack-themes";
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
} from "lucide-react";
import { templatesById } from "@/lib/templates";
import { TemplateLogo } from "@/lib/icons";
import MonacoEditor from "./MonacoEditor";
import ShortcutsModal from "./ShortcutsModal";

type Visibility = "private" | "public";

type Snippet = {
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs transition ${
        active
          ? "bg-accent text-white"
          : "text-subtle hover:text-fg hover:bg-elevated"
      }`}
    >
      {children}
    </button>
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
}: Props) {
  const tpl = templatesById[templateId];
  if (!tpl) {
    return <div className="p-8">Unknown template: {templateId}</div>;
  }

  const [title, setTitle] = useState(initialTitle ?? tpl.title);
  const [visibility, setVisibility] = useState<Visibility>(snippet?.visibility ?? "private");
  const [saving, setSaving] = useState(false);
  const [forking, setForking] = useState(false);
  const [view, setView] = useState<"preview" | "console" | "both">("preview");
  const [editor, setEditor] = useState<"sandpack" | "monaco">("sandpack");
  const [snippetId, setSnippetId] = useState<string | null>(snippet?.id ?? null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(snippet?.slug ?? null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    snippet ? Date.now() : null
  );
  const [tags, setTags] = useState<string[]>(snippet?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [running, setRunning] = useState(false);

  const filesRef = useRef<SandpackFiles>(initialFiles ?? tpl.files);
  const runRef = useRef<(() => void) | null>(null);
  const formatRef = useRef<(() => Promise<void>) | null>(null);
  const customSetup = useMemo(
    () => (tpl.dependencies ? { dependencies: tpl.dependencies } : undefined),
    [tpl]
  );
  const editable = isOwner || !snippet;
  const isMobile = useIsMobile(768);

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
      toast.success("Fork created — opening…");
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  return (
    <div className="flex-1 flex flex-col">
      {!embed && !previewOnly && (
      /* Toolbar — single row on lg+, two rows on smaller screens */
      <div className="border-b border-border bg-surface/70 backdrop-blur-xl">
        {/* Row 1: identity + save (always visible) */}
        <div className="h-14 px-3 sm:px-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg grid place-items-center border border-border bg-panel shrink-0">
            <TemplateLogo id={templateId} size={18} />
          </div>

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="relative flex items-center group min-w-0">
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                disabled={!editable}
                className="bg-transparent outline-none font-medium text-sm w-full min-w-0 max-w-[140px] sm:max-w-[200px] md:max-w-[280px] disabled:opacity-60 pr-4"
              />
              {editable && (
                <Pencil className="w-3 h-3 text-muted absolute right-0 pointer-events-none opacity-0 group-hover:opacity-100 transition" />
              )}
            </div>
            <span className="text-[11px] text-muted hidden md:inline">·</span>
            <span className="text-xs text-muted hidden md:inline shrink-0">{tpl.title}</span>
            {editable && signedIn && (saving || dirty || lastSavedAt) && (
              <span
                className={`hidden md:inline text-[10px] shrink-0 ${
                  saving
                    ? "text-muted"
                    : dirty
                      ? "text-amber-400/80"
                      : "text-emerald-400/80"
                }`}
                title={
                  lastSavedAt
                    ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                    : undefined
                }
              >
                {saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}
              </span>
            )}
            {!editable && (
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-panel text-[10px] text-muted shrink-0">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">read-only</span>
              </span>
            )}
          </div>

          {/* Right section — visible on lg+, hidden below (moved to row 2) */}
          <div className="hidden md:flex items-center gap-2">
            <ShortcutsModal />
            <ControlButtons
              editor={editor} setEditor={setEditor}
              view={view} setView={setView}
              editable={editable} signedIn={signedIn} snippetId={snippetId}
              visibility={visibility} setVisibility={(v) => { setVisibility(v); setDirty(true); }}
              snippet={snippet} isOwner={isOwner}
              saving={saving} forking={forking}
              onSave={handleSave} onFork={handleFork} onShare={handleShare} onCopyEmbed={handleCopyEmbed} onPopout={handlePopout} onRun={handleRun} running={running}
              compact={false}
            />
          </div>

          {/* Non-editable row-1 actions on mobile (fork) */}
          {snippet && !isOwner && (
            <button
              onClick={handleFork}
              disabled={forking}
              className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-panel hover:bg-elevated text-xs transition disabled:opacity-50 shrink-0"
              title="Fork"
            >
              <GitFork className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 1.5: tag editor — only when saved + editable */}
        {editable && snippetId && (
          <div className="hidden md:flex items-center gap-1.5 px-3 sm:px-4 pb-2 flex-wrap">
            <Tag className="w-3 h-3 text-muted shrink-0" />
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-panel text-[10px] text-subtle"
              >
                #{t}
                <button
                  onClick={() => {
                    setTags((prev) => prev.filter((x) => x !== t));
                    setDirty(true);
                  }}
                  title={`Remove tag ${t}`}
                  className="hover:text-fg transition"
                >
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const v = tagInput.trim().replace(/^#/, "");
                  if (v && !tags.includes(v) && tags.length < 20) {
                    setTags((prev) => [...prev, v]);
                    setDirty(true);
                  }
                  setTagInput("");
                } else if (e.key === "Backspace" && !tagInput && tags.length) {
                  setTags((prev) => prev.slice(0, -1));
                  setDirty(true);
                }
              }}
              placeholder="add tag…"
              className="bg-transparent text-[11px] outline-none placeholder:text-muted w-24"
            />
          </div>
        )}

        {/* Row 2: controls — only on < lg */}
        <div className="md:hidden px-3 pb-2 flex items-center gap-2 flex-wrap">
          <ControlButtons
            editor={editor} setEditor={setEditor}
            view={view} setView={setView}
            editable={editable} signedIn={signedIn} snippetId={snippetId}
            visibility={visibility} setVisibility={(v) => { setVisibility(v); setDirty(true); }}
            snippet={snippet} isOwner={isOwner}
            saving={saving} forking={forking}
            onSave={handleSave} onFork={handleFork} onShare={handleShare} onCopyEmbed={handleCopyEmbed} onPopout={handlePopout} onRun={handleRun} running={running}
            compact
          />
        </div>
      </div>
      )}

      {/* relative+absolute gives Sandpack a guaranteed definite height */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <SandpackProvider
            theme={atomDark}
            template={tpl.base}
            files={filesRef.current}
            customSetup={customSetup}
            options={{ recompileMode: "delayed", recompileDelay: 150, autorun: true, autoReload: true, initMode: "immediate" }}
          >
            {previewOnly ? (
              <div style={{ height: "100%", width: "100%" }}>
                <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%", width: "100%" }} />
              </div>
            ) : isMobile ? (
              /* Mobile: column stack — editor top 55%, output bottom 45% */
              <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#1e1e1e" }}>
                <div style={{ flex: "0 0 55%", minHeight: 0, overflow: "hidden" }}>
                  {editor === "sandpack" ? (
                    <SandpackCodeEditor
                      showLineNumbers showTabs closableTabs wrapContent
                      readOnly={!editable} style={{ height: "100%" }}
                    />
                  ) : (
                    <MonacoEditor />
                  )}
                </div>
                <div style={{ flex: "0 0 45%", minHeight: 0, borderTop: "2px solid #2a2f3c", display: "flex", flexDirection: "column", background: "#0d1016" }}>
                  {/* Always mount both so the iframe (code runner) stays alive */}
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
                    borderTop: view === "both" ? "1px solid #20242f" : undefined,
                  }}>
                    <SandpackConsole style={{ height: "100%", width: "100%" }} />
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop: side-by-side — file explorer + editor + preview/console */
              <SandpackLayout style={{ height: "100%", border: 0, borderRadius: 0 }}>
                <FileExplorer readOnly={!editable} />
                {editor === "sandpack" ? (
                  <SandpackCodeEditor
                    showLineNumbers showTabs closableTabs wrapContent
                    readOnly={!editable} style={{ height: "100%" }}
                  />
                ) : (
                  <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
                    <MonacoEditor />
                  </div>
                )}
                {/* Always mount both so the iframe (code runner) stays alive */}
                <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
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
                    borderTop: view === "both" ? "1px solid #20242f" : undefined,
                  }}>
                    <SandpackConsole style={{ height: "100%", width: "100%" }} />
                  </div>
                </div>
              </SandpackLayout>
            )}
            <FilesBridge filesRef={filesRef} onChange={() => setDirty(true)} />
            <RunBridge
              runRef={runRef}
              onStatusChange={(s) => {
                if (s === "idle" || s === "done") setRunning(false);
              }}
            />
            <FormatBridge formatRef={formatRef} />
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}

type ControlButtonsProps = {
  editor: "sandpack" | "monaco";
  setEditor: (v: "sandpack" | "monaco") => void;
  view: "preview" | "console" | "both";
  setView: (v: "preview" | "console" | "both") => void;
  editable: boolean;
  signedIn: boolean;
  snippetId: string | null;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
  snippet: Snippet | null | undefined;
  isOwner: boolean;
  saving: boolean;
  forking: boolean;
  onSave: () => void;
  onFork: () => void;
  onShare: () => void;
  onCopyEmbed: () => void;
  onPopout: () => void;
  onRun: () => void;
  running: boolean;
  compact: boolean;
};

function ControlButtons({
  editor, setEditor, view, setView,
  editable, signedIn, snippetId, visibility, setVisibility,
  snippet, isOwner, saving, forking,
  onSave, onFork, onShare, onCopyEmbed, onPopout, onRun, running, compact,
}: ControlButtonsProps) {
  return (
    <>
      {/* Run button */}
      <button
        onClick={onRun}
        disabled={running}
        title="Run code (Ctrl/Cmd + Enter)"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs transition disabled:opacity-70"
      >
        {running ? (
          <span className="w-3.5 h-3.5 inline-block rounded-full border-2 border-emerald-400/40 border-t-emerald-400 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-emerald-400" />
        )}
        {!compact && <span>{running ? "Running…" : "Run"}</span>}
      </button>

      {/* Editor toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border bg-panel">
        <SegBtn active={editor === "sandpack"} onClick={() => setEditor("sandpack")} title="CodeMirror (lightweight)">
          {compact ? <Code2 className="w-3.5 h-3.5" /> : "Basic"}
        </SegBtn>
        <SegBtn active={editor === "monaco"} onClick={() => setEditor("monaco")} title="Monaco (VS Code engine)">
          <Code2 className="w-3.5 h-3.5" />
          {!compact && <span>Monaco</span>}
        </SegBtn>
      </div>

      {/* View toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border bg-panel">
        <SegBtn active={view === "preview"} onClick={() => setView("preview")} title="Preview only">
          <Eye className="w-3.5 h-3.5" />
          {!compact && <span>Preview</span>}
        </SegBtn>
        <SegBtn active={view === "both"} onClick={() => setView("both")} title="Preview + Console">
          <PanelBottom className="w-3.5 h-3.5" />
          {!compact && <span>Both</span>}
        </SegBtn>
        <SegBtn active={view === "console"} onClick={() => setView("console")} title="Console only">
          <Terminal className="w-3.5 h-3.5" />
          {!compact && <span>Console</span>}
        </SegBtn>
      </div>

      {editable && snippetId && (
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          className="bg-panel border border-border rounded-lg px-2 py-1.5 text-xs hover:border-border-strong"
          title="Visibility"
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      )}

      {snippetId && (
        <>
          <button
            onClick={onShare}
            title="Copy shareable link"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-panel hover:bg-elevated text-xs transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            {!compact && <span>Share</span>}
          </button>
          <button
            onClick={onCopyEmbed}
            title="Copy embed iframe code"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-panel hover:bg-elevated text-xs transition"
          >
            <Code className="w-3.5 h-3.5" />
            {!compact && <span>Embed</span>}
          </button>
          <button
            onClick={onPopout}
            title="Open preview in a new tab"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-panel hover:bg-elevated text-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {!compact && <span>Pop out</span>}
          </button>
        </>
      )}

      {snippet && !isOwner && (
        <button
          onClick={onFork}
          disabled={forking}
          title="Fork snippet"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-panel hover:bg-elevated text-xs transition disabled:opacity-50"
        >
          <GitFork className="w-3.5 h-3.5" />
          {!compact && <span>{forking ? "Forking…" : "Fork"}</span>}
        </button>
      )}

      {/* Save: shown in row 2 on lg only on non-editable flows */}
      {editable && compact && (
        <button
          onClick={onSave}
          disabled={saving}
          title={signedIn ? "Save (Ctrl/Cmd+S)" : "Sign in to save"}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-xs shadow-soft disabled:opacity-50 transition ${
            signedIn
              ? "bg-accent hover:bg-accent-soft"
              : "bg-panel border border-border text-subtle hover:text-fg hover:bg-elevated"
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span className="sm:hidden">
            {saving ? "Saving…" : signedIn ? "Save" : "Sign in"}
          </span>
        </button>
      )}

      {/* Full save button for lg+ (non-compact) */}
      {editable && !compact && (
        <button
          onClick={onSave}
          disabled={saving}
          title={signedIn ? "Save (Ctrl/Cmd+S)" : "Sign in to save"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shadow-soft disabled:opacity-50 transition ${
            signedIn
              ? "bg-accent hover:bg-accent-soft text-white"
              : "bg-panel border border-border text-subtle hover:text-fg hover:bg-elevated"
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : signedIn ? "Save" : "Sign in to save"}
        </button>
      )}
    </>
  );
}

function FilesBridge({
  filesRef,
  onChange,
}: {
  filesRef: React.MutableRefObject<SandpackFiles>;
  onChange?: () => void;
}) {
  const { sandpack } = useSandpack();
  const initialized = useRef(false);
  useEffect(() => {
    const map: SandpackFiles = {};
    for (const [path, file] of Object.entries(sandpack.files)) {
      const code = typeof file === "string" ? file : (file as { code: string }).code;
      map[path] = { code };
    }
    filesRef.current = map;
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    onChange?.();
  }, [sandpack.files, filesRef, onChange]);
  return null;
}

function RunBridge({
  runRef,
  onStatusChange,
}: {
  runRef: React.MutableRefObject<(() => void) | null>;
  onStatusChange?: (status: string) => void;
}) {
  const { dispatch, sandpack } = useSandpack();
  useEffect(() => {
    runRef.current = () => dispatch({ type: "refresh" });
  }, [dispatch, runRef]);
  useEffect(() => {
    onStatusChange?.(sandpack.status);
  }, [sandpack.status, onStatusChange]);
  return null;
}

function FormatBridge({
  formatRef,
}: {
  formatRef: React.MutableRefObject<(() => Promise<void>) | null>;
}) {
  const { sandpack } = useSandpack();
  useEffect(() => {
    formatRef.current = async () => {
      const path = sandpack.activeFile;
      if (!path) return;
      const file = sandpack.files[path];
      const code =
        typeof file === "string" ? file : (file as { code: string }).code;
      const { formatCode } = await import("@/lib/format");
      const result = await formatCode(path, code);
      if (!result.ok) {
        toast.error("Format failed", { description: result.reason });
        return;
      }
      if (result.code === code) {
        toast("Already formatted");
        return;
      }
      sandpack.updateFile(path, result.code);
      toast.success("Formatted");
    };
  }, [sandpack]);
  return null;
}
