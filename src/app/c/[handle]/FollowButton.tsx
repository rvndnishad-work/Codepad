"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, Check, Loader2 } from "lucide-react";
import { followSpaceAction, unfollowSpaceAction } from "./actions";

type Props = {
  spaceId: string;
  handle: string;
  isAuthed: boolean;
  initiallyFollowing: boolean;
  followerCount: number;
};

export default function FollowButton({
  spaceId,
  handle,
  isAuthed,
  initiallyFollowing,
  followerCount,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, startTransition] = useTransition();

  // Optimistic count: server count ± the local delta since load.
  const count = followerCount + (following ? 1 : 0) - (initiallyFollowing ? 1 : 0);

  if (!isAuthed) {
    return (
      <Link
        href={`/login?next=/c/${handle}`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-accent/40 bg-accent-glow text-sm font-bold text-fg hover:border-accent transition-colors"
      >
        <Heart className="w-4 h-4 text-accent" /> Follow
        {count > 0 && <span className="text-xs font-semibold text-muted">{count.toLocaleString()}</span>}
      </Link>
    );
  }

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        if (next) {
          await followSpaceAction(spaceId);
          toast.success("Following — you'll be notified about new content.");
        } else {
          await unfollowSpaceAction(spaceId);
        }
        router.refresh();
      } catch (err) {
        setFollowing(!next);
        toast.error(next ? "Couldn't follow" : "Couldn't unfollow", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors disabled:opacity-60 ${
        following
          ? "border-border bg-panel/50 text-muted hover:text-fg hover:border-accent/40"
          : "border-accent/40 bg-accent-glow text-fg hover:border-accent"
      }`}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : following ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Heart className="w-4 h-4 text-accent" />
      )}
      {following ? "Following" : "Follow"}
      {count > 0 && <span className="text-xs font-semibold text-muted">{count.toLocaleString()}</span>}
    </button>
  );
}
