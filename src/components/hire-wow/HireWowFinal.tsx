"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

gsap.registerPlugin(ScrollTrigger);

/** Closing band for hiring teams: deep indigo, one ask. */
export default function HireWowFinal({ ctaHref, signedIn }: { ctaHref: string; signedIn: boolean }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".wow-hire-final-title > span > span", {
        yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 72%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <footer ref={root} className="wow-noise relative overflow-hidden bg-[#0c1030] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-200px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#4f46e5]/30 blur-[130px]" />
        <div className="wow-grid-bg absolute inset-0 opacity-70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-20 md:pt-28">
        <WowReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#a5b4fc]">◆ your next opening, minus the pile</p>
        </WowReveal>
        <h2 className="wow-hire-final-title wow-font-display mt-4 text-[13vw] leading-[0.9] md:text-[6.5rem]">
          <span className="block overflow-hidden"><span className="block">MAKE YOUR NEXT</span></span>
          <span className="block overflow-hidden"><span className="wow-gradient-boss block pb-2">HIRE THE OBVIOUS ONE.</span></span>
        </h2>

        <WowReveal delay={0.1}>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
            <Link href={ctaHref} className="group flex w-fit items-center gap-2 rounded-full bg-white px-9 py-4 text-sm font-black uppercase tracking-wider text-[#0c1030] transition hover:scale-[1.03]">
              {signedIn ? "Open your workspace" : "Create a workspace"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/pricing" className="flex w-fit items-center gap-2 rounded-full border border-white/25 px-9 py-[14px] text-sm font-bold uppercase tracking-wider text-white transition hover:border-white/60 hover:bg-white/5">
              Compare plans
            </Link>
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/50 md:ml-auto">Pilot friendly · Cancel anytime</p>
          </div>
        </WowReveal>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-6 font-mono text-[11px] uppercase tracking-widest text-white/50 md:flex-row md:items-center">
          <span>© 2026 Interviewpad — hire on evidence</span>
          <div className="flex items-center gap-5">
            <Link href="/" className="transition hover:text-white">Developers →</Link>
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/blog" className="transition hover:text-white">Blog</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
