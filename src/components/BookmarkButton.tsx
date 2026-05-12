"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

export default function BookmarkButton({
  postId,
  initialBookmarked,
  signedIn,
  orientation = "horizontal",
}: {
  postId: string;
  initialBookmarked: boolean;
  signedIn: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res = await fetch(`/api/blogs/${postId}/bookmark`, {
        method: next ? "POST" : "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      setBookmarked(!next);
      toast.error("Couldn't update bookmark", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  if (orientation === "vertical") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={bookmarked}
        title={bookmarked ? "Remove bookmark" : "Save for later"}
        className={`w-12 h-12 rounded-xl border transition-all disabled:opacity-60 flex items-center justify-center ${
          bookmarked
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface hover:bg-accent/5 hover:border-accent/20 text-accent/60 hover:text-accent"
        }`}
      >
        {bookmarked ? (
          <BookmarkCheck className="w-5 h-5 fill-current" />
        ) : (
          <Bookmark className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={bookmarked}
      title={bookmarked ? "Remove bookmark" : "Save for later"}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all disabled:opacity-60 ${
        bookmarked
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-surface hover:bg-accent/5 hover:border-accent/20 text-accent/60 hover:text-accent"
      }`}
    >
      {bookmarked ? (
        <BookmarkCheck className="w-4 h-4 fill-current" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      <span className="text-sm font-bold hidden sm:inline">
        {bookmarked ? "Saved" : "Save"}
      </span>
    </button>
  );
}
