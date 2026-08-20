"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Code2 } from "lucide-react";

interface TechCard {
  title: string;
  description: string;
  topics: string[];
  gradient: string;
  hoverBorder: string;
  hoverShadow: string;
}

const TECH_CARDS: TechCard[] = [
  {
    title: "JavaScript",
    description: "Closures, prototypes, event loop, async patterns",
    topics: ["ES2024+", "Event Loop", "Closures"],
    gradient: "from-amber-500 to-yellow-600",
    hoverBorder: "hover:border-amber-500/30",
    hoverShadow: "hover:shadow-amber-500/10",
  },
  {
    title: "TypeScript",
    description: "Generics, utility types, strict mode patterns",
    topics: ["Generics", "Type Guards", "Mapped Types"],
    gradient: "from-blue-500 to-blue-600",
    hoverBorder: "hover:border-blue-500/30",
    hoverShadow: "hover:shadow-blue-500/10",
  },
  {
    title: "React",
    description: "Hooks, RSC, concurrent features, performance",
    topics: ["Server Components", "Suspense", "Hooks"],
    gradient: "from-cyan-400 to-cyan-600",
    hoverBorder: "hover:border-cyan-500/30",
    hoverShadow: "hover:shadow-cyan-500/10",
  },
  {
    title: "Python",
    description: "Generators, decorators, asyncio, data structures",
    topics: ["Generators", "Decorators", "AsyncIO"],
    gradient: "from-emerald-500 to-emerald-600",
    hoverBorder: "hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
  {
    title: "Go",
    description: "Goroutines, channels, interfaces, error handling",
    topics: ["Goroutines", "Channels", "Interfaces"],
    gradient: "from-sky-400 to-sky-600",
    hoverBorder: "hover:border-sky-500/30",
    hoverShadow: "hover:shadow-sky-500/10",
  },
  {
    title: "Rust",
    description: "Ownership, lifetimes, pattern matching, traits",
    topics: ["Ownership", "Lifetimes", "Traits"],
    gradient: "from-orange-500 to-orange-600",
    hoverBorder: "hover:border-orange-500/30",
    hoverShadow: "hover:shadow-orange-500/10",
  },
  {
    title: "System Design",
    description: "Distributed systems, caching, load balancing",
    topics: ["Scaling", "Caching", "Load Balancing"],
    gradient: "from-violet-500 to-violet-600",
    hoverBorder: "hover:border-violet-500/30",
    hoverShadow: "hover:shadow-violet-500/10",
  },
  {
    title: "DSA",
    description: "Trees, graphs, dynamic programming, greedy",
    topics: ["Graphs", "DP", "Greedy"],
    gradient: "from-rose-500 to-rose-600",
    hoverBorder: "hover:border-rose-500/30",
    hoverShadow: "hover:shadow-rose-500/10",
  },
];

/**
 * Apple-style horizontal card scrub.
 * A tall (300vh) container pins a sticky viewport to the screen.
 * Vertical scrolling smoothly drives horizontal translation of the card deck
 * via spring-dampened scroll progress.
 */
export default function HomeHorizontalScrub() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    mass: 0.2,
  });

  // Translate from 0% to -65% for a smooth left-slide across the deck
  const trackX = useTransform(smoothProgress, [0, 1], ["5%", "-62%"]);

  // Reduced motion fallback: standard responsive grid
  if (reducedMotion) {
    return (
      <section className="bg-[#050507] py-24">
        <div className="mx-auto max-w-6xl px-4 space-y-10">
          <ScrubHeader />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TECH_CARDS.map((card) => (
              <StaticCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen bg-[#050507] overflow-hidden flex flex-col justify-center">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-[160px] pointer-events-none" />

        <div className="relative z-10 px-4">
          <ScrubHeader />

          {/* Horizontal track */}
          <motion.div
            className="flex gap-6 mt-14 will-change-transform"
            style={{ x: trackX }}
          >
            {TECH_CARDS.map((card, i) => (
              <ScrubCard key={card.title} card={card} index={i} progress={smoothProgress} />
            ))}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[11px] font-bold text-white/25">
          <motion.div
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1"
            initial={{ opacity: 0.5 }}
          >
            <motion.div
              className="w-1 h-2 bg-white/40 rounded-full"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <span>Scroll to explore</span>
        </div>
      </div>
    </section>
  );
}

function ScrubHeader() {
  return (
    <div className="text-center space-y-3">
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold uppercase tracking-widest text-white/50">
        Technologies · Languages · Frameworks
      </span>
      <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.05]">
        14 technologies. 8 languages.{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
          One sandbox.
        </span>
      </h2>
    </div>
  );
}

function ScrubCard({
  card,
  index,
  progress,
}: {
  card: TechCard;
  index: number;
  progress: ReturnType<typeof useSpring>;
}) {
  // Each card slightly scales up as it enters the viewport center
  const cardStart = index / TECH_CARDS.length;
  const cardPeak = (index + 0.5) / TECH_CARDS.length;
  const cardEnd = (index + 1) / TECH_CARDS.length;

  const cardScale = useTransform(
    progress,
    [cardStart, cardPeak, cardEnd],
    [0.95, 1, 0.95]
  );
  const cardOpacity = useTransform(
    progress,
    [Math.max(0, cardStart - 0.05), cardStart, cardPeak, cardEnd, Math.min(1, cardEnd + 0.05)],
    [0.5, 0.8, 1, 0.8, 0.5]
  );

  return (
    <motion.div
      className={`flex-shrink-0 min-w-[320px] md:min-w-[380px] rounded-3xl border border-white/[0.08] bg-[#0c0e14] p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${card.hoverBorder} ${card.hoverShadow} will-change-transform`}
      style={{ scale: cardScale, opacity: cardOpacity }}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg mb-5`}
      >
        <Code2 className="w-6 h-6" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-black text-white tracking-tight mb-2">
        {card.title}
      </h3>

      {/* Description */}
      <p className="text-white/40 text-sm leading-relaxed mb-5">
        {card.description}
      </p>

      {/* Topic chips */}
      <div className="flex flex-wrap gap-2">
        {card.topics.map((topic) => (
          <span
            key={topic}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/[0.08] text-white/50 bg-white/[0.03] tracking-wide"
          >
            {topic}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/** Reduced motion fallback */
function StaticCard({ card }: { card: TechCard }) {
  return (
    <div
      className={`rounded-3xl border border-white/[0.08] bg-[#0c0e14] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.hoverBorder} ${card.hoverShadow}`}
    >
      <div
        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg mb-4`}
      >
        <Code2 className="w-5 h-5" />
      </div>
      <h3 className="text-base font-black text-white tracking-tight mb-1">
        {card.title}
      </h3>
      <p className="text-white/40 text-xs leading-relaxed mb-3">
        {card.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {card.topics.map((topic) => (
          <span
            key={topic}
            className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-white/[0.08] text-white/50 bg-white/[0.03]"
          >
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}
