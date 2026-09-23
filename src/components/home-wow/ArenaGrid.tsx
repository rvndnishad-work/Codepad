"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/components/wow/motion";
import { Flame, Clock, Swords, ArrowRight, Crown, Lock } from "lucide-react";
import RevealLines from "@/components/wow/RevealLines";

gsap.registerPlugin(ScrollTrigger);

export type ArenaPick = {
  slug: string;
  title: string;
  difficulty: string;
  lang: string;
  minutes: number;
  attempts: number;
  featured: boolean;
  premium: boolean;
  tags: string[];
};

const DIFF: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "rgb(var(--c-success))" },
  medium: { label: "Medium", color: "rgb(var(--c-warning))" },
  hard: { label: "Hard", color: "rgb(var(--c-danger))" },
};

export default function ArenaGrid({ picks }: { picks: ArenaPick[] }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".wow-arena-card").forEach((card) => {
        gsap.from(card, {
          y: 60, opacity: 0, duration: 0.9, ease: "expo.out",
          scrollTrigger: { trigger: card, start: "top 88%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-secondary/15 blur-[130px]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-subtle"><Swords className="h-4 w-4" /> featured challenges</p>
            <RevealLines className="wow-font-display mt-3 text-4xl md:text-5xl lg:text-6xl" lines={[<span key="l0">Pick a problem.</span>, <span key="l1">Beat the tests<span className="text-accent">.</span></span>]} />
          </div>
          <Link href="/challenges" className="group flex w-fit items-center gap-2 rounded-full border border-border bg-panel px-6 py-3 text-xs font-semibold transition hover:border-fg/30">
            All challenges <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {picks.map((c) => {
            const d = DIFF[c.difficulty] ?? { label: c.difficulty, color: "rgb(var(--c-accent-2))" };
            return (
              <article key={c.slug} data-spotlight className="wow-arena-card wow-card-glow group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-panel p-5">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest">
                  {c.featured && <span className="flex items-center gap-1 rounded-full bg-fg px-2.5 py-0.5 font-semibold text-bg"><Flame className="h-3 w-3" aria-hidden /> staff pick</span>}
                  {c.premium && <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 font-bold text-accent-ink"><Crown className="h-3 w-3" aria-hidden /> pro</span>}
                  <span className="min-w-0 max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-muted">{c.lang}</span>
                </div>
                <h3 className="mt-4 line-clamp-2 min-h-[2.5em] text-xl font-semibold leading-tight tracking-tight">{c.title}</h3>
                {c.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-md border border-border px-2 py-0.5 font-mono text-xs text-subtle">{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center gap-2 pt-5 font-mono text-xs uppercase tracking-widest text-subtle">
                  <span className="rounded-full px-2.5 py-0.5 font-bold text-bg" style={{ background: d.color }}>{d.label}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden /> {c.minutes}m</span>
                  {c.attempts > 0 && <span className="ml-auto tabular-nums">{c.attempts} {c.attempts === 1 ? "attempt" : "attempts"}</span>}
                </div>
                <Link
                  href={`/challenges/${c.slug}`}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-elevated py-2.5 text-[13px] font-medium transition group-hover:border-transparent group-hover:bg-accent group-hover:text-accent-ink"
                >
                  {c.premium ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <span aria-hidden>▶</span>}
                  {c.premium ? "Unlock challenge" : "Start challenge"}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
