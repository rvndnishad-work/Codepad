"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Title, one-line summary, page actions and the All candidates / Batches tabs. */
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
      className={`flex items-center gap-2 h-10 px-0.5 border-b-2 text-sm font-medium transition-colors ${
        active === id ? "border-secondary text-fg" : "border-transparent text-muted hover:text-fg"
      }`}
    >
      {text}
      <span className="text-xs text-subtle tabular-nums">{n}</span>
    </Link>
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-tight text-fg">Candidates</h1>
          <p className="text-[15px] text-muted mt-1.5">{summary}</p>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
      <nav aria-label="Candidates views" className="flex gap-6 border-b border-border">
        {tab("all", "All candidates", counts.all, `/w/${slug}/candidates`)}
        {tab("batches", "Batches", counts.batches, `/w/${slug}/batches`)}
      </nav>
    </div>
  );
}
