"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

export default function ReactionBar({
  postId,
  initialCount,
  initialReacted,
  signedIn,
  orientation = "horizontal",
}: {
  postId: string;
  initialCount: number;
  initialReacted: boolean;
  signedIn: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !reacted;
    // Optimistic
    setReacted(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(
        `/api/blogs/${postId}/reactions${next ? "" : "?type=clap"}`,
        {
          method: next ? "POST" : "DELETE",
          headers: next ? { "content-type": "application/json" } : undefined,
          body: next ? JSON.stringify({ type: "clap" }) : undefined,
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = (await res.json()) as { reacted: boolean; count: number };
      // Sync with authoritative count
      setReacted(data.reacted);
      setCount(data.count);
    } catch (err) {
      // Rollback on failure
      setReacted(!next);
      setCount((c) => c + (next ? -1 : 1));
      toast.error("Couldn't update reaction", {
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
        aria-pressed={reacted}
        title={reacted ? "Remove like" : "Like this post"}
        className={`group w-12 flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all disabled:opacity-60 ${
          reacted
            ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
            : "border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg"
        }`}
      >
        <Heart
          className={`w-5 h-5 transition-transform ${reacted ? "fill-current scale-110" : "group-hover:scale-110"}`}
        />
        <span className="text-[11px] font-bold tabular-nums">{count}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={reacted}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all disabled:opacity-60 ${
        reacted
          ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
          : "border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg"
      }`}
      title={reacted ? "Remove like" : "Like this post"}
    >
      <Heart
        className={`w-4 h-4 transition-transform ${reacted ? "fill-current scale-110" : ""}`}
      />
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </button>
  );
}
