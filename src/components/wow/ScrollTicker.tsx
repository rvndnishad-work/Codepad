"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * While the page scrolls, hero scenes drop from a free-running loop to
 * frameloop="demand" and this ticker renders them at a capped rate. Motion
 * keeps going (a frozen loop read as "the planet stopped"), the canvas is
 * redrawn after any scroll-time resize (a frozen loop left it blank, e.g.
 * when a phone URL bar collapses), and the GPU still yields most of each
 * frame to the scroll compositor on laptop iGPUs.
 */
export function ScrollTicker({ active, fps = 30 }: { active: boolean; fps?: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    invalidate();
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [active, fps, invalidate]);
  return null;
}

/** Canvas frameloop for a hero scene: offscreen → never, scrolling → demand. */
export function heroFrameloop(paused: boolean, scrolling: boolean): "never" | "demand" | "always" {
  return paused ? "never" : scrolling ? "demand" : "always";
}
