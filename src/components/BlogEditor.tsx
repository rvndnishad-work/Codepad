"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Eye,
  Pencil,
  Rocket,
  Check,
  CloudOff,
  Loader2,
  ImagePlus,
  X,
  Settings2,
  Hash,
  Image as ImageIcon,
  Quote,
  BookOpen,
  Globe,
  Lock,
  PanelRightOpen,
  PanelRightClose,
  Type,
  Wand2,
} from "lucide-react";

import TagInput from "./blog-editor/TagInput";
import PublishDialog from "./blog-editor/PublishDialog";
import ImageGenDialog from "./blog-editor/ImageGenDialog";
import { useAutoSave } from "./blog-editor/useAutoSave";
import type { BlogEditorData, SaveState, BlogEditorSavePayload } from "./blog-editor/types";
import MarkdownRenderer from "./MarkdownRenderer";

// EditorSurface depends on browser APIs; load lazily.
const EditorSurface = dynamic(() => import("./blog-editor/EditorSurface"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] flex items-center justify-center text-sm text-muted">
      Loading editor…
    </div>
  ),
});

interface BlogEditorProps {
  initialData?: Partial<BlogEditorData>;
  onSave: (data: BlogEditorSavePayload) => Promise<void>;
  /**
   * Whether autosave is enabled. Defaults to true when an `id` is present
   * (i.e. we're editing an existing draft). New blogs auto-save only after
   * the first manual save creates the row.
   */
  autoSave?: boolean;
}

