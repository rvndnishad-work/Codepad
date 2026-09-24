"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { nextUnsolved } from "@/lib/interview-questions/topic-catalog";
import { useSolvedSlugs } from "./QuestionGroups";

const R = 33;
const C = 2 * Math.PI * R;

function Ring({ pct, size }: { pct: number; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 76 76" aria-hidden className="shrink-0">
      <circle cx="38" cy="38" r={R} fill="none" strokeWidth="7" className="stroke-border" />
      <circle
        cx="38"
        cy="38"
        r={R}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct)}
        transform="rotate(-90 38 38)"
        className="iq-ring-fill stroke-success transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        style={{ ["--iq-ring-c" as string]: C }}
      />
      <text x="38" y="43" textAnchor="middle" className="fill-fg text-[15px] font-semibold">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/**
 * How much of this topic the reader has solved (stored on this device) and
 * the next question to open. `ordered` is the topic's full list, easy first.
 */
export default function ProgressPanel({
  ordered,
  total,
  variant,
}: {
  ordered: { slug: string; title: string }[];
  total: number;
  variant: "card" | "strip";
}) {
  const solvedSet = useSolvedSlugs();
  const solved = ordered.filter((q) => solvedSet.has(q.slug)).length;
  const pct = total > 0 ? Math.min(1, solved / total) : 0;
  const next = nextUnsolved(ordered, solvedSet);
  const headline = `${solved} of ${total} solved`;

  if (variant === "strip") {
    const body = (
      <>
        <Ring pct={pct} size={46} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-fg">{headline}</span>
          <span className="truncate text-xs text-subtle">{next ? `Up next: ${next.title}` : "Every question solved"}</span>
        </span>
        {next && <ArrowRight className="h-[18px] w-[18px] shrink-0 text-accent" aria-hidden />}
      </>
    );
    const cls = "flex h-[72px] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5";
    return next ? (
      <Link href={`/interview-question/${next.slug}`} className={`${cls} hover:border-border-strong`}>
        {body}
      </Link>
    ) : (
      <div className={cls}>{body}</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        <Ring pct={pct} size={64} />
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-fg">{headline}</span>
          <span className="text-[13px] text-subtle">Saved on this device</span>
        </div>
      </div>
      {next && (
        <Link
          href={`/interview-question/${next.slug}`}
          className="flex min-h-11 items-center justify-between gap-2.5 rounded-xl border border-border-strong px-3.5 py-2 text-sm text-fg transition-colors hover:border-subtle motion-reduce:transition-none"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-subtle">Up next</span>
            <span className="truncate">{next.title}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        </Link>
      )}
    </div>
  );
}
