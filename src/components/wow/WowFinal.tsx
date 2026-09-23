"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { FaGithub as Github, FaTwitter as Twitter, FaYoutube as Youtube } from "react-icons/fa6";

gsap.registerPlugin(ScrollTrigger);

export default function WowFinal() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
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
    <footer ref={root} className="wow-noise relative overflow-hidden bg-[#ffe600] text-black">
      {/* morphing SVG waves on top edge */}
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block h-[70px] w-[130%] md:h-[90px]" aria-hidden>
        <path className="wow-wave-1" d="M0,50 C240,95 360,5 600,45 S960,90 1200,40 S1380,60 1440,45 L1440,0 L0,0 Z" fill="#08080f" />
      </svg>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="wow-wave-2 -mt-[70px] block h-[70px] w-[130%] opacity-60 md:-mt-[90px] md:h-[90px]" aria-hidden>
        <path d="M0,60 C260,10 420,85 660,50 S1000,15 1220,55 S1390,70 1440,55 L1440,0 L0,0 Z" fill="#ff2fb3" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-14 md:pt-20">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]">✦ final boss — your career</p>
        <h2 className="wow-final-title wow-font-display mt-4 text-[16vw] leading-[0.85] md:text-[8.5rem]">
          <span className="block overflow-hidden"><span className="block">WALK IN</span></span>
          <span className="block overflow-hidden"><span className="block">PREPARED<span className="text-[#ff2fb3]">.</span></span></span>
        </h2>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <a href="/login" className="group flex w-fit items-center gap-2 rounded-full bg-black px-9 py-4 text-sm font-black uppercase tracking-wider text-[#ffe600] transition hover:scale-105 hover:rotate-1">
            Create free account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a href="/challenges" className="flex w-fit items-center gap-2 rounded-full border-2 border-black px-9 py-[14px] text-sm font-black uppercase tracking-wider transition hover:bg-black hover:text-[#ffe600]">
            Browse the arena
          </a>
          <p className="font-mono text-[11px] uppercase tracking-widest opacity-70 md:ml-auto">No card · No install · Just press start</p>
        </div>

        {/* giant marquee */}
        <div className="mt-12 overflow-hidden border-t-2 border-black/80 pt-4">
          <div className="wow-marquee-track wow-font-display text-4xl md:text-6xl">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="mx-6 whitespace-nowrap">INTERVIEWPAD ✦ PLAY ✦ PROVE ✦ GET HIRED ✦</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t-2 border-black/80 pt-6 font-mono text-[11px] uppercase tracking-widest md:flex-row md:items-center">
          <span>© 2026 Interviewpad — practice, prove, get hired</span>
          <div className="flex items-center gap-3">
            <a href="/blog" aria-label="Blog" className="rounded-full border border-black/40 p-2.5 transition hover:bg-black hover:text-[#ffe600]"><Twitter className="h-4 w-4" /></a>
            <a href="/playgrounds" aria-label="Playgrounds" className="rounded-full border border-black/40 p-2.5 transition hover:bg-black hover:text-[#ffe600]"><Github className="h-4 w-4" /></a>
            <a href="/creators" aria-label="Creators" className="rounded-full border border-black/40 p-2.5 transition hover:bg-black hover:text-[#ffe600]"><Youtube className="h-4 w-4" /></a>
            <a href="/hire" className="ml-2 underline underline-offset-4 hover:no-underline">Hiring? Enter boss mode →</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
