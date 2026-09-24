"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { getSolved } from "@/lib/interview-questions/progress";
import {
  TRACKS,
  TOPIC_ORDER,
  trackOf,
  topicName,
  topicBlurb,
  plural,
  type TrackKey,
} from "@/lib/interview-questions/topic-catalog";
import { TopicLogoBlob } from "./_components/TopicLogo";
import { DifficultyBar } from "./_components/Difficulty";

interface TechStats {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

type Filter = "all" | TrackKey;

const CHIPS: { key: Filter; label: string; count: number }[] = [
  { key: "all", label: "All topics", count: TOPIC_ORDER.length },
  ...TRACKS.map((t) => ({ key: t.key, label: t.label, count: t.topics.length })),
];

/** "Browse by topic": track filter chips and one card per topic. */
export default function TechCards({ stats }: { stats: Record<string, TechStats> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [solvedCounts, setSolvedCounts] = useState<Record<string, number>>({});
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const computeSolved = () => {
      const counts: Record<string, number> = {};
      for (const q of getSolved()) {
        if (q.technology) counts[q.technology] = (counts[q.technology] || 0) + 1;
      }
      setSolvedCounts(counts);
    };
    computeSolved();
    window.addEventListener("iq-solved-changed", computeSolved);
    return () => window.removeEventListener("iq-solved-changed", computeSolved);
  }, []);

  const total = Object.values(stats).reduce((s, t) => s + t.total, 0);
  const topics = TOPIC_ORDER.filter((slug) => filter === "all" || trackOf(slug) === filter);

  return (
    <div className="flex flex-col gap-4 md:gap-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-fg md:text-[30px] md:leading-[1.15]">
            Browse by topic
          </h2>
          <p className="text-sm text-subtle md:text-[15px]">
            {TOPIC_ORDER.length} topics, {plural(total, "question")} with answers.
          </p>
        </div>
        <div
          role="group"
          aria-label="Filter topics"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {CHIPS.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(c.key)}
                className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-[15px] text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg"
                }`}
              >
                {c.label}
                <span className={`text-xs ${active ? "opacity-60" : "text-subtle"}`}>{c.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div layout={!reduceMotion} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {topics.map((slug, i) => {
            const stat = stats[slug] ?? { easy: 0, medium: 0, hard: 0, total: 0 };
            const solved = solvedCounts[slug] || 0;
            return (
              <motion.div
                key={slug}
                layout={!reduceMotion}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: (i % 4) * 0.06, ease: "easeOut" }}
              >
                <Link
                  href={`/interview-questions/${slug}`}
                  className="iq-card flex h-[132px] flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 hover:border-border-strong hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-[184px] sm:gap-0 sm:p-5"
                >
                  <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
                    <span className="sm:hidden">
                      <TopicLogoBlob slug={slug} size={40} />
                    </span>
                    <span className="hidden sm:block">
                      <TopicLogoBlob slug={slug} size={52} />
                    </span>
                    <div className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
                      <h3 className="iq-name truncate text-[15px] font-semibold text-fg sm:text-[17px] sm:tracking-[-0.01em]">
                        {topicName(slug)}
                      </h3>
                      <p className="truncate text-xs text-subtle sm:text-[13px]">
                        {plural(stat.total, "question")}
                        {solved > 0 && <span className="text-success sm:hidden"> · {solved} solved</span>}
                      </p>
                    </div>
                    <ArrowUpRight className="iq-go hidden h-[18px] w-[18px] shrink-0 text-muted sm:block" aria-hidden />
                  </div>

                  <p className="mt-3.5 hidden truncate text-sm text-muted sm:block">{topicBlurb(slug)}</p>

                  <div className="mt-auto flex flex-col gap-2.5">
                    <DifficultyBar
                      easy={stat.easy}
                      medium={stat.medium}
                      hard={stat.hard}
                      height={4}
                      delay={0.15 + (i % 4) * 0.06}
                    />
                    <div className="hidden items-center justify-between gap-2 text-xs text-subtle sm:flex">
                      <span className="truncate">
                        {stat.easy} easy · {stat.medium} medium · {stat.hard} hard
                      </span>
                      {solved > 0 && (
                        <span className="flex shrink-0 items-center gap-1 font-medium text-success">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          {solved} solved
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
