"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/** Pings the view counter once on mount and renders a like toggle. */
export default function QuestionEngagement({ slug, initialLikes, tone = "default" }: { slug: string; initialLikes: number; tone?: "default" | "dark" }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // One view ping per mount.
    fetch(`/api/interview-questions/${slug}/view`, { method: "POST" }).catch(() => {});
    // Reflect prior like state from this browser.
    try {
      if (localStorage.getItem(`iq-like-${slug}`) === "1") {
        setTimeout(() => setLiked(true), 0);
      }
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
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={`${liked ? "Unlike" : "Like"} this question, ${likes} likes`}
      className={`inline-flex items-center gap-2 border text-sm font-medium tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
        tone === "dark" ? "h-11 rounded-full px-4 backdrop-blur-md" : "h-10 rounded-xl px-4"
      } ${
        liked
          ? "border-danger/40 bg-danger/10 text-danger"
          : tone === "dark"
            ? "border-white/[0.14] bg-white/[0.06] text-white/85 hover:border-white/30 hover:bg-white/[0.1] hover:text-white"
            : "border-border text-muted hover:border-border-strong hover:text-fg"
      }`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} aria-hidden />
      {likes}
    </button>
  );
}
