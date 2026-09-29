"use client";

import { useRef } from "react";
import {
  Bot, ClipboardCheck, FileCode2, Gauge, GitBranch, MonitorPlay,
  Radar, ScrollText, ShieldCheck, Timer, Users, Workflow,
} from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";
import { useCycle } from "@/components/wow/useCycle";

const STAGE_MS = 3000;
const STAGE_X = [6, 400, 800, 1194];
import RevealLines from "@/components/wow/RevealLines";

/** Same 4 stages + 12 mechanisms as the classic pipeline — reskinned. */
const STAGES = [
  {
    step: "01", title: "Create", tagline: "Assessments in minutes, not sprints", icon: FileCode2,
    features: [
      { icon: ClipboardCheck, text: "Curated challenge library, ready to assign" },
      { icon: ScrollText, text: "Custom rubrics & structured scorecards" },
      { icon: Workflow, text: "Author your own via MCP or the editor" },
    ],
  },
  {
    step: "02", title: "Screen", tagline: "The whole pile, scored in parallel", icon: Bot,
    features: [
      { icon: Timer, text: "One take-home for every applicant, graded on our servers" },
      { icon: Bot, text: "AI screening interview runs round one, in parallel" },
      { icon: ShieldCheck, text: "Anti-cheat signals on every attempt, so the ranking holds" },
      { icon: Gauge, text: "Ranked shortlist, best-first, by morning" },
    ],
  },
  {
    step: "03", title: "Interview", tagline: "The live room, nothing to install", icon: MonitorPlay,
    features: [
      { icon: Users, text: "Multiplayer editor with live cursors" },
      { icon: FileCode2, text: "Real execution in 8 languages" },
      { icon: MonitorPlay, text: "Full session replay with integrity signals" },
    ],
  },
  {
    step: "04", title: "Decide", tagline: "Evidence, not vibes", icon: ShieldCheck,
    features: [
      { icon: Radar, text: "Integrity report & AI-suspicion radar" },
      { icon: ScrollText, text: "Rubric scores side-by-side per candidate" },
      { icon: GitBranch, text: "Sync verdicts to Greenhouse, Lever, Ashby" },
    ],
  },
];

export default function HireWowPipeline() {
  const track = useRef<HTMLDivElement>(null);
  // A candidate moving through the pipeline: the track fills to the active
  // stage and that card lights up, then it moves on.
  const active = useCycle(track, STAGES.length, STAGE_MS);
  return (
    <section className="relative bg-bg px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary"><Workflow className="h-3.5 w-3.5" /> the pipeline</p>
          <RevealLines className="wow-font-display mt-3 max-w-4xl text-5xl md:text-7xl" lines={[<span key="l0">One workspace,</span>, <span key="l1" className="wow-gradient-boss">every stage.</span>]} />
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            From a thousand applicants down to the signed offer — no
            tool-hopping, no lost context between stages, and one record per
            candidate you can point at afterwards.
          </p>
        </WowReveal>

        <div ref={track}>
        <svg viewBox="0 0 1200 40" className="mt-10 hidden h-8 w-full lg:block" aria-hidden>
          <line x1="0" y1="20" x2="1200" y2="20" stroke="rgb(var(--c-accent-2))" strokeOpacity="0.35" strokeWidth="2" className="wow-svg-dash" />
          {active >= 0 && (
            <line
              x1="0" y1="20" x2="1200" y2="20"
              stroke="rgb(var(--c-accent-2-soft))" strokeWidth="2.5"
              style={{
                transformBox: "fill-box",
                transformOrigin: "left center",
                transform: `scaleX(${STAGE_X[active] / 1200})`,
                transition: "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          )}
          {STAGE_X.map((x, i) => (
            <circle
              key={x} cx={x} cy="20" r={i === active ? 7 : 5}
              fill={active >= 0 && i <= active ? "rgb(var(--c-accent-2-soft))" : "rgb(var(--c-bg))"}
              stroke="rgb(var(--c-accent-2))" strokeWidth="2"
              style={{ transition: "r 0.4s ease, fill 0.4s ease" }}
            />
          ))}
        </svg>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s, i) => (
            <WowReveal key={s.step} delay={i * 0.07}>
              <article
                data-spotlight
                className={`group relative flex h-full flex-col gap-4 rounded-3xl border bg-surface p-6 backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-secondary/60 ${
                  i === active ? "-translate-y-1 border-secondary/60 shadow-[0_20px_60px_-24px_rgb(var(--c-accent-2)/0.6)]" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl border text-secondary transition-colors duration-500 ${i === active ? "border-secondary/60 bg-secondary/25" : "border-secondary/30 bg-secondary/10"}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-subtle">{s.step}</span>
                </div>
                <div>
                  <h3 className="wow-font-display text-3xl">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] text-muted">{s.tagline}</p>
                </div>
                <ul className="mt-auto space-y-2.5 border-t border-border pt-4">
                  {s.features.map((f, j) => (
                    <li
                      key={f.text}
                      className={`flex items-start gap-2.5 text-[13px] font-medium leading-snug transition-opacity duration-500 ${active >= 0 && i !== active ? "opacity-60" : "opacity-100"}`}
                      style={{ transitionDelay: i === active ? `${j * 90}ms` : "0ms" }}
                    >
                      <f.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                      {f.text}
                    </li>
                  ))}
                </ul>
              </article>
            </WowReveal>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
