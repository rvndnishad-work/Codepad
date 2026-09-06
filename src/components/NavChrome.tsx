"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * DARK-HERO CONTRACT (automatic — no per-page requests needed):
 * any route rendering a `[data-dark-hero]` section gets the transparent
 * floating bar with white content at top. Just add the attribute to a dark
 * (both-themes) hero when redesigning a page — nothing else to update.
 * The pathname lists below are only a fast path so known routes paint
 * correctly on the very first render; runtime detection covers everything.
 */
const IMMERSIVE_EXACT = ["/", "/hire", "/playgrounds"];
const IMMERSIVE_PREFIX = ["/interview-question/"];

function isImmersive(pathname: string | null): boolean {
  if (!pathname) return false;
  if (IMMERSIVE_EXACT.includes(pathname)) return true;
  return IMMERSIVE_PREFIX.some((p) => pathname.startsWith(p));
}

/**
 * Scroll-aware navbar chrome, same on every route (like the homepage):
 * at the top the bar is full-width/stretched; past ~24px it condenses
 * into the opaque glass pill. Pages too short to scroll simply stay
 * stretched. `data-immersive` marks the dark-hero routes (home, hire,
 * playgrounds, any page with a `[data-dark-hero]` section) where the
 * stretched state floats transparent with white content; elsewhere the
 * stretched state keeps themed content so light pages stay readable.
 * Starts scrolled (pill) to avoid a flash of the wrong state during hydration.
 */
export default function NavChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Runtime-detected dark hero (set after mount / on every navigation —
  // the page DOM is fully committed before effects run, so the query is safe).
  const [hasDarkHero, setHasDarkHero] = useState(false);
  const immersive = isImmersive(pathname) || hasDarkHero;
  const [scrolled, setScrolled] = useState(true);

  useEffect(() => {
    setHasDarkHero(!!document.querySelector("[data-dark-hero]"));
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <header data-scrolled={scrolled} data-immersive={immersive} className="site-nav sticky top-0 z-[100] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300">
      <div
        aria-hidden
        className="nav-hairline pointer-events-none absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-[#8b93ff]/60 to-transparent transition-opacity duration-300"
      />
      {children}
    </header>
  );
}
