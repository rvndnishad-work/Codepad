"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import RelativeTime from "@/components/RelativeTime";
import { ChevronLeft, ChevronRight, Star, BookOpen, Eye } from "lucide-react";
import type { BlogFeedEntry } from "@/components/BlogFeedItem";

/**
 * Pinned-stories cinema rail: full-bleed image cards with overlay type,
 * autoplay (pauses on hover), glow arrows and a progress bar.
 */
export default function PinnedRail({ items }: { items: BlogFeedEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [hovered, setHovered] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    const slides = Array.from(el.children) as HTMLElement[];
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0, bestD = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - center);
      if (d < bestD) { bestD = d; best = i; }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const jumpTo = useCallback((index: number) => {
    const el = scrollRef.current;
    const target = el?.children[index] as HTMLElement | undefined;
    target && el!.scrollTo({ left: target.offsetLeft - 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (items.length <= 1 || hovered) return;
    const t = setInterval(() => jumpTo((active + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length, active, hovered, jumpTo]);

  if (items.length === 0) return null;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#ffe600]">
          <Star className="h-3.5 w-3.5 fill-current" /> Pinned by the editors
        </p>
        {items.length > 1 && (
          <div className="hidden items-center gap-2 md:flex">
            {[
              { dir: "left" as const, Icon: ChevronLeft, ok: canLeft, label: "Previous pinned story" },
              { dir: "right" as const, Icon: ChevronRight, ok: canRight, label: "Next pinned story" },
            ].map(({ dir, Icon, ok, label }) => (
              <button
                key={dir}
                type="button"
                onClick={() => jumpTo(active + (dir === "right" ? 1 : -1))}
                disabled={!ok}
                aria-label={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] text-[var(--wow-fg)] transition hover:border-[#ffe600] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((blog) => (
          <Link
            key={blog.id}
            href={`/blog/${blog.slug}`}
            style={{ scrollSnapAlign: "start" }}
            className="group relative block h-[400px] w-[88%] shrink-0 overflow-hidden rounded-3xl border border-[var(--wow-card-border)] md:h-[430px] md:w-[72%]"
          >
            {blog.coverImage ? (
              <SafeImage
                src={blog.coverImage}
                alt=""
                fill
                sizes="(min-width: 1024px) 70vw, 88vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                unoptimized={blog.coverImage.startsWith("data:")}
              />
            ) : (
              <span aria-hidden className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8b93ff] via-[#b537f2] to-[#ff2fb3]">
                <Star className="h-16 w-16 fill-white/25 text-white/25" />
              </span>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 block p-6 md:p-8">
              <span className="flex flex-wrap gap-1.5">
                {(blog.tags ?? []).slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full border border-white/25 bg-black/45 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">#{t}</span>
                ))}
              </span>
              <span className="wow-font-display mt-3 block text-2xl leading-[0.95] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] md:text-4xl line-clamp-3">
                {blog.title}
              </span>
              <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-white/75">
                <span className="font-sans text-[12px] font-semibold text-white">{blog.user.name ?? "Anonymous"}</span>
                <RelativeTime iso={blog.createdAt} />
                <span className="flex items-center gap-1 tabular-nums"><BookOpen className="h-3 w-3" />{blog.readingMinutes}m</span>
                <span className="flex items-center gap-1 tabular-nums"><Eye className="h-3 w-3" />{blog.viewCount.toLocaleString()}</span>
              </span>
            </span>
          </Link>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--wow-card-border)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ffe600] via-[#ff2fb3] to-[#8b93ff] transition-all duration-500"
            style={{ width: `${100 / items.length}%`, marginLeft: `${(active * 100) / items.length}%` }}
          />
        </div>
      )}
    </div>
  );
}
