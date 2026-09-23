"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prefersReducedMotion } from "./motion";

gsap.registerPlugin(ScrollTrigger);

export default function WowFinal() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(".wow-wave-1", {
        xPercent: -12, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 1.2 },
      });
      gsap.to(".wow-wave-2", {
        xPercent: 12, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 1.2 },
      });
      gsap.from(".wow-final-title span", {
        yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    // A closing CTA band, not a footer: the global <Footer /> renders right
    // after it and owns the links, socials and copyright.
    <section ref={root} className="wow-noise relative overflow-hidden bg-[#ffe600] text-black">
      {/* morphing SVG waves on top edge. Wave 2 scrubs right by 12% of its
          own width, so it starts pulled left by more than that to keep its
          left end off-screen for the whole tween. */}
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block h-[70px] w-[130%] md:h-[90px]" aria-hidden>
        <path className="wow-wave-1" d="M0,50 C240,95 360,5 600,45 S960,90 1200,40 S1380,60 1440,45 L1440,0 L0,0 Z" fill="#08080f" />
      </svg>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="wow-wave-2 -ml-[16%] -mt-[70px] block h-[70px] w-[130%] opacity-60 md:-mt-[90px] md:h-[90px]" aria-hidden>
        <path d="M0,60 C260,10 420,85 660,50 S1000,15 1220,55 S1390,70 1440,55 L1440,0 L0,0 Z" fill="#ff2fb3" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 md:pb-20 md:pt-20">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]">✦ final boss — your career</p>
        <h2 className="wow-final-title wow-font-display mt-4 text-[16vw] leading-[0.85] md:text-[8.5rem]">
          <span className="block overflow-hidden"><span className="block">WALK IN</span></span>
          <span className="block overflow-hidden"><span className="block">PREPARED<span className="text-[#ff2fb3]">.</span></span></span>
        </h2>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <Link href="/login" className="group flex w-fit items-center gap-2 rounded-full bg-black px-9 py-4 text-sm font-black uppercase tracking-wider text-[#ffe600] transition hover:scale-105 hover:rotate-1">
            Create free account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/challenges" className="flex w-fit items-center gap-2 rounded-full border-2 border-black px-9 py-[14px] text-sm font-black uppercase tracking-wider transition hover:bg-black hover:text-[#ffe600]">
            Browse the arena
          </Link>
          <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-widest md:ml-auto md:items-end">
            <p className="opacity-70">No card · No install · Just press start</p>
            <Link href="/hire" className="w-fit py-1 underline underline-offset-4 hover:no-underline">Hiring? Enter boss mode →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
