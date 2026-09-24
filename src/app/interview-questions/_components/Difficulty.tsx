"use client";

import { motion, useReducedMotion } from "framer-motion";
import { difficultyKey, type DifficultyKey } from "@/lib/interview-questions/topic-catalog";

export const DIFFICULTY_TEXT: Record<DifficultyKey, string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-danger",
};
export const DIFFICULTY_BG: Record<DifficultyKey, string> = {
  easy: "bg-success",
  medium: "bg-warning",
  hard: "bg-danger",
};
export const DIFFICULTY_LABEL: Record<DifficultyKey, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Difficulty as a coloured dot and a word. */
export function DifficultyLabel({ difficulty, className = "" }: { difficulty: string | null; className?: string }) {
  const d = difficultyKey(difficulty);
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${DIFFICULTY_TEXT[d]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_BG[d]}`} aria-hidden />
      {DIFFICULTY_LABEL[d]}
    </span>
  );
}

/** Easy / medium / hard split as one bar; the segments grow in the first time it scrolls into view. */
export function DifficultyBar({
  easy,
  medium,
  hard,
  height = 4,
  delay = 0,
}: {
  easy: number;
  medium: number;
  hard: number;
  height?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const segs = (
    [
      ["easy", easy],
      ["medium", medium],
      ["hard", hard],
    ] as [DifficultyKey, number][]
  ).filter(([, n]) => n > 0);

  if (segs.length === 0) return <div className="w-full rounded-full bg-border" style={{ height }} aria-hidden />;

  return (
    <div
      className="flex w-full gap-[3px]"
      style={{ height }}
      role="img"
      aria-label={`${easy} easy, ${medium} medium, ${hard} hard`}
    >
      {segs.map(([d, n], i) => (
        <motion.span
          key={d}
          className={`block min-w-[6px] rounded-full ${DIFFICULTY_BG[d]}`}
          style={{ flexGrow: n, originX: 0 }}
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.8, delay: delay + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
        />
      ))}
    </div>
  );
}
