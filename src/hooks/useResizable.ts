"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Lightweight resize hook — returns a drag handle's onMouseDown / onTouchStart
 * that adjusts a width (in px) by watching pointer movement.
 */
export function useResizable(initialWidth: number, minWidth = 80, maxWidth = 600) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;

      const onPointerMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - startX.current;
        setWidth(Math.min(maxWidth, Math.max(minWidth, startW.current + dx)));
      };

      const onPointerUp = () => {
        dragging.current = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        // Remove the overlay that blocks iframe pointer events
        const overlay = document.getElementById("resize-overlay");
        overlay?.remove();
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      // Add an overlay that blocks iframe pointer events during drag
      const overlay = document.createElement("div");
      overlay.id = "resize-overlay";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:9999;cursor:col-resize;";
      document.body.appendChild(overlay);
    },
    [width, minWidth, maxWidth]
  );

  return { width, onPointerDown, setWidth };
}
