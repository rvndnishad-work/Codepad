"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import HireHeroTypewriter from "./HireHeroTypewriter";

const CodeVerse3D = dynamic(() => import("@/components/wow/CodeVerse3D"), { ssr: false });

/**
 * One hero stat. `live` marks a count read from the database (shown only once
 * it is big enough to mean something); the rest are fixed capabilities.
 */
export type HeroStat = { value: string; label: string; live: boolean };

/**
 * Boss-mode hero: dark cinematic command center in both themes. Persona
 * toggle cross-links /, CTAs route by session, stat strip mixes live DB
 * counts with fixed capabilities and never shows a placeholder word.
 */
export default function HireWowHero({
  stats,
  ctaHref,
  signedIn,
}: {
  stats: HeroStat[];
  ctaHref: string;
  signedIn: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
      return;
    }
    const el = root.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0.02 });
    obs.observe(el);
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setScrolling(false), 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".wow-hire-line", { yPercent: 110, duration: 1.1, stagger: 0.12 })
        .from(".wow-hire-fade", { y: 26, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.6")
        .from(".wow-hire-chip", { scale: 0, opacity: 0, duration: 0.9, ease: "back.out(1.6)", stagger: 0.1 }, "-=0.7");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-24 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-secondary/20 blur-[140px]" />
        <div className="absolute right-[-160px] top-1/3 h-[420px] w-[420px] rounded-full bg-accent-4/10 blur-[120px]" />
        <div className="wow-grid-bg absolute inset-0" />
      </div>

      <div className="absolute inset-0 transform-gpu opacity-80 will-change-transform">
        <CodeVerse3D paused={paused || scrolling} tone="boss" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_64%_54%_at_50%_44%,rgb(var(--c-bg)/0.9),transparent_72%)]" />

      {/* floating proof chips */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
        <div className="wow-hire-chip wow-float absolute left-[3%] top-[24%] -rotate-6 rounded-2xl border border-success/30 bg-surface/85 px-4 py-3 shadow-[0_16px_50px_-16px_rgb(var(--c-success)/0.5)]">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-success">✓ 900 attempts graded</p>
          <p className="mt-0.5 text-sm font-bold text-fg">While you slept</p>
        </div>
        <div className="wow-hire-chip wow-float-2 absolute right-[3%] top-[22%] rotate-3 rounded-2xl border border-secondary/40 bg-surface/85 px-4 py-3 shadow-[0_16px_50px_-16px_rgb(var(--c-accent-2)/0.6)]">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-secondary-soft">applicant #612 · now rank 1</p>
          <p className="wow-font-display mt-0.5 text-2xl text-fg">92<span className="text-fg/40">/100</span></p>
        </div>
        <div className="wow-hire-chip wow-float-3 absolute bottom-[20%] right-[5%] -rotate-2 rounded-2xl border border-fg/15 bg-surface/85 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-fg/55">▶ replay attached</p>
          <p className="mt-0.5 text-sm font-bold text-fg">Shortlist in 1 click</p>
        </div>
      </div>

      <div className="relative z-20 mx-auto flex min-h-[100vh] max-w-7xl flex-col items-center px-4 pb-16 pt-24 text-center md:pt-[7.5rem]">
        <div className="wow-hire-fade flex flex-wrap items-center justify-center gap-3">
          <nav aria-label="Choose your view" className="flex items-center rounded-full border border-fg/15 bg-fg/[0.06] p-1 font-mono text-xs uppercase tracking-[0.12em] backdrop-blur-md">
            <Link href="/" className="rounded-full px-4 py-1.5 text-fg/60 transition hover:text-fg">← Developers</Link>
            <span aria-current="page" className="rounded-full bg-secondary px-4 py-1.5 font-bold text-secondary-ink">Hiring teams</span>
          </nav>
          <span className="hidden items-center gap-1.5 rounded-full border border-fg/15 bg-fg/[0.06] px-4 py-2 font-mono sm:flex text-xs uppercase tracking-[0.12em] text-fg/80 backdrop-blur-md">
            <Building2 className="h-3.5 w-3.5 text-secondary" /> Technical hiring
          </span>
        </div>

        <h1 className="wow-font-display mt-8 text-[9vw] leading-[0.9] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-[7.5vw] lg:text-[5rem]">
          <span className="block overflow-hidden pb-1"><span className="wow-hire-line block">1,000 applied.</span></span>
          <span className="block overflow-hidden pb-2"><span className="wow-hire-line block whitespace-nowrap"><HireHeroTypewriter /></span></span>
        </h1>

        <p className="wow-hire-fade mt-6 max-w-2xl text-balance text-base font-medium leading-relaxed text-fg/85 [text-shadow:0_2px_18px_rgba(0,0,0,0.9)] md:text-lg">
          A thousand applications, read in the order they arrived, and the
          shortlist closed at forty. Send every applicant the same take-home or
          AI screening interview instead. We grade each attempt on our servers
          with integrity signals attached, and by morning your list is ranked by
          who can actually do the job.
        </p>

        <div className="wow-hire-fade mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          <Link href={ctaHref} className="group flex items-center justify-center gap-2 rounded-full bg-fg px-8 py-4 text-sm font-semibold text-bg transition hover:scale-[1.03]">
            {signedIn ? "Open your workspace" : "Create a workspace"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/pricing" className="flex items-center justify-center gap-2 rounded-full border border-fg/25 bg-fg/5 px-8 py-4 text-sm font-semibold text-fg backdrop-blur transition hover:border-fg/50">
            See pricing
          </Link>
        </div>

        {stats.length > 0 && (
          <dl className="wow-hire-fade mt-10 grid w-full max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-fg/12 bg-fg/10">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse justify-end bg-surface/95 px-3 py-4 sm:px-4">
                <dt className="mt-1 text-[12px] leading-snug text-muted sm:text-[13px]">{s.label}</dt>
                <dd className="wow-font-display text-2xl tabular-nums md:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="wow-hire-fade mt-6 text-balance text-center font-mono text-xs uppercase leading-relaxed tracking-[0.12em] text-fg/55">
          <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 align-[-3px] text-success" />Screen on evidence, not arrival order
        </p>
      </div>
    </section>
  );
}
