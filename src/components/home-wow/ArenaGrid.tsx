"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flame, Clock, Swords, ArrowRight, Crown, Lock } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export type ArenaPick = {
  slug: string;
  title: string;
  difficulty: string;
  lang: string;
  minutes: number;
  solves: number;
  featured: boolean;
  premium: boolean;
  tags: string[];
  img: string;
};

const DIFF: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "#34d399" },
  medium: { label: "Medium", color: "#fbbf24" },
  hard: { label: "Hard", color: "#ff2fb3" },
};

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 12;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  };
  const onLeave = () => { ref.current!.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)"; };
  return <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`wow-tilt ${className ?? ""}`}>{children}</div>;
}

export default function ArenaGrid({ picks }: { picks: ArenaPick[] }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".wow-arena-card").forEach((card, i) => {
        gsap.from(card, {
          y: 80, opacity: 0, rotation: i % 2 ? 3 : -3, duration: 0.9, ease: "expo.out",
          scrollTrigger: { trigger: card, start: "top 88%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden bg-[var(--wow-bg-2)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--wow-glow-a)] blur-[130px]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#ff2fb3]"><Swords className="h-4 w-4" /> tonight in the arena</p>
            <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">FRESH<br />BOSS FIGHTS<span className="text-[#ff2fb3]">.</span></h2>
          </div>
          <Link href="/challenges" className="group flex w-fit items-center gap-2 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] px-6 py-3 text-xs font-bold uppercase tracking-wider transition hover:border-[#ff2fb3]">
            All fights <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {picks.map((c) => {
            const d = DIFF[c.difficulty] ?? { label: c.difficulty, color: "#8b93ff" };
            return (
              <TiltCard key={c.slug} className="wow-arena-card">
                <article className="wow-card-glow group relative h-full overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm">
                  <div className="relative h-44 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-1" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {c.featured && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#ff2fb3] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white"><Flame className="h-3 w-3" /> staff pick</span>}
                    <span className="absolute right-3 top-3 max-w-[55%] truncate rounded-full bg-black/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur">{c.lang}</span>
                    {c.premium && <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-[#ffe600] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black"><Crown className="h-3 w-3" /> pro</span>}
                  </div>
                  <div className="wow-tilt-inner p-5">
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--wow-faint)]">
                      <span className="rounded-full px-2.5 py-0.5 font-bold text-black" style={{ background: d.color }}>{d.label}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.minutes}m</span>
                      <span className="ml-auto tabular-nums">{c.solves} solves</span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 min-h-[3.2em] text-xl font-extrabold tracking-tight">{c.title}</h3>
                    {c.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.tags.map((t) => (
                          <span key={t} className="rounded-md border border-[var(--wow-card-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--wow-faint)]">{t}</span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/challenges/${c.slug}`}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--wow-card-border)] bg-[var(--wow-chip)] py-2.5 text-xs font-black uppercase tracking-widest transition group-hover:border-transparent group-hover:bg-[#ffe600] group-hover:text-black"
                    >
                      {c.premium ? <Lock className="h-3.5 w-3.5" /> : <span aria-hidden>▶</span>}
                      {c.premium ? "Unlock fight" : "Fight boss"}
                    </Link>
                  </div>
                </article>
              </TiltCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
