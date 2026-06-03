"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  ListChecks,
  Share2,
  Target,
  Users,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";

export default function HomeChallengesFlow() {
  const [persona, setPersona] = useState<"candidate" | "recruiter" | null>(null);

  useEffect(() => {
    // Initial load
    const saved = localStorage.getItem("ipad.persona");
    if (saved === "candidate" || saved === "recruiter") {
      setPersona(saved as "candidate" | "recruiter");
    }

    // Event listener for changes
    const handlePersonaChange = (e: Event) => {
      setPersona((e as CustomEvent).detail);
    };
    window.addEventListener("ipad-persona-change", handlePersonaChange);
    return () => window.removeEventListener("ipad-persona-change", handlePersonaChange);
  }, []);

  const isRecruiter = persona === "recruiter";

  return (
    <SpotlightGroup>
      <RevealOnScroll
        className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2"
        stagger={0.12}
      >
        <RevealItem className="flex-1 flex">
          <SpotlightCard className="rounded-3xl w-full h-full">
            <FlowCard
              index={1}
              icon={isRecruiter ? <Briefcase className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
              title={isRecruiter ? "Author campaign" : "Pick a challenge"}
              isRecruiter={isRecruiter}
            >
              {isRecruiter ? <RecruiterPickCard /> : <PickCard />}
            </FlowCard>
          </SpotlightCard>
        </RevealItem>

        <Connector />

        <RevealItem className="flex-1 flex">
          <SpotlightCard className="rounded-3xl w-full h-full">
            <FlowCard
              index={2}
              icon={isRecruiter ? <ShieldCheck className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
              title={isRecruiter ? "Proctor sessions" : "Solve it live"}
              isRecruiter={isRecruiter}
            >
              {isRecruiter ? <RecruiterSolveCard /> : <SolveCard />}
            </FlowCard>
          </SpotlightCard>
        </RevealItem>

        <Connector />

        <RevealItem className="flex-1 flex">
          <SpotlightCard className="rounded-3xl w-full h-full">
            <FlowCard
              index={3}
              icon={isRecruiter ? <Users className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
              title={isRecruiter ? "Evaluate candidates" : "Build an interview"}
              isRecruiter={isRecruiter}
            >
              {isRecruiter ? <RecruiterBuildCard /> : <BuildCard />}
            </FlowCard>
          </SpotlightCard>
        </RevealItem>
      </RevealOnScroll>
    </SpotlightGroup>
  );
}

function FlowCard({
  index,
  icon,
  title,
  children,
  isRecruiter
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isRecruiter?: boolean;
}) {
  return (
    <div className={`relative w-full h-full rounded-3xl border bg-panel p-5 transition-colors flex flex-col ${
      isRecruiter ? "hover:border-indigo-500/40 border-border" : "hover:border-border-strong border-border"
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black bg-bg/40 border ${
          isRecruiter ? "text-indigo-400 border-indigo-500/25" : "text-muted border-border"
        }`}>
          {index}
        </div>
        <div className="flex items-center gap-1.5 text-fg">
          <span className={isRecruiter ? "text-indigo-400" : "text-muted"}>{icon}</span>
          <span className="font-black text-sm">{title}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Connector() {
  return (
    <div
      aria-hidden
      className="hidden md:flex items-center justify-center self-stretch w-5 text-border-strong"
    >
      <ChevronRight className="w-4 h-4" />
    </div>
  );
}

/* ────────── Step 1: Pick a challenge ────────── */

function PickCard() {
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-4 relative min-h-[120px]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-fg font-bold text-sm truncate">Two Sum</div>
          <div className="text-muted text-[10px] mt-0.5 uppercase tracking-wider">
            Algorithms
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border text-emerald-500 bg-emerald-500/10 border-emerald-500/30">
          easy
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          15 min
        </span>
        <span className="text-muted/30">·</span>
        <span className="px-1.5 py-0.5 rounded bg-bg/60 border border-border text-[10px] text-fg/80">
          arrays
        </span>
        <span className="px-1.5 py-0.5 rounded bg-bg/60 border border-border text-[10px] text-fg/80">
          hashmap
        </span>
      </div>
      <div
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md"
        aria-hidden
      >
        <CheckCircle2 className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

/* ────────── Step 1: Recruiter Pick Card ────────── */
function RecruiterPickCard() {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-bg/40 p-4 relative min-h-[120px]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-fg font-bold text-sm truncate">React Architect</div>
          <div className="text-muted text-[10px] mt-0.5 uppercase tracking-wider">
            MCP autograded challenge
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border text-indigo-400 bg-indigo-500/10 border-indigo-500/30">
          Active
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
          60 min
        </span>
        <span className="text-muted/30">·</span>
        <span className="px-1.5 py-0.5 rounded bg-bg/60 border border-border text-[10px] text-fg/80">
          AI Proctoring
        </span>
        <span className="px-1.5 py-0.5 rounded bg-bg/60 border border-border text-[10px] text-fg/80">
          Jest Grader
        </span>
      </div>
      <div
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-md animate-pulse"
        aria-hidden
      >
        <CheckCircle2 className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

/* ────────── Step 2: Solve it live ────────── */

const SOLUTION = "return target - sum;";

function SolveCard() {
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-4 font-mono min-h-[120px]">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-2">solution.js</div>
      <div className="text-fg text-xs min-h-[1.4em] leading-[1.4em] whitespace-pre">
        <span className="text-purple-400">function</span>{" "}
        <span className="text-accent">solve</span>(sum, target) {"{"}
      </div>
      <div className="text-fg text-xs min-h-[1.4em] leading-[1.4em] whitespace-pre pl-3">
        {SOLUTION}
      </div>
      <div className="text-fg text-xs min-h-[1.4em] leading-[1.4em] whitespace-pre">{"}"}</div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-full" />
        </div>
        <span className="text-[10px] font-bold text-emerald-500">3/3 passing</span>
      </div>
    </div>
  );
}

/* ────────── Step 2: Recruiter Solve Card ────────── */
function RecruiterSolveCard() {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-bg/40 p-4 font-mono min-h-[120px] text-[10px]">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-2 font-mono">proctoring_feed.log</div>
      <div className="text-slate-300 min-h-[1.4em] leading-[1.4em] whitespace-pre flex justify-between">
        <span>› Tab switches:</span>
        <span className="text-amber-400 font-bold">1 warning</span>
      </div>
      <div className="text-slate-300 min-h-[1.4em] leading-[1.4em] whitespace-pre flex justify-between">
        <span>› Clipboard:</span>
        <span className="text-rose-400 font-bold">Blocked paste</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 w-full animate-pulse" />
        </div>
        <span className="text-[10px] font-bold text-indigo-400">Keystroke telemetry</span>
      </div>
    </div>
  );
}

/* ────────── Step 3: Build an interview ────────── */

type PlaylistItem = { title: string; min: number; tone: "emerald" | "amber" | "rose" };

const SESSION: PlaylistItem[] = [
  { title: "Two Sum", min: 15, tone: "emerald" },
  { title: "Debounce", min: 20, tone: "amber" },
  { title: "Tree Diff", min: 30, tone: "rose" },
];

const TONE_BORDER: Record<PlaylistItem["tone"], string> = {
  emerald: "border-emerald-500/40",
  amber: "border-amber-500/40",
  rose: "border-rose-500/40",
};
const TONE_DOT: Record<PlaylistItem["tone"], string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

function BuildCard() {
  const totalMin = SESSION.reduce((s, i) => s + i.min, 0);
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-4 min-h-[120px]">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted">
          Session playlist
        </div>
        <div className="text-[10px] text-muted font-mono tabular-nums">
          {totalMin} min
        </div>
      </div>
      <div className="space-y-1.5 mb-3">
        {SESSION.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-bg/50 ${TONE_BORDER[item.tone]}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[item.tone]}`}
              aria-hidden
            />
            <span className="text-xs text-fg font-medium truncate">{item.title}</span>
            <span className="ml-auto text-[10px] text-muted font-mono">{item.min}m</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold">
        <Share2 className="w-3 h-3 text-accent" />
        <span className="text-accent">Share link ready</span>
      </div>
    </div>
  );
}

/* ────────── Step 3: Recruiter Build Card ────────── */
function RecruiterBuildCard() {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-bg/40 p-4 min-h-[120px]">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted">
          AI Candidate Dossier
        </div>
        <div className="text-[10px] text-emerald-400 font-mono font-bold">
          94/100
        </div>
      </div>
      <div className="space-y-2 mb-3 text-[11px] text-slate-300">
        <div className="flex justify-between">
          <span>Problem Solving:</span>
          <span className="text-fg font-bold">94%</span>
        </div>
        <div className="flex justify-between">
          <span>Code Quality:</span>
          <span className="text-fg font-bold">96%</span>
        </div>
        <div className="flex justify-between">
          <span>Proctoring Flag:</span>
          <span className="text-emerald-400 font-bold uppercase text-[9px]">Clean</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400">
        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
        <span>Dossier ready for review</span>
      </div>
    </div>
  );
}