function wordsAndMinutes(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-]/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export default function BlogEditor({ initialData, onSave, autoSave }: BlogEditorProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [published, setPublished] = useState(initialData?.published ?? false);

  const [view, setView] = useState<"write" | "preview">("write");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [coverEditing, setCoverEditing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [imageGenOpen, setImageGenOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [isManuallySaving, setIsManuallySaving] = useState(false);
  const [stats, setStats] = useState({ words: 0, characters: 0 });

  // Keep word count fresh based on markdown when EditorSurface isn't mounted
  // (e.g. preview view), and as a fallback before its first stats event.
  const fallbackStats = useMemo(() => wordsAndMinutes(content), [content]);
  const liveWords = stats.words || fallbackStats.words;
  const minutes = Math.max(1, Math.round(liveWords / 200));

  const hasId = Boolean(initialData?.id);
  const autoSaveEnabled = autoSave ?? hasId;

  const payload = useMemo<BlogEditorSavePayload>(
    () => ({
      title: title.trim(),
      content,
      excerpt: excerpt.trim(),
      coverImage: coverImage.trim(),
      tags,
      published,
    }),
    [title, content, excerpt, coverImage, tags, published],
  );

  // Stable callback for autosave so the hook doesn't re-fire just from
  // re-renders. The latest values are read via ref.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const autoSaveFn = useCallback(async () => {
    const p = payloadRef.current;
    // Don't autosave empty drafts.
    if (!p.title.trim() && !p.content.trim()) return;
    await onSaveRef.current(p);
  }, []);

  useAutoSave({
    value: payload,
    enabled: autoSaveEnabled,
    onSave: autoSaveFn,
    onState: setSaveState,
    isEqual: (a, b) =>
      a.title === b.title &&
      a.content === b.content &&
      a.excerpt === b.excerpt &&
      a.coverImage === b.coverImage &&
      a.published === b.published &&
      a.tags.length === b.tags.length &&
      a.tags.every((t, i) => t === b.tags[i]),
  });

  // ⌘S / Ctrl+S manual save shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleManualSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, excerpt, coverImage, tags, published]);

  // Periodically re-render the "Saved 5s ago" label so it stays fresh.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (saveState.kind !== "saved") return;
    const id = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [saveState.kind]);

  async function handleManualSave() {
    if (!title.trim()) {
      toast.error("Add a title before saving");
      return;
    }
    setIsManuallySaving(true);
    setSaveState({ kind: "saving" });
    try {
      await onSave(payload);
      setSaveState({ kind: "saved", at: Date.now() });
      toast.success(hasId ? "Draft saved" : "Draft created");
    } catch (err) {
      setSaveState({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed",
      });
      toast.error("Couldn't save. Check your connection and try again.");
    } finally {
      setIsManuallySaving(false);
    }
  }

  async function handlePublish(data: {
    excerpt: string;
    coverImage: string;
    tags: string[];
  }) {
    if (!title.trim()) {
      toast.error("Add a title before publishing");
      throw new Error("missing title");
    }
    if (!content.trim()) {
      toast.error("Add some content before publishing");
      throw new Error("missing content");
    }
    const merged: BlogEditorSavePayload = {
      title: title.trim(),
      content,
      excerpt: data.excerpt.trim(),
      coverImage: data.coverImage.trim(),
      tags: data.tags,
      published: true,
    };
    setSaveState({ kind: "saving" });
    try {
      await onSave(merged);
      setExcerpt(merged.excerpt);
      setCoverImage(merged.coverImage);
      setTags(merged.tags);
      setPublished(true);
      setSaveState({ kind: "saved", at: Date.now() });
      setPublishOpen(false);
      toast.success(published ? "Story updated!" : "Your story is live!");
    } catch (err) {
      setSaveState({
        kind: "error",
        message: err instanceof Error ? err.message : "Publish failed",
      });
      toast.error("Couldn't publish. Try again.");
    }
  }

  function unpublish() {
    setPublished(false);
    toast.message("Switched to draft", {
      description: "Save to apply the change.",
    });
  }

  return (
    <div className="rounded-3xl border border-border bg-surface overflow-hidden shadow-xl">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 border-b border-border bg-surface/95 backdrop-blur-xl">
        <SaveStatus state={saveState} />

        <div className="hidden md:flex items-center gap-2 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Type className="w-3 h-3" />
            <span className="tabular-nums">{liveWords}</span> words
          </span>
          <span className="text-muted/30">·</span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {minutes}m read
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-bg p-0.5">
            <button
              onClick={() => setView("write")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                view === "write" ? "bg-accent text-bg" : "text-muted hover:text-fg"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Write
            </button>
            <button
              onClick={() => setView("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                view === "preview" ? "bg-accent text-bg" : "text-muted hover:text-fg"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-bg hover:bg-elevated text-muted hover:text-fg transition-colors"
            title={sidebarOpen ? "Hide settings" : "Show settings"}
          >
            {sidebarOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleManualSave}
            disabled={isManuallySaving}
            className="px-3 py-2 rounded-xl border border-border bg-bg hover:bg-elevated text-fg text-[11px] font-bold transition-colors disabled:opacity-50"
          >
            Save draft
          </button>

          {published ? (
            <>
              <button
                onClick={() => setPublishOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-black hover:bg-emerald-500/20 transition-colors"
              >
                <Rocket className="w-3.5 h-3.5" />
                Update story
              </button>
            </>
          ) : (
            <button
              onClick={() => setPublishOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg text-[11px] font-black hover:bg-accent-soft transition-colors shadow-md"
            >
              <Rocket className="w-3.5 h-3.5" />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-16rem)]">
        {/* Main writing column */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div
            className={`px-4 md:px-12 lg:px-16 py-10 max-w-3xl mx-auto w-full ${
              view === "write" ? "" : "hidden"
            }`}
          >
            <CoverImageBlock
              value={coverImage}
              editing={coverEditing}
              onEdit={() => setCoverEditing(true)}
              onChange={setCoverImage}
              onDone={() => setCoverEditing(false)}
              onGenerate={() => setImageGenOpen(true)}
            />

            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Title"
              rows={1}
              className="w-full bg-transparent text-4xl md:text-5xl font-black text-fg placeholder:text-fg/15 outline-none border-none p-0 resize-none mb-4 leading-tight tracking-tight"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }}
            />

            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value.slice(0, 500))}
              placeholder="Add a subtitle or dek (optional)…"
              rows={1}
              className="w-full bg-transparent text-lg md:text-xl text-muted placeholder:text-muted/30 outline-none border-none p-0 resize-none mb-10 leading-relaxed font-medium"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }}
            />

            <EditorSurface
              content={initialData?.content ?? ""}
              onChange={setContent}
              onStats={setStats}
            />
          </div>

          {view === "preview" && (
            <div className="px-4 md:px-12 lg:px-16 py-10 max-w-3xl mx-auto w-full">
              {coverImage && (
                <div className="aspect-[2/1] w-full mb-10 rounded-2xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-black text-fg mb-4 leading-tight tracking-tight">
                {title || "Untitled story"}
              </h1>
              {excerpt && (
                <p className="text-lg md:text-xl text-muted leading-relaxed mb-10 font-medium">
                  {excerpt}
                </p>
              )}
              <MarkdownRenderer
                content={content || "_Nothing to preview yet. Switch back to Write._"}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-panel/30">
            <div className="sticky top-[64px] p-5 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <SidebarSection icon={<Settings2 className="w-3.5 h-3.5" />} title="Status">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg">
                  <div className="flex items-center gap-2">
                    {published ? (
                      <Globe className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-fg">
                        {published ? "Published" : "Draft"}
                      </p>
                      <p className="text-[10px] text-muted">
                        {published ? "Visible to everyone" : "Only visible to you"}
                      </p>
                    </div>
                  </div>
                  {published && (
                    <button
                      onClick={unpublish}
                      className="text-[10px] font-bold text-muted hover:text-fg uppercase tracking-widest"
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </SidebarSection>

              <SidebarSection
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                title="Cover image"
              >
                <input
                  type="url"
                  value={coverImage.startsWith("data:") ? "" : coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder={
                    coverImage.startsWith("data:")
                      ? "Generated image set"
                      : "https://…"
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg outline-none focus:border-accent placeholder:text-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setImageGenOpen(true)}
                  className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent text-[11px] font-black transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Generate with AI
                </button>
                {coverImage && /^(https?:\/\/|data:image\/)/i.test(coverImage) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt=""
                    className="mt-2 w-full aspect-[16/9] object-cover rounded-lg border border-border"
                  />
                )}
              </SidebarSection>

              <SidebarSection icon={<Quote className="w-3.5 h-3.5" />} title="Excerpt">
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Short summary shown on listings and social previews."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-xs text-fg outline-none focus:border-accent placeholder:text-muted/50 resize-none"
                />
                <p className="text-[10px] text-muted/60 text-right tabular-nums">
                  {excerpt.length}/500
                </p>
              </SidebarSection>

              <SidebarSection icon={<Hash className="w-3.5 h-3.5" />} title="Tags">
                <TagInput tags={tags} onChange={setTags} placeholder="react, ai…" />
              </SidebarSection>

              <SidebarSection icon={<Type className="w-3.5 h-3.5" />} title="Stats">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Words" value={liveWords.toLocaleString()} />
                  <Stat label="Chars" value={stats.characters.toLocaleString()} />
                  <Stat label="Read" value={`${minutes}m`} />
                </div>
              </SidebarSection>

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted/60 leading-relaxed">
                  Tip: type <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono">/</kbd>{" "}
                  in the editor for blocks. Select text for inline formatting.
                  <br />
                  <kbd className="px-1 py-0.5 rounded bg-bg border border-border font-mono">⌘S</kbd>{" "}
                  saves a draft.
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        initialTitle={title}
        initialExcerpt={excerpt}
        initialCoverImage={coverImage}
        initialTags={tags}
        alreadyPublished={published}
        readingMinutes={minutes}
        onPublish={handlePublish}
      />

      <ImageGenDialog
        open={imageGenOpen}
        onClose={() => setImageGenOpen(false)}
        // Seed the prompt with the post's title — the user usually wants
        // cover art that matches what the post is about.
        initialPrompt={title.trim() ? `Cover image for an article titled: "${title.trim()}"` : ""}
        onAccept={(dataUrl) => {
          setCoverImage(dataUrl);
          toast.success("Cover image set");
        }}
      />
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state.kind === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
        <Check className="w-3 h-3" />
        Saved {relativeTime(state.at)}
      </span>
    );
  }
  if (state.kind === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-500">
        <CloudOff className="w-3 h-3" />
        {state.message}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted/60">
      <Check className="w-3 h-3 opacity-30" />
      Not saved yet
    </span>
  );
}

function SidebarSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-2">
      <div className="text-xs font-black text-fg tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}

interface CoverImageBlockProps {
  value: string;
  editing: boolean;
  onEdit: () => void;
  onChange: (v: string) => void;
  onDone: () => void;
  onGenerate?: () => void;
}

function CoverImageBlock({
  value,
  editing,
  onEdit,
  onChange,
  onDone,
  onGenerate,
}: CoverImageBlockProps) {
  // Accept both http(s) URLs and base64 data URLs (the latter is what the AI
  // generator returns and stores directly on coverImage).
  const isValid = value && /^(https?:\/\/|data:image\/)/i.test(value);

  if (!value && !editing) {
    return (
      <div className="mb-10 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="py-6 rounded-2xl border border-dashed border-border hover:border-accent hover:bg-accent/5 text-muted hover:text-fg transition-colors flex items-center justify-center gap-2 text-sm font-bold"
        >
          <ImagePlus className="w-4 h-4" />
          Add a cover image
        </button>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="py-6 sm:px-6 rounded-2xl border border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent transition-colors flex items-center justify-center gap-2 text-sm font-black"
            title="Generate with AI"
          >
            <Wand2 className="w-4 h-4" />
            Generate with AI
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-10 relative group">
      {isValid && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="w-full aspect-[2/1] object-cover rounded-2xl border border-border"
        />
      )}
      {!isValid && (
        <div className="w-full aspect-[2/1] rounded-2xl border border-dashed border-border bg-bg/40 flex items-center justify-center text-sm text-muted">
          <span className="opacity-60">Cover preview will appear here</span>
        </div>
      )}
      {(editing || !isValid) && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste image URL…"
            autoFocus
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg text-sm text-fg outline-none focus:border-accent placeholder:text-muted/50"
          />
          <button
            type="button"
            onClick={onDone}
            className="px-3 py-2 rounded-xl bg-accent text-bg text-xs font-black hover:bg-accent-soft transition-colors"
          >
            Done
          </button>
        </div>
      )}
      {isValid && !editing && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/90 backdrop-blur text-bg text-[10px] font-black hover:bg-accent"
              title="Regenerate with AI"
            >
              <Wand2 className="w-3 h-3" />
              AI
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="px-2.5 py-1 rounded-lg bg-bg/90 backdrop-blur border border-border text-fg text-[10px] font-bold hover:bg-surface"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-7 h-7 rounded-lg bg-bg/90 backdrop-blur border border-border text-muted hover:text-fg flex items-center justify-center"
            title="Remove cover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
