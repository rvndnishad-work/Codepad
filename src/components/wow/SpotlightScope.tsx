"use client";

import { useEffect } from "react";

/**
 * One pointer listener for the page: any element marked `data-spotlight`
 * gets --mx/--my set to the pointer position inside it, which the
 * `[data-spotlight]` rule in wow.css turns into a soft glow that follows
 * the cursor. Touch input has no hover, so it is ignored.
 */
export default function SpotlightScope() {
  useEffect(() => {
    let last: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest?.("[data-spotlight]") as HTMLElement | null;
      if (last && last !== el) last.removeAttribute("data-spot-on");
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      el.setAttribute("data-spot-on", "");
    };
    const onLeave = () => {
      last?.removeAttribute("data-spot-on");
      last = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
