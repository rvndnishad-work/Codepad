import { Code2, Building2, Server, History, ShieldCheck, Cpu } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";
import RevealLines from "@/components/wow/RevealLines";
import { BrandIcon } from "@/components/brand/BrandLogo";
import type { Tone } from "./tone";

/**
 * The diagram that explains the two-brand setup: developers practice on
 * DevPrep, hiring teams evaluate on Intervutree, and both doors open onto
 * the same sandboxes, graders and replay. Pulses travel the connectors.
 */
export default function AboutRuntime({ tone }: { tone: Tone }) {
  const recruiter = tone.key === "intervutree";
  return (
    <section
      className="relative bg-bg px-4 py-24 text-fg transition-colors md:py-32"
      style={{ "--about-pulse": tone.pulse, "--about-pulse-glow": tone.pulseGlow } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl">
        <WowReveal>
          <p className={`flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] ${tone.text}`}>
            <Cpu className="h-3.5 w-3.5" /> how it fits together
          </p>
          <RevealLines
            className="wow-font-display mt-3 text-5xl md:text-7xl"
            lines={[<span key="l0">Two doors,</span>, <span key="l1" className={tone.gradient}>one runtime.</span>]}
          />
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            {recruiter
              ? "The sandboxes your candidates write in are the same ones developers practice on every day at DevPrep. Nobody meets a strange environment on interview day, and every attempt is graded by the same servers."
              : "The sandboxes you practice in are the same ones hiring teams use on Intervutree. When you walk into a real interview, the editor, the runner and the rules are already familiar."}
          </p>
        </WowReveal>

        <WowReveal delay={0.1}>
          <div className="mt-14 grid items-stretch gap-0 md:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
            <Door
              brand="devprep"
              title="DevPrep"
              eyebrow="for developers"
              highlight={!recruiter}
              tone={tone}
              items={["Playgrounds and runnable challenges", "Interview questions and prep journeys", "Mock interviews with replay"]}
            />

            <Pipe />

            <Core tone={tone} />

            <Pipe reverse />

            <Door
              brand="intervutree"
              title="Intervutree"
              eyebrow="for hiring teams"
              highlight={recruiter}
              tone={tone}
              items={["AI screening at any applicant volume", "Live interviews with full replay", "Workspaces, pipelines and ATS sync"]}
            />
          </div>
        </WowReveal>
      </div>
    </section>
  );
}

function Door({ brand, title, eyebrow, items, highlight, tone }: { brand: "devprep" | "intervutree"; title: string; eyebrow: string; items: string[]; highlight: boolean; tone: Tone }) {
  const Icon = brand === "devprep" ? Code2 : Building2;
  return (
    <article className={`about-card flex h-full flex-col gap-4 rounded-3xl border bg-surface p-6 transition hover:-translate-y-1 ${highlight ? "border-fg/30 shadow-clay" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-bg">
          <BrandIcon brand={brand} className="h-7 w-7" />
        </span>
        <span className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${highlight ? tone.text : "text-subtle"}`}>
          <Icon className="h-3.5 w-3.5" /> {eyebrow}
        </span>
      </div>
      <h3 className="wow-font-display text-2xl">{title}</h3>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm text-muted">
            <span aria-hidden className={`mt-[7px] h-[5px] w-[5px] shrink-0 ${highlight ? tone.dot : "bg-subtle"}`} />
            {it}
          </li>
        ))}
      </ul>
      {highlight && <p className={`mt-auto pt-2 font-mono text-[11px] uppercase tracking-[0.12em] ${tone.text}`}>you are here</p>}
    </article>
  );
}

function Pipe({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="flex items-center justify-center py-2 md:w-16 md:py-0">
      <div className={`about-pipe about-pipe-y md:hidden ${reverse ? "about-pipe-reverse" : ""}`} />
      <div className={`about-pipe about-pipe-x hidden md:block ${reverse ? "about-pipe-reverse" : ""}`} style={reverse ? ({ "--about-pulse-delay": "-1.2s" } as React.CSSProperties) : undefined} />
    </div>
  );
}

function Core({ tone }: { tone: Tone }) {
  const rows = [
    { icon: Server, label: "Network-isolated sandboxes", sub: "Every run in its own box, with CPU and memory limits" },
    { icon: ShieldCheck, label: "Server-side grading", sub: "Hidden tests run on our infrastructure, never in a browser" },
    { icon: History, label: "Keystroke replay", sub: "Each attempt is kept as a timeline you can scrub" },
  ];
  return (
    <div className="relative flex h-full flex-col justify-center rounded-3xl border border-border bg-surface p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className={`about-core-ring absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full ${tone.blobA} blur-2xl`} />
      </div>
      <p className={`relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] ${tone.text}`}>
        <Cpu className="h-3.5 w-3.5" /> shared runtime
      </p>
      <ul className="relative mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tone.tile}`}>
              <r.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-[-0.01em]">{r.label}</p>
              <p className="text-xs leading-relaxed text-muted">{r.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
