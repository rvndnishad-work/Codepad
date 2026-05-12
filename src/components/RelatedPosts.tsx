import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import RelativeTime from "./RelativeTime";

export type RelatedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  createdAt: string;
  readingMinutes: number;
  user: { name: string | null };
};

export default function RelatedPosts({ posts }: { posts: RelatedPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-12 mb-20">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-accent mb-1">
            Keep reading
          </div>
          <h3 className="text-2xl font-black tracking-tight text-fg">
            Related stories
          </h3>
        </div>
        <Link
          href="/blog"
          className="text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5 group"
        >
          All posts
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.slice(0, 3).map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="group rounded-2xl border border-border bg-surface hover:bg-elevated hover:border-border-strong transition-all overflow-hidden"
          >
            {p.coverImage ? (
              <div className="aspect-[16/9] overflow-hidden border-b border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.coverImage}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-accent/10 via-bg to-accent/5 border-b border-border flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-accent/30" />
              </div>
            )}
            <div className="p-4">
              <h4 className="text-sm font-black text-fg tracking-tight line-clamp-2 group-hover:text-accent transition-colors mb-2">
                {p.title}
              </h4>
              {p.excerpt && (
                <p className="text-xs text-muted line-clamp-2 mb-3 leading-relaxed">
                  {p.excerpt}
                </p>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted/60 font-medium">
                <span className="truncate">{p.user.name ?? "Anonymous"}</span>
                <span className="shrink-0 ml-2 flex items-center gap-2">
                  <span>{p.readingMinutes} min</span>
                  <span>·</span>
                  <span><RelativeTime iso={p.createdAt} /></span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
