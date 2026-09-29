"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "./motion";

type Tag = "h1" | "h2" | "h3";

/**
 * A headline whose lines rise out of a mask one after another when it
 * scrolls into view: the same motion as the hero, for section titles.
 * Lines render visible on the server; the mask only arms after hydration,
 * and never under reduced motion.
 */
export default function RevealLines({
  as: As = "h2",
  lines,
  className,
  stagger = 90,
}: {
  as?: Tag;
  lines: ReactNode[];
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<"static" | "armed" | "in">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    setState("armed");
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("in");
          obs.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <As ref={ref} className={`wow-lines ${className ?? ""}`} data-state={state}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <span className="wow-line block" style={{ transitionDelay: `${i * stagger}ms` }}>
            {line}
          </span>
        </span>
      ))}
    </As>
  );
}
