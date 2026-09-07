"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Box, Newspaper, Trophy, Eye, Star } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Stats = {
  total: number;
  publicCount: number;
  privateCount: number;
  totalViews: number;
  pinnedCount: number;
  blogsCount: number;
  challengesCount: number;
};

const CARDS = [
  { key: "total", label: "Code Stars", sub: "shipped into orbit", Icon: Box, accent: "#8b93ff", viz: "split" },
  { key: "blogs", label: "Transmissions", sub: "stories beamed home", Icon: Newspaper, accent: "#22d3ee", viz: "dots" },
  { key: "challenges", label: "Missions", sub: "trials authored", Icon: Trophy, accent: "#ffd166", viz: "dots" },
  { key: "views", label: "Light-Years", sub: "eyeballs travelled", Icon: Eye, accent: "#ff2fb3", viz: "pulse" },
  { key: "pinned", label: "North Stars", sub: "pinned to the sky", Icon: Star, accent: "#fff7e0", viz: "dots" },
] as const;

type VizKind = (typeof CARDS)[number]["viz"];

/** Deterministic pseudo-random (mulberry-ish) so SSR and client agree. */
function seeded(seed: number) {
  let s = seed * 1013904223 + 987643211;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967295;
  };
}

/** Public/private split bar for the Code Stars card. */
function SplitViz({ a, b, accent }: { a: number; b: number; accent: string }) {
  const total = a + b;
  const pctA = total === 0 ? 50 : Math.round((a / total) * 100);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
        <div className="rounded-full bg-gradient-to-r from-[#8b93ff] to-[#22d3ee]" style={{ width: `${pctA}%` }} />
        <div className="rounded-full bg-gradient-to-r from-[#ffd166] to-[#ff2fb3]" style={{ width: `${100 - pctA}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(238,240,255,0.5)]">
        <span><span className="font-bold text-[#8b93ff]">{a}</span> public</span>
        <span><span className="font-bold text-[#ffd166]">{b}</span> private</span>
      </div>
    </div>
  );
}

/** Orbit dots: one lit star per item, capped at ten. */
function DotsViz({ value, accent }: { value: number; accent: string }) {
  const lit = Math.min(10, value);
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            data-gx-dot={i < lit ? "lit" : "dim"}
            className="h-1.5 w-1.5 rounded-full"
            style={
              i < lit
                ? { background: accent, boxShadow: `0 0 8px ${accent}` }
                : { background: "rgba(255,255,255,0.12)" }
            }
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(238,240,255,0.5)]">
        {value === 0 ? "empty orbit — launch one" : `${value} in formation`}
      </p>
    </div>
  );
}

/** Signal pulse: seeded bar spectrum for total views. */
function PulseViz({ value, accent, seed }: { value: number; accent: string; seed: number }) {
  const rnd = seeded(seed + value * 31 + 7);
  const bars = Array.from({ length: 16 }, () => 18 + Math.floor(rnd() * 82));
  return (
    <div>
      <div className="flex h-9 items-end gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            data-gx-bar
            className="w-full origin-bottom rounded-sm"
            style={{ height: `${h}%`, background: `linear-gradient(180deg, ${accent}, ${accent}44)`, opacity: 0.45 + (h / 100) * 0.55 }}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(238,240,255,0.5)]">
        {value.toLocaleString()} total views
      </p>
    </div>
  );
}

/**
 * Deep-space instruments: ghost numeral watermarks, orbital icon rings,
 * twinkling starfields and a live micro-visualization per card. Values
 * count up on scroll; bars and dots ignite with a stagger.
 */
export default function DashboardStats({ stats }: { stats: Stats }) {
  const root = useRef<HTMLDivElement>(null);
  const values: Record<string, number> = {
    total: stats.total,
    blogs: stats.blogsCount,
    challenges: stats.challengesCount,
    views: stats.totalViews,
    pinned: stats.pinnedCount,
  };

  useLayoutEffect(() => {
    if (!root.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.current.querySelectorAll("[data-gx-count]").forEach((el) => {
        el.textContent = (el as HTMLElement).dataset.value ?? "0";
      });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.from("[data-gx-card]", {
        y: 40,
        opacity: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: "top 88%" },
      });
      root.current!.querySelectorAll<HTMLElement>("[data-gx-count]").forEach((el) => {
        const target = Number(el.dataset.value ?? 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%" },
          onUpdate: () => {
            el.textContent = Math.round(obj.v).toLocaleString();
          },
        });
      });
      gsap.from("[data-gx-bar]", {
        scaleY: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.03,
        scrollTrigger: { trigger: root.current, start: "top 88%" },
      });
      gsap.from("[data-gx-dot='lit']", {
        scale: 0,
        duration: 0.45,
        ease: "back.out(2.5)",
        stagger: 0.05,
        scrollTrigger: { trigger: root.current, start: "top 88%" },
      });
    }, root);
    return () => ctx.revert();
  }, [stats.total, stats.blogsCount, stats.challengesCount, stats.totalViews, stats.pinnedCount]);

  return (
    <div ref={root} className="gx mb-8 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
      {CARDS.map(({ key, label, sub, Icon, accent, viz }) => {
        const value = values[key] ?? 0;
        return (
          <article
            key={key}
            data-gx-card
            className="group relative flex min-h-[218px] flex-col overflow-hidden rounded-[26px] border border-white/10 p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1.5 hover:border-white/25"
            style={{ background: `linear-gradient(165deg, ${accent}26 0%, rgba(10,12,30,0.9) 46%, rgba(5,6,18,0.95) 100%)` }}
          >
            {/* starfield speckle */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 0.6px, transparent 0.7px)", backgroundSize: "22px 22px" }}
            />
            {/* spectral orb */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl transition-opacity duration-500 opacity-50 group-hover:opacity-90"
              style={{ background: `radial-gradient(circle, ${accent}66, transparent 65%)` }}
            />
            {/* ghost numeral */}
            <span
              aria-hidden
              className="gx-display pointer-events-none absolute -bottom-7 right-2 select-none text-[92px] font-extrabold leading-none tabular-nums text-white/[0.07] transition-colors duration-500 group-hover:text-white/[0.12]"
            >
              {value > 999 ? `${Math.floor(value / 1000)}k` : value}
            </span>
            {/* shine sweep */}
            <span aria-hidden className="gx-shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative mb-4 flex items-center justify-between">
              <span className="relative grid h-12 w-12 place-items-center rounded-full border" style={{ borderColor: `${accent}66`, background: `radial-gradient(circle at 35% 30%, ${accent}33, rgba(0,0,0,0.5) 70%)`, color: accent }}>
                <Icon className="h-5 w-5" />
                <span className="gx-twinkle absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(238,240,255,0.4)]">
                {String(CARDS.findIndex((c) => c.key === key) + 1).padStart(2, "0")} / 05
              </span>
            </div>

            <p data-gx-count data-value={value} className="gx-display relative text-4xl font-extrabold tabular-nums text-white">
              0
            </p>
            <p className="relative mt-1 text-sm font-bold text-white">{label}</p>
            <p className="relative mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[rgba(238,240,255,0.45)]">{sub}</p>

            <div className="relative mt-auto">
              {viz === "split" && <SplitViz a={stats.publicCount} b={stats.privateCount} accent={accent} />}
              {viz === "dots" && <DotsViz value={value} accent={accent} />}
              {viz === "pulse" && <PulseViz value={value} accent={accent} seed={11} />}
            </div>
          </article>
        );
      })}
    </div>
  );
}
