import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";
import RevealLines from "@/components/wow/RevealLines";
import type { Tone } from "./tone";

export type Value = { icon: LucideIcon; title: string; body: string };

/** The principles behind the product, as a staggered card grid. */
export default function AboutValues({ tone, title, intro, values }: { tone: Tone; title: [string, string]; intro: string; values: Value[] }) {
  return (
    <section
      className="relative overflow-hidden bg-surface px-4 py-24 text-fg transition-colors md:py-32"
      style={{ "--about-pulse": tone.pulse, "--about-pulse-glow": tone.pulseGlow } as React.CSSProperties}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="wow-grid-bg absolute inset-0 opacity-60" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <WowReveal>
          <p className={`flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] ${tone.text}`}>
            <Sparkles className="h-3.5 w-3.5" /> what we believe
          </p>
          <RevealLines
            className="wow-font-display mt-3 text-5xl md:text-7xl"
            lines={[<span key="l0">{title[0]}</span>, <span key="l1" className={tone.gradient}>{title[1]}</span>]}
          />
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{intro}</p>
        </WowReveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <WowReveal key={v.title} delay={(i % 4) * 0.08}>
              <article className={`about-card group flex h-full flex-col gap-3 rounded-3xl border border-border bg-bg p-6 transition hover:-translate-y-1 ${tone.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-2xl transition ${tone.tile} ${tone.tileHover}`}>
                    <v.icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-subtle">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="text-[15px] font-bold tracking-[-0.015em]">{v.title}</h3>
                <p className="text-[12.5px] leading-relaxed text-muted">{v.body}</p>
              </article>
            </WowReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
