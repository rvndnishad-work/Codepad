"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { StoryCard } from "./StoryCards";
import type { BlogFeedEntry } from "@/components/BlogFeedItem";

const CARD_W = 320;
const GAP = 20;

/**
 * Lazy stories rail — same /api/blogs cursor contract as the old feed
 * (before + limit, excludeIds dedupe), reskinned as WOW cards with
 * glow arrows instead of square chrome.
 */
export default function StoriesRail({
  initialItems,
  initialCursor,
  excludeIds,
  batchSize = 6,
}: {
  initialItems: BlogFeedEntry[];
  initialCursor: string | null;
  excludeIds: string[];
  batchSize?: number;
}) {
  const [items, setItems] = useState<BlogFeedEntry[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialCursor === null);
  const [error, setError] = useState<string | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set([...excludeIds, ...initialItems.map((i) => i.id)]));

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
      const params = new URLSearchParams({ before: cursor, limit: String(batchSize) });
      const res = await fetch(`/api/blogs?${params}`);
      if (!res.ok) {
        setError("Couldn't load more.");
        return;
      }
      const batch = (await res.json()) as Array<{
        id: string; slug: string; title: string; excerpt: string | null;
        coverImage: string | null; viewCount: number; createdAt: string;
        content: string; tags: string | null;
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
          if (Array.isArray(parsed)) tagsArr = parsed.filter((t): t is string => typeof t === "string");
        } catch { /* ignore */ }
        fresh.push({
          id: b.id, slug: b.slug, title: b.title, excerpt: b.excerpt,
          coverImage: b.coverImage, viewCount: b.viewCount, createdAt: b.createdAt,
          readingMinutes: Math.max(1, Math.round(b.content.trim().split(/\s+/).length / 200)),
          tags: tagsArr, user: { name: b.user.name, image: b.user.image },
        });
      }
      if (fresh.length > 0) setItems((prev) => [...prev, ...fresh]);
      setCursor(batch[batch.length - 1].createdAt);
      if (batch.length < batchSize) setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, batchSize]);

  useEffect(() => {
    if (done) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) void loadMore(); },
      { root: scrollRef.current, rootMargin: `0px ${CARD_W}px 0px 0px`, threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore, done]);

  function nudge(direction: "left" | "right") {
    scrollRef.current?.scrollBy({ left: direction === "right" ? CARD_W + GAP : -(CARD_W + GAP), behavior: "smooth" });
  }

  if (items.length === 0) return null;

  const arrow = "hidden md:grid h-11 w-11 place-items-center rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] text-[var(--wow-fg)] backdrop-blur transition hover:border-[#8b93ff] hover:shadow-[0_0_24px_-6px_#8b93ff]";

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: "x proximity" }}>
        {items.map((blog, i) => (
          <div key={blog.id} className="shrink-0" style={{ width: `${CARD_W}px`, scrollSnapAlign: "start" }}>
            <StoryCard blog={blog} index={i} />
          </div>
        ))}
        {!done && (
          <div ref={sentinelRef} className="grid shrink-0 place-items-center rounded-3xl border-2 border-dashed border-[var(--wow-card-border)]" style={{ width: `${CARD_W / 2}px` }}>
            {loading ? (
              <span className="flex flex-col items-center gap-2 text-[var(--wow-faint)]">
                <Loader2 className="h-5 w-5 animate-spin text-[#8b93ff]" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Loading</span>
              </span>
            ) : error ? (
              <button type="button" onClick={loadMore} className="px-2 text-center font-mono text-[11px] uppercase tracking-widest text-rose-400">
                {error}<br />Tap to retry
              </button>
            ) : (
              <span className="px-2 text-center font-mono text-[10px] uppercase leading-tight tracking-widest text-[var(--wow-faint)]">Scroll<br />for more</span>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={() => nudge("left")} aria-label="Previous stories"
        className={`${arrow} absolute -left-5 top-[38%] ${canLeft ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => nudge("right")} aria-label="Next stories"
        className={`${arrow} absolute -right-5 top-[38%] ${canRight ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
