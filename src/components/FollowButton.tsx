"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function FollowButton({
  userId,
  initialFollowing,
  signedIn,
  size = "md",
}: {
  userId: string;
  initialFollowing: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    // Optimistic.
    const next = !following;
    setFollowing(next);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: next ? "POST" : "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      setFollowing(!next); // rollback
      toast.error("Couldn't update follow status", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  const sizeClasses =
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  if (!signedIn) {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg font-bold transition ${sizeClasses}`}
        title="Sign in to follow"
      >
        <LogIn className="w-3 h-3" />
        Follow
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || pending}
      className={`flex items-center gap-1.5 rounded-lg font-bold transition disabled:opacity-60 ${sizeClasses} ${
        following
          ? "bg-surface border border-border text-fg/70 hover:bg-elevated hover:text-fg"
          : "bg-accent text-bg hover:bg-accent-soft"
      }`}
    >
      {following ? (
        <>
          <UserCheck className="w-3 h-3" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-3 h-3" />
          Follow
        </>
      )}
    </button>
  );
}
