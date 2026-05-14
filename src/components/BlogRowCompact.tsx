import Link from "next/link";
import { BookOpen, Eye } from "lucide-react";
import RelativeTime from "./RelativeTime";
import type { BlogFeedEntry } from "./BlogFeedItem";

/**
 * One-line compact list row. Tiny square thumbnail (or accent placeholder)
 * on the left, then title, meta, and an indented author line. Designed for
 * dense "more stories" tails on `/blog`.
 */
export default function BlogRowCompact({ blog }: { blog: BlogFeedEntry }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group flex items-center gap-4 py-3 border-b border-border last:border-b-0 hover:bg-bg/40 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-panel border border-border overflow-hidden shrink-0">
        {blog.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blog.coverImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent/15 to-accent/0 flex items-center justify-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-accent/70">
              {blog.tags?.[0]?.slice(0, 3) ?? "art"}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-fg leading-snug tracking-tight group-hover:text-accent transition-colors line-clamp-1">
          {blog.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
          <span className="font-bold text-fg/70 truncate max-w-[140px]">
            {blog.user.name ?? "Anonymous"}
          </span>
          <span className="text-muted/30">·</span>
          <span className="hidden sm:inline">
            <RelativeTime iso={blog.createdAt} />
          </span>
          {blog.tags?.[0] && (
            <>
              <span className="text-muted/30 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-accent/80 font-bold">
                #{blog.tags[0]}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 text-[11px] text-muted shrink-0">
        <span className="flex items-center gap-1 text-emerald-500/80">
          <BookOpen className="w-3 h-3" />
          <span className="text-muted">{blog.readingMinutes}m</span>
        </span>
        <span className="flex items-center gap-1 text-blue-500/80">
          <Eye className="w-3 h-3" />
          <span className="text-muted tabular-nums">{blog.viewCount}</span>
        </span>
      </div>
    </Link>
  );
}
