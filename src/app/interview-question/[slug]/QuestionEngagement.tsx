"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/** Pings the view counter once on mount and renders a like toggle. */
export default function QuestionEngagement({ slug, initialLikes }: { slug: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // One view ping per mount.
    fetch(`/api/interview-questions/${slug}/view`, { method: "POST" }).catch(() => {});
    // Reflect prior like state from this browser.
    try {
      if (localStorage.getItem(`iq-like-${slug}`) === "1") setLiked(true);
    } catch {}
  }, [slug]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      const r = await fetch(`/api/interview-questions/${slug}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: next }),
      });
      if (r.ok) {
        const { likes: serverLikes } = await r.json();
        setLikes(serverLikes);
        try {
          if (next) localStorage.setItem(`iq-like-${slug}`, "1");
          else localStorage.removeItem(`iq-like-${slug}`);
        } catch {}
      }
    } catch {
      // revert on failure
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition ${
        liked
          ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
          : "border-border text-muted hover:text-fg hover:border-fg/30"
      }`}
    >
      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      {likes}
    </button>
  );
}
