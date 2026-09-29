import Link from "next/link";
import { Flame } from "lucide-react";

/**
 * Strip of the most viewed questions under the hero. It scrolls sideways
 * (CSS transform, see interview-questions.css), pauses on hover or focus and
 * stands still under reduced motion.
 */
export default function SignalTicker({
  items,
}: {
  items: { title: string; slug: string; company: string | null }[];
}) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="iq-marquee flex h-[46px] items-center overflow-hidden border-y border-border bg-bg md:h-[52px]">
      <div className="relative z-10 flex h-full shrink-0 items-center gap-2 border-r border-border bg-bg px-4 text-[13px] font-semibold text-fg md:px-6">
        <Flame className="h-[15px] w-[15px] text-accent" aria-hidden />
        <span className="md:hidden">Popular</span>
        <span className="hidden md:inline">Most viewed</span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent" />
        <div className="iq-marquee-track flex w-max items-center">
          {loop.map((q, i) => (
            <Link
              key={`${q.slug}-${i}`}
              href={`/interview-question/${q.slug}`}
              tabIndex={i >= items.length ? -1 : undefined}
              aria-hidden={i >= items.length ? true : undefined}
              className="flex shrink-0 items-center gap-2.5 px-7 text-sm text-muted transition-colors hover:text-fg motion-reduce:transition-none"
            >
              <span className="h-1 w-1 rounded-full bg-border-strong" aria-hidden />
              <span className="max-w-[360px] truncate">{q.title}</span>
              {q.company && <span className="shrink-0 text-[13px] text-subtle">{q.company}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
