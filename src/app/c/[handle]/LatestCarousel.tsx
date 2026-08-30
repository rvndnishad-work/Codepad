"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check, Lock, Zap } from "lucide-react";
import { SECTION_META, type SpaceCard } from "./space-cards";

const AUTOPLAY_MS = 5500;

/**
 * Auto-playing "Latest drops" carousel for the newest publications. Advances
 * every 5.5s with a visible progress bar; pauses on hover/focus and in
 * hidden tabs, and never autoplays under prefers-reduced-motion. Arrows +
 * dots give full manual control.
 */
export default function LatestCarousel({ items }: { items: SpaceCard[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  // Restarts the progress-bar animation even when index lands on the same
  // slide again (e.g. wrap-around on a 1-step loop).
  const [cycle, setCycle] = useState(0);

  const count = items.length;

  const goTo = (i: number) => {
    setIndex(((i % count) + count) % count);
    setCycle((c) => c + 1);
  };

  const step = (dir: 1 | -1) => {
    setIndex((i) => (((i + dir) % count) + count) % count);
    setCycle((c) => c + 1);
  };

  useEffect(() => {
    // Autoplay must be decided post-hydration (matchMedia is client-only and
    // the SSR markup renders static) — syncing from an external system.
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoplay(true);
  }, [count]);

  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % count);
      setCycle((c) => c + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [autoplay, paused, count]);

  if (count === 0) return null;

  return (
    <div
      className="group relative rounded-[1.5rem] border border-border bg-surface overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Latest drops"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Track */}
      <div
        className="flex transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)`, transitionDuration: "600ms" }}
      >
        {items.map((card, i) => (
          <Slide key={card.key} card={card} position={i + 1} total={count} active={i === index} />
        ))}
      </div>

      {/* Arrows (fade in on hover) */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => step(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-fg grid place-items-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:border-accent/50 transition-all z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => step(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-bg/80 backdrop-blur-sm border border-border/50 text-fg grid place-items-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:border-accent/50 transition-all z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
          {items.map((c, i) => (
            <button
              key={c.key}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index ? "w-5 h-1.5 bg-accent" : "w-1.5 h-1.5 bg-fg/25 hover:bg-fg/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Autoplay progress bar */}
      {autoplay && count > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/40 z-10" aria-hidden>
          <div
            key={cycle}
            className="h-full bg-accent/80 cs-progress"
            style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
          />
        </div>
      )}
    </div>
  );
}

function Slide({
  card,
  position,
  total,
  active,
}: {
  card: SpaceCard;
  position: number;
  total: number;
  active: boolean;
}) {
  const meta = SECTION_META[card.sectionKey];
  return (
    <div
      className="w-full shrink-0 grid grid-cols-1 md:grid-cols-5"
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-hidden={!active}
    >
      <Link
        href={card.href}
        tabIndex={active ? 0 : -1}
        className="md:col-span-2 relative block aspect-[16/10] md:aspect-auto md:min-h-[220px] bg-panel overflow-hidden group/slide"
      >
        {card.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.cover} alt="" className="w-full h-full object-cover group-hover/slide:scale-[1.03] transition-transform duration-700" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} grid place-items-center relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
            <meta.Icon className="w-12 h-12 text-white/90 drop-shadow-md" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:hidden" />
      </Link>
      <div className="md:col-span-3 p-5 md:p-7 pb-8 flex flex-col gap-4 bg-surface">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="relative inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-accent bg-accent/10 border border-accent/20 rounded-full pl-2.5 pr-3 py-1.5">
            <span className="relative flex w-1.5 h-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-accent" />
            </span>
            Latest drops
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
            <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
          </span>
          <span className="ml-auto text-[11px] font-bold tabular-nums text-muted/60 bg-panel border border-border rounded-full px-2 py-0.5">
            {position}/{total}
          </span>
        </div>
        <Link
          href={card.href}
          tabIndex={active ? 0 : -1}
          className="text-[20px] md:text-[22px] font-black tracking-tight leading-tight text-fg hover:text-accent transition-colors line-clamp-2"
        >
          {card.title}
        </Link>
        {card.summary && <p className="text-[14px] text-muted leading-relaxed line-clamp-2">{card.summary}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between gap-3 border-t border-border/40">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {card.chips.slice(0, 3).map((c) => (
              <span key={c} className="text-[11px] font-semibold tracking-wide text-muted bg-panel border border-border/50 rounded-full px-2.5 py-1">
                {c}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {card.unlocked ? (
              card.accessTierRank != null ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <Check className="w-3.5 h-3.5" /> Unlocked
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">Free</span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1.5">
                <Lock className="w-3 h-3" /> {card.tierName ?? "Members"}
              </span>
            )}
            <Link
              href={card.href}
              tabIndex={active ? 0 : -1}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FFD600] text-black text-xs font-black shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5" /> {card.unlocked ? "Open" : "Preview"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
