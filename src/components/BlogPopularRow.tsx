import Link from "next/link";
import { Eye } from "lucide-react";
import type { BlogFeedEntry } from "./BlogFeedItem";

/**
 * Ultra-compact "Top N" list row for sidebar use. Shows a big numbered rank
 * + title + author + view count. No thumbnail — keeps the column narrow so
 * it sits comfortably next to a big editorial card.
 */
export default function BlogPopularRow({
  blog,
  rank,
}: {
  blog: BlogFeedEntry;
  rank: number;
}) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group flex items-start gap-3 py-2.5 border-b border-border last:border-b-0 hover:bg-bg/40 -mx-2 px-2 rounded-lg transition-colors"
    >
      <span className="text-2xl font-black leading-none text-accent/30 tabular-nums shrink-0 w-7 pt-0.5">
        {rank.toString().padStart(2, "0")}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-fg leading-snug tracking-tight line-clamp-2 group-hover:text-accent transition-colors">
          {blog.title}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted mt-1 font-bold">
          <span className="truncate max-w-[120px]">
            {blog.user.name ?? "Anonymous"}
          </span>
          <span className="text-muted/30">·</span>
          <span className="flex items-center gap-1 text-blue-500/80 shrink-0">
            <Eye className="w-2.5 h-2.5" />
            <span className="tabular-nums text-muted">{blog.viewCount.toLocaleString()}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}
