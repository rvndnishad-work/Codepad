"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Mail } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";
import { prefersReducedMotion } from "@/components/wow/motion";
import type { Tone } from "./tone";

gsap.registerPlugin(ScrollTrigger);

export type FinalCopy = {
  eyebrow: string;
  lines: [string, string];
  primary: { href: string; label: string };
  links: { href: string; label: string }[];
  contact?: string;
};

/** Closing band with the brand ask and a contact line. */
export default function AboutFinal({ tone, copy }: { tone: Tone; copy: FinalCopy }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(".about-final-title > span > span", {
        yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 72%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="wow-noise relative overflow-hidden bg-surface text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className={`absolute left-1/2 top-[-220px] h-[460px] w-[860px] -translate-x-1/2 rounded-full blur-[130px] ${tone.blobA}`} />
        <div className="wow-grid-bg absolute inset-0 opacity-70" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 md:pb-28 md:pt-28">
        <WowReveal>
          <p className={`font-mono text-xs uppercase tracking-[0.12em] ${tone.text}`}>{copy.eyebrow}</p>
        </WowReveal>
        <h2 className="about-final-title wow-font-display mt-4 text-[13vw] leading-[0.9] md:text-[6.5rem]">
          <span className="block overflow-hidden"><span className="block">{copy.lines[0]}</span></span>
          <span className="block overflow-hidden"><span className={`block pb-2 ${tone.gradient}`}>{copy.lines[1]}</span></span>
        </h2>

        <WowReveal delay={0.1}>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
            <Link href={copy.primary.href} className="group flex w-fit items-center gap-2 rounded-full bg-ink px-9 py-4 text-sm font-semibold text-ink-fg transition hover:scale-[1.03]">
              {copy.primary.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {copy.links.map((l) => (
              <Link key={l.href} href={l.href} className="flex w-fit items-center gap-2 rounded-full border border-fg/30 px-7 py-[14px] text-sm font-semibold text-fg transition hover:border-fg/60 hover:bg-fg/5">
                {l.label}
              </Link>
            ))}
            {copy.contact && (
              <a href={`mailto:${copy.contact}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-subtle transition hover:text-fg md:ml-auto">
                <Mail className="h-3.5 w-3.5" /> {copy.contact}
              </a>
            )}
          </div>
        </WowReveal>
      </div>
    </section>
  );
}
