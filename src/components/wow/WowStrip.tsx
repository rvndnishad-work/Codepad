"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STACK = ["JavaScript", "TypeScript", "React", "Python", "SQL", "System Design", "DSA", "Next.js", "Node.js", "AI Prompts", "Angular", "Vue"];
const SNAPS = [
  { src: "/images/wow/study-squad.jpg", cap: "study squads" },
  { src: "/images/wow/whiteboard-wars.jpg", cap: "whiteboard wars" },
  { src: "/images/wow/setup-dark.jpg", cap: "dark-mode grind" },
  { src: "/images/wow/macbook.jpg", cap: "macbook + matcha" },
];

export default function WowStrip() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".wow-reveal").forEach((el) => {
        gsap.from(el, {
          y: 50, opacity: 0, duration: 0.9, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative bg-[#08080f] py-20 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <p className="wow-reveal text-center font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">stack coverage — no setup, just spawn</p>
        <div className="wow-reveal mt-6 flex flex-wrap justify-center gap-2.5">
          {STACK.map((s, i) => (
            <span key={s} className="wow-card-glow cursor-default rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition hover:border-[#ffe600] hover:text-[#ffe600]" style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
              {s}
            </span>
          ))}
        </div>
      </div>
      {/* photo filmstrip */}
      <div className="mt-12 overflow-hidden">
        <div className="wow-marquee-track reverse gap-5 pr-5">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 gap-5">
              {SNAPS.map((p) => (
                <figure key={`${k}-${p.cap}`} className="relative h-52 w-80 shrink-0 overflow-hidden rounded-2xl border border-white/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.cap} className="h-full w-full object-cover" loading="lazy" />
                  <figcaption className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur">{p.cap}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
