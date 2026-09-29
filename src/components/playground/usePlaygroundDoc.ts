"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { toast } from "sonner";
import { snapshotFiles } from "@/lib/file-dirty";
import type { FormatResult } from "../bridges/FormatBridge";

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

export type SaveOptions = { silent?: boolean; title?: string };
export type PlaygroundDoc = ReturnType<typeof usePlaygroundDoc>;

/**
 * The playground as a document: its title, visibility and saved state, and
 * the save / fork / share / embed / pop-out actions that act on it.
 */
export function usePlaygroundDoc({
  templateId,
  defaultTitle,
  snippet,
  initialTitle,
  signedIn,
  editable,
  filesRef,
  activeFileRef,
  formatRef,
  formatOnSave,
  savedSnapshotRef,
}: {
  templateId: string;
  defaultTitle: string;
  snippet?: Snippet | null;
  initialTitle?: string;
  signedIn: boolean;
  editable: boolean;
  filesRef: MutableRefObject<SandpackFiles>;
  activeFileRef: MutableRefObject<string>;
  formatRef: MutableRefObject<((opts?: { quiet?: boolean }) => Promise<FormatResult | null>) | null>;
  formatOnSave: boolean;
  savedSnapshotRef: MutableRefObject<SandpackFiles | null>;
}) {
  const [title, setTitle] = useState(initialTitle ?? defaultTitle);
  const [visibility, setVisibility] = useState<Visibility>(snippet?.visibility ?? "private");
  const [saving, setSaving] = useState(false);
  const [forking, setForking] = useState(false);
  const [snippetId, setSnippetId] = useState<string | null>(snippet?.id ?? null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(snippet?.slug ?? null);
  const [dirty, setDirty] = useState(false);
  const [tags] = useState<string[]>(snippet?.tags ?? []);

  const saveSeqRef = useRef(0);
  const committedSeqRef = useRef(0);
  // One-time hint teaching the save model (silent persists never land on
  // the dashboard) — shown on the first Ctrl+S of an unsaved playground.
  const saveHintShownRef = useRef(false);

  async function handleSave(opts: SaveOptions = {}) {
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
    // Background auto-saves stay invisible: only explicit saves animate Save.
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
        toast.success(snippetId ? "Playground updated" : "Playground saved", {
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
      toast.success("Fork created, opening it…");
      window.location.href = `/play/${data.slug}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Fork failed", { description: msg });
      setForking(false);
    }
  }

  /**
   * Public links and embeds only work for public snippets. Making one public
   * is the owner's call, so ask instead of flipping it silently.
   */
  async function ensurePublic(): Promise<boolean> {
    if (!editable || visibility === "public" || !snippetId) return true;
    const ok = window.confirm(
      "This playground is private. Make it public so anyone with the link can view it?",
    );
    if (!ok) return false;
    try {
      const res = await fetch(`/api/snippets/${snippetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setVisibility("public");
      return true;
    } catch {
      toast.error("Could not make the playground public. Try again.");
      return false;
    }
  }

  async function copyText(text: string, success: string, description?: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success, description ? { description } : undefined);
    } catch {
      toast(text);
    }
  }

  async function handleShare() {
    if (!snippetId || !currentSlug) {
      toast.info("Save first to get a shareable link.");
      return;
    }
    if (!(await ensurePublic())) return;
    const url = `${window.location.origin}/play/${currentSlug}`;
    await copyText(url, "Public link copied", url);
  }

  function handlePopout() {
    if (!currentSlug) {
      toast.info("Save first to pop out the preview.");
      return;
    }
    window.open(`${window.location.origin}/play/${currentSlug}?view=preview`, "_blank", "noopener,noreferrer");
  }

  async function handleCopyEmbed() {
    if (!snippetId || !currentSlug) {
      toast.info("Save first to get an embed code.");
      return;
    }
    if (!(await ensurePublic())) return;
    const url = `${window.location.origin}/embed/${currentSlug}`;
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`;
    await copyText(code, "Embed code copied", url);
  }

  // Auto-save: debounced silent PATCH for existing snippets. Reads the
  // latest handleSave through a ref so the timer never fires a stale closure.
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  useEffect(() => {
    if (!dirty || !signedIn || !editable || !snippetId) return;
    const t = setTimeout(() => {
      void handleSaveRef.current({ silent: true });
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, title, visibility, snippetId, signedIn, editable]);

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

  return {
    title,
    setTitle,
    visibility,
    setVisibility,
    saving,
    forking,
    snippetId,
    currentSlug,
    dirty,
    setDirty,
    handleSave,
    handleSaveRef,
    handleFork,
    handleShare,
    handlePopout,
    handleCopyEmbed,
  };
}
