"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowLeft, Binary, Braces, Clock, FlaskConical, LayoutTemplate, Lock, Eye } from "lucide-react";

const KIND_ICON = { algorithms: Binary, ui: LayoutTemplate, js: Braces } as const;
const KIND_TINT: Record<string, string> = {
  algorithms: "#38bdf8",
  ui: "#a78bfa",
  js: "#fbbf24",
};
const KIND_GRADING: Record<string, string> = {
  algorithms: "Auto-graded",
  ui: "Human review",
  js: "Auto-graded",
};
const DIFF_DOT: Record<string, string> = {
  easy: "bg-emerald-400",
  medium: "bg-amber-400",
  hard: "bg-rose-400",
};

/**
 * BRIEFING HERO v2 — a real mission dossier masthead for /challenges/[slug].
 * Oversized display title, a glass parameter band (difficulty · time ·
 * questions · grading), tag strip, giant watermark glyph and type-tinted
 * atmosphere. GSAP masked entrance. Carries `data-dark-hero` so the navbar
 * floats transparent. All content arrives as serializable props.
 */
export default function ChallengeBriefingHero({
  kind,
  typeLabel,
  category,
  title,
  difficulty,
  minutes,
  steps,
  isMulti,
  visibility,
  tags,
}: {
  kind: keyof typeof KIND_ICON;
  typeLabel: string;
  category: string | null;
  title: string;
  difficulty: string;
  minutes: number;
  steps: number;
  isMulti: boolean;
  visibility: string;
  tags: string[];
}) {
  const root = useRef<HTMLElement>(null);
  const tint = KIND_TINT[kind] ?? "#8b93ff";
  const Icon = KIND_ICON[kind];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".cb-line", { yPercent: 115, duration: 1.05, stagger: 0.1 })
        .from(".cb-fade", { y: 22, opacity: 0, duration: 0.8, stagger: 0.07 }, "-=0.65")
        .from(".cb-mark", { opacity: 0, scale: 0.9, rotate: -5, duration: 1.2 }, "-=0.9")
        .from(".cb-param", { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, "-=0.7");
    }, root);
    return () => ctx.revert();
  }, []);

  const params = [
    { icon: null, dot: DIFF_DOT[difficulty] ?? "bg-white/60", label: "Difficulty", value: difficulty },
    { icon: Clock, label: "Time", value: `~${minutes}m` },
    { icon: null, dot: null, label: isMulti ? "Questions" : "Format", value: isMulti ? `${steps} steps` : "Single" },
    { icon: KIND_GRADING[kind] === "Auto-graded" ? FlaskConical : Eye, label: "Grading", value: KIND_GRADING[kind] },
  ];

  return (
    <section ref={root} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#08080f] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[6%] h-[420px] w-[640px] rounded-full blur-[140px]" style={{ backgroundColor: tint, opacity: 0.15 }} />
        <div className="absolute -bottom-40 -left-24 h-[340px] w-[460px] rounded-full bg-[#8b93ff]/10 blur-[120px]" />
        <div className="wow-grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black_60%,transparent_98%)]" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08080f]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#08080f]" />

      <div aria-hidden className="cb-mark pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 opacity-[0.12] lg:block">
        <Icon className="h-80 w-80" strokeWidth={0.8} />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-32 sm:px-6">
        <Link
          href="/challenges"
          className="cb-fade inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/45 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All challenges
        </Link>

        <div className="cb-fade mt-7 flex items-center gap-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md"
            style={{ boxShadow: `0 0 36px -8px ${tint}` }}
          >
            <Icon className="h-5 w-5" style={{ color: tint }} />
          </span>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">
            <span style={{ color: tint }}>{typeLabel} challenge</span>
            {category && <span className="text-white/35"> · {category}</span>}
          </p>
        </div>

        <h1 className="mt-4 max-w-4xl text-[13vw] font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] sm:text-6xl md:text-7xl">
          <span className="block overflow-hidden pb-2"><span className="cb-line block">{title}</span></span>
        </h1>

        {/* parameter band */}
        <div className="mt-8 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md sm:grid-cols-4">
          {params.map((p) => (
            <div key={p.label} className="cb-param bg-[#0b0d16]/90 px-4 py-3.5">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                {p.icon && <p.icon className="h-3 w-3" />}
                {p.dot && <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />}
                {p.label}
              </p>
              <p className="mt-1 truncate text-[15px] font-extrabold capitalize text-white">{p.value}</p>
            </div>
          ))}
        </div>

        {visibility === "private" && (
          <p className="cb-fade mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Lock className="h-3 w-3" /> Private
          </p>
        )}

        {tags.length > 0 && (
          <div className="cb-fade mt-4 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/55 transition-colors hover:border-white/25 hover:text-white/85"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
