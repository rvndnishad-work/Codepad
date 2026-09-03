"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import {
  FileCode2,
  Users,
  ShieldCheck,
  Activity,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/home/SectionHeading";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";

/**
 * THE one pinned scroll-scrub moment on the homepage.
 *
 * Four stages of "what actually happens when you practice here" scrubbed by
 * vertical scroll: a sticky viewport crossfades stages while a progress rail
 * fills. Below `lg` (and for reduced-motion users) it degrades to a plain
 * animated card stack — no scroll-jacking on mobile.
 *
 * This replaces the old HomeStickyStory + candidate half of HomeInfographic,
 * which duplicated the same four stages twice on one page.
 */

type Stage = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  icon: LucideIcon;
  /** Functional wayfinding hue (like difficulty colors). */
  tone: {
    text: string;
    border: string;
    chipBg: string;
    glow: string;
    bar: string;
  };
  points: string[];
};

const STAGES: Stage[] = [
  {
    id: "write",
    kicker: "01 · Write",
    title: "A real editor, not a textarea",
    body: "Open a browser tab and you're in a full monaco-powered workspace backed by an in-memory file system. No installs, no containers, no setup screen.",
    icon: FileCode2,
    tone: {
      text: "text-emerald-500",
      border: "border-emerald-500/30",
      chipBg: "bg-emerald-500/10",
      glow: "bg-emerald-500/15",
      bar: "bg-emerald-500",
    },
    points: ["Multi-file projects", "Instant preview", "Zero install"],
  },
  {
    id: "collaborate",
    kicker: "02 · Collaborate",
    title: "Live sessions on CRDT rails",
    body: "Interviewer or teammate joins your room and edits merge conflict-free at the character level — everyone's cursor visible, every keystroke synced.",
    icon: Users,
    tone: {
      text: "text-sky-500",
      border: "border-sky-500/30",
      chipBg: "bg-sky-500/10",
      glow: "bg-sky-500/15",
      bar: "bg-sky-500",
    },
    points: ["Conflict-free sync", "Shared cursor presence", "Voice-ready rooms"],
  },
  {
    id: "execute",
    kicker: "03 · Execute",
    title: "Run anything, safely sandboxed",
    body: "Code executes in a two-layer isolated runtime across eight languages. stdout, stderr and timing come back to the panel in milliseconds.",
    icon: ShieldCheck,
    tone: {
      text: "text-amber-500",
      border: "border-amber-500/30",
      chipBg: "bg-amber-500/10",
      glow: "bg-amber-500/15",
      bar: "bg-amber-500",
    },
    points: ["8 languages", "Isolated execution", "ms-level feedback"],
  },
  {
    id: "prove",
    kicker: "04 · Prove",
    title: "Judged on signal, not claims",
    body: "Every run, paste and replay is captured into an integrity-aware timeline — so recruiters see how you work, and you get a shareable proof of craft.",
    icon: Activity,
    tone: {
      text: "text-rose-500",
      border: "border-rose-500/30",
      chipBg: "bg-rose-500/10",
      glow: "bg-rose-500/15",
      bar: "bg-rose-500",
    },
    points: ["Full replay", "Integrity signals", "Shareable portfolio"],
  },
];

