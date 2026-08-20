"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { FolderTree, GitBranch, ShieldCheck, Play } from "lucide-react";

interface Stage {
  id: string;
  number: string;
  tag: string;
  title: string;
  desc: string;
  metrics: string[];
  color: string;
  colorAccent: string;
  icon: React.ReactNode;
}

const STAGES: Stage[] = [
  {
    id: "vfs",
    number: "01",
    tag: "Workspace",
    title: "Virtual Workspace (VFS)",
    desc: "Every sandbox starts in a virtualized in-memory file system. Your directories, configurations, and files are managed client-side without physical disk read/write delays.",
    metrics: ["In-memory VFS", "Zero disk-write lag", "Monaco direct mapping"],
    color: "emerald",
    colorAccent: "rgb(52, 211, 153)",
    icon: <FolderTree className="w-6 h-6" />,
  },
  {
    id: "yjs",
    number: "02",
    tag: "Collaboration",
    title: "Real-Time Yjs Protocol",
    desc: "In live interviews, code updates are serialized into conflict-free replicated data types (CRDTs) and broadcast peer-to-peer over WebRTC — both sides type into the same buffer.",
    metrics: ["Peer delta sync", "WebRTC signaling", "CRDT conflict-free"],
    color: "blue",
    colorAccent: "rgb(96, 165, 250)",
    icon: <GitBranch className="w-6 h-6" />,
  },
  {
    id: "sandbox",
    number: "03",
    tag: "Isolation",
    title: "Two-Layer Sandboxing",
    desc: "Frontend previews run in an origin-separated iframe with strict sandbox attributes. Multi-language code executes on an isolated, network-disabled runner with CPU and memory limits — never on the app server.",
    metrics: [
      "Origin-isolated previews",
      "Network-disabled runner jail",
      "CPU / memory / output caps",
    ],
    color: "amber",
    colorAccent: "rgb(251, 191, 36)",
    icon: <ShieldCheck className="w-6 h-6" />,
  },
  {
    id: "telemetry",
    number: "04",
    tag: "Integrity",
    title: "Attempt Telemetry & Replay",
    desc: "Focus changes, paste events, and keystroke timing are captured during graded attempts, powering session replays and integrity signals reviewers can actually trust.",
    metrics: [
      "Keystroke timeline",
      "Paste & blur signals",
      "Full session replay",
    ],
    color: "rose",
    colorAccent: "rgb(251, 113, 133)",
    icon: <Play className="w-6 h-6" />,
  },
];

/**
 * Apple-style sticky scroll storytelling section.
 * The section spans 350vh. A sticky inner viewport locks to the screen while
 * scroll progress scrubs through 4 architecture stages with smooth spring physics.
 */
