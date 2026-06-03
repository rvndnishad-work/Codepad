"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Lightweight vertical resize hook — returns a drag handle's onMouseDown / onTouchStart
 * that adjusts a height (in px) by watching pointer movement.
 * Since the Console is placed at the bottom, dragging UP decreases clientY (negative dy)
 * but should INCREASE console height. So: height = startH - dy.
 */
export function useResizableHeight(initialHeight: number, minHeight = 80, maxHeight = 800) {
  const [height, setHeight] = useState(initialHeight);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startH.current = height;

      const onPointerMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const dy = ev.clientY - startY.current;
        setHeight(Math.min(maxHeight, Math.max(minHeight, startH.current - dy)));
      };

      const onPointerUp = () => {
        dragging.current = false;
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
