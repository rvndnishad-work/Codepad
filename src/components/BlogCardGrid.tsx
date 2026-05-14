import Link from "next/link";
import { User, BookOpen } from "lucide-react";
import RelativeTime from "./RelativeTime";
import type { BlogFeedEntry } from "./BlogFeedItem";

/**
 * Medium card with cover image on top and title + meta beneath. Designed for
 * 2- or 3-column grids on `/blog` and the home page.
 */
export default function BlogCardGrid({ blog }: { blog: BlogFeedEntry }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface hover:border-accent/30 transition-colors overflow-hidden"
    >
      <div className="aspect-[16/9] bg-panel relative overflow-hidden">
        {blog.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blog.coverImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent/15 via-accent/5 to-transparent flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/60">
              {blog.tags?.[0] ? `#${blog.tags[0]}` : "Article"}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 p-4">
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {blog.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.15em] bg-accent/10 text-accent/90"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <h3 className="text-base font-black text-fg leading-snug tracking-tight group-hover:text-accent transition-colors line-clamp-2">
          {blog.title}
        </h3>

        {blog.excerpt && (
          <p className="text-xs text-muted/80 leading-relaxed line-clamp-2 font-medium">
            {blog.excerpt}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center gap-2 text-[10px] font-bold border-t border-border">
          <span className="w-4 h-4 rounded-full bg-bg overflow-hidden border border-border shrink-0">
            {blog.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blog.user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full bg-accent/10 flex items-center justify-center">
                <User className="w-2 h-2 text-accent" />
              </span>
            )}
          </span>
          <span className="text-fg/80 truncate max-w-[100px]">
            {blog.user.name ?? "Anonymous"}
          </span>
          <span className="text-muted/30">·</span>
          <span className="text-muted">
            <RelativeTime iso={blog.createdAt} />
          </span>
          <span className="ml-auto flex items-center gap-1 text-emerald-500/80">
            <BookOpen className="w-2.5 h-2.5" />
            <span className="text-muted">{blog.readingMinutes}m</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
