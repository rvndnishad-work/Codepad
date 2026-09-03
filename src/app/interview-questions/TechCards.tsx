"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
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
    <SpotlightGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {TECHNOLOGIES.map((t) => {
        const m = getTechMeta(t.slug);
        const stat = stats[t.slug] ?? { easy: 0, medium: 0, hard: 0, total: 0 };
        const total = stat.total || 1;
        const easyPct = (stat.easy / total) * 100;
        const mediumPct = (stat.medium / total) * 100;
        const hardPct = (stat.hard / total) * 100;
        const solvedCount = solvedCounts[t.slug] || 0;

        return (
          <SpotlightCard key={t.slug} className="h-full">
            <Link
              href={`/interview-questions/${t.slug}`}
              className={`group relative p-6 rounded-3xl border ${m.border} ${m.bg} ${m.hoverBg} transition-all duration-500 overflow-hidden flex flex-col justify-between ${m.hoverBorder} ${m.hoverShadow} hover:-translate-y-1 backdrop-blur-sm`}
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
                    className="text-[11px] font-bold tracking-wide bg-bg/50 dark:bg-bg/40 text-muted border border-border rounded-full px-2.5 py-0.5"
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
                  <div className="flex justify-between items-center mb-1.5 text-[11px] font-bold text-muted">
                    <span className="text-fg/80 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
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
                  <div className="flex justify-between items-center mt-2.5 text-[11px] font-bold text-muted">
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
                <div className="text-[11px] font-black tracking-widest text-muted/50 uppercase">
                  Coming soon
                </div>
              )}
            </div>
            </Link>
          </SpotlightCard>
        );
      })}
    </SpotlightGroup>
  );
}
