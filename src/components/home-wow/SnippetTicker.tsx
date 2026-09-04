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
    <section aria-label="Fresh from the community" className="relative overflow-hidden border-y border-[var(--wow-card-border)] bg-[var(--wow-bg)] py-5">
      <div className="wow-marquee-track gap-4 pr-4">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center gap-4">
            <span className="mx-2 flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff2fb3]">
              <Play className="h-3.5 w-3.5 fill-current" /> fresh sandboxes
            </span>
            {snippets.map((s) => (
              <Link
                key={`${k}-${s.slug}`}
                href={`/play/${s.slug}`}
                className="flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-card)] px-4 py-2 text-[13px] font-medium text-[var(--wow-fg)] transition hover:border-[#8b93ff]"
              >
                <span className="max-w-[220px] truncate">{s.title}</span>
                <span className="rounded-md bg-[#8b93ff]/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8b93ff]">{s.template}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
