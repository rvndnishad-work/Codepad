"use client";

import { useEffect, useState } from "react";

export type NavSection = { id: string; label: string; count?: number };

/**
 * Sticky pill navigation for the public space page. Scroll-spies the section
 * anchors with a plain scroll listener + rect math (an IntersectionObserver
 * misses fast/jump scrolls and stalls entirely in throttled/occluded tabs).
 * Sits just below the site header (top-16) with a backdrop-blur bar.
 */
export default function SpaceSectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    // The active section is the last one whose top has crossed the spy line
    // (a bit below the sticky bar). Deterministic under any scroll pattern.
    const SPY_LINE = 180;
    let raf = 0;

    const compute = () => {
      raf = 0;
      let current: string | null = null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        // Sections inside the lg sticky sidebar hover near the top of the
        // viewport permanently — they'd always win "last crossed". Skip any
        // target that is itself stuck (desktop); on mobile the sidebar
        // stacks statically and these spy normally.
        if (getComputedStyle(el.parentElement ?? el).position === "sticky") continue;
        if (el.getBoundingClientRect().top <= SPY_LINE) current = s.id;
      }
      setActive(current ?? sections[0]?.id ?? null);
    };

    const onScroll = () => {
      if (raf) return;
      // rAF-throttled with a timeout fallback for non-painting contexts.
      raf = requestAnimationFrame(compute);
      window.setTimeout(() => {
        if (raf) {
          cancelAnimationFrame(raf);
          compute();
        }
      }, 120);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <div className="sticky top-16 z-30 mt-6 py-2.5 bg-bg/75 backdrop-blur-md border-b border-border/40">
      <nav
        className="max-w-6xl mx-auto px-4 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Page sections"
      >
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
                isActive
                  ? "bg-accent text-bg shadow-soft"
                  : "text-muted hover:text-fg hover:bg-panel/60 border border-transparent hover:border-border"
              }`}
            >
              {s.label}
              {s.count !== undefined && (
                <span
                  className={`text-[9px] font-black tabular-nums rounded-full px-1.5 py-px ${
                    isActive ? "bg-bg/20 text-bg" : "bg-panel/80 text-muted"
                  }`}
                >
                  {s.count}
                </span>
              )}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
