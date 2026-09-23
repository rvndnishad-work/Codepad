import Link from "next/link";
import { FileCode2, Users, ShieldCheck, Trophy, ArrowRight } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

const STEPS = [
  { n: "01", icon: FileCode2, title: "Write", accent: "--c-accent-4", copy: "A full editor in the browser: multiple files, live preview and nothing to install.", code: "editor.open('offer.ts')" },
  { n: "02", icon: Users, title: "Pair up", accent: "--c-accent-2", copy: "Invite a friend, mentor or interviewer and edit the same code together in real time.", code: "room.join('squad')" },
  { n: "03", icon: ShieldCheck, title: "Run", accent: "--c-accent", copy: "Your code runs in a sandbox in 8 languages and returns output, timing and test results.", code: "$ run --lang=any  ✓ 3ms" },
  { n: "04", icon: Trophy, title: "Show it", accent: "--c-accent-3", copy: "Every session keeps a replay you can add to a public portfolio for recruiters.", code: "portfolio.publish()" },
];

/**
 * How it works: the four-step story as one static row. Replaces the pinned
 * horizontal scroll ride, which held about four screens of scroll for four
 * short cards. Stacks on phones, two-up on tablets.
 */
export default function HomeWowSteps() {
  return (
    <section className="relative bg-bg px-4 py-24 text-fg transition-colors md:py-32">
      <div className="mx-auto max-w-7xl">
        <WowReveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent-4">✦ how it works</p>
              <h2 className="wow-font-display mt-3 text-4xl md:text-5xl lg:text-6xl">WRITE IT. RUN IT.<br /><span className="wow-gradient-text">PROVE IT.</span></h2>
            </div>
            <Link href="/playgrounds" className="group flex w-fit shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-black uppercase tracking-wider text-accent-ink transition hover:scale-105">
              Open a playground <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </WowReveal>

        <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className="min-w-0">
              <WowReveal delay={i * 0.06} className="h-full">
                <article className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-panel p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-7 w-7" style={{ color: `rgb(var(${s.accent}))` }} aria-hidden />
                    <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-subtle">STEP {s.n}</span>
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight">{s.title}</h3>
                  <p className="text-[14px] leading-relaxed text-muted">{s.copy}</p>
                  <code className="mt-auto block truncate rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[12px]" style={{ color: `rgb(var(${s.accent}))` }}>{s.code}</code>
                </article>
              </WowReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
