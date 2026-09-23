"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import HireHeroTypewriter from "./HireHeroTypewriter";

const CodeVerse3D = dynamic(() => import("@/components/wow/CodeVerse3D"), { ssr: false });

export type HireHeroStats = { workspaces: number; sessions: number; challenges: number };

/**
 * Boss-mode hero: dark cinematic command center in both themes. Persona
 * toggle cross-links /, CTAs route by session, stat strip is live DB data.
 */
export default function HireWowHero({
  stats,
  ctaHref,
  signedIn,
}: {
  stats: HireHeroStats;
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

  const cells = [
    { v: stats.workspaces > 0 ? `${stats.workspaces}+` : "Live", l: "hiring workspaces" },
    { v: stats.sessions > 0 ? `${stats.sessions}+` : "Replay", l: "sessions on record" },
    { v: stats.challenges > 0 ? `${stats.challenges}+` : "8-lang", l: "challenges ready to assign" },
  ];

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
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-success">✓ 900 attempts graded</p>
          <p className="mt-0.5 text-sm font-bold text-fg">While you slept</p>
        </div>
        <div className="wow-hire-chip wow-float-2 absolute right-[3%] top-[22%] rotate-3 rounded-2xl border border-secondary/40 bg-surface/85 px-4 py-3 shadow-[0_16px_50px_-16px_rgb(var(--c-accent-2)/0.6)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary-soft">applicant #612 · now rank 1</p>
          <p className="wow-font-display mt-0.5 text-2xl text-fg">92<span className="text-fg/40">/100</span></p>
        </div>
        <div className="wow-hire-chip wow-float-3 absolute bottom-[20%] right-[5%] -rotate-2 rounded-2xl border border-fg/15 bg-surface/85 px-4 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg/55">▶ replay attached</p>
          <p className="mt-0.5 text-sm font-bold text-fg">Shortlist in 1 click</p>
        </div>
      </div>

      <div className="relative z-20 mx-auto flex min-h-[100vh] max-w-7xl flex-col items-center px-4 pb-16 pt-24 text-center md:pt-[7.5rem]">
        <div className="wow-hire-fade flex flex-wrap items-center justify-center gap-3">
          <nav aria-label="Choose your view" className="flex items-center rounded-full border border-fg/15 bg-fg/[0.06] p-1 font-mono text-[11px] uppercase tracking-[0.18em] backdrop-blur-md">
            <Link href="/" className="rounded-full px-4 py-1.5 text-fg/60 transition hover:text-fg">← Developers</Link>
            <span aria-current="page" className="rounded-full bg-secondary px-4 py-1.5 font-bold text-secondary-ink">Hiring teams</span>
          </nav>
          <span className="flex items-center gap-1.5 rounded-full border border-fg/15 bg-fg/[0.06] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fg/80 backdrop-blur-md">
            <Building2 className="h-3.5 w-3.5 text-secondary" /> Boss mode
          </span>
        </div>

        <h1 className="wow-font-display mt-8 text-[9vw] leading-[0.9] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-[7.5vw] lg:text-[5rem]">
          <span className="block overflow-hidden pb-1"><span className="wow-hire-line block">1,000 APPLIED.</span></span>
          <span className="block overflow-hidden pb-2"><span className="wow-hire-line block whitespace-nowrap"><HireHeroTypewriter /></span></span>
        </h1>

        <p className="wow-hire-fade mt-6 max-w-2xl text-balance text-base font-medium leading-relaxed text-fg/85 [text-shadow:0_2px_18px_rgba(0,0,0,0.9)] md:text-lg">
          Nine hundred applications, opened in the order they landed,
          shortlist closed at forty. Send all nine hundred a take-home or an AI
          interview instead — our servers grade every attempt, anti-cheat rides
          along, and by morning the list is sorted by who can actually do the job.
        </p>

        <div className="wow-hire-fade mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href={ctaHref} className="group flex items-center gap-2 rounded-full bg-fg px-8 py-4 text-sm font-black uppercase tracking-wider text-bg transition hover:scale-[1.03]">
            {signedIn ? "Open your workspace" : "Create a workspace"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/pricing" className="flex items-center gap-2 rounded-full border border-fg/25 bg-fg/5 px-8 py-4 text-sm font-bold uppercase tracking-wider text-fg backdrop-blur transition hover:border-fg/50">
            See pricing
          </Link>
        </div>

        <div className="wow-hire-fade mt-10 grid w-full max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-fg/12 bg-fg/10">
          {cells.map((s) => (
            <div key={s.l} className="bg-surface/95 px-4 py-4">
              <p className="wow-font-display text-2xl tabular-nums md:text-3xl">{s.v}</p>
              <p className="mt-1 font-mono text-[11px] uppercase leading-snug tracking-[0.16em] text-fg/55 md:text-[11px]">{s.l}</p>
            </div>
          ))}
        </div>

        <p className="wow-hire-fade mt-6 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fg/55">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> Capgemini · SakSoft · and more screen on evidence, not order
        </p>
      </div>
    </section>
  );
}
