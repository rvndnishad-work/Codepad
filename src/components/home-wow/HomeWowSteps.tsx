"use client";

import { useRef } from "react";
import Link from "next/link";
import { FileCode2, Users, ShieldCheck, Trophy, ArrowRight } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";
import RevealLines from "@/components/wow/RevealLines";
import { useCycle, useTyped } from "@/components/wow/useCycle";

const STEP_MS = 2800;

const STEPS = [
  { n: "01", icon: FileCode2, title: "Write", accent: "--c-accent-2-soft", copy: "A full editor in the browser: multiple files, live preview and nothing to install.", code: "editor.open('offer.ts')" },
  { n: "02", icon: Users, title: "Pair up", accent: "--c-accent-2-soft", copy: "Invite a friend, mentor or interviewer and edit the same code together in real time.", code: "room.join('squad')" },
  { n: "03", icon: ShieldCheck, title: "Run", accent: "--c-accent-2-soft", copy: "Your code runs in a sandbox in 8 languages and returns output, timing and test results.", code: "$ run --lang=any  ✓ 3ms" },
  { n: "04", icon: Trophy, title: "Show it", accent: "--c-accent-2-soft", copy: "Every session keeps a replay you can add to a public portfolio for recruiters.", code: "portfolio.publish()" },
];

/**
 * How it works: the four-step story as one static row. Replaces the pinned
 * horizontal scroll ride, which held about four screens of scroll for four
 * short cards. Stacks on phones, two-up on tablets.
 */
export default function HomeWowSteps() {
  const list = useRef<HTMLOListElement>(null);
  // One step at a time lights up and types its line, like a run in progress.
  const active = useCycle(list, STEPS.length, STEP_MS);
  return (
    <section className="relative bg-bg px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-subtle">how it works</p>
              <RevealLines className="wow-font-display mt-3 text-4xl md:text-5xl lg:text-6xl" lines={[<span key="l0">Write it. Run it.</span>, <span key="l1" className="wow-gradient-text">Prove it.</span>]} />
            </div>
            <Link href="/playgrounds" className="group flex w-fit shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-semibold text-accent-ink transition hover:scale-[1.02]">
              Open a playground <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </WowReveal>

        <ol ref={list} className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className="min-w-0">
              <WowReveal delay={i * 0.06} className="h-full">
                <StepCard step={s} active={active === i} />
              </WowReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepCard({ step: s, active }: { step: (typeof STEPS)[number]; active: boolean }) {
  const typed = useTyped(s.code, active);
  return (
    <article
      data-spotlight
      className={`relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border bg-panel p-6 transition-[border-color,background-color,transform] duration-500 ${
        active ? "-translate-y-1 border-accent/40 bg-elevated/60" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <s.icon className="h-7 w-7 transition-colors duration-500" style={{ color: active ? "rgb(var(--c-accent))" : `rgb(var(${s.accent}))` }} aria-hidden />
        <span className="font-mono text-xs tabular-nums text-subtle">{s.n}</span>
      </div>
      <h3 className="text-2xl font-semibold tracking-tight">{s.title}</h3>
      <p className="text-[14px] leading-relaxed text-muted">{s.copy}</p>
      <code className={`mt-auto block truncate rounded-xl border bg-surface px-3 py-2 font-mono text-[12px] transition-colors duration-500 ${active ? "border-accent/30 text-fg" : "border-border text-muted"}`}>
        {active ? typed : s.code}
        {active && <span aria-hidden className="wow-blink ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-accent" />}
      </code>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-border/60">
        {active && <span key={s.n} className="wow-step-fill block h-full bg-accent" style={{ ["--wow-step-ms" as string]: `${STEP_MS}ms` }} />}
      </span>
    </article>
  );
}
