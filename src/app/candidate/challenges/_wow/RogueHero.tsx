"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Telescope, Play, Flame, ArrowDown } from "lucide-react";
import CountUp from "@/components/scroll/CountUp";

gsap.registerPlugin(ScrollTrigger);

const RoguePlanet3D = dynamic(() => import("./RoguePlanet3D"), { ssr: false });

export type DailyPick = {
  slug: string;
  title: string;
  difficulty: string;
  minutes: number | null;
  steps: number;
  solved: boolean;
} | null;

/**
 * ROGUE HERO — the drifter hangs right-of-center while copy holds the left:
 * interviews throw unknown questions at you, so you train in the dark.
 * GSAP masked-line entrance + parallax, canvas frozen offscreen / scrolling /
 * reduced-motion. Carries `data-dark-hero` so the navbar floats transparent.
 */
export default function RogueHero({
  firstName,
  todayLabel,
  checkedIn,
  streak,
  daily,
  nextUnsolved,
  total,
  solvedCount,
}: {
  firstName: string;
  todayLabel: string;
  checkedIn: boolean;
  streak: number;
  daily: DailyPick;
  nextUnsolved: { slug: string; title: string } | null;
  total: number;
  solvedCount: number;
}) {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
        .from(".rg-line", { yPercent: 115, duration: 1.05, stagger: 0.12 })
        .from(".rg-fade", { y: 24, opacity: 0, duration: 0.85, stagger: 0.08 }, "-=0.6")
        .from(".rg-3d", { opacity: 0, scale: 1.05, duration: 1.6 }, 0);
      gsap.to(".rg-bg", {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#07070e] text-white">
      <div aria-hidden className="rg-bg pointer-events-none absolute inset-0">
        <div className="absolute right-[-120px] top-[-140px] h-[420px] w-[560px] rounded-full bg-[#8b93ff]/12 blur-[130px]" />
        <div className="absolute bottom-[-160px] left-[-120px] h-[360px] w-[440px] rounded-full bg-[#22d3ee]/10 blur-[120px]" />
        <div className="wow-grid-bg absolute inset-0 opacity-70" />
      </div>
      <div aria-hidden className="rg-3d absolute inset-0 transform-gpu will-change-transform">
        <RoguePlanet3D paused={paused || scrolling} />
      </div>
      {/* readability: text lives left, fade at the bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07070e]/85 via-[#07070e]/30 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#07070e]" />

      <div className="relative z-20 mx-auto max-w-6xl px-4 pb-14 pt-24 md:pt-32">
        <p className="rg-fade font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white/45">{todayLabel}</p>
        <p className="rg-fade mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
          <Telescope className="h-3.5 w-3.5 text-[#8b93ff]" />
          Deep field // unknown questions ahead
        </p>

        <h1 className="wow-font-display mt-6 max-w-3xl text-6xl leading-[0.92] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] md:text-8xl">
          <span className="block overflow-hidden pb-1"><span className="rg-line block">EXPECT THE</span></span>
          <span className="block overflow-hidden pb-2"><span className="rg-line wow-gradient-text block pb-2">UNEXPECTED.</span></span>
        </h1>

        <p className="rg-fade mt-5 max-w-xl text-balance text-[15px] font-medium leading-relaxed text-white/70 md:text-base">
          {firstName}, interviews never ask the question you rehearsed. A new
          challenge lands here every day — solve it, keep your streak alive,
          and walk in ready for anything.
        </p>

        <div className="rg-fade mt-8 flex flex-wrap items-center gap-3">
          {daily ? (
            <Link
              href={`/challenges/${daily.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[13px] font-black uppercase tracking-wider text-black shadow-[0_6px_24px_-8px_rgba(255,255,255,0.5)] transition hover:scale-105 active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              {daily.solved ? "Solve it again" : "Solve today's challenge"}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3 font-mono text-[12px] uppercase tracking-wider text-white/50">
              No challenges yet — check back soon
            </span>
          )}
          <a
            href="#catalog"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-7 py-3 text-[13px] font-black uppercase tracking-wider text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/[0.1]"
          >
            Browse all <ArrowDown className="h-4 w-4" />
          </a>
        </div>
        {daily?.solved && nextUnsolved && (
          <p className="rg-fade mt-3 text-xs text-white/50">
            Already done today?{" "}
            <Link href={`/challenges/${nextUnsolved.slug}`} className="font-bold text-[#ffe600] transition hover:text-white">
              Try “{nextUnsolved.title.length > 40 ? `${nextUnsolved.title.slice(0, 40)}…` : nextUnsolved.title}” →
            </Link>
          </p>
        )}

        <div className="rg-fade mt-8 flex flex-wrap items-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55 sm:gap-10">
          <span className="flex items-center gap-2">
            <Flame className={`h-4 w-4 ${streak > 0 ? "fill-current text-orange-400" : "text-white/30"}`} />
            <strong className="wow-font-display text-xl normal-case tabular-nums tracking-normal text-white"><CountUp value={streak} /></strong>
            day streak{streak === 1 ? "" : "s"}
          </span>
          <span><strong className="wow-font-display text-xl normal-case tabular-nums tracking-normal text-white"><CountUp value={solvedCount} /></strong> solved</span>
          <span><strong className="wow-font-display text-xl normal-case tabular-nums tracking-normal text-white">{total}</strong> challenges</span>
          <span className={checkedIn ? "text-emerald-400" : "text-amber-400"}>
            {checkedIn ? "✓ Practiced today" : "○ Not yet today"}
          </span>
        </div>
      </div>
    </section>
  );
}
