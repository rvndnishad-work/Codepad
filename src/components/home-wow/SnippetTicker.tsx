import Link from "next/link";
import { Play } from "lucide-react";

/**
 * Community pulse ticker: real public snippets scrolling between sections.
 * Lightweight (CSS-only marquee) and every item links to a live sandbox.
 */
export default function SnippetTicker({
  snippets,
}: {
  snippets: { slug: string; title: string; template: string }[];
}) {
  return (
    <section aria-label="Fresh from the community" className="relative overflow-hidden border-y border-border bg-bg py-5">
      <div className="wow-marquee-track gap-4 pr-4">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center gap-4">
            <span className="mx-2 flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-accent-3">
              <Play className="h-3.5 w-3.5 fill-current" /> fresh sandboxes
            </span>
            {snippets.map((s) => (
              <Link
                key={`${k}-${s.slug}`}
                href={`/play/${s.slug}`}
                className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-fg transition hover:border-secondary"
              >
                <span className="max-w-[220px] truncate">{s.title}</span>
                <span className="rounded-md bg-secondary/15 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-secondary">{s.template}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
