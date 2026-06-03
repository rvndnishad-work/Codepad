"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import BlogCardGrid from "./BlogCardGrid";
import type { BlogFeedEntry } from "./BlogFeedItem";

interface BlogLazyFeedProps {
  /** Server-rendered first page. */
  initialItems: BlogFeedEntry[];
  /** Cursor (last item's createdAt ISO) to start the next page from.
   *  null when there's nothing left to load. */
  initialCursor: string | null;
  /** IDs already shown elsewhere on the page (hero, popular sidebar). The
   *  client uses these to dedupe newly-fetched items in case they overlap. */
  excludeIds: string[];
  /** Number of items to fetch per batch. */
  batchSize?: number;
}

/**
 * Horizontal carousel of small blog cards. The container itself takes
 * 100% of its parent's width (it lives inside `lg:col-span-2` on the
 * homepage, so on desktop that's the main column to the left of the
 * sidebar — same width as the hero card directly above it).
 *
 *   • Cards are fixed-width (small) so 3 fit per "page" on desktop
 *   • Prev / next buttons nudge the scroller by one card-width at a time
 *   • Native horizontal scroll handles touch swipe + trackpad gestures
 *   • CSS scroll-snap keeps cards aligned at their leading edge
 *   • IntersectionObserver on a right-edge sentinel triggers lazy load
 */
const CARD_WIDTH_PX = 256;
const CARD_GAP_PX = 20; // matches gap-5 (1.25rem at 16px base)
const SCROLL_STEP_PX = CARD_WIDTH_PX + CARD_GAP_PX;

export default function BlogLazyFeed({
  initialItems,
  initialCursor,
  excludeIds,
  batchSize = 6,
}: BlogLazyFeedProps) {
  const [items, setItems] = useState<BlogFeedEntry[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialCursor === null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(
    new Set([...excludeIds, ...initialItems.map((i) => i.id)]),
  );

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, items.length]);

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        before: cursor,
        limit: String(batchSize),
      });
      const res = await fetch(`/api/blogs?${params}`);
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
      }>;
      if (batch.length === 0) {
        setDone(true);
        return;
      }
      const fresh: BlogFeedEntry[] = [];
      for (const b of batch) {
        if (seenIdsRef.current.has(b.id)) continue;
        seenIdsRef.current.add(b.id);
        let tagsArr: string[] = [];
        try {
          const parsed = b.tags ? JSON.parse(b.tags) : [];
          if (Array.isArray(parsed)) {
            tagsArr = parsed.filter((t): t is string => typeof t === "string");
          }
        } catch {
          // ignore
        }
        fresh.push({
          id: b.id,
          slug: b.slug,
          title: b.title,
          excerpt: b.excerpt,
          coverImage: b.coverImage,
          viewCount: b.viewCount,
          createdAt: b.createdAt,
          readingMinutes: Math.max(
            1,
            Math.round(b.content.trim().split(/\s+/).length / 200),
          ),
          tags: tagsArr,
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
  }, [cursor, loading, done, batchSize]);

  // Lazy-load trigger: when the right-edge sentinel comes into the scroller's
  // viewport, fetch the next batch. rootMargin puts the trigger ~one card
  // ahead of the user so cards appear before they're needed.
  useEffect(() => {
    if (done) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      {
        root: scrollRef.current,
        rootMargin: `0px ${CARD_WIDTH_PX}px 0px 0px`,
        threshold: 0,
      },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore, done]);

  function nudge(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "right" ? SCROLL_STEP_PX : -SCROLL_STEP_PX,
      behavior: "smooth",
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-3 -mb-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ scrollbarColor: "var(--border) transparent" }}
      >
        {items.map((blog) => (
          <div
            key={blog.id}
            className="snap-start shrink-0 flex"
            style={{ width: `${CARD_WIDTH_PX}px` }}
          >
            <BlogCardGrid blog={blog} />
          </div>
        ))}

        {/* Sentinel + loading state at the right edge. Drives the lazy load
            via IntersectionObserver. Hidden once the feed is exhausted. */}
        {!done && (
          <div
            ref={sentinelRef}
            className="snap-start shrink-0 flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40"
            style={{ width: `${CARD_WIDTH_PX / 2}px` }}
          >
            {loading ? (
              <span className="flex flex-col items-center gap-2 text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Loading
                </span>
              </span>
            ) : error ? (
              <button
                type="button"
                onClick={loadMore}
                className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 px-2 text-center"
              >
                {error}
                <br />
                Tap to retry
              </button>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted/60 text-center px-2 leading-tight">
                Scroll for more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Arrow controls — visible only when there's room to scroll in that
          direction. Sit just outside the card row so they don't cover content. */}
      <button
        type="button"
        onClick={() => nudge("left")}
        aria-label="Previous stories"
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full border border-border bg-surface/95 backdrop-blur shadow-lg items-center justify-center text-fg hover:bg-elevated transition-all hidden md:flex ${
          canLeft
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => nudge("right")}
        aria-label="Next stories"
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 rounded-full border border-border bg-surface/95 backdrop-blur shadow-lg items-center justify-center text-fg hover:bg-elevated transition-all hidden md:flex ${
          canRight
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
