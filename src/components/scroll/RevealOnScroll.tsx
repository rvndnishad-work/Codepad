"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode } from "react";
import {
  EASE_EXPO_OUT,
  REVEAL_DISTANCE,
  REVEAL_DURATION,
} from "./motion-config";

/**
 * Single shared fade-up reveal. Wrap a section, a card group, or a heading
 * cluster — anything that should rise into place once when entering the
 * viewport.
 *
 * For groups of sibling elements that should stagger, set `stagger` and wrap
 * each child in <RevealItem>. Without children-stagger, the wrapped block
 * animates as one unit.
 */
export default function RevealOnScroll({
  children,
  className,
  delay = 0,
  distance = REVEAL_DISTANCE,
  duration = REVEAL_DURATION,
  stagger,
  amount = 0.2,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  /** Initial delay before the reveal starts (seconds). */
  delay?: number;
  /** Travel distance in px. Use 0 for a pure fade. */
  distance?: number;
  duration?: number;
  /** Child stagger in seconds — if set, the wrapper treats children as a group. */
  stagger?: number;
  /** Intersection ratio that triggers the reveal. */
  amount?: number;
  /** Replay every time it re-enters viewport? Default `true` (play once). */
  once?: boolean;
}) {
  const reduced = useReducedMotion();

  // With reduced motion, render children inline — no transforms, no opacity
  // tween, no observer. Layout matches the animated path exactly because we
  // never touched layout-affecting props.
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const variants: Variants = stagger
    ? {
        hidden: {},
        show: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }
    : {
        hidden: { opacity: 0, y: distance },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            delay,
            ease: EASE_EXPO_OUT as unknown as [number, number, number, number],
          },
        },
      };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

/**
 * Use inside a <RevealOnScroll stagger={...}> to animate group children
 * with the shared rhythm.
 *
 * Exported as a named component (not attached as a static property on
 * RevealOnScroll) so that Server Components importing this module can use
 * it — static properties don't survive Next.js's client-reference proxy
 * when crossing the server→client boundary.
 */
export function RevealItem({
  children,
  className,
  distance = REVEAL_DISTANCE,
  duration = REVEAL_DURATION,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const variants: Variants = {
    hidden: { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: EASE_EXPO_OUT as unknown as [number, number, number, number] },
    },
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

