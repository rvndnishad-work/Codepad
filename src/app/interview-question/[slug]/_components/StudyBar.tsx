"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { scrollToSection, useActiveSection } from "./useActiveSection";
import { STICKY_OFFSET, type NavQuestion, type StudySection, type TrackPosition } from "./types";

/** Where the bar sticks: just under the floating nav pill (md and up). */
const BAR_TOP = 84;

/**
 * Section bar under the hero (md and up). Sticks under the site nav with a
 * band behind the nav once stuck, marks the section being read, and keeps
 * previous / next and "Mark as solved" in reach while reading.
 */
export default function StudyBar({
  sections,
  prev,
  next,
  track,
  solved,
  onToggleSolved,
}: {
  sections: StudySection[];
  prev: NavQuestion | null;
  next: NavQuestion | null;
  track: TrackPosition | null;
  solved: boolean;
  onToggleSolved: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const active = useActiveSection(
    sections.map((s) => s.id),
    STICKY_OFFSET,
  );
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      const el = bar.current;
      if (!el) return;
      setStuck(window.matchMedia("(min-width: 768px)").matches && el.getBoundingClientRect().top <= BAR_TOP + 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const arrow =
    "grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-strong hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";

  return (
    <div
      ref={bar}
      data-stuck={stuck}
      className="relative z-30 hidden border-b border-border bg-bg/90 backdrop-blur-md md:sticky md:top-[84px] md:block"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-full h-[84px] bg-bg/90 backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none ${
          stuck ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-6">
        <nav aria-label="On this page" className="-ml-3 flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s, i) => {
            const on = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(s.id, STICKY_OFFSET);
                }}
                className={`relative flex h-14 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent motion-reduce:transition-none ${
                  on ? "text-fg" : "text-subtle hover:text-fg"
                }`}
              >
                <span className={`text-xs tabular-nums ${on ? "text-accent" : "text-subtle/70"}`}>{i + 1}</span>
                {s.label}
                {on && (
                  <motion.span
                    layoutId="qa-section"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent"
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {track && (
            <span className="mr-1 hidden text-xs tabular-nums text-subtle lg:inline">
              {track.index + 1} of {track.total}
            </span>
          )}
          {prev ? (
            <Link href={`/interview-question/${prev.slug}`} className={arrow} aria-label={`Previous question: ${prev.title}`} title={`Previous: ${prev.title}`}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className={`${arrow} pointer-events-none opacity-40`} aria-hidden>
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
          {next ? (
            <Link href={`/interview-question/${next.slug}`} className={arrow} aria-label={`Next question: ${next.title}`} title={`Next: ${next.title}`}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className={`${arrow} pointer-events-none opacity-40`} aria-hidden>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
          <button
            type="button"
            onClick={onToggleSolved}
            aria-pressed={solved}
            title="Shortcut: M"
            className={`ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
              solved
                ? "border-success/40 bg-success/10 text-success"
                : "border-border text-muted hover:border-border-strong hover:bg-panel hover:text-fg"
            }`}
          >
            <Check className="h-4 w-4" aria-hidden />
            {solved ? "Solved" : "Mark solved"}
          </button>
        </div>
      </div>
    </div>
  );
}
