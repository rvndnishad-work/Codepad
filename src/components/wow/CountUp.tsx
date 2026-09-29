"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

/** Splits "1,000", "1.2k+", "~4%" or "75 hrs" into prefix, number and suffix. */
export function parseStat(value: string): { prefix: string; n: number; decimals: number; comma: boolean; suffix: string } | null {
  const m = value.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return { prefix: m[1], n, decimals, comma: raw.includes(","), suffix: m[3] };
}

function format(n: number, decimals: number, comma: boolean): string {
  const fixed = n.toFixed(decimals);
  if (!comma) return fixed;
  const [int, frac] = fixed.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? `.${frac}` : "");
}

/**
 * A stat that counts up from zero the first time it scrolls into view. The
 * server renders the final value, so the number is right without JS and for
 * crawlers; reduced motion keeps it there.
 */
export default function CountUp({ value, duration = 1400, className }: { value: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const parsed = parseStat(value);
    setText(value);
    if (!el || !parsed || parsed.n === 0 || prefersReducedMotion()) return;
    let raf = 0;
    let done = false;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        setText(parsed.prefix + format(parsed.n * eased, parsed.decimals, parsed.comma) + parsed.suffix);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    // Park at zero until the number is on screen.
    setText(parsed.prefix + format(0, parsed.decimals, parsed.comma) + parsed.suffix);
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !done) {
          done = true;
          obs.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