export default function HomeStickyStory() {
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

  // Progress track fill height (0% to 100%)
  const trackFill = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  // Reduced motion: show all stages stacked
  if (reducedMotion) {
    return (
      <section className="bg-[#050507] py-24">
        <div className="mx-auto max-w-5xl px-4 space-y-6">
          <SectionHeader />
          {STAGES.map((stage) => (
            <StaticStageCard key={stage.id} stage={stage} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative h-[350vh]">
      <div className="sticky top-0 h-screen bg-[#050507] overflow-hidden flex items-center">
        {/* Ambient glow behind active content */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px] pointer-events-none opacity-20"
          style={{
            background: useTransform(
              smoothProgress,
              [0, 0.25, 0.5, 0.75, 1],
              [
                "radial-gradient(circle, rgba(52,211,153,0.3), transparent)",
                "radial-gradient(circle, rgba(96,165,250,0.3), transparent)",
                "radial-gradient(circle, rgba(251,191,36,0.3), transparent)",
                "radial-gradient(circle, rgba(251,113,133,0.3), transparent)",
                "radial-gradient(circle, rgba(251,113,133,0.3), transparent)",
              ]
            ),
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 w-full">
          <SectionHeader />

          <div className="mt-14 flex gap-12 lg:gap-20 items-start">
            {/* ── Left: Vertical progress track ── */}
            <div className="hidden md:flex flex-col items-center relative flex-shrink-0 w-16">
              {/* Background track line */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-white/[0.06] rounded-full" />
              {/* Filled track line */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] rounded-full bg-gradient-to-b from-emerald-400 via-blue-400 via-amber-400 to-rose-400"
                style={{ height: trackFill }}
              />

              {/* Stage dots */}
              <div className="relative flex flex-col justify-between h-[320px]">
                {STAGES.map((stage, i) => (
                  <StageDot
                    key={stage.id}
                    stage={stage}
                    index={i}
                    progress={smoothProgress}
                  />
                ))}
              </div>
            </div>

            {/* ── Right: Content panel ── */}
            <div className="flex-1 relative min-h-[340px]">
              {STAGES.map((stage, i) => (
                <StageContent
                  key={stage.id}
                  stage={stage}
                  index={i}
                  progress={smoothProgress}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="text-center space-y-3">
      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold uppercase tracking-widest text-white/50">
        Engineering · Architecture · Security
      </span>
      <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.05]">
        How it works under the hood
      </h2>
    </div>
  );
}

function StageDot({
  stage,
  index,
  progress,
}: {
  stage: Stage;
  index: number;
  progress: ReturnType<typeof useSpring>;
}) {
  const stageStart = index / STAGES.length;
  const stageEnd = (index + 1) / STAGES.length;
  const stageMid = (stageStart + stageEnd) / 2;

  const scale = useTransform(
    progress,
    [stageStart, stageMid, stageEnd],
    [0.7, 1.3, 0.7]
  );
  const opacity = useTransform(
    progress,
    [stageStart, stageMid, stageEnd],
    [0.3, 1, 0.3]
  );

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ scale, opacity }}
    >
      <div
        className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-black"
        style={{
          borderColor: stage.colorAccent,
          color: stage.colorAccent,
          background: `${stage.colorAccent}15`,
          boxShadow: `0 0 20px ${stage.colorAccent}25`,
        }}
      >
        {stage.number}
      </div>
    </motion.div>
  );
}

function StageContent({
  stage,
  index,
  progress,
}: {
  stage: Stage;
  index: number;
  progress: ReturnType<typeof useSpring>;
}) {
  const stageStart = index / STAGES.length;
  const stageEnd = (index + 1) / STAGES.length;
  const fadeIn = stageStart + 0.02;
  const peak = (stageStart + stageEnd) / 2;
  const fadeOut = stageEnd - 0.02;

  const opacity = useTransform(
    progress,
    [stageStart, fadeIn, peak, fadeOut, stageEnd],
    [0, 1, 1, 1, 0]
  );
  const y = useTransform(
    progress,
    [stageStart, fadeIn, peak, fadeOut, stageEnd],
    [40, 0, 0, 0, -40]
  );

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center will-change-transform"
      style={{ opacity, y }}
    >
      {/* Tag pill */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${stage.colorAccent}, ${stage.colorAccent}88)`,
          }}
        >
          {stage.icon}
        </div>
        <span
          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
          style={{
            color: stage.colorAccent,
            borderColor: `${stage.colorAccent}40`,
            background: `${stage.colorAccent}10`,
          }}
        >
          {stage.tag}
        </span>
      </div>

      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
        {stage.title}
      </h3>
      <p className="text-white/50 text-base md:text-lg leading-relaxed max-w-xl mb-6">
        {stage.desc}
      </p>

      {/* Metric chips */}
      <div className="flex flex-wrap gap-2.5">
        {stage.metrics.map((metric) => (
          <span
            key={metric}
            className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold border"
            style={{
              color: stage.colorAccent,
              borderColor: `${stage.colorAccent}25`,
              background: `${stage.colorAccent}08`,
              boxShadow: `0 0 12px ${stage.colorAccent}10`,
            }}
          >
            {metric}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/** Reduced motion fallback — all stages visible in a regular vertical stack. */
function StaticStageCard({ stage }: { stage: Stage }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#0c0e14] p-7 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${stage.colorAccent}, ${stage.colorAccent}88)`,
          }}
        >
          {stage.icon}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">
            {stage.tag}
          </span>
          <h3 className="text-lg font-black text-white tracking-tight">
            {stage.title}
          </h3>
        </div>
      </div>
      <p className="text-white/50 text-sm leading-relaxed">{stage.desc}</p>
      <div className="flex flex-wrap gap-2">
        {stage.metrics.map((metric) => (
          <span
            key={metric}
            className="px-3 py-1 rounded-lg text-[11px] font-bold border border-white/10 text-white/60 bg-white/[0.03]"
          >
            {metric}
          </span>
        ))}
      </div>
    </div>
  );
}
