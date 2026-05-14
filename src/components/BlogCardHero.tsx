import Link from "next/link";
import { User, BookOpen, Eye } from "lucide-react";
import RelativeTime from "./RelativeTime";
import type { BlogFeedEntry } from "./BlogFeedItem";

/**
 * Editorial feature card. Cover on the left, title + dek on the right.
 * Used as the lead post on `/blog`. Falls back to a no-cover stacked layout
 * when there's no image.
 */
export default function BlogCardHero({ blog }: { blog: BlogFeedEntry }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 rounded-3xl border border-border bg-surface hover:border-accent/30 transition-colors overflow-hidden"
    >
      {blog.coverImage ? (
        <div className="relative aspect-[16/10] md:aspect-auto md:h-full overflow-hidden bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blog.coverImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg/80 backdrop-blur border border-border text-[9px] font-black uppercase tracking-[0.18em] text-accent">
            Featured
          </span>
        </div>
      ) : (
        <div className="aspect-[16/10] md:aspect-auto md:h-full bg-gradient-to-br from-accent/20 via-accent/5 to-transparent border-r border-border flex items-center justify-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/70">
            Featured story
          </span>
        </div>
      )}

      <div className="flex flex-col justify-center p-6 md:p-8 gap-3">
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {blog.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.15em] bg-accent/10 border border-accent/20 text-accent"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-fg leading-[1.1] tracking-tight group-hover:text-accent transition-colors line-clamp-3">
          {blog.title}
        </h2>

        {blog.excerpt && (
          <p className="text-sm md:text-base text-muted leading-relaxed line-clamp-2 md:line-clamp-3">
            {blog.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-bg overflow-hidden border border-border shrink-0">
              {blog.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blog.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full bg-accent/10 flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-accent" />
                </span>
              )}
            </span>
            <span className="text-fg/80 truncate max-w-[160px]">
              {blog.user.name ?? "Anonymous"}
            </span>
          </span>
          <span className="text-muted/30">·</span>
          <span className="text-muted">
            <RelativeTime iso={blog.createdAt} />
          </span>
          <span className="text-muted/30">·</span>
          <span className="flex items-center gap-1 text-emerald-500/80">
            <BookOpen className="w-3 h-3" />
            <span className="text-muted">{blog.readingMinutes}m</span>
          </span>
          <span className="text-muted/30">·</span>
          <span className="flex items-center gap-1 text-blue-500/80">
            <Eye className="w-3 h-3" />
            <span className="text-muted tabular-nums">{blog.viewCount}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
