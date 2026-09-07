"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Plus, Rocket, Zap, Orbit, ChevronDown } from "lucide-react";
import { TemplateLogo } from "@/lib/icons";
import StarLottie from "./galaxy/StarLottie";

const QUICK_TEMPLATES = [
  { id: "react", label: "React Nebula", accent: "#61dafb", angle: -30 },
  { id: "typescript", label: "TypeScript Star", accent: "#3178c6", angle: 90 },
  { id: "empty-js", label: "Blank Comet", accent: "#f7df1e", angle: 210 },
];

/**
 * Full-bleed Milky Way header: no card, edge-to-edge starlight with the
 * galactic band running behind the copy. GSAP choreographs the entrance
 * (eyebrow -> headline -> copy -> CTAs -> launch pods -> scroll cue).
 */
export default function DashboardHero({ userName }: { userName: string | null }) {
  const firstName = userName?.split(" ")[0];
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-gx='eyebrow']", { y: 18, opacity: 0, duration: 0.6 })
        .from("[data-gx='line']", { y: 60, opacity: 0, duration: 0.9, stagger: 0.12 }, "-=0.35")
        .from("[data-gx='copy']", { y: 20, opacity: 0, duration: 0.6 }, "-=0.55")
        .from("[data-gx='cta']", { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.4")
        .from("[data-gx='pod']", { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(1.8)", stagger: 0.12 }, "-=0.45")
        .from("[data-gx='cue']", { opacity: 0, y: -8, duration: 0.6 }, "-=0.2");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="gx relative -mx-4 -mt-8 md:-mt-12">
      <div className="relative flex min-h-[88vh] items-center overflow-hidden px-4 py-20 md:px-8">
        {/* warm core-light washing the headline from behind */}
        <div aria-hidden className="pointer-events-none absolute left-[8%] top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,232,190,0.09),transparent_62%)] blur-2xl" />
        {/* twinkling dust */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {[
            { l: "6%", t: "16%" }, { l: "16%", t: "70%" }, { l: "38%", t: "10%" },
            { l: "52%", t: "84%" }, { l: "70%", t: "14%" }, { l: "88%", t: "56%" },
            { l: "94%", t: "26%" }, { l: "30%", t: "42%" },
          ].map((p, i) => (
            <span
              key={i}
              className="gx-twinkle absolute h-1 w-1 rounded-full bg-white"
              style={{ left: p.l, top: p.t, animationDelay: `${i * 0.6}s` }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p data-gx="eyebrow" className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(255,233,201,0.35)] bg-[rgba(255,233,201,0.06)] px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-[#ffe9c9]">
              <Orbit className="h-3.5 w-3.5" />
              Milky Way Command
            </p>
            <h1 className="gx-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
              <span data-gx="line" className="block">
                {firstName ? `Hey ${firstName},` : "Welcome back,"}
              </span>
              <span data-gx="line" className="gx-gold-text block pb-3">
                chart your next build.
              </span>
            </h1>
            <p data-gx="copy" className="mt-6 max-w-lg text-lg leading-relaxed text-[rgba(238,240,255,0.7)] md:text-xl">
              Your personal observatory for experiments, snippets and social coding — every star is something you shipped.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                data-gx="cta"
                href="/"
                className="gx-btn-star gx-pulse-glow inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffd166] to-[#ff2fb3] px-7 py-4 text-base font-bold text-[#14092b]"
              >
                <Plus className="h-5 w-5" strokeWidth={3} />
                Launch Sandbox
              </Link>
              <Link
                data-gx="cta"
                href="/explore"
                className="gx-btn-star inline-flex items-center gap-2 rounded-2xl border border-[rgba(139,147,255,0.4)] bg-[rgba(13,16,38,0.6)] px-7 py-4 text-base font-bold text-white backdrop-blur"
              >
                <Rocket className="h-5 w-5" />
                Explore the Galaxy
              </Link>
            </div>
          </div>

          {/* Launch cluster: lottie heart + orbiting quick-start pods */}
          <div className="relative mx-auto h-80 w-80 sm:h-96 sm:w-96">
            <div aria-hidden className="gx-spin-slow absolute inset-0 rounded-full border border-dashed border-[rgba(232,238,255,0.25)]" />
            <div aria-hidden className="absolute inset-8 rounded-full border border-[rgba(255,233,201,0.2)]" />
            <div className="absolute inset-0 grid place-items-center">
              <StarLottie size={170} />
            </div>
            {QUICK_TEMPLATES.map((t) => {
              const rad = (t.angle * Math.PI) / 180;
              const x = Math.cos(rad) * 138;
              const y = Math.sin(rad) * 138;
              return (
                <Link
                  key={t.id}
                  data-gx="pod"
                  href={`/play?template=${t.id}`}
                  title={`Open ${t.label} sandbox`}
                  className="group absolute flex items-center gap-2 rounded-2xl border border-[rgba(232,238,255,0.22)] bg-[rgba(8,10,26,0.88)] py-2 pl-2 pr-3 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-[rgba(255,209,102,0.6)] hover:shadow-[0_12px_36px_-12px_rgba(255,209,102,0.55)]"
                  style={{ left: `calc(50% + ${x.toFixed(1)}px)`, top: `calc(50% + ${y.toFixed(1)}px)`, transform: "translate(-50%,-50%)" }}
                >
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"
                    style={{ background: `${t.accent}22` }}
                  >
                    <TemplateLogo id={t.id} size={18} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-bold">{t.label}</span>
                  <Zap className="h-3.5 w-3.5 text-[#ffd166] opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
            <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-[rgba(238,240,255,0.4)]">
              Quick-launch orbit
            </p>
          </div>
        </div>

        {/* scroll cue */}
        <div data-gx="cue" className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <a href="#gx-deck" aria-label="Scroll to your deck" className="flex flex-col items-center gap-1 text-[rgba(238,240,255,0.5)] transition-colors hover:text-white">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Your deck</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </a>
        </div>
        {/* bottom fade into the deck */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#02030a]" />
      </div>
    </section>
  );
}
