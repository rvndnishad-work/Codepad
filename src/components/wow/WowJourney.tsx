"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileCode2, Users, ShieldCheck, Trophy } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  { n: "01", icon: FileCode2, title: "WRITE", color: "#34d399", img: "/images/wow/code-editor.jpg", copy: "A full Monaco workspace in a tab. Multi-file, instant preview, zero install. Your keystrokes already look like a trailer.", code: "const dream = await editor.open('offer.ts')" },
  { n: "02", icon: Users, title: "SQUAD UP", color: "#38bdf8", img: "/images/wow/pair-programming.jpg", copy: "CRDT rooms — friends, mentors, interviewers merge edits live. Cursors everywhere, conflicts nowhere.", code: "room.join('squad') // 4 cursors, 0 conflicts" },
  { n: "03", icon: ShieldCheck, title: "EXECUTE", color: "#fbbf24", img: "/images/wow/code-dark.jpg", copy: "Two-layer sandboxes fire your code in 8 languages. stdout, timing, verdicts — back in milliseconds.", code: "$ run --lang=any --fast=ms ✓ 3ms" },
  { n: "04", icon: Trophy, title: "PROVE IT", color: "#ff2fb3", img: "/images/wow/hackathon.jpg", copy: "Every run becomes replay + integrity timeline + shareable portfolio. Recruiters watch the film, not the poster.", code: "portfolio.publish() // ★ hired" },
];

/**
 * GSAP-pinned horizontal ride. Desktop: panels slide sideways under a progress bar.
 * Mobile: falls back to vertical stack (no pin).
 */
export default function WowJourney() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const el = track.current!;
      const getX = () => -(el.scrollWidth - window.innerWidth);
      const tween = gsap.to(el, {
        x: getX,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${el.scrollWidth - window.innerWidth + 400}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            gsap.to(".wow-progress-fill", { scaleX: self.progress, duration: 0.2, overwrite: true });
          },
        },
      });
      // SVG path draws as you travel
      gsap.fromTo(".wow-journey-path", { strokeDashoffset: 1200 }, {
        strokeDashoffset: 0, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 1 },
      });
      return () => { tween.scrollTrigger?.kill(); tween.kill(); };
    });
    return () => mm.revert();
  }, []);

  return (
    /* Desktop pin fit: the pinned block must NEVER exceed the viewport height
       (pinned overflow is unreachable by scroll). So on lg the section becomes
       exactly 100svh, chrome compacts, and cards size in svh with min/max
       clamps. Mobile stays a natural vertical stack (no pin, no clamps). */
    <section ref={root} className="relative overflow-hidden bg-[#0b0b16] text-white lg:flex lg:h-[100svh] lg:min-h-[620px] lg:flex-col lg:justify-center lg:overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 md:px-10 lg:pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#22d3ee]">✦ the ride — keep scrolling</p>
        <div className="hidden h-[3px] w-56 overflow-hidden rounded-full bg-white/10 lg:block">
          <div className="wow-progress-fill h-full w-full origin-left scale-x-0 bg-gradient-to-r from-[#ffe600] via-[#ff2fb3] to-[#22d3ee]" />
        </div>
      </div>
      <h2 className="wow-font-display px-4 pt-3 text-5xl md:px-10 lg:pt-2 lg:text-6xl xl:text-7xl">ONE SCROLL.<br />FULL ORIGIN STORY.</h2>

      {/* animated SVG connector */}
      <svg viewBox="0 0 1200 120" className="mt-3 h-10 w-full px-6 lg:h-12" aria-hidden preserveAspectRatio="none">
        <path className="wow-journey-path" d="M0,60 C200,10 300,110 480,60 S760,10 900,60 S1100,90 1200,60" fill="none" stroke="#ffe600" strokeWidth="3" strokeDasharray="1200" strokeLinecap="round" />
        <circle cx="0" cy="60" r="6" fill="#ff2fb3" />
        <circle cx="1200" cy="60" r="6" fill="#22d3ee" />
      </svg>

      <div ref={track} className="flex flex-col gap-6 px-4 pb-24 pt-4 lg:w-max lg:flex-row lg:items-stretch lg:gap-8 lg:px-10 lg:pb-4">
        {STAGES.map((s) => (
          <article key={s.n} className="wow-card-glow group relative w-full shrink-0 overflow-hidden rounded-3xl border border-white/12 lg:h-[46svh] lg:max-h-[520px] lg:min-h-[360px] lg:w-[78vw] xl:w-[62vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <span aria-hidden className="absolute -right-4 -top-10 select-none text-[11rem] font-black leading-none text-white/10 lg:text-[11rem] xl:text-[13rem]">{s.n}</span>
            <div className="relative flex h-full min-h-0 flex-col justify-center gap-3 p-6 md:p-8 xl:gap-4 xl:p-10">
              <span className="w-fit rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black" style={{ background: s.color }}>{s.n} — stage</span>
              <h3 className="wow-font-display flex items-center gap-3 text-5xl md:text-6xl xl:gap-4 xl:text-7xl">
                <s.icon className="h-10 w-10 shrink-0 md:h-12 md:w-12 xl:h-14 xl:w-14" style={{ color: s.color }} /> {s.title}
              </h3>
              <p className="max-w-lg text-[15px] leading-relaxed text-white/75 xl:text-base">{s.copy}</p>
              <code className="w-fit max-w-full truncate rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 font-mono text-[13px] xl:text-sm" style={{ color: s.color }}>{s.code}</code>
              {/* SVG underline draw on hover */}
              <svg viewBox="0 0 300 12" className="h-3 w-56 xl:w-64" aria-hidden>
                <line x1="0" y1="6" x2="300" y2="6" stroke={s.color} strokeWidth="4" strokeLinecap="round" className="wow-svg-dash" />
              </svg>
            </div>
          </article>
        ))}

        {/* end card */}
        <article className="grid w-full shrink-0 place-items-center rounded-3xl border-2 border-dashed border-[#ffe600]/50 bg-[#ffe600]/5 p-8 text-center lg:h-[46svh] lg:max-h-[520px] lg:min-h-[360px] lg:w-[40vw]">
          <div>
            <p className="wow-font-display text-4xl xl:text-5xl">YOUR<br />TURN.</p>
            <a href="/playgrounds" className="mt-5 inline-block rounded-full bg-[#ffe600] px-7 py-3.5 text-sm font-black uppercase tracking-wider text-black hover:scale-105">Open a playground →</a>
          </div>
        </article>
      </div>
    </section>
  );
}
