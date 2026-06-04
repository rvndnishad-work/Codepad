"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim top-of-page navigation progress bar (GitHub/YouTube style).
 *
 * Why this instead of a route-level `loading.tsx` skeleton: the cookie-reading
 * root layout forces every route to render dynamically, so the App Router can't
 * prefetch page bodies — a click blocks on the server render with no feedback,
 * which is the "laggy" feel. A `loading.tsx` would blank the entire content
 * area while the page streams; this instead overlays a 2px accent bar at the
 * very top and keeps the current page on screen, reading as "working…" without
 * a jarring full-page swap.
 *
 * The App Router doesn't expose router events, so we start the bar on
 * internal-link clicks (capture phase, before Next's own handler) and finish it
 * when the resolved pathname/search actually change.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(false);
  const trickleRef = useRef<number | null>(null);
  const doneRef = useRef<number | null>(null);
  const firstRender = useRef(true);

  const clearTimers = () => {
    if (trickleRef.current !== null) window.clearInterval(trickleRef.current);
    if (doneRef.current !== null) window.clearTimeout(doneRef.current);
    trickleRef.current = null;
    doneRef.current = null;
  };

  const start = () => {
    clearTimers();
    setActive(true);
    setWidth(8);
    // Trickle toward ~90% and stall there until the route resolves, so a slow
    // server render still shows continuous forward motion.
    trickleRef.current = window.setInterval(() => {
      setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w));
    }, 200);
  };

  const finish = () => {
    clearTimers();
    setWidth(100);
    doneRef.current = window.setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 250);
  };

  // Finish whenever the route resolves. Skip the very first mount so an initial
  // page load doesn't flash the bar.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Start on qualifying internal-link clicks.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      // Ignore new-tab / modified / non-primary clicks — those don't navigate
      // this document.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || (target && target !== "_self")) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      let dest: URL;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return; // external
      // Same URL → no navigation, so no progress.
      if (
        dest.pathname === window.location.pathname &&
        dest.search === window.location.search
      ) {
        return;
      }
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Clean up timers if the component unmounts mid-navigation.
  useEffect(() => () => clearTimers(), []);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[200] h-0.5 pointer-events-none"
    >
      <div
        className="h-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
