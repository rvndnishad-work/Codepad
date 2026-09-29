"use client";

import { useEffect, useState } from "react";

/**
 * The id of the section being read: the last one whose top has passed the
 * line `offset` pixels below the viewport top. Recomputed on scroll and resize.
 */
export function useActiveSection(ids: string[], offset: number): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join("|");

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current: string | null = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 1) current = id;
      }
      // At the very bottom the last section is the one being read.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = ids[ids.length - 1] ?? current;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, offset]);

  return active;
}

/** Smooth-scrolls to a section, or jumps under reduced motion. */
export function scrollToSection(id: string, offset: number) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = el.getBoundingClientRect().top + window.scrollY - offset + 8;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  history.replaceState(null, "", `#${id}`);
}
