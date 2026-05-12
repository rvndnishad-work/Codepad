"use client";

import { useEffect, useState } from "react";

/**
 * Slim progress bar pinned to the top of the viewport that fills as the user
 * scrolls through the page. Gives a "you're 60% through this article" cue
 * without taking real estate.
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, (scrolled / max) * 100));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-0.5 z-[150] pointer-events-none"
    >
      <div
        className="h-full bg-accent transition-[width] duration-100 shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
