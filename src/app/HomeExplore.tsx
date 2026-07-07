"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, Flame } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
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
 * "Explore Trends" — featured community snippets rendered as miniature editor
 * windows: real filename, real syntax-highlighted code, template brand chip,
 * and author/view/date metadata. The code preview is highlighted server-side
 * (see src/lib/snippet-peek.ts), so this section ships no highlighting JS.
 */
export default function HomeExplore({ featured }: { featured: Snippet[] }) {
  // No public snippets yet → no section. A heading floating over empty space
  // reads as broken, not aspirational.
  if (featured.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20">
      <RevealOnScroll className="flex items-end justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full text-accent bg-accent/10">
            <Flame className="w-3.5 h-3.5 fill-current" />
            Discovery
          </div>
          <h2 className="text-3xl font-black text-fg tracking-tight">Trending in the sandbox</h2>
          <p className="text-sm text-muted font-medium mt-1.5">
            Real snippets from the community — open one and it runs.
          </p>
        </div>
        <Link
          href="/explore"
          className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group shrink-0"
        >
          Explore all snippets
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </RevealOnScroll>

      <RevealOnScroll
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        stagger={0.06}
      >
        {featured.map((s) => {
          const meta = templateIcon[s.template];
          const accent = meta?.color ?? "var(--accent)";
          return (
            <RevealItem key={s.id}>
              <Link
                href={`/play/${s.slug}`}
                style={{ ["--tpl" as string]: accent }}
                className="group relative flex flex-col h-full rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[var(--tpl)] hover:shadow-xl"
              >
                {/* Template-tinted hover glow */}
                <div
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[70px] opacity-0 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
                  style={{ background: accent }}
                />

                {/* Editor chrome bar */}
                <div className="relative flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-panel/40">
                  <span className="flex items-center gap-1.5 shrink-0" aria-hidden>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </span>
                  <span className="font-mono text-[11px] text-muted truncate">
                    {s.preview?.fileName ?? "snippet"}
                  </span>
                  <span
                    className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border text-[10px] font-bold shrink-0"
                    style={{ background: meta?.bg, color: accent }}
                  >
                    <TemplateLogo id={s.template} className="w-3 h-3" />
                    {templateLabel(s.template)}
                  </span>
                </div>

                {/* Code peek */}
                <div className="iq-hl relative h-[148px] overflow-hidden bg-slate-50 dark:bg-[#0a0b10]">
                  {s.preview ? (
                    <pre className="px-4 py-3 font-mono text-[11px] leading-[1.7] whitespace-pre overflow-hidden">
                      <code dangerouslySetInnerHTML={{ __html: s.preview.html }} />
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <TemplateLogo id={s.template} className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                  {/* Fade-out so cut-off code reads as intentional */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 dark:from-[#0a0b10] to-transparent pointer-events-none" />
                  {/* Run affordance on hover */}
                  <span className="absolute bottom-2.5 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-surface/90 backdrop-blur text-[10px] font-black uppercase tracking-wider text-fg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    ▶ Open &amp; run
                  </span>
                </div>

                {/* Meta footer */}
                <div className="relative flex flex-col gap-1.5 px-4 py-3.5 border-t border-border mt-auto">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-fg tracking-tight leading-tight truncate">
                      {s.title}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted min-w-0">
                    {s.author?.image ? (
                      <img
                        src={s.author.image}
                        alt=""
                        className="w-4 h-4 rounded-full border border-border shrink-0 object-cover"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-panel border border-border shrink-0" />
                    )}
                    <span className="truncate font-medium">{s.author?.name ?? "anonymous"}</span>
                    {s.views > 0 && (
                      <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                        <Eye className="w-3 h-3 opacity-60" />
                        {formatViews(s.views)}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] font-bold text-muted/50 uppercase tabular-nums shrink-0">
                      <RelativeTime iso={s.updatedAt} />
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          );
        })}
      </RevealOnScroll>
    </section>
  );
}
