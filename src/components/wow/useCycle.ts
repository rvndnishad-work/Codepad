"use client";

import { useEffect, useState, type RefObject } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * Steps through `count` items every `ms` while `ref` is on screen and the
 * pointer is not resting on it. Returns -1 under reduced motion (and before
 * hydration), which callers render as the static, all-visible state.
 */
export function useCycle(ref: RefObject<HTMLElement | null>, count: number, ms: number): number {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el || count === 0 || prefersReducedMotion()) return;
    let visible = false;
    let hovered = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      if (!visible || hovered) return;
      timer = setInterval(() => setActive((a) => (a + 1) % count), ms);
    };
    const obs = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) setActive((a) => (a < 0 ? 0 : a));
        start();
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    const enter = () => { hovered = true; stop(); };
    const leave = () => { hovered = false; start(); };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      obs.disconnect();
      stop();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref, count, ms]);

  return active;
}

/** Types `text` out while `on` is true; shows it whole otherwise. */
export function useTyped(text: string, on: boolean, cps = 28): string {
  const [n, setN] = useState(text.length);
  useEffect(() => {
    if (!on) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(t);
    }, 1000 / cps);
    return () => clearInterval(t);
  }, [text, on, cps]);
  return text.slice(0, n);
}
