"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";

/**
 * Shared drag-rail chrome: the visible rail stays 6px, but an invisible
 * ~22px grab zone surrounds it (the `before:` hit area) so trackpads and
 * imprecise pointers can catch the handle. Includes a focus ring for
 * keyboard users — pair with `tabIndex={0}` + `onResizeKey`.
 */
export const RESIZE_RAIL_X =
  "relative before:absolute before:inset-y-0 before:-inset-x-2 before:content-[''] focus-visible:bg-accent/70 focus-visible:outline-none";
export const RESIZE_RAIL_Y =
  "relative before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] focus-visible:bg-accent/70 focus-visible:outline-none";

/** Arrow-key stepping for a separator handle (Left/Right or Up/Down). */
export function onResizeKey(e: KeyboardEvent, nudge: (dir: 1 | -1) => void) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault();
  nudge(e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1);
}

/**
 * Lightweight resize hook — returns a drag handle's onMouseDown / onTouchStart
 * that adjusts a width (in px) by watching pointer movement.
 *
 * Pass `invert: true` for panels anchored to the RIGHT of their drag handle
 * (dragging left should then grow the panel instead of shrinking it).
 */
export function useResizable(initialWidth: number, minWidth = 80, maxWidth = 600, invert = false) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  // Coalesce high-frequency trackpad streams to one update per frame.
  const raf = useRef(0);
  const pending = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;

      const apply = () => {
        if (pending.current === null) return;
        setWidth(Math.min(maxWidth, Math.max(minWidth, startW.current + pending.current)));
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - startX.current;
        pending.current = invert ? -dx : dx;
        if (!raf.current) {
          raf.current = requestAnimationFrame(() => {
            raf.current = 0;
            apply();
          });
        }
      };

      const onPointerUp = () => {
        dragging.current = false;
        if (raf.current) {
          cancelAnimationFrame(raf.current);
          raf.current = 0;
        }
        // Flush the last pointer position so the panel lands exactly where it
        // was released instead of one (cancelled) frame short.
        apply();
        pending.current = null;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        // Remove the overlay that blocks iframe pointer events
        const overlay = document.getElementById("resize-overlay");
        overlay?.remove();
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      // Add an overlay that blocks iframe pointer events during drag
      const overlay = document.createElement("div");
      overlay.id = "resize-overlay";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:9999;cursor:col-resize;";
      document.body.appendChild(overlay);
    },
    [width, minWidth, maxWidth, invert]
  );

  return { width, onPointerDown, setWidth };
}
