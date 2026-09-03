"use client";

import type { CSSProperties } from "react";

/**
 * Stack coverage as a TICKER TAPE, not a carousel of pills.
 *
 * The previous version was two rows of rounded, bordered, shadowed chips —
 * the single most recycled component on the modern web. This is a readout:
 * monospaced names on one baseline, separated by hairline slashes, running
 * between two rules. It reads as a status line scrolling across a build
 * server, which is the register the rest of the site is written in.
 *
 * Pure CSS animation (GPU-friendly, works without JS), pauses on hover,
 * edge-faded, no scroll-jacking.
 */

const ROW_A = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Go",
  "Java",
  "C++",
  "SQL",
];

const ROW_B = [
  "Data structures",
  "System design",
  "Machine coding",
  "Angular",
  "Vue",
  "Prompt engineering",
  "AI code review",
  "Behavioural",
  "Git & CI",
];

function MarqueeRow({
  items,
  direction,
}: {
  items: string[];
  direction: "left" | "right";
}) {
  // Content duplicated once so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className="marquee-mask group relative flex overflow-hidden py-3">
      <div
        className={`flex shrink-0 items-center group-hover:[animation-play-state:paused] ${
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        }`}
        style={{ willChange: "transform" } as CSSProperties}
      >
        {doubled.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center whitespace-nowrap">
            <span className="ip-label ip-label-fg px-5">{label}</span>
            <span className="h-3 w-px bg-border" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TechMarquee() {
  return (
    <section aria-label="Technologies covered" className="border-b border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3 border-b border-border py-3">
          <span className="ip-live h-[5px] w-[5px] bg-accent" aria-hidden />
          <span className="ip-label">Coverage</span>
          <span className="ip-rule min-w-4 flex-1" aria-hidden />
          <span className="ip-label">14 technologies · 8 runtimes</span>
        </div>
        <div className="divide-y divide-border">
          <MarqueeRow items={ROW_A} direction="left" />
          <MarqueeRow items={ROW_B} direction="right" />
        </div>
      </div>
    </section>
  );
}
