import WowReveal from "@/components/wow/WowReveal";
import CountUp from "@/components/wow/CountUp";
import type { Tone } from "./tone";

export type Stat = { value: string; label: string; live: boolean };

/** A strip of counters that count up on scroll. Live rows are DB-backed. */
export default function AboutNumbers({ tone, stats }: { tone: Tone; stats: Stat[] }) {
  return (
    <section className="bg-bg px-4 py-16 text-fg transition-colors md:py-20">
      <WowReveal>
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="group relative bg-surface px-5 py-7 transition hover:bg-bg">
              <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${tone.bar}`} />
              <dd className="wow-font-display text-4xl tabular-nums md:text-5xl">
                <CountUp value={s.value} />
              </dd>
              <dt className="mt-2 flex items-center gap-2 text-xs text-muted">
                {s.live && <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />}
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </WowReveal>
    </section>
  );
}
