"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

/**
 * Mouse-following accent glow that spans a row of cards. Wrap a card group
 * with <SpotlightGroup> and each card inside with <SpotlightCard>. As the
 * cursor moves over the group, every card receives a per-card cursor
 * position via CSS variables — so the gradient on each card renders at the
 * *real* cursor location, even when the cursor is over a neighbour. That's
 * what produces the "single light source illuminating multiple cards" feel
 * (Linear / Vercel / Stripe).
 *
 * Performance:
 *   - Single mousemove listener at the group level (not per-card).
 *   - Updates batched into one requestAnimationFrame per event.
 *   - Only CSS custom properties are written — no layout, no paint outside
 *     the gradient itself.
 */
export function SpotlightGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    // Respect reduced-motion users: skip the listener entirely so we don't
    // even pay the rAF cost. Cards stay in their resting (no-glow) state.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards = group.querySelectorAll<HTMLElement>("[data-spot]");
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
          card.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
        }
      });
    };

    group.addEventListener("mousemove", onMove);
    return () => {
      group.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={`group/spot ${className ?? ""}`}>
      {children}
    </div>
  );
}

/**
 * A single card in a SpotlightGroup. Renders a passive gradient overlay over
 * `children`. The gradient is anchored to the cursor position via the CSS
 * variables set by the parent group. Opacity fades in only while the group
 * is hovered.
 *
 * The wrapper itself is transparent — it adds no border or background of its
 * own — so it composes cleanly over any existing card design.
 */
export function SpotlightCard({
  children,
  className,
  radius = 380,
  intensity = 0.12,
}: {
  children: ReactNode;
  className?: string;
  /** Spread of the gradient circle in px. Larger = softer, broader glow. */
  radius?: number;
  /** Alpha of the gradient at its center (0 to 1). */
  intensity?: number;
}) {
  // Initial fallback position keeps the gradient hidden under the card center
  // before any mousemove fires, so the first paint isn't a flash at (0, 0).
  const initialVars = {
    "--spot-x": "50%",
    "--spot-y": "50%",
  } as CSSProperties;

  return (
    <div
      data-spot
      className={`relative isolate ${className ?? ""}`}
      style={initialVars}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(${radius}px circle at var(--spot-x) var(--spot-y), rgba(var(--accent-rgb), ${intensity}), transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}
