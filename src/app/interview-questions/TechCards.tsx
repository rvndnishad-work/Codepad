"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";
import TechSvg from "@/components/TechSvg";
import { getSolved } from "@/lib/interview-questions/progress";

interface TechStats {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

interface TechMeta {
  bg: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
  iconBg: string;
  glowColor: string;
  tagline: string;
  concepts: string[];
}

const META: Record<string, TechMeta> = {
  reactjs: {
    bg: "bg-gradient-to-br from-cyan-500/5 via-surface to-surface dark:from-cyan-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-cyan-500/15 dark:border-cyan-500/10",
    hoverBg: "hover:from-cyan-500/10 dark:hover:from-cyan-950/25",
    hoverBorder: "hover:border-cyan-500/40 dark:hover:border-cyan-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(6,182,212,0.06)]",
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    glowColor: "bg-cyan-500/5",
    tagline: "Hooks, rendering & state",
    concepts: ["Hooks", "JSX", "Context", "Suspense"],
  },
  nodejs: {
    bg: "bg-gradient-to-br from-green-500/5 via-surface to-surface dark:from-green-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-green-500/15 dark:border-green-500/10",
    hoverBg: "hover:from-green-500/10 dark:hover:from-green-950/25",
    hoverBorder: "hover:border-green-500/40 dark:hover:border-green-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(34,197,94,0.06)]",
    iconBg: "bg-green-500/10 dark:bg-green-500/20",
    glowColor: "bg-green-500/5",
    tagline: "Event loop, streams & APIs",
    concepts: ["Event Loop", "Streams", "V8 Engine", "Buffers"],
  },
  javascript: {
    bg: "bg-gradient-to-br from-yellow-500/5 via-surface to-surface dark:from-yellow-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-yellow-500/15 dark:border-yellow-500/10",
    hoverBg: "hover:from-yellow-500/10 dark:hover:from-yellow-950/25",
    hoverBorder: "hover:border-yellow-500/40 dark:hover:border-yellow-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(234,179,8,0.06)]",
    iconBg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    glowColor: "bg-yellow-500/5",
    tagline: "Closures, async & the core",
    concepts: ["Closures", "Async/Await", "Promises", "ES6+"],
  },
  "machine-coding": {
    bg: "bg-gradient-to-br from-indigo-500/5 via-surface to-surface dark:from-indigo-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-indigo-500/15 dark:border-indigo-500/10",
    hoverBg: "hover:from-indigo-500/10 dark:hover:from-indigo-950/25",
    hoverBorder: "hover:border-indigo-500/40 dark:hover:border-indigo-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)]",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    glowColor: "bg-indigo-500/5",
    tagline: "Build live UI components & widgets",
    concepts: ["Components", "State", "Events", "Live Build"],
  },
  angular: {
    bg: "bg-gradient-to-br from-red-500/5 via-surface to-surface dark:from-red-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-red-500/15 dark:border-red-500/10",
    hoverBg: "hover:from-red-500/10 dark:hover:from-red-950/25",
    hoverBorder: "hover:border-red-500/40 dark:hover:border-red-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(239,68,68,0.06)]",
    iconBg: "bg-red-500/10 dark:bg-red-500/20",
    glowColor: "bg-red-500/5",
    tagline: "Components, DI & RxJS",
    concepts: ["Directives", "Services", "RxJS", "Routing"],
  },
  vuejs: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-emerald-500/15 dark:border-emerald-500/10",
    hoverBg: "hover:from-emerald-500/10 dark:hover:from-emerald-950/25",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    glowColor: "bg-emerald-500/5",
    tagline: "Reactivity & composition API",
    concepts: ["Reactivity", "Pinia", "Components", "Composition"],
  },
  typescript: {
    bg: "bg-gradient-to-br from-blue-500/5 via-surface to-surface dark:from-blue-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-blue-500/15 dark:border-blue-500/10",
    hoverBg: "hover:from-blue-500/10 dark:hover:from-blue-950/25",
    hoverBorder: "hover:border-blue-500/40 dark:hover:border-blue-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)]",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    glowColor: "bg-blue-500/5",
    tagline: "Types, generics & inference",
    concepts: ["Generics", "Interfaces", "Union Types", "Inference"],
  },
  dsa: {
    bg: "bg-gradient-to-br from-purple-500/5 via-surface to-surface dark:from-purple-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-purple-500/15 dark:border-purple-500/10",
    hoverBg: "hover:from-purple-500/10 dark:hover:from-purple-950/25",
    hoverBorder: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)]",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    glowColor: "bg-purple-500/5",
    tagline: "Algorithms & data structures",
    concepts: ["Trees", "Graphs", "DP", "Sorting"],
  },
  "system-design": {
    bg: "bg-gradient-to-br from-orange-500/5 via-surface to-surface dark:from-orange-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-orange-500/15 dark:border-orange-500/10",
    hoverBg: "hover:from-orange-500/10 dark:hover:from-orange-950/25",
    hoverBorder: "hover:border-orange-500/40 dark:hover:border-orange-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)]",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    glowColor: "bg-orange-500/5",
    tagline: "Scale, storage & trade-offs",
    concepts: ["Load Balancer", "Caching", "Sharding", "Pub-Sub"],
  },
  python: {
    bg: "bg-gradient-to-br from-emerald-500/5 via-surface to-surface dark:from-emerald-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-emerald-500/15 dark:border-emerald-500/10",
    hoverBg: "hover:from-emerald-500/10 dark:hover:from-emerald-950/25",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    glowColor: "bg-emerald-500/5",
    tagline: "Idioms, data & internals",
    concepts: ["Decorators", "GIL", "Generators", "Asyncio"],
  },
  sql: {
    bg: "bg-gradient-to-br from-sky-500/5 via-surface to-surface dark:from-sky-950/15 dark:via-surface/10 dark:to-surface/5",
    border: "border-sky-500/15 dark:border-sky-500/10",
    hoverBg: "hover:from-sky-500/10 dark:hover:from-sky-950/25",
    hoverBorder: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    hoverShadow: "hover:shadow-[0_8px_30px_rgba(56,189,248,0.06)]",
    iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
    glowColor: "bg-sky-500/5",
    tagline: "Joins, indexes & queries",
    concepts: ["Joins", "Indexes", "Subqueries", "ACID"],
  },
};

