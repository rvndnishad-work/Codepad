import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { DifficultyLabel } from "@/app/interview-questions/_components/Difficulty";
import type { NavQuestion, TrackPosition } from "./types";

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/**
 * The close of the page: where you are in the topic, mark as solved, and the
 * next question as the obvious way on. Its top edge is where the phone dock
 * tucks away.
 */
export default function EndCap({
  next,
  track,
  tech,
  techName,
  color,
  solved,
  onToggleSolved,
}: {
  next: NavQuestion | null;
  track: TrackPosition | null;
  tech: string | null;
  techName: string | null;
  color: string;
  solved: boolean;
  onToggleSolved: () => void;
}) {
  return (
    <section aria-label="What next" className="mx-auto max-w-[1180px] px-4 md:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 py-8 md:px-10 md:py-11">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 h-[320px] w-[520px] rounded-full blur-[110px]" style={{ background: tint(color, 14) }} />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          <div>
            {track && (
              <p className="text-sm text-subtle">
                Question <span className="tabular-nums">{track.index + 1}</span> of <span className="tabular-nums">{track.total}</span>
                {techName ? ` in ${techName}` : ""}
              </p>
            )}
            <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-fg md:text-[32px]">
              {solved ? "Solved. On to the next one." : "Keep your momentum going."}
            </h2>
            <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-muted">
              {solved
                ? "Your progress is saved. The next question builds on this one."
                : "Mark this question solved to track your progress, then take the next one while it is fresh."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {!solved && (
                <button
                  type="button"
                  onClick={onToggleSolved}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Check className="h-4 w-4" aria-hidden /> Mark as solved
                </button>
              )}
              {tech && (
                <Link
                  href={`/interview-questions/${tech}`}
                  className="inline-flex h-11 items-center rounded-full border border-border-strong px-5 text-sm font-medium text-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                >
                  All {techName ?? ""} questions
                </Link>
              )}
            </div>
          </div>

          {next ? (
            <Link
              href={`/interview-question/${next.slug}`}
              className="qa-next group block rounded-2xl border border-border bg-bg p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-accent">Up next</span>
                <span className="flex items-center gap-2 text-xs text-subtle">
                  <DifficultyLabel difficulty={next.difficulty} className="text-xs" />
                  <span className="hidden rounded-md border border-border bg-panel px-1.5 py-px font-mono text-[11px] md:inline" title="Shortcut: right arrow">→</span>
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold leading-snug tracking-[-0.01em] text-fg [text-wrap:pretty] md:text-[22px]">{next.title}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted group-hover:text-fg">
                Continue <ArrowRight className="qa-arrow h-4 w-4" aria-hidden />
              </span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-success/30 bg-success/[0.06] p-6 md:p-7">
              <span className="text-sm font-medium text-success">End of the topic</span>
              <p className="mt-3 text-lg font-semibold leading-snug text-fg md:text-[22px]">
                That was the last {techName ?? ""} question.
              </p>
              <Link href="/interview-questions" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
                Pick another topic <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
