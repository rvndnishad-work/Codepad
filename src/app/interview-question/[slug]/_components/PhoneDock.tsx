"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { NavQuestion, TrackPosition } from "./types";

/**
 * Bottom dock on phones: previous, where you are in the topic, mark as
 * solved, next. Tucks away once the end card is on screen so it never sits
 * over the footer.
 */
export default function PhoneDock({
  prev,
  next,
  track,
  techName,
  color,
  solved,
  onToggleSolved,
  visible,
}: {
  prev: NavQuestion | null;
  next: NavQuestion | null;
  track: TrackPosition | null;
  techName: string | null;
  color: string;
  solved: boolean;
  onToggleSolved: () => void;
  visible: boolean;
}) {
  const pct = track && track.total > 0 ? ((track.index + 1) / track.total) * 100 : 0;
  const side =
    "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors active:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <motion.nav
      aria-label="Question navigation"
      aria-hidden={!visible}
      inert={!visible}
      initial={false}
      animate={visible ? { y: 0, opacity: 1 } : { y: 96, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
    >
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface/90 p-1.5 shadow-[0_18px_50px_-16px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        {prev ? (
          <Link href={`/interview-question/${prev.slug}`} aria-label={`Previous question: ${prev.title}`} className={`${side} text-muted`}>
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        ) : (
          <span className={`${side} text-muted opacity-30`} aria-hidden>
            <ArrowLeft className="h-[18px] w-[18px]" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2">
          <span className="truncate text-xs text-subtle">
            {track ? (
              <>
                <span className="font-medium tabular-nums text-fg">
                  {track.index + 1} of {track.total}
                </span>
                {techName && <> in {techName}</>}
              </>
            ) : (
              techName
            )}
          </span>
          <span className="h-1 overflow-hidden rounded-full bg-panel" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleSolved}
          aria-pressed={solved}
          aria-label={solved ? "Solved" : "Mark as solved"}
          className={`${side} border ${solved ? "border-success/40 bg-success/15 text-success" : "border-border text-muted"}`}
        >
          <Check className="h-[18px] w-[18px]" aria-hidden />
        </button>
        {next ? (
          <Link
            href={`/interview-question/${next.slug}`}
            aria-label={`Next question: ${next.title}`}
            className={`${side} bg-accent text-accent-ink active:bg-accent`}
          >
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        ) : (
          <span className={`${side} text-muted opacity-30`} aria-hidden>
            <ArrowRight className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
    </motion.nav>
  );
}