export default function HomeHowItWorks() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 0.2 });

  // Rail fill height tracks overall progress.
  const railFill = useTransform(smooth, [0, 1], ["0%", "100%"]);

  return (
    <section className="relative border-b border-border bg-bg pt-20 md:pt-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="03"
          eyebrow="Under the hood"
          eyebrowIcon={<ShieldCheck className="h-3 w-3" />}
          title="From keystroke"
          highlight="to verdict."
          lede="Four systems working as one — what happens before, during and after every line you write."
        />
      </div>

      {/* Mobile / reduced-motion: simple animated stack */}
      {reduced ? (
        <StaticStack />
      ) : (
        <>
          {/* Desktop: pinned scrub */}
          <div ref={containerRef} className="relative hidden lg:block h-[320vh]">
            <div className="sticky top-0 h-screen flex items-center overflow-hidden">
              <div className="mx-auto max-w-6xl px-4 w-full">
                <div className="grid grid-cols-12 gap-10 items-center">
                  {/* Progress rail */}
                  <div className="col-span-3 relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
                    <motion.div
                      className="absolute left-[7px] top-2 bottom-2 w-px origin-top bg-accent"
                      style={{ scaleY: smooth }}
                      aria-hidden
                    />
                    <ul className="space-y-14">
                      {STAGES.map((s, i) => (
                        <RailItem key={s.id} stage={s} index={i} progress={smooth} />
                      ))}
                    </ul>
                  </div>

                  {/* Crossfading stage panels */}
                  <div className="col-span-9 relative h-[420px] [perspective:1200px]">
                    {STAGES.map((s, i) => (
                      <StagePanel key={s.id} stage={s} index={i} progress={smooth} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tablet/mobile: animated stack, no pinning */}
          <div className="lg:hidden pb-24">
            <StaticStack />
          </div>
        </>
      )}
    </section>
  );
}

/** One row of the desktop progress rail; lights up while its stage is active. */
function RailItem({
  stage,
  index,
  progress,
}: {
  stage: Stage;
  index: number;
  progress: MotionValue<number>;
}) {
  // Each stage owns an equal slice of the 0..1 progress range.
  const start = index / STAGES.length;
  const end = (index + 0.5) / STAGES.length;
  const dotScale = useTransform(progress, [start - 0.08, start + 0.04], [1, 1.6]);
  const dotOpacity = useTransform(progress, [start - 0.08, start + 0.04, end + 0.3], [0.35, 1, 1]);
  const titleOpacity = useTransform(progress, [start - 0.06, start + 0.05], [0.4, 1]);

  return (
    <li className="relative pl-10">
      <motion.span
        style={{ scale: dotScale, opacity: dotOpacity }}
        className={`absolute left-0 top-1.5 w-[11px] h-[11px] border-2 ${stage.tone.bar} ${stage.tone.border} bg-bg`}
        aria-hidden
      />
      <motion.div style={{ opacity: titleOpacity }}>
        <p className={`text-[11px] font-bold uppercase tracking-widest ${stage.tone.text}`}>
          {stage.kicker}
        </p>
        <h3 className="text-lg font-extrabold text-fg tracking-tight mt-1">{stage.title}</h3>
      </motion.div>
    </li>
  );
}

/** The big stage card; only visible (opacity/scale) during its slice of scroll. */
function StagePanel({
  stage,
  index,
  progress,
}: {
  stage: Stage;
  index: number;
  progress: MotionValue<number>;
}) {
  const n = STAGES.length;
  const enterStart = Math.max(0, index / n - 0.06);
  const enterEnd = index / n + 0.04;
  const exitStart = (index + 1) / n - 0.04;
  const exitEnd = Math.min(1, (index + 1) / n + 0.05);

  const opacity = useTransform(
    progress,
    [enterStart, enterEnd, exitStart, exitEnd],
    [0, 1, 1, index === n - 1 ? 1 : 0]
  );
  const y = useTransform(progress, [enterStart, enterEnd, exitStart, exitEnd], [48, 0, 0, -48]);
  const rotateX = useTransform(progress, [enterStart, enterEnd], [6, 0]);

  const Icon = stage.icon;
  return (
    <motion.article
      style={{ opacity, y, rotateX, transformStyle: "preserve-3d" }}
      className={`absolute inset-0  border ${stage.tone.border} bg-surface  p-10 flex flex-col justify-center overflow-hidden will-change-`}
    >
      <span
        aria-hidden
        className="absolute -bottom-8 -right-4 text-[10rem] leading-none font-bold text-fg opacity-[0.03] select-none pointer-events-none"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative space-y-6 max-w-xl">
        <div className={`w-16 h-16  border ${stage.tone.border} ${stage.tone.chipBg} ${stage.tone.text} flex items-center justify-center`}>
          <Icon className="w-8 h-8" />
        </div>
        <p className={`text-xs font-bold uppercase tracking-widest ${stage.tone.text}`}>{stage.kicker}</p>
        <h3 className="text-3xl xl:text-4xl font-bold tracking-tight text-fg leading-tight">{stage.title}</h3>
        <p className="text-muted text-base md:text-lg leading-relaxed font-medium">{stage.body}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {stage.points.map((p) => (
            <span
              key={p}
              className={`inline-flex items-center rounded-data border px-2.5 py-1 font-mono text-[11px] text-fg ${stage.tone.border} ${stage.tone.chipBg}`}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

/** No-pinning fallback: all four stages as reveal-staggered cards. */
function StaticStack() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-24 lg:pb-0">
      <RevealOnScroll stagger={0.1} amount={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STAGES.map((s) => {
          const Icon = s.icon;
          return (
            <RevealItem key={s.id}>
              <article className={`relative h-full  border ${s.tone.border} bg-surface  p-7 overflow-hidden`}>
                <div className="relative space-y-4">
                  <div className={`w-12 h-12  border ${s.tone.border} ${s.tone.chipBg} ${s.tone.text} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${s.tone.text}`}>{s.kicker}</p>
                  <h3 className="text-xl font-extrabold text-fg tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed font-medium">{s.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.points.map((p) => (
                      <span
                        key={p}
                        className={`inline-flex items-center rounded-data border px-2 py-0.5 font-mono text-[10.5px] text-fg ${s.tone.border} ${s.tone.chipBg}`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </RevealItem>
          );
        })}
      </RevealOnScroll>
    </div>
  );
}
