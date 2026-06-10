"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/**
 * Lazy mount harness for the homepage Three.js scenes.
 *
 * Guardrails (the scenes must never tax users who don't benefit from them):
 *   - the R3F chunk is dynamically imported with ssr:false, so three.js is
 *     never in the initial bundle and never blocks LCP;
 *   - a scene mounts only when its container scrolls near the viewport and
 *     unmounts again when scrolled far away (no off-screen GPU work);
 *   - `prefers-reduced-motion` and small screens get the static `poster`
 *     instead — the poster also serves as the loading state, so there is
 *     no layout shift when the canvas appears.
 */
const SCENES = {
  pipeline: dynamic(() => import("./scenes/PipelineScene"), { ssr: false, loading: () => null }),
  funnel: dynamic(() => import("./scenes/FunnelScene"), { ssr: false, loading: () => null }),
} as const;

export type SceneName = keyof typeof SCENES;

const ELIGIBLE_QUERIES = ["(prefers-reduced-motion: reduce)", "(max-width: 767px)"];

function subscribeEligibility(onChange: () => void): () => void {
  const lists = ELIGIBLE_QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function readEligibility(): boolean {
  return ELIGIBLE_QUERIES.every((q) => !window.matchMedia(q).matches);
}

export default function Lazy3D({
  scene,
  poster,
  className,
}: {
  scene: SceneName;
  /** Static fallback — shown until the canvas mounts, and permanently for reduced-motion / small screens. */
  poster: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  // SSR snapshot is false → the server always renders the poster; the canvas
  // is a purely client-side upgrade.
  const eligible = useSyncExternalStore(subscribeEligibility, readEligibility, () => false);

  useEffect(() => {
    if (!eligible || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      // Generous margin: start loading the chunk before the user arrives,
      // release the canvas once they're well past it.
      { rootMargin: "600px 0px 600px 0px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [eligible]);

  const Scene = SCENES[scene];
  const showScene = eligible && near;

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      {/* Poster sits underneath; the canvas fades in over it when ready. */}
      <div aria-hidden className="absolute inset-0">{poster}</div>
      {showScene && (
        <div className="absolute inset-0">
          <Scene />
        </div>
      )}
    </div>
  );
}
