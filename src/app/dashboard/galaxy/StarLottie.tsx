"use client";

import React, { Suspense, lazy } from "react";
import { STAR_LOTTIE } from "./sparkleAnimation";

/**
 * Lottie sparkle, loaded lazily: lottie-web touches canvas at import time,
 * which neither SSR nor jsdom provides — so the player code-splits into its
 * own chunk and any load/render failure swaps in a pure-CSS twinkling star.
 * The hero never goes dark in any environment.
 */

// lottie-react v3 has no default export; adapt the named `Lottie` for lazy().
const LottiePlayer = lazy(() =>
  import("lottie-react").then((m) => ({ default: m.Lottie }))
);

export function SparkleFallback({ size = 120 }: { size?: number }) {
  return (
    <div
      aria-hidden
      data-testid="gx-star-fallback"
      className="gx-twinkle mx-auto"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle, #fff7e0 0%, #ffd166 28%, rgba(255,47,179,0.55) 55%, transparent 72%)",
        clipPath:
          "polygon(50% 0%, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0% 50%, 42% 42%)",
      }}
    />
  );
}

type BoundaryProps = { fallback: React.ReactNode; children: React.ReactNode };
type BoundaryState = { failed: boolean };

class PlayerBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* fallback already rendered — nothing to report */
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function StarLottie({ size = 120 }: { size?: number }) {
  const fallback = <SparkleFallback size={size} />;
  return (
    <div style={{ width: size, height: size }} className="mx-auto">
      <PlayerBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          {/* lottie-react v3 takes `src` (object or URL) — no network fetch involved. */}
          <LottiePlayer src={STAR_LOTTIE as never} loop autoplay />
        </Suspense>
      </PlayerBoundary>
    </div>
  );
}
