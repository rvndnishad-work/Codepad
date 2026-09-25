"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Users } from "lucide-react";

/**
 * Title band (a soft indigo glow and dot grid, as on the workspace overview),
 * one-line summary, page actions and the All candidates / Batches tabs.
 */
export function CandidatesHeader({
  slug,
  active,
  summary,
  actions,
  counts,
}: {
  slug: string;
  active: "all" | "batches";
  summary: ReactNode;
  actions: ReactNode;
  counts: { all: number; batches: number };
}) {
  const tab = (id: "all" | "batches", text: string, n: number, href: string) => (
    <Link
      href={href}
      aria-current={active === id ? "page" : undefined}
      className={`group relative flex items-center gap-2 h-10 px-0.5 text-sm font-medium transition-colors ${
        active === id ? "text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {text}
      <span
        className={`min-w-5 h-5 px-1.5 rounded-full text-xs leading-5 text-center tabular-nums transition-colors ${
          active === id ? "bg-secondary/20 text-secondary-soft" : "bg-panel text-subtle group-hover:text-muted"
        }`}
      >
        {n}
      </span>
      <span
        aria-hidden
        className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary origin-left transition-transform duration-300 motion-reduce:transition-none ${
          active === id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
        }`}
      />
    </Link>
  );
  return (
    <div className="flex flex-col gap-4">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.22), transparent 70%), radial-gradient(420px 200px at 100% 130%, rgb(var(--c-success) / 0.10), transparent 70%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--c-border-strong) / 0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to left, black, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 60%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span
              aria-hidden
              className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25"
            >
              <Users className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">Candidates</h1>
              <p className="text-[15px] text-muted mt-1">{summary}</p>
            </div>
          </div>
          <div className="flex gap-2">{actions}</div>
        </div>
      </section>
      <nav aria-label="Candidates views" className="flex gap-6 border-b border-border">
        {tab("all", "All candidates", counts.all, `/w/${slug}/candidates`)}
        {tab("batches", "Batches", counts.batches, `/w/${slug}/batches`)}
      </nav>
    </div>
  );
}
