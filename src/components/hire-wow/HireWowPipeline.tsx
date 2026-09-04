"use client";

import {
  Bot, ClipboardCheck, FileCode2, Gauge, GitBranch, MonitorPlay,
  Radar, ScrollText, ShieldCheck, Timer, Users, Workflow,
} from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

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
    step: "02", title: "Screen", tagline: "Volume handled before your calendar is", icon: Bot,
    features: [
      { icon: Bot, text: "AI screening interviews at batch scale" },
      { icon: Timer, text: "Take-homes with server-side grading" },
      { icon: Gauge, text: "Auto-scored attempts, instant shortlists" },
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
  return (
    <section className="relative bg-[var(--wow-bg)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]"><Workflow className="h-3.5 w-3.5" /> the pipeline</p>
          <h2 className="wow-font-display mt-3 max-w-4xl text-5xl md:text-7xl">ONE WORKSPACE,<br /><span className="wow-gradient-boss">EVERY STAGE.</span></h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
            From the first screen to the signed offer — no tool-hopping, no lost
            context between stages, and one record you can point at afterwards.
          </p>
        </WowReveal>

        <svg viewBox="0 0 1200 40" className="mt-10 hidden h-8 w-full lg:block" aria-hidden>
          <line x1="0" y1="20" x2="1200" y2="20" stroke="#8b93ff" strokeOpacity="0.5" strokeWidth="2" className="wow-svg-dash" />
          {[6, 400, 800, 1194].map((x) => (
            <circle key={x} cx={x} cy="20" r="5" fill="var(--wow-bg)" stroke="#8b93ff" strokeWidth="2" />
          ))}
        </svg>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s, i) => (
            <WowReveal key={s.step} delay={i * 0.07}>
              <article className="group flex h-full flex-col gap-4 rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#8b93ff]/60 hover:shadow-[0_20px_60px_-20px_rgba(139,147,255,0.5)]">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#8b93ff]/30 bg-[#8b93ff]/10 text-[#8b93ff]">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-[var(--wow-faint)]">{s.step}</span>
                </div>
                <div>
                  <h3 className="wow-font-display text-3xl">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] text-[var(--wow-muted)]">{s.tagline}</p>
                </div>
                <ul className="mt-auto space-y-2.5 border-t border-[var(--wow-card-border)] pt-4">
                  {s.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug">
                      <f.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b93ff]" />
                      {f.text}
                    </li>
                  ))}
                </ul>
              </article>
            </WowReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
