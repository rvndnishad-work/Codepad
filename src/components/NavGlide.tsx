"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Wraps the primary nav so one shared highlight glides between the items
 * under the pointer, instead of each item flashing its own background.
 * Items opt in with the `nav-pill` class; the highlight hides when the
 * pointer leaves the nav. Reduced motion drops the glide (see globals.css).
 */
export default function NavGlide({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });

  const onOver = (e: React.PointerEvent) => {
    const pill = (e.target as Element).closest(".nav-pill") as HTMLElement | null;
    if (!pill || !wrap.current) return;
    const a = wrap.current.getBoundingClientRect();
    const b = pill.getBoundingClientRect();
    setBox({ x: b.left - a.left, w: b.width, on: true });
  };

  return (
    <div ref={wrap} className="relative flex items-center gap-1" onPointerOver={onOver} onPointerLeave={() => setBox((b) => ({ ...b, on: false }))}>
      <span
        aria-hidden
        className="nav-glide pointer-events-none absolute top-1/2 h-9 -translate-y-1/2 rounded-full"
        style={{ transform: `translate(${box.x}px, -50%)`, width: box.w, opacity: box.on ? 1 : 0 }}
      />
      {children}
    </div>
  );
}
