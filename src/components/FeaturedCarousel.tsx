"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import SafeImage from "./SafeImage";
import RelativeTime from "./RelativeTime";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  User,
  BookOpen,
  Eye,
} from "lucide-react";
import type { BlogFeedEntry } from "./BlogFeedItem";

interface FeaturedCarouselProps {
  items: BlogFeedEntry[];
}

/**
 * Horizontal carousel of admin-pinned (featured=true) blog posts. One large
 * card visible at a time on mobile, two on desktop. Scroll-snap + arrow
 * buttons + dot indicators. If nothing is pinned, the component renders
 * nothing (the page falls straight through to the stories list).
 */
export default function FeaturedCarousel({ items }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const updateState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);

    // Figure out which slide is most visible.
    const slides = Array.from(el.children) as HTMLElement[];
    let bestIndex = 0;
    let bestDistance = Infinity;
    const center = el.scrollLeft + el.clientWidth / 2;
    slides.forEach((s, i) => {
      const slideCenter = s.offsetLeft + s.offsetWidth / 2;
      const d = Math.abs(slideCenter - center);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    });
    setActiveIndex(bestIndex);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateState();
    el.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    return () => {
      el.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [updateState]);

  useEffect(() => {
    if (items.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % items.length;
      jumpTo(nextIndex);
    }, 5000); // 5s autoplay delay

    return () => clearInterval(timer);
  }, [items.length, activeIndex, isHovered]);

  function nudge(direction: "left" | "right") {
    const nextIndex = direction === "right" ? activeIndex + 1 : activeIndex - 1;
    if (nextIndex >= 0 && nextIndex < items.length) {
      jumpTo(nextIndex);
    }
  }

  function jumpTo(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.children[index] as HTMLElement | undefined;
    if (target) {
      el.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
    }
  }

  if (items.length === 0) return null;

  return (
    <section
      className="mb-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-accent">
          <Star className="w-3 h-3 fill-current" />
          Featured stories
        </div>
        {items.length > 1 && (
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => nudge("left")}
              disabled={!canLeft}
              aria-label="Previous featured story"
              className="w-9 h-9 rounded-full border border-border bg-surface flex items-center justify-center text-fg hover:bg-elevated transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => nudge("right")}
              disabled={!canRight}
              aria-label="Next featured story"
              className="w-9 h-9 rounded-full border border-border bg-surface flex items-center justify-center text-fg hover:bg-elevated transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-2 -mb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((blog) => (
          <Link
            key={blog.id}
            href={`/blog/${blog.slug}`}
            className="group snap-start shrink-0 w-full rounded-2xl border border-border bg-surface hover:border-accent/30 transition-colors overflow-hidden flex flex-col md:flex-row"
          >
            {blog.coverImage ? (
              <div className="relative w-full aspect-[16/10] md:w-[50%] lg:w-[55%] md:aspect-auto shrink-0 overflow-hidden bg-panel md:border-r border-border">
                <SafeImage
                  src={blog.coverImage}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 55vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  priority
                />
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-bg/85 backdrop-blur border border-border text-[10px] font-black uppercase tracking-[0.16em] text-accent">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Featured
                </span>
              </div>
            ) : (
              <div className="w-full aspect-[16/10] md:w-[50%] lg:w-[55%] md:aspect-auto shrink-0 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border-b md:border-b-0 md:border-r border-border flex items-center justify-center min-h-[220px]">
                <Star className="w-12 h-12 text-accent/30 fill-current" />
              </div>
            )}

            <div className="p-5 md:p-8 lg:p-10 flex flex-col gap-4 flex-1 justify-between">
              <div className="flex flex-col gap-3">
                {blog.tags && blog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {blog.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.14em] bg-accent/10 border border-accent/20 text-accent"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <h3 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-fg leading-[1.2] tracking-tight group-hover:text-accent transition-colors line-clamp-2 md:line-clamp-3">
                  {blog.title}
                </h3>

                {blog.excerpt && (
                  <p className="text-sm text-muted line-clamp-3 md:line-clamp-4 leading-relaxed">
                    {blog.excerpt}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border/50 text-[12px]">
                <span className="relative w-7 h-7 rounded-full bg-panel overflow-hidden border border-border shrink-0">
                  {blog.user.image ? (
                    <SafeImage
                      src={blog.user.image}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="w-full h-full bg-accent/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-accent/70" />
                    </span>
                  )}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-fg/80 truncate max-w-[140px]">
                    {blog.user.name ?? "Anonymous"}
                  </span>
                  <span className="text-[10px] text-muted">
                    <RelativeTime iso={blog.createdAt} />
                  </span>
                </div>
                <span className="ml-auto flex items-center gap-4 text-muted">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {blog.readingMinutes} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span className="tabular-nums">{blog.viewCount} views</span>
                  </span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Featured story ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? "w-6 bg-accent"
                  : "w-1.5 bg-border hover:bg-muted/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
