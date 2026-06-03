"use client";

import { useState, useEffect } from "react";
import { X, Rocket, Image as ImageIcon, Hash, BookOpen, Sparkles, AlertCircle } from "lucide-react";
import TagInput from "./TagInput";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  initialTitle: string;
  initialExcerpt: string;
  initialCoverImage: string;
  initialTags: string[];
  alreadyPublished: boolean;
  readingMinutes: number;
  onPublish: (data: {
    excerpt: string;
    coverImage: string;
    tags: string[];
  }) => Promise<void>;
}

export default function PublishDialog({
  open,
  onClose,
  initialTitle,
  initialExcerpt,
  initialCoverImage,
  initialTags,
  alreadyPublished,
  readingMinutes,
  onPublish,
}: PublishDialogProps) {
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [tags, setTags] = useState(initialTags);
  const [busy, setBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setExcerpt(initialExcerpt);
    setCoverImage(initialCoverImage);
    setTags(initialTags);
    setCoverError(null);
  }, [open, initialExcerpt, initialCoverImage, initialTags]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    if (
      coverImage &&
      !/^https?:\/\//i.test(coverImage) &&
      !/^data:image\//i.test(coverImage)
    ) {
      setCoverError("Must be a full http(s) URL or generated image");
      return;
    }
    setBusy(true);
    try {
      await onPublish({ excerpt, coverImage, tags });
    } finally {
      setBusy(false);
    }
  }

  const excerptCount = excerpt.length;
  const excerptMax = 500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-black text-fg">
                {alreadyPublished ? "Update your story" : "Ready to publish?"}
              </h2>
              <p className="text-xs text-muted">
                A quick check on what readers will see.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-lg text-muted hover:text-fg hover:bg-bg/60 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="rounded-2xl border border-border bg-bg/40 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted mb-2">
              <Sparkles className="w-3 h-3 text-accent" />
              Preview
            </div>
            <h3 className="text-xl font-black text-fg leading-tight mb-1">
              {initialTitle || "Untitled story"}
            </h3>
            <p className="text-sm text-muted line-clamp-2">
              {excerpt || "Add an excerpt to entice readers."}
            </p>
            <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-muted">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {readingMinutes}m read
              </span>
              {tags.length > 0 && (
                <>
                  <span className="text-muted/30">·</span>
                  <span className="flex flex-wrap gap-1">
                    {tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-accent">#{t}</span>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Cover image URL
            </label>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-bg ${
                coverError ? "border-red-500/60" : "border-border focus-within:border-accent"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-muted shrink-0" />
              <input
                type="url"
                value={coverImage}
                onChange={(e) => {
                  setCoverImage(e.target.value);
                  setCoverError(null);
                }}
                placeholder="https://images.unsplash.com/…"
                className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted/50"
              />
            </div>
            {coverError && (
              <p className="text-[11px] text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                {coverError}
              </p>
            )}
            {coverImage && /^(https?:\/\/|data:image\/)/i.test(coverImage) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt=""
                className="mt-2 w-full aspect-[16/7] object-cover rounded-xl border border-border"
                onError={() => setCoverError("Could not load image")}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                Excerpt
              </label>
              <span className="text-[10px] text-muted/60 tabular-nums">
                {excerptCount}/{excerptMax}
              </span>
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value.slice(0, excerptMax))}
              placeholder="A short summary shown on listings and social previews."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-fg outline-none focus:border-accent placeholder:text-muted/50 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
              <Hash className="w-3 h-3" /> Tags
            </label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-panel/30">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-muted hover:text-fg hover:bg-bg/60 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-bg text-sm font-black hover:bg-accent-soft transition-all disabled:opacity-50 shadow-lg"
          >
            <Rocket className="w-4 h-4" />
            {busy
              ? "Publishing…"
              : alreadyPublished
                ? "Update story"
                : "Publish now"}
          </button>
        </div>
      </div>
    </div>
  );
}
