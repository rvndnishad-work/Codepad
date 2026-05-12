import Link from "next/link";
import { User, MessageCircle, Eye, BookOpen, Heart } from "lucide-react";
import RelativeTime from "./RelativeTime";

export type BlogFeedEntry = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  viewCount: number;
  createdAt: string;
  readingMinutes: number;
  tags?: string[];
  reactionCount?: number;
  commentCount?: number;
  user: {
    name: string | null;
    image: string | null;
  };
};

export default function BlogFeedItem({ blog }: { blog: BlogFeedEntry }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group relative flex gap-6 p-5 rounded-2xl border border-border bg-surface hover:bg-elevated hover:border-border-strong transition-all"
    >
      {/* Left: text content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Author + date */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="w-6 h-6 rounded-full bg-surface overflow-hidden border border-border shrink-0">
            {blog.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blog.user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                <User className="w-3 h-3 text-muted" />
              </div>
            )}
          </div>
          <span className="font-bold text-fg truncate max-w-[180px]">
            {blog.user.name ?? "Anonymous"}
          </span>
          <span className="text-muted/40">·</span>
          <span className="text-muted">
            <RelativeTime iso={blog.createdAt} />
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-black text-fg tracking-tight leading-snug group-hover:text-accent transition-colors line-clamp-2">
          {blog.title}
        </h3>

        {/* Excerpt */}
        {blog.excerpt && (
          <p className="text-sm text-muted leading-relaxed line-clamp-2">
            {blog.excerpt}
          </p>
        )}

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {blog.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-muted/80"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-1 text-[11px] font-medium text-muted/70">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            <span className="tabular-nums">{blog.readingMinutes} min read</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            <span className="tabular-nums">{blog.viewCount}</span>
          </span>
          {typeof blog.reactionCount === "number" && (
            <span className="flex items-center gap-1.5">
              <Heart className="w-3 h-3" />
              <span className="tabular-nums">{blog.reactionCount}</span>
            </span>
          )}
          {typeof blog.commentCount === "number" && (
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3 h-3" />
              <span className="tabular-nums">{blog.commentCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: thumbnail (only if cover exists) */}
      {blog.coverImage && (
        <div className="shrink-0 hidden sm:block">
          <div className="w-32 h-24 md:w-40 md:h-28 rounded-xl overflow-hidden border border-border bg-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blog.coverImage}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </Link>
  );
}
