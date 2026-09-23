import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import RelativeTime from "@/components/RelativeTime";
import { User, BookOpen, Eye, ArrowUpRight, Star } from "lucide-react";
import type { BlogFeedEntry } from "@/components/BlogFeedItem";

const FALLBACK_HUES = [
  "from-secondary/45 to-panel",
  "from-accent-4/30 to-panel",
  "from-secondary/25 to-elevated",
  "from-accent/25 to-panel",
];

function CoverArt({ blog, index = 0, sizes }: { blog: BlogFeedEntry; index?: number; sizes: string }) {
  if (blog.coverImage) {
    return (
      <SafeImage
        src={blog.coverImage}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        unoptimized={blog.coverImage.startsWith("data:")}
      />
    );
  }
  return (
    <span aria-hidden className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${FALLBACK_HUES[index % FALLBACK_HUES.length]}`}>
      <span className="wow-font-display px-6 text-center text-3xl text-fg/95 drop-shadow-lg">
        {blog.tags?.[0] ? `#${blog.tags[0]}` : "✦"}
      </span>
    </span>
  );
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  return (
    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-fg/30">
      {image ? (
        <SafeImage src={image} alt="" fill sizes="24px" className="object-cover" unoptimized={image.startsWith("data:")} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-elevated">
          <User className="h-3 w-3 text-fg" />
        </span>
      )}
    </span>
  );
}

function Meta({ blog, light = false }: { blog: BlogFeedEntry; light?: boolean }) {
  const tone = light ? "text-fg/75" : "text-subtle";
  return (
    <span className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs ${tone}`}>
      <span className="flex items-center gap-1.5">
        <Avatar name={blog.user.name} image={blog.user.image} />
        <span className={`max-w-[130px] truncate font-sans text-[12px] font-semibold ${light ? "text-fg" : "text-fg"}`}>
          {blog.user.name ?? "Anonymous"}
        </span>
      </span>
      <RelativeTime iso={blog.createdAt} />
      <span className="flex items-center gap-1 tabular-nums"><BookOpen className="h-3 w-3" />{blog.readingMinutes}m</span>
      <span className="flex items-center gap-1 tabular-nums"><Eye className="h-3 w-3" />{blog.viewCount.toLocaleString()}</span>
    </span>
  );
}

function TagRow({ tags = [] }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {tags.slice(0, 2).map((t) => (
        <span key={t} className="rounded-full border border-fg/25 bg-black/45 px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-fg backdrop-blur">
          #{t}
        </span>
      ))}
    </span>
  );
}

/** Lead story — cinematic image card with overlay type. */
export function StoryHeroCard({ blog }: { blog: BlogFeedEntry }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="wow-card-glow group relative block h-full min-h-[420px] overflow-hidden rounded-3xl border border-border md:min-h-[460px]"
    >
      <span className="absolute inset-0">
        <CoverArt blog={blog} sizes="(min-width: 1024px) 66vw, 100vw" />
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />
      <span className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">
        <Star className="h-3 w-3 fill-accent-ink" /> Lead story
      </span>
      <span className="absolute inset-x-0 bottom-0 block p-6 md:p-9">
        <TagRow tags={blog.tags} />
        <span className="wow-font-display mt-3 block text-3xl leading-[0.95] text-fg drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] md:text-5xl">
          {blog.title}
        </span>
        {blog.excerpt && (
          <span className="mt-3 block max-w-2xl text-[14px] leading-relaxed text-fg/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)] md:line-clamp-2 line-clamp-2">
            {blog.excerpt}
          </span>
        )}
        <span className="mt-4 block"><Meta blog={blog} light /></span>
      </span>
      <span className="absolute bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full bg-fg text-bg opacity-0 transition-all duration-300 group-hover:opacity-100 md:bottom-9 md:right-9">
        <ArrowUpRight className="h-5 w-5" />
      </span>
    </Link>
  );
}

/** Medium card for rails and grids — image top, body below. */
export function StoryCard({ blog, index = 0 }: { blog: BlogFeedEntry; index?: number }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="wow-card-glow group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-panel backdrop-blur-sm"
    >
      <span className="relative block aspect-[16/9] overflow-hidden">
        <CoverArt blog={blog} index={index} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        {blog.tags?.[0] && (
          <span className="absolute left-3 top-3 rounded-full border border-fg/25 bg-black/50 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-fg backdrop-blur">
            #{blog.tags[0]}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-2.5 p-5">
        <span className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-fg">
          {blog.title}
        </span>
        {blog.excerpt && (
          <span className="line-clamp-2 text-[13px] leading-relaxed text-muted">{blog.excerpt}</span>
        )}
        <span className="mt-auto block border-t border-border pt-3"><Meta blog={blog} /></span>
      </span>
    </Link>
  );
}
