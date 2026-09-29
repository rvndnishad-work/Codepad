"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ChevronRight, Eye, FileQuestion, Heart } from "lucide-react";
import { compactNumber } from "@/lib/interview-questions/shared";

const TechLogo3D = dynamic(() => import("./TechLogo3D"), { ssr: false });

/**
 * TECH DOSSIER HERO — the compact dark sub-hero for /interview-questions/[tech].
 * Same Questionverse blood as the parent (noise + grid + masked-line GSAP
 * entrance) but dressed as a sector file: breadcrumb, tech-tinted glows,
 * a rotating, glowing 3D logo of the topic, mono stat readouts and a difficulty spectrum strip.
 * All data arrives as serializable props from the server page.
 */
export default function TechDossierHero({
  tech,
  label,
  tagline,
  hex,
  total,
  views,
  likes,
  diff,
}: {
  tech: string;
  label: string;
  tagline: string;
  hex: string;
  total: number;
  views: number;
  likes: number;
  diff: { easy: number; medium: number; hard: number };
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".td-line", { yPercent: 115, duration: 1, stagger: 0.1 })
        .from(".td-fade", { y: 22, opacity: 0, duration: 0.8, stagger: 0.07 }, "-=0.6")
        .from(".td-mark", { opacity: 0, scale: 0.9, rotate: -4, duration: 1.1 }, "-=0.8");
    }, root);
    return () => ctx.revert();
  }, []);

  const segs = [
    { n: diff.easy, c: "bg-emerald-500", label: `Easy ${diff.easy}` },
    { n: diff.medium, c: "bg-amber-500", label: `Medium ${diff.medium}` },
    { n: diff.hard, c: "bg-rose-500", label: `Hard ${diff.hard}` },
  ];

  return (
    <section ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#08080f] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[-140px] h-[340px] w-[560px] rounded-full blur-[120px]" style={{ backgroundColor: hex, opacity: 0.16 }} />
        <div className="absolute bottom-[-160px] right-[-100px] h-[300px] w-[420px] rounded-full bg-[#8b93ff]/15 blur-[110px]" />
        <div className="wow-grid-bg absolute inset-0" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08080f]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-24 md:pt-28">
        {/* the topic logo in 3D: a small badge on phones, a centrepiece beside the text from md */}
        <div
          aria-hidden
          className="td-mark pointer-events-none absolute right-0 top-[70px] h-24 w-24 md:right-4 md:top-[calc(50%+2.25rem)] md:h-[280px] md:w-[280px] md:-translate-y-1/2 lg:h-[420px] lg:w-[420px]"
        >
          <TechLogo3D tech={tech} />
        </div>

        {/* breadcrumb back to the archive */}
        <nav aria-label="Breadcrumb" className="td-fade flex max-w-[calc(100%-5rem)] items-center md:max-w-none gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
          <Link href="/interview-questions" className="transition-colors hover:text-white">
            Questionverse
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-white/85">{label}</span>
        </nav>

        <p className="td-fade mt-5 inline-flex max-w-[calc(100%-5rem)] items-center md:max-w-none gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
          <FileQuestion className="h-3.5 w-3.5" style={{ color: hex }} />
          Sector file // {tech}
        </p>

        <h1 className="wow-font-display mt-4 text-5xl md:max-w-[calc(100%-300px)] lg:max-w-[calc(100%-440px)] leading-[0.95] drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)] sm:text-6xl md:text-7xl">
          <span className="block overflow-hidden pb-1"><span className="td-line block">{label.toUpperCase()}</span></span>
          <span className="block overflow-hidden pb-2"><span className="td-line wow-gradient-text block pb-2">DECODED.</span></span>
        </h1>

        <p className="td-fade mt-4 max-w-2xl text-[15px] md:max-w-[min(42rem,calc(100%-300px))] lg:max-w-[min(42rem,calc(100%-440px))] font-medium leading-relaxed text-white/70">
          {tagline}
        </p>

        {/* stat readouts + spectrum */}
        <div className="td-fade mt-7 flex flex-wrap md:max-w-[calc(100%-300px)] lg:max-w-[calc(100%-440px)] items-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
          <span><strong className="wow-font-display text-2xl normal-case tabular-nums tracking-normal text-white">{total}</strong> Questions</span>
          <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /><strong className="wow-font-display text-2xl normal-case tabular-nums tracking-normal text-white">{compactNumber(views)}</strong> Views</span>
          <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /><strong className="wow-font-display text-2xl normal-case tabular-nums tracking-normal text-white">{compactNumber(likes)}</strong> Upvotes</span>
        </div>

        {total > 0 && (
          <div className="td-fade mt-5 max-w-xl">
            <div className="flex h-2 w-full gap-1 overflow-hidden">
              {segs.filter((s) => s.n > 0).map((s) => (
                <span
                  key={s.c}
                  title={s.label}
                  style={{ flexGrow: s.n }}
                  className={`min-w-4 rounded-full ${s.c}`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
              <span className="text-emerald-400">{diff.easy} easy</span>
              <span className="text-amber-400">{diff.medium} med</span>
              <span className="text-rose-400">{diff.hard} hard</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
