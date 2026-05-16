"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useReducedMotion, animate } from "framer-motion";

/**
 * Animated number ticker. Counts up from 0 to `value` over `duration` seconds
 * the first time the element scrolls into view. Suffix/prefix are rendered
 * around the animated number so they stay perfectly aligned.
 *
 * Example:
 *   <CountUp value={40} suffix="+" />
 *   <CountUp value={12} suffix="h+" />
 */
export default function CountUp({
  value,
  duration = 1.4,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced, motionValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
