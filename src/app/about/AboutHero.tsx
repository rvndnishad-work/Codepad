"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowRight, Code2, FlaskConical, ShieldCheck, Users } from "lucide-react";
import { BrandIcon, BrandLockup } from "@/components/brand/BrandLogo";
import { prefersReducedMotion } from "@/components/wow/motion";
import type { Tone } from "./tone";

export type HeroCopy = {
  eyebrow: string;
  lines: [string, string, string];
  intro: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
};

/**
 * Opening band: the brand lockup inside two slow orbits of product marks,
 * a three-line headline rising out of a mask, and the one-paragraph pitch.
 */
export default function AboutHero({ tone, copy }: { tone: Tone; copy: HeroCopy }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from(".about-hero-badge", { scale: 0.6, opacity: 0, duration: 1.1, ease: "back.out(1.4)" })
        .from(".about-hero-line", { yPercent: 110, duration: 1.1, stagger: 0.12 }, "-=0.7")
        .from(".about-hero-fade", { y: 26, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.6")
        .from(".about-hero-sat", { scale: 0, opacity: 0, duration: 0.8, ease: "back.out(1.8)", stagger: 0.08 }, "-=0.8");
    }, root);
    return () => ctx.revert();
  }, []);

  const other = tone.key === "devprep" ? "intervutree" : "devprep";

  return (
    <section
      ref={root}
      className="wow-noise relative overflow-hidden bg-bg text-fg"
      style={{ "--about-pulse": tone.pulse, "--about-pulse-glow": tone.pulseGlow } as React.CSSProperties}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="wow-grid-bg absolute inset-0" />
        <div className={`about-blob left-[8%] top-[10%] h-[380px] w-[380px] ${tone.blobA}`} />
        <div className={`about-blob about-blob-2 right-[6%] top-[22%] h-[420px] w-[420px] ${tone.blobB}`} />
        <div className="about-blob about-blob-3 bottom-[-10%] left-[38%] h-[360px] w-[360px] bg-success/25" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-24 md:grid-cols-[1.15fr_0.85fr] md:items-center md:pb-28 md:pt-32">
        <div>
          <p className={`about-hero-fade flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] ${tone.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {copy.eyebrow}
          </p>
          <h1 className="wow-font-display mt-6 text-[12vw] leading-[0.92] sm:text-[8.5vw] lg:text-[5.6rem]">
            <span className="block overflow-hidden pb-1"><span className="about-hero-line block">{copy.lines[0]}</span></span>
            <span className="block overflow-hidden pb-1"><span className={`about-hero-line block pb-1 ${tone.gradient}`}>{copy.lines[1]}</span></span>
            <span className="block overflow-hidden pb-2"><span className="about-hero-line wow-text-stroke block">{copy.lines[2]}</span></span>
          </h1>
          <p className="about-hero-fade mt-7 max-w-xl text-balance text-base leading-relaxed text-muted md:text-lg">{copy.intro}</p>
          <div className="about-hero-fade mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={copy.primary.href} className="group flex w-fit items-center gap-2 rounded-full bg-ink px-8 py-3.5 text-sm font-semibold text-ink-fg transition hover:scale-[1.03]">
              {copy.primary.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href={copy.secondary.href} className="flex w-fit items-center gap-2 rounded-full border border-fg/30 px-8 py-[13px] text-sm font-semibold text-fg transition hover:border-fg/60 hover:bg-fg/5">
              {copy.secondary.label}
            </Link>
          </div>
        </div>

        {/* Orbit: the brand at the centre, product facets circling it. */}
        <div className="about-hero-badge relative mx-auto my-6 aspect-square w-[72%] max-w-[420px] sm:my-0 sm:w-full">
          <div aria-hidden className={`absolute inset-[18%] rounded-full ${tone.blobA} blur-[60px]`} />
          <div aria-hidden className="absolute inset-0 rounded-full border border-dashed border-fg/15" />
          <div aria-hidden className="absolute inset-[17%] rounded-full border border-fg/10" />

          <div className="absolute inset-[30%] grid place-items-center rounded-[28%] border border-border bg-surface/90 shadow-clay backdrop-blur">
            <BrandIcon brand={tone.key} className="h-[52%] w-[52%]" />
          </div>

          <div className="about-orbit">
            <Satellite angle={-90} tone={tone} icon={<Code2 className="h-4 w-4" />} label="Playgrounds" />
            <Satellite angle={0} tone={tone} icon={<FlaskConical className="h-4 w-4" />} label="Challenges" />
            <Satellite angle={90} tone={tone} icon={<Users className="h-4 w-4" />} label="Interviews" />
            <Satellite angle={180} tone={tone} icon={<ShieldCheck className="h-4 w-4" />} label="Replay" />
          </div>
          <div className="about-orbit about-orbit-reverse">
            <div className="absolute left-1/2 top-[17%] -translate-x-1/2 -translate-y-1/2">
              <div className="about-hero-sat">
                <span className="about-counter grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface shadow-clay">
                  <BrandIcon brand={other} className="h-6 w-6" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10">
        <div className="about-hero-fade flex items-center gap-3 border-t border-border pt-6">
          <BrandLockup brand={tone.key} height={28} />
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">and</span>
          <BrandLockup brand={other} height={28} className="opacity-70" />
          <span className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.12em] text-subtle sm:inline">one team · one runtime</span>
        </div>
      </div>
    </section>
  );
}

function Satellite({ angle, tone, icon, label }: { angle: number; tone: Tone; icon: React.ReactNode; label: string }) {
  // Place on the outer ring: 50% radius from the centre.
  const rad = (angle * Math.PI) / 180;
  const x = 50 + 50 * Math.cos(rad);
  const y = 50 + 50 * Math.sin(rad);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="about-hero-sat">
        <span className="about-counter flex items-center gap-2 rounded-full border border-border bg-surface/95 py-1.5 pl-1.5 pr-3 text-xs font-semibold shadow-clay backdrop-blur">
          <span className={`grid h-7 w-7 place-items-center rounded-full ${tone.tile}`}>{icon}</span>
          {label}
        </span>
      </div>
    </div>
  );
}
