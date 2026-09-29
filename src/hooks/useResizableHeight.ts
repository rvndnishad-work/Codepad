"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight vertical resize hook — returns a drag handle's onMouseDown / onTouchStart
 * that adjusts a height (in px) by watching pointer movement.
 * Since the Console is placed at the bottom, dragging UP decreases clientY (negative dy)
 * but should INCREASE console height. So: height = startH - dy.
 */
export function useResizableHeight(
  initialHeight: number,
  minHeight = 80,
  maxHeight = 800,
  /** When set, the height persists across sessions under this localStorage key. */
  storageKey?: string,
) {
  const [height, setHeight] = useState(initialHeight);
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return;
      const n = Number(raw);
      if (Number.isFinite(n)) setHeight(Math.min(maxHeight, Math.max(minHeight, n)));
    } catch {
      /* private mode — run with defaults */
    }
  }, [storageKey, minHeight, maxHeight]);
  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, String(height));
    } catch {
      /* ignore */
    }
  }, [height, storageKey]);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  // Coalesce high-frequency trackpad streams to one update per frame.
  const raf = useRef(0);
  const pending = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startH.current = height;

      const apply = () => {
        if (pending.current === null) return;
        setHeight(Math.min(maxHeight, Math.max(minHeight, startH.current - pending.current)));
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        pending.current = ev.clientY - startY.current;
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
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        // Remove the overlay that blocks iframe pointer events
        const overlay = document.getElementById("resize-overlay-h");
        overlay?.remove();
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      // Add an overlay that blocks iframe pointer events during drag
      const overlay = document.createElement("div");
      overlay.id = "resize-overlay-h";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:9999;cursor:row-resize;";
      document.body.appendChild(overlay);
    },
    [height, minHeight, maxHeight]
  );

  return { height, onPointerDown, setHeight };
}
