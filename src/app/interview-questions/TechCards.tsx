"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";
import TechSvg from "@/components/TechSvg";
import { getSolved } from "@/lib/interview-questions/progress";
import { getTechMeta } from "@/lib/interview-questions/techTheme";
import { SpotlightGroup, SpotlightCard } from "@/components/scroll/SpotlightGroup";

interface TechStats {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

/** Pointer-tracked 3D tilt (springs) — disabled for reduced motion. */
function TiltModule({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 180, damping: 16 });
  const ry = useSpring(0, { stiffness: 180, damping: 16 });
  if (reduce) return <div className="h-full">{children}</div>;
  return (
    <motion.div
      className="h-full"
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Radial "decrypted" progress ring. */
function SolveRing({ solved, total }: { solved: number; total: number }) {
  const pct = total > 0 ? Math.min(1, solved / total) : 0;
  const R = 15.5;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-11 w-11 shrink-0" title={`${solved}/${total} decrypted`}>
      <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3.5" className="stroke-black/10 dark:stroke-white/10" />
        <circle
          cx="18" cy="18" r={R} fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-bold tabular-nums text-[var(--wow-fg)]">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

export default function TechCards({
  stats,
}: {
  stats: Record<string, TechStats>;
}) {
  const [solvedCounts, setSolvedCounts] = useState<Record<string, number>>({});
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const computeSolved = () => {
      const list = getSolved();
      const counts: Record<string, number> = {};
      list.forEach((q) => {
        if (q.technology) {
          counts[q.technology] = (counts[q.technology] || 0) + 1;
        }
      });
      setSolvedCounts(counts);
    };

    computeSolved();
    window.addEventListener("iq-solved-changed", computeSolved);
    return () => window.removeEventListener("iq-solved-changed", computeSolved);
  }, []);

  return (
    <SpotlightGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {TECHNOLOGIES.map((t, i) => {
        const m = getTechMeta(t.slug);
        const stat = stats[t.slug] ?? { easy: 0, medium: 0, hard: 0, total: 0 };
        const solvedCount = solvedCounts[t.slug] || 0;
        const segs = [
          { n: stat.easy, c: "bg-emerald-500", label: `Easy: ${stat.easy}` },
          { n: stat.medium, c: "bg-amber-500", label: `Medium: ${stat.medium}` },
          { n: stat.hard, c: "bg-rose-500", label: `Hard: ${stat.hard}` },
        ].filter((s) => s.n > 0);

        return (
          <motion.div
            key={t.slug}
            className="h-full"
            initial={reduceMotion ? false : { opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: (i % 3) * 0.09, ease: "easeOut" }}
          >
            <SpotlightCard className="h-full">
              <TiltModule>
                <Link
                  href={`/interview-questions/${t.slug}`}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${m.hoverBorder} hover:shadow-[0_18px_50px_-20px_rgba(139,147,255,0.45)]`}
                >
                  {/* sheen sweep */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  {/* hover glow */}
                  <span aria-hidden className={`pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-40 ${m.glowColor}`} />

                  {/* module header */}
                  <div className="relative flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                      MOD-{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--wow-card-border)] text-muted opacity-60 transition-all duration-300 group-hover:border-[#8b93ff]/50 group-hover:text-[#8b93ff] group-hover:opacity-100">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* reactor icon */}
                  <div className="relative mt-4 flex items-center gap-4">
                    <span className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border ${m.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                      <TechSvg tech={t.slug} className="h-9 w-9" />
                      <span aria-hidden className={`pointer-events-none absolute -inset-1 rounded-[1.1rem] border border-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                    </span>
                    <span>
                      <h3 className="wow-font-display text-[1.35rem] leading-none text-[var(--wow-fg)]">
                        {t.label}
                      </h3>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                        {stat.total > 0 ? `${stat.total} signals` : "standby"}
                      </p>
                    </span>
                  </div>

                  <p className="relative mt-3 text-xs leading-relaxed text-muted">{m.tagline}</p>

                  {/* concept chips */}
                  <div className="relative mb-4 mt-3 flex flex-wrap gap-1.5">
                    {m.concepts.slice(0, 4).map((concept) => (
                      <span
                        key={concept}
                        className="rounded-md border border-[var(--wow-card-border)] bg-[var(--wow-stage)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>

                  {/* footer */}
                  <div className="relative mt-auto flex items-center gap-3 border-t border-[var(--wow-card-border)] pt-4">
                    {stat.total > 0 ? (
                      <>
                        <SolveRing solved={solvedCount} total={stat.total} />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                            {solvedCount}/{stat.total} decrypted
                          </p>
                          <div className="mt-1.5 flex gap-1">
                            {segs.map((s) => (
                              <span
                                key={s.c}
                                title={s.label}
                                style={{ flexGrow: s.n }}
                                className={`h-1.5 min-w-3 rounded-full ${s.c}`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted/60">
                        Awaiting transmissions
                      </p>
                    )}
                  </div>
                </Link>
              </TiltModule>
            </SpotlightCard>
          </motion.div>
        );
      })}
    </SpotlightGroup>
  );
}
