"use client";

import {
  Braces,
  FileCode2,
  Atom,
  Triangle,
  Server,
  Database,
  Cloud,
  Layers,
  GitBranch,
  Cpu,
  Boxes,
  Workflow,
  TerminalSquare,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

/**
 * Infinite auto-scrolling technology marquee. Replaces the old 300vh
 * pinned horizontal-scrub deck: same content signal ("we cover your
 * stack"), zero scroll-jacking, pure CSS animation (GPU-friendly, works
 * without JS), pauses on hover, edge-faded.
 */

type Tech = { label: string; icon: LucideIcon };

const ROW_A: Tech[] = [
  { label: "JavaScript", icon: Braces },
  { label: "TypeScript", icon: FileCode2 },
  { label: "React", icon: Atom },
  { label: "Next.js", icon: Triangle },
  { label: "Node.js", icon: Server },
  { label: "Python", icon: TerminalSquare },
  { label: "Go", icon: Cpu },
];

const ROW_B: Tech[] = [
  { label: "Rust", icon: Boxes },
  { label: "Java", icon: Layers },
  { label: "SQL", icon: Database },
  { label: "System Design", icon: Cloud },
  { label: "DSA", icon: Workflow },
  { label: "Git & CI", icon: GitBranch },
  { label: "Behavioral", icon: MessagesSquare },
];

function MarqueeRow({ items, direction }: { items: Tech[]; direction: "left" | "right" }) {
  // Content duplicated once so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className="marquee-mask group relative flex overflow-hidden">
      <div
        className={`flex shrink-0 items-center gap-4 pr-4 group-hover:[animation-play-state:paused] ${
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        }`}
        style={{ willChange: "transform" } as CSSProperties}
      >
        {doubled.map((t, i) => (
          <span
            key={`${t.label}-${i}`}
            className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-bold text-muted shadow-tile transition-colors hover:border-accent/40 hover:text-fg"
          >
            <t.icon className="w-4 h-4 text-accent" />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TechMarquee() {
  return (
    <section aria-label="Technologies covered" className="bg-bg py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4 space-y-4">
        <MarqueeRow items={ROW_A} direction="left" />
        <MarqueeRow items={ROW_B} direction="right" />
      </div>
    </section>
  );
}
