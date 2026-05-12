"use client";

import { MessageCircle } from "lucide-react";
import ReactionBar from "./ReactionBar";
import BookmarkButton from "./BookmarkButton";
import ShareButton from "./ShareButton";

type Props = {
  postId: string;
  title: string;
  reactionCount: number;
  hasReacted: boolean;
  isBookmarked: boolean;
  commentCount: number;
  signedIn: boolean;
};

/**
 * Desktop: floating vertical rail of actions (reactions, bookmark, jump-to-comments, share).
 * Mobile: a bottom-sticky bar via the parent. This component is intentionally
 * desktop-only — render it inside an `hidden lg:flex` wrapper.
 */
export default function BlogEngagementRail({
  postId,
  title,
  reactionCount,
  hasReacted,
  isBookmarked,
  commentCount,
  signedIn,
}: Props) {
  function jumpToComments() {
    const el = document.getElementById("comments");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col items-center gap-2 sticky top-24">
      <ReactionBar
        postId={postId}
        initialCount={reactionCount}
        initialReacted={hasReacted}
        signedIn={signedIn}
        orientation="vertical"
      />
      <BookmarkButton
        postId={postId}
        initialBookmarked={isBookmarked}
        signedIn={signedIn}
        orientation="vertical"
      />
      <button
        onClick={jumpToComments}
        title="Jump to comments"
        className="w-12 flex flex-col items-center gap-0.5 py-2 rounded-xl border border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg transition group"
      >
        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-bold tabular-nums">{commentCount}</span>
      </button>
      <ShareButton title={title} orientation="vertical" />
    </div>
  );
}
