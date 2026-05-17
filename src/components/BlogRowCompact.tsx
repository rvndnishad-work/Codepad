import Link from "next/link";
import SafeImage from "./SafeImage";
import {
  BookOpen,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  User,
} from "lucide-react";
import RelativeTime from "./RelativeTime";
import type { BlogFeedEntry } from "./BlogFeedItem";

/**
 * Medium-style feed row. Author byline at the top, large bold title and
 * dek, square thumbnail on the right, lean action bar at the bottom
 * (reactions / comments / read time + bookmark / overflow). Borderless —
 * just a thin bottom rule between items. Used in the "More stories" tail
 * on `/blog`.
 */
export default function BlogRowCompact({ blog }: { blog: BlogFeedEntry }) {
  return (
    <article className="group border-b border-border last:border-b-0 py-7">
      <Link href={`/blog/${blog.slug}`} className="block">
        {/* Byline */}
        <div className="flex items-center gap-2 text-[13px] text-fg/80 mb-3">
          <span className="relative w-5 h-5 rounded-full bg-panel overflow-hidden border border-border shrink-0">
            {blog.user.image ? (
              <SafeImage
                src={blog.user.image}
                alt=""
                fill
                sizes="20px"
                className="object-cover"
              />
            ) : (
              <span className="w-full h-full bg-accent/10 flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-accent/70" />
              </span>
            )}
          </span>
          <span className="font-medium truncate max-w-[260px]">
            {blog.user.name ?? "Anonymous"}
          </span>
        </div>

        {/* Title + excerpt + thumb */}
        <div className="flex gap-5 sm:gap-8">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-fg leading-[1.25] tracking-tight group-hover:text-accent transition-colors line-clamp-2">
              {blog.title}
            </h3>
            {blog.excerpt && (
              <p className="hidden sm:block mt-2 text-[15px] text-muted leading-relaxed line-clamp-2">
                {blog.excerpt}
              </p>
            )}
          </div>

          <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 rounded-md overflow-hidden bg-panel border border-border">
            {blog.coverImage ? (
              <SafeImage
                src={blog.coverImage}
                alt=""
                fill
                sizes="(min-width: 768px) 128px, (min-width: 640px) 112px, 80px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/15 to-accent/0 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent/40" />
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-4 mt-4 text-[12px] text-muted">
          <span className="tabular-nums">
            <RelativeTime iso={blog.createdAt} />
          </span>
          <span className="text-muted/30">·</span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{blog.readingMinutes} min read</span>
          </span>
          {typeof blog.reactionCount === "number" && blog.reactionCount > 0 && (
            <>
              <span className="text-muted/30">·</span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                <span className="tabular-nums">{blog.reactionCount}</span>
              </span>
            </>
          )}
          {typeof blog.commentCount === "number" && blog.commentCount > 0 && (
            <>
              <span className="text-muted/30">·</span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="tabular-nums">{blog.commentCount}</span>
              </span>
            </>
          )}

          <span className="ml-auto flex items-center gap-1 text-muted/60">
            <span
              className="p-1.5 rounded-full hover:bg-elevated hover:text-fg transition-colors"
              aria-hidden="true"
            >
              <Bookmark className="w-4 h-4" />
            </span>
            <span
              className="p-1.5 rounded-full hover:bg-elevated hover:text-fg transition-colors"
              aria-hidden="true"
            >
              <MoreHorizontal className="w-4 h-4" />
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
