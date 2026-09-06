"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

/**
 * SIGNAL TICKER — an infinite transmission strip of the most-asked
 * questions scrolling beneath the hero. Pure CSS motion (GPU transform),
 * pauses on hover, and freezes entirely for reduced-motion users.
 */
export default function SignalTicker({
  items,
}: {
  items: { title: string; slug: string; company: string | null }[];
}) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[#0a0a14]">
      <style>{`
        @keyframes qv-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .qv-marquee-track { animation: qv-marquee 55s linear infinite; }
        .qv-marquee:hover .qv-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .qv-marquee-track { animation: none; }
        }
      `}</style>
      <div className="qv-marquee pointer-events-auto relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0a14] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0a14] to-transparent" />
        <div className="qv-marquee-track flex w-max items-center gap-0 py-3">
          {loop.map((q, i) => (
            <Link
              key={`${q.slug}-${i}`}
              href={`/interview-question/${q.slug}`}
              className="group flex shrink-0 items-center gap-2.5 px-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-[#ffe600]"
            >
              <Zap className="h-3 w-3 shrink-0 text-[#ff2fb3] transition-colors group-hover:text-[#ffe600]" />
              <span className="max-w-[320px] truncate">{q.title}</span>
              {q.company && <span className="shrink-0 text-white/25">@{q.company}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
