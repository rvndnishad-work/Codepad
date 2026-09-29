"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Eye, Heart } from "lucide-react";
import { compactNumber, parseJsonArray } from "@/lib/interview-questions/shared";
import { getSolved } from "@/lib/interview-questions/progress";
import { DIFFICULTY_ORDER, groupByDifficulty, plural, type DifficultyKey } from "@/lib/interview-questions/topic-catalog";
import { DIFFICULTY_BG, DIFFICULTY_LABEL } from "../_components/Difficulty";

export type TopicQuestion = {
  title: string;
  slug: string;
  difficulty: string;
  round: string | null;
  views: number;
  likes: number;
  tags: string;
  company?: { name: string; slug: string } | null;
};

/** Rows shown per difficulty before "Show more". */
const PAGE = 8;

/** Slugs the reader has marked solved on this device; follows changes from other components. */
export function useSolvedSlugs(): Set<string> {
  const [solved, setSolved] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const read = () => setSolved(new Set(getSolved().map((q) => q.slug)));
    read();
    window.addEventListener("iq-solved-changed", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("iq-solved-changed", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return solved;
}

function SolvedMark({ solved }: { solved: boolean }) {
  return solved ? (
    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-success text-bg" title="Solved">
      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      <span className="sr-only">Solved</span>
    </span>
  ) : (
    <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-border-strong" title="Not solved yet" aria-hidden />
  );
}

function Row({ q, n, solved, first }: { q: TopicQuestion; n: number; solved: boolean; first: boolean }) {
  const tags = parseJsonArray<string>(q.tags).filter(Boolean).slice(0, 3).join(", ");
  const meta = [q.round, q.company?.name].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/interview-question/${q.slug}`}
      className={`iq-row flex min-h-[84px] items-center gap-3 px-3.5 py-3 hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent md:min-h-[72px] md:gap-4 md:px-5 ${
        first ? "" : "border-t border-border"
      }`}
    >
      <SolvedMark solved={solved} />
      <span className="hidden w-[26px] shrink-0 font-mono text-[13px] tabular-nums text-subtle md:block" aria-hidden>
        {String(n).padStart(2, "0")}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <h4 className="iq-name line-clamp-2 text-[15px] font-semibold leading-snug text-fg md:line-clamp-1">{q.title}</h4>
        <p className="truncate text-xs text-subtle md:text-[13px]">
          {meta}
          <span className="md:hidden">
            {meta && " · "}
            {compactNumber(q.views)} views
          </span>
          {tags && (
            <span className="hidden md:inline">
              {meta && " · "}
              {tags}
            </span>
          )}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-3.5 text-xs text-subtle md:flex">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Views:</span>
          {compactNumber(q.views)}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Likes:</span>
          {q.likes}
        </span>
        <ArrowRight className="iq-go h-4 w-4 text-muted" aria-hidden />
      </div>
    </Link>
  );
}

/** The topic's questions split into easy, medium and hard, each showing a page of rows and a "Show more". */
export default function QuestionGroups({ questions, filtered }: { questions: TopicQuestion[]; filtered: boolean }) {
  const solved = useSolvedSlugs();
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState<Record<DifficultyKey, number>>({ easy: PAGE, medium: PAGE, hard: PAGE });
  const groups = groupByDifficulty(questions);

  return (
    <div className="flex flex-col gap-7 md:gap-10">
      {DIFFICULTY_ORDER.filter((d) => groups[d].length > 0).map((d) => {
        const rows = groups[d];
        const visible = rows.slice(0, shown[d]);
        const more = rows.length - visible.length;
        return (
          <motion.section
            key={d}
            aria-labelledby={`group-${d}`}
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
          >
            <div className="flex h-9 items-center gap-2.5 md:h-10">
              <span className={`h-2 w-2 rounded-full ${DIFFICULTY_BG[d]}`} aria-hidden />
              <h3 id={`group-${d}`} className="text-[17px] font-semibold text-fg md:text-lg">
                {DIFFICULTY_LABEL[d]}
              </h3>
              <span className="text-sm text-subtle">{plural(rows.length, "question")}</span>
              {d === "easy" && !filtered && (
                <span className="ml-auto flex h-[26px] items-center rounded-full bg-success/10 px-2.5 text-xs font-medium text-success">
                  Start here
                </span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
              {visible.map((q, i) => (
                <Row key={q.slug} q={q} n={i + 1} solved={solved.has(q.slug)} first={i === 0} />
              ))}
              {more > 0 && (
                <button
                  type="button"
                  onClick={() => setShown((s) => ({ ...s, [d]: s[d] + PAGE * 3 }))}
                  className="iq-row flex h-12 items-center justify-center gap-1.5 border-t border-border text-sm font-medium text-muted hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent md:h-[52px]"
                >
                  Show {Math.min(more, PAGE * 3)} more {d} questions
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
