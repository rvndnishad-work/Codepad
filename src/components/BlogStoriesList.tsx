"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import BlogRowCompact from "./BlogRowCompact";
import type { BlogFeedEntry } from "./BlogFeedItem";

interface BlogStoriesListProps {
  /** Server-rendered first page. */
  initialItems: BlogFeedEntry[];
  /** Cursor (last item's createdAt ISO) to start the next page from.
   *  null when there's nothing left to load. */
  initialCursor: string | null;
  /** IDs already shown elsewhere on the page (featured carousel, etc.) so we
   *  don't surface them twice when a later batch overlaps. */
  excludeIds?: string[];
  /** Tag filter passed through to /api/blogs. */
  tag?: string | null;
  /** Disable lazy-load entirely. Used when the active tab can't be cursor-paginated
   *  (e.g. "Most read" is ordered by viewCount, not createdAt). */
  enableLazy?: boolean;
  /** Number of items to fetch per batch. */
  batchSize?: number;
}

function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

function safeTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

export default function BlogStoriesList({
  initialItems,
  initialCursor,
  excludeIds = [],
  tag = null,
  enableLazy = true,
  batchSize = 8,
}: BlogStoriesListProps) {
  const [items, setItems] = useState<BlogFeedEntry[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!enableLazy || initialCursor === null);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(
    new Set([...excludeIds, ...initialItems.map((i) => i.id)]),
  );

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        before: cursor,
        limit: String(batchSize),
      });
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/blogs?${params}`, { cache: "no-store" });
      if (!res.ok) {
        setError("Couldn't load more.");
        return;
      }
      const batch = (await res.json()) as Array<{
        id: string;
        slug: string;
        title: string;
        excerpt: string | null;
        coverImage: string | null;
        viewCount: number;
        createdAt: string;
        content: string;
        tags: string | null;
        user: { name: string | null; image: string | null };
        _count?: { reactions: number; comments: number };
      }>;
      if (batch.length === 0) {
        setDone(true);
        return;
      }
      const fresh: BlogFeedEntry[] = [];
      for (const b of batch) {
        if (seenIdsRef.current.has(b.id)) continue;
        seenIdsRef.current.add(b.id);
        fresh.push({
          id: b.id,
          slug: b.slug,
          title: b.title,
          excerpt: b.excerpt,
          coverImage: b.coverImage,
          viewCount: b.viewCount,
          createdAt: b.createdAt,
          readingMinutes: readingMinutes(b.content),
          tags: safeTags(b.tags),
          reactionCount: b._count?.reactions,
          commentCount: b._count?.comments,
          user: { name: b.user.name, image: b.user.image },
        });
      }
      if (fresh.length > 0) setItems((prev) => [...prev, ...fresh]);
      const last = batch[batch.length - 1];
      setCursor(last.createdAt);
      if (batch.length < batchSize) setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, batchSize, tag]);

  // Lazy-load trigger: when the bottom sentinel comes into the viewport, fetch
  // the next batch. rootMargin loads ~600px before the user reaches the bottom
  // so the next batch is usually ready before they hit it.
  useEffect(() => {
    if (done || !enableLazy) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px 600px 0px", threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore, done, enableLazy]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col">
      {items.map((blog) => (
        <BlogRowCompact key={blog.id} blog={blog} />
      ))}

      {enableLazy && !done && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          {loading ? (
            <span className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Loading more stories
            </span>
          ) : error ? (
            <button
              type="button"
              onClick={loadMore}
              className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
            >
              {error} · Tap to retry
            </button>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted/40">
              Scroll for more
            </span>
          )}
        </div>
      )}

      {done && items.length > 8 && (
        <div className="text-center py-10 text-[11px] font-bold uppercase tracking-widest text-muted/40">
          You've reached the end
        </div>
      )}
    </div>
  );
}
