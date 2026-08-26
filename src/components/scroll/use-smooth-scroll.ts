"use client";

import { useScroll, useSpring, useTransform, type MotionValue, type UseScrollOptions } from "framer-motion";
import { SPRING_CINEMATIC } from "./motion-config";

export interface SmoothScrollReturn {
  /** Raw 0..1 scroll progress from Framer Motion. */
  rawProgress: MotionValue<number>;
  /** Inertial, spring-dampened 0..1 scroll progress. */
  smoothProgress: MotionValue<number>;
  /** Spring-dampened velocity signal. */
  scrollY: MotionValue<number>;
}

/**
 * Custom hook delivering Apple-grade momentum-smoothed scroll progress.
 *
 * @param options Framer Motion useScroll options (target ref, offset, etc.)
 * @param springConfig Custom spring physics or defaults to SPRING_CINEMATIC
 */
export function useSmoothScroll(
  options?: UseScrollOptions,
  springConfig = SPRING_CINEMATIC
): SmoothScrollReturn {
  const { scrollYProgress, scrollY } = useScroll(options);

  const smoothProgress = useSpring(scrollYProgress, springConfig);

  return {
    rawProgress: scrollYProgress,
    smoothProgress,
    scrollY,
  };
}