const FALLBACK: TechMeta = {
  bg: "bg-gradient-to-br from-accent/5 via-surface to-surface dark:from-accent/5 dark:via-surface/10 dark:to-surface/5",
  border: "border-accent/15 dark:border-accent/10",
  hoverBg: "hover:from-accent/10 dark:hover:from-accent/15",
  hoverBorder: "hover:border-accent/50",
  hoverShadow: "hover:shadow-[0_8px_30px_var(--accent-glow)]",
  iconBg: "bg-accent/10 dark:bg-accent/20",
  glowColor: "bg-accent/5",
  tagline: "Interview questions",
  concepts: ["Concepts", "Problems", "Rounds"],
};

export default function TechCards({
  stats,
}: {
  stats: Record<string, TechStats>;
}) {
  const [solvedCounts, setSolvedCounts] = useState<Record<string, number>>({});

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {TECHNOLOGIES.map((t) => {
        const m = META[t.slug] ?? FALLBACK;
        const stat = stats[t.slug] ?? { easy: 0, medium: 0, hard: 0, total: 0 };
        const total = stat.total || 1;
        const easyPct = (stat.easy / total) * 100;
        const mediumPct = (stat.medium / total) * 100;
        const hardPct = (stat.hard / total) * 100;
        const solvedCount = solvedCounts[t.slug] || 0;

        return (
          <Link
            key={t.slug}
            href={`/interview-questions/${t.slug}`}
            className={`group relative p-6 rounded-2xl border ${m.border} ${m.bg} ${m.hoverBg} transition-all duration-300 overflow-hidden flex flex-col justify-between ${m.hoverBorder} ${m.hoverShadow}`}
          >
            {/* Background Glow */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-45 transition-opacity duration-500 ${m.glowColor}`} />

            <div>
              {/* Card Header: Icon + Arrow */}
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-xl border border-border flex items-center justify-center ${m.iconBg}`}>
                  <TechSvg tech={t.slug} className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="p-1.5 rounded-lg bg-surface border border-border text-muted opacity-50 group-hover:opacity-100 group-hover:text-accent group-hover:border-accent/40 transition-all duration-300">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Title & Tagline */}
              <div className="mt-5">
                <h3 className="font-black text-lg text-fg group-hover:text-accent transition-colors duration-300 tracking-tight">
                  {t.label}
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">{m.tagline}</p>
              </div>

              {/* Concepts / Badges */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {m.concepts.map((concept) => (
                  <span
                    key={concept}
                    className="text-[10px] font-bold tracking-wide bg-bg/50 dark:bg-bg/40 text-muted border border-border rounded-full px-2.5 py-0.5"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats Breakdown */}
            <div className="mt-6 pt-5 border-t border-border">
              {stat.total > 0 ? (
                <div>
                  {/* Progress Tracker */}
                  <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold text-muted">
                    <span className="text-fg/80 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {solvedCount} / {stat.total} Solved
                    </span>
                    <span className="text-muted/80">{Math.round((solvedCount / stat.total) * 100)}%</span>
                  </div>
                  {solvedCount > 0 && (
                    <div className="h-1 w-full bg-bg border border-border rounded-full overflow-hidden mb-3.5">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(solvedCount / stat.total) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Distribution Bar */}
                  <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-bg border border-border gap-0.5 p-[1px]">
                    {stat.easy > 0 && (
                      <div
                        style={{ width: `${easyPct}%` }}
                        className="bg-emerald-500 rounded-full transition-all duration-500"
                        title={`Easy: ${stat.easy}`}
                      />
                    )}
                    {stat.medium > 0 && (
                      <div
                        style={{ width: `${mediumPct}%` }}
                        className="bg-amber-500 rounded-full transition-all duration-500"
                        title={`Medium: ${stat.medium}`}
                      />
                    )}
                    {stat.hard > 0 && (
                      <div
                        style={{ width: `${hardPct}%` }}
                        className="bg-rose-500 rounded-full transition-all duration-500"
                        title={`Hard: ${stat.hard}`}
                      />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex justify-between items-center mt-2.5 text-[10px] font-bold text-muted">
                    <div className="flex items-center gap-3">
                      {stat.easy > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {stat.easy} Easy
                        </span>
                      )}
                      {stat.medium > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {stat.medium} Med
                        </span>
                      )}
                      {stat.hard > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {stat.hard} Hard
                        </span>
                      )}
                    </div>
                    <span className="text-fg/90 dark:text-fg/80">{stat.total} Qs</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] font-black tracking-widest text-muted/50 uppercase">
                  Coming soon
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
