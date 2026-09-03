"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Code2,
  ListChecks,
  ShieldCheck,
  Target,
  Users,
  Briefcase,
} from "lucide-react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";

/**
 * The three-step flow, rendered as a SPEC SHEET rather than three glowing
 * cards. One frame, two internal rules, and a step number set in the index
 * voice. The old version wrapped each step in a rounded panel with a
 * cursor-tracking spotlight glow; the structure now does that work, so the
 * lighting effect is gone and nothing lifts, scales or blooms.
 *
 * Each step's body is a miniature of the real product surface it describes:
 * a challenge row, an editor with a passing test bar, a session playlist.
 */
export default function HomeChallengesFlow() {
  const [persona, setPersona] = useState<"candidate" | "recruiter" | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ipad.persona");
    if (saved === "candidate" || saved === "recruiter") {
      setPersona(saved as "candidate" | "recruiter");
    }
    const handlePersonaChange = (e: Event) => {
      setPersona((e as CustomEvent).detail);
    };
    window.addEventListener("ipad-persona-change", handlePersonaChange);
    return () => window.removeEventListener("ipad-persona-change", handlePersonaChange);
  }, []);

  const isRecruiter = persona === "recruiter";

  const steps = isRecruiter
    ? [
        { icon: <Briefcase className="h-3.5 w-3.5" />, title: "Author campaign", body: <RecruiterPickCard /> },
        { icon: <ShieldCheck className="h-3.5 w-3.5" />, title: "Proctor sessions", body: <RecruiterSolveCard /> },
        { icon: <Users className="h-3.5 w-3.5" />, title: "Evaluate candidates", body: <RecruiterBuildCard /> },
      ]
    : [
        { icon: <Target className="h-3.5 w-3.5" />, title: "Pick a challenge", body: <PickCard /> },
        { icon: <Code2 className="h-3.5 w-3.5" />, title: "Solve it live", body: <SolveCard /> },
        { icon: <ListChecks className="h-3.5 w-3.5" />, title: "Build an interview", body: <BuildCard /> },
      ];

  return (
    <RevealOnScroll className="ip-frame grid grid-cols-1 gap-px bg-border md:grid-cols-3">
      {steps.map((step, i) => (
        <div key={step.title} className="flex flex-col gap-4 bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className={`ip-index ${isRecruiter ? "text-secondary" : "text-accent"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-subtle">{step.icon}</span>
            <span className="ip-label ip-label-fg">{step.title}</span>
            {/* The step's own rule, running to the cell edge. */}
            <span className="ip-rule-soft min-w-2 flex-1" aria-hidden />
          </div>
          {step.body}
        </div>
      ))}
    </RevealOnScroll>
  );
}

/* ────────── Step 1: Pick a challenge ────────── */

function PickCard() {
  return (
    <div className="ip-frame-bare min-h-[126px] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-fg">Two Sum</div>
          <div className="ip-label mt-1">Algorithms</div>
        </div>
        <span className="ip-label flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
          <span className="h-[5px] w-[5px] bg-emerald-500" aria-hidden />
          easy
        </span>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="ip-chip">
          <Clock className="h-3 w-3" />
          15 min
        </span>
        <span className="ip-chip">arrays</span>
        <span className="ip-chip">hashmap</span>
      </div>
    </div>
  );
}

function RecruiterPickCard() {
  return (
    <div className="ip-frame-bare min-h-[126px] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-fg">React Architect</div>
          <div className="ip-label mt-1">MCP autograded challenge</div>
        </div>
        <span className="ip-label ip-label-secondary flex items-center gap-1.5">
          <span className="ip-live h-[5px] w-[5px] bg-secondary" aria-hidden />
          active
        </span>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="ip-chip">
          <Clock className="h-3 w-3" />
          60 min
        </span>
        <span className="ip-chip">AI proctoring</span>
        <span className="ip-chip">Jest grader</span>
      </div>
    </div>
  );
}

/* ────────── Step 2: Solve it live ────────── */

function SolveCard() {
  return (
    <div className="ip-frame-bare min-h-[126px] p-3.5 font-mono">
      <div className="ip-label mb-2.5">solution.js</div>
      <div className="whitespace-pre text-[11.5px] leading-[1.5] text-fg">
        <span className="text-violet-800 dark:text-violet-400">function</span>{" "}
        <span className="text-accent">solve</span>(sum, target) {"{"}
      </div>
      <div className="whitespace-pre pl-3 text-[11.5px] leading-[1.5] text-fg">
        return target - sum;
      </div>
      <div className="whitespace-pre text-[11.5px] leading-[1.5] text-fg">{"}"}</div>
      <div className="mt-3.5 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden bg-border" aria-hidden>
          <div className="h-full w-full bg-emerald-500" />
        </div>
        <span className="ip-label text-emerald-800 dark:text-emerald-400">
          3/3 passing
        </span>
      </div>
    </div>
  );
}

function RecruiterSolveCard() {
  return (
    <div className="ip-frame-bare min-h-[126px] p-3.5 font-mono">
      <div className="ip-label mb-2.5">proctoring_feed.log</div>
      <div className="flex justify-between text-[11.5px] leading-[1.6] text-muted">
        <span>› Tab switches</span>
        <span className="text-amber-800 dark:text-amber-400">1 warning</span>
      </div>
      <div className="flex justify-between text-[11.5px] leading-[1.6] text-muted">
        <span>› Clipboard</span>
        <span className="text-rose-700 dark:text-rose-400">blocked paste</span>
      </div>
      <div className="mt-3.5 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden bg-border" aria-hidden>
          <div className="h-full w-full bg-secondary" />
        </div>
        <span className="ip-label ip-label-secondary">telemetry</span>
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

const TONE_DOT: Record<PlaylistItem["tone"], string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

function BuildCard() {
  const totalMin = SESSION.reduce((s, i) => s + i.min, 0);
  return (
    <div className="ip-frame-bare min-h-[126px] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="ip-label">Session playlist</span>
        <span className="ip-nums font-mono text-[11px] text-subtle">{totalMin} min</span>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {SESSION.map((item) => (
          <div key={item.title} className="flex items-center gap-2.5 py-1.5">
            <span className={`h-[5px] w-[5px] shrink-0 ${TONE_DOT[item.tone]}`} aria-hidden />
            <span className="truncate text-[12px] text-fg">{item.title}</span>
            <span className="ip-nums ml-auto font-mono text-[11px] text-subtle">
              {item.min}m
            </span>
          </div>
        ))}
      </div>
      <div className="ip-label ip-label-accent mt-3">Share link ready</div>
    </div>
  );
}

function RecruiterBuildCard() {
  const ROWS = [
    { k: "Problem solving", v: "94%" },
    { k: "Code quality", v: "96%" },
    { k: "Integrity flag", v: "clean" },
  ];
  return (
    <div className="ip-frame-bare min-h-[126px] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="ip-label">Candidate dossier</span>
        <span className="ip-nums font-mono text-[11px] text-emerald-800 dark:text-emerald-400">
          94/100
        </span>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {ROWS.map((r) => (
          <div key={r.k} className="flex items-center justify-between py-1.5">
            <span className="text-[12px] text-muted">{r.k}</span>
            <span className="ip-nums font-mono text-[11px] text-fg">{r.v}</span>
          </div>
        ))}
      </div>
      <div className="ip-label ip-label-secondary mt-3">Ready for review</div>
    </div>
  );
}
