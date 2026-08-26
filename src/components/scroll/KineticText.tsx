"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";

interface KineticTextProps {
  text: string;
  className?: string;
  wordClassName?: string;
  highlightWords?: string[];
  highlightClassName?: string;
}

export default function KineticText({
  text,
  className = "",
  wordClassName = "",
  highlightWords = [],
  highlightClassName = "text-accent font-black",
}: KineticTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "start 0.3"],
  });

  const words = text.split(" ");

  if (reducedMotion) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p
      ref={containerRef}
      className={`flex flex-wrap gap-x-[0.28em] gap-y-[0.1em] leading-tight ${className}`}
    >
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const isHighlight = highlightWords.some(
          (hw) => hw.toLowerCase() === cleanWord
        );

        return (
          <KineticWord
            key={`${word}-${i}`}
            word={word}
            progress={scrollYProgress}
            range={[start, end]}
            className={isHighlight ? `${wordClassName} ${highlightClassName}` : wordClassName}
          />
        );
      })}
    </p>
  );
}

function KineticWord({
  word,
  progress,
  range,
  className = "",
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  className?: string;
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const y = useTransform(progress, range, [4, 0]);

  return (
    <motion.span
      style={{ opacity, y }}
      className={`inline-block transition-colors duration-150 will-change-transform ${className}`}
    >
      {word}
    </motion.span>
  );
}
