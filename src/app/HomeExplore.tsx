"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";
import { templateIcon, TemplateLogo } from "@/lib/icons";

type Snippet = {
  id: string;
  slug: string;
  title: string;
  template: string;
  author: { name: string | null; image: string | null } | null;
  updatedAt: string;
  views: number;
  /** Server-highlighted code peek; null when the snippet has no code files. */
  preview: { fileName: string; html: string } | null;
};

/** Human labels for template ids shown in the card chrome chip. */
const TEMPLATE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  "empty-js": "JavaScript",
  typescript: "TypeScript",
  "empty-ts": "TypeScript",
  react: "React",
  "empty-react": "React",
  "react-hooks": "React",
  "react-classes": "React",
  vue: "Vue",
  angular: "Angular",
  svelte: "Svelte",
  solid: "Solid",
  python: "Python",
  go: "Go",
  java: "Java",
  cpp: "C++",
};

function templateLabel(id: string): string {
  return (
    TEMPLATE_LABELS[id] ??
    id.replace(/^empty-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatViews(n: number): string {
  if (n >= 1000) return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/**
 * Community snippets as a CONTACT SHEET — one ruled grid where every cell
 * shares its edges with its neighbours, rather than six cards floating on a
 * background. The separators are real 1px gaps in a bordered frame (the grid
 * gap *is* the rule), so the structure holds at every breakpoint without a
 * pile of conditional border classes.
 *
 * Each cell is a miniature editor window: real filename, real syntax-
 * highlighted code, real metadata. The code preview is highlighted
 * server-side, so this section ships no highlighting JS.
 */
export default function HomeExplore({ featured }: { featured: Snippet[] }) {
  // No public snippets yet → no section. A heading floating over empty space
  // reads as broken, not aspirational.
  if (featured.length === 0) return null;

  const cols =
    featured.length === 1
      ? "md:grid-cols-1"
      : featured.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="relative border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="05"
          eyebrow="Discovery"
          title="Trending in"
          highlight="the sandbox."
          lede="Real snippets from the community. Open one and it runs — no fork, no install, no signup wall."
          linkHref="/explore"
          linkLabel="Explore all snippets"
        />

        {/* Ruled by borders rather than by grid gaps: the container draws the
            top and left edges, each cell draws its own bottom and right. That
            completes the frame at any column count and leaves a partly filled
            final row clean, instead of exposing a slab of gap colour. The
            sheet also reveals as one object — staggering the cells would tear
            the hairlines apart on the way in. */}
        <RevealOnScroll className={`grid grid-cols-1 border-l border-t border-border ${cols}`}>
          {featured.map((s) => {
            const meta = templateIcon[s.template];
            const accent = meta?.color ?? "var(--accent)";
            return (
              <div key={s.id} className="flex border-b border-r border-border bg-surface">
                <Link
                  href={`/play/${s.slug}`}
                  className="group ip-ticks ip-ticks-hover flex h-full w-full flex-col"
                >
                  {/* Chrome: filename left, language right. No traffic lights
                      — those belong to macOS, not to this product. */}
                  <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
                    <span className="ip-label ip-label-xs truncate">
                      {s.preview?.fileName ?? "snippet"}
                    </span>
                    <span
                      className="ip-label ip-label-xs ml-auto flex shrink-0 items-center gap-1.5"
                      style={{ color: accent }}
                    >
                      <TemplateLogo id={s.template} className="h-3 w-3" />
                      {templateLabel(s.template)}
                    </span>
                  </div>

                  {/* Code peek */}
                  <div className="iq-hl relative h-[150px] overflow-hidden bg-panel dark:bg-[#0b0d12]">
                    {s.preview ? (
                      <pre className="overflow-hidden whitespace-pre px-4 py-3 font-mono text-[11px] leading-[1.7]">
                        <code dangerouslySetInnerHTML={{ __html: s.preview.html }} />
                      </pre>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <TemplateLogo id={s.template} className="h-10 w-10 opacity-25" />
                      </div>
                    )}
                    {/* Fade-out so cut-off code reads as intentional */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-panel to-transparent dark:from-[#0b0d12]" />
                    {/* Run affordance — a mono label, revealed on hover */}
                    <span className="ip-label ip-label-xs ip-label-accent absolute bottom-2.5 left-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      ▸ Open &amp; run
                    </span>
                  </div>

                  {/* Meta footer */}
                  <div className="mt-auto flex flex-col gap-2 border-t border-border px-3.5 py-3">
                    <span className="truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-fg">
                      {s.title}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 font-mono text-[10.5px] text-subtle">
                      <span className="truncate">{s.author?.name ?? "anonymous"}</span>
                      {s.views > 0 && (
                        <span className="ip-nums inline-flex shrink-0 items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatViews(s.views)}
                        </span>
                      )}
                      <span className="ip-nums ml-auto shrink-0">
                        <RelativeTime iso={s.updatedAt} />
                      </span>
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </RevealOnScroll>
      </div>
    </section>
  );
}
