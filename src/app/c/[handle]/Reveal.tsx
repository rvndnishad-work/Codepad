"use client";

import { useEffect, useRef } from "react";

/**
 * Fade-up scroll reveal. SSR renders children fully visible (SEO / no-JS
 * safe); after hydration, elements still below the fold get `.cs-reveal`
 * and transition in via `.cs-in` when they enter the viewport.
 *
 * Robustness notes:
 * - The observer's huge top rootMargin means "at or above the viewport"
 *   counts as intersecting, so elements jumped past (anchor links, fast
 *   scrolls) still transition false→true and get revealed.
 * - A failsafe timer force-reveals if the observer never fires (throttled
 *   or occluded tabs deliver no IntersectionObserver callbacks at all) —
 *   content must never stay hidden.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at mount → leave it visible, no animation.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.classList.add("cs-reveal");
    const show = () => {
      el.classList.add("cs-in");
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          window.setTimeout(show, delay);
        }
      },
      { rootMargin: "10000px 0px -8% 0px" },
    );
    observer.observe(el);
    const failsafe = window.setTimeout(show, 4000);
    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
