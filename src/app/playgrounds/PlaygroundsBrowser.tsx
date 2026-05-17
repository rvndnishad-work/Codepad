"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowRight, LayoutGrid, Search } from "lucide-react";
import {
  templates,
  groups,
  templatesById,
  type TemplateDef,
} from "@/lib/templates";
import { TemplateLogo } from "@/lib/icons";
import { CodePeekCard } from "./CodePeekCard";

type Welcome = {
  name: string | null;
  image: string | null;
  snippetCount: number;
  recent: { slug: string; title: string; template: string } | null;
} | null;

const FEATURED_IDS = ["react", "typescript", "javascript"] as const;

const FILTERS = [
  { key: "all", label: "All" },
  ...groups.map((g) => ({ key: g.key, label: g.label })),
];

function WelcomeStrip({ w }: { w: NonNullable<Welcome> }) {
  const firstName = w.name?.split(" ")[0] ?? "there";

  return (
    <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur p-4 flex items-center gap-4">
      {w.image ? (
        <Image
          src={w.image}
          alt={w.name ?? ""}
          width={36}
          height={36}
          className="rounded-full border border-border shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-surface border border-border grid place-items-center shrink-0 text-sm font-bold">
          {firstName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-fg truncate">
          Welcome back, {firstName}
        </div>
        <div className="text-xs text-muted">
          {w.snippetCount === 0
            ? "No snippets saved yet."
            : `${w.snippetCount} ${w.snippetCount === 1 ? "snippet" : "snippets"} saved`}
        </div>
      </div>

      {w.recent && (
        <Link
          href={`/play/${w.recent.slug}`}
          className="group hidden sm:flex items-center gap-3 rounded-lg border border-border hover:border-border-strong bg-bg/60 hover:bg-elevated px-3 py-2 transition shrink-0 max-w-xs"
        >
          <div className="w-7 h-7 rounded-md border border-border bg-panel grid place-items-center shrink-0">
            <TemplateLogo id={w.recent.template} size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-wider text-muted">
              Continue
            </div>
            <div className="text-xs font-semibold truncate text-fg">
              {w.recent.title}
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-fg transition shrink-0" />
        </Link>
      )}

      <Link
        href="/dashboard"
        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg/60 hover:bg-elevated text-xs text-muted hover:text-fg transition shrink-0"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Dashboard
      </Link>
    </div>
  );
}

export default function PlaygroundsBrowser({ welcome }: { welcome: Welcome }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const featured = useMemo(
    () =>
      FEATURED_IDS.map((id) => templatesById[id]).filter(
        (t): t is TemplateDef => Boolean(t)
      ),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (filter !== "all" && t.group !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.subtitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, filter]);

  const stats = useMemo(() => {
    const tsCount = templates.filter((t) =>
      Object.keys(t.files).some(
        (p) => p.endsWith(".ts") || p.endsWith(".tsx")
      )
    ).length;
    return { total: templates.length, ts: tsCount };
  }, []);

  const isBrowsing = filter !== "all" || query.trim().length > 0;
  const featuredIds = new Set<string>(FEATURED_IDS);

  // For each group, hide templates that already appear in the featured row so
  // they don't show up twice on the default view.
  const groupedItems = useMemo(() => {
    return groups.map((g) => ({
      group: g,
      items: templates.filter(
        (t) => t.group === g.key && !featuredIds.has(t.id)
      ),
    }));
  }, [featuredIds]);

  return (
    <div className="bg-bg min-h-screen pb-24">
      {/* Compact header */}
      <header className="mx-auto max-w-6xl px-4 pt-12 pb-6">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-accent mb-3">
          Playgrounds
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg leading-tight">
              Open a sandbox. See the code first.
            </h1>
            <p className="mt-2 text-sm text-muted max-w-xl">
              {stats.total} pre-wired environments. Each card shows the actual
              starter file — no install, save and share with one click.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {stats.total} total
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {stats.ts} TypeScript
            </span>
          </div>
        </div>

        {welcome && welcome.snippetCount > 0 && (
          <div className="mt-6">
            <WelcomeStrip w={welcome} />
          </div>
        )}
      </header>

      {/* Sticky search + filter */}
      <div className="sticky top-16 z-20 border-y border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search playgrounds…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-border focus:border-accent/40 text-sm outline-none placeholder:text-muted/60 transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? "bg-fg text-bg border-fg"
                      : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto text-[11px] text-muted/70 tabular-nums">
            {filtered.length} {filtered.length === 1 ? "match" : "matches"}
          </div>
        </div>
      </div>

      {/* Featured row — taller code-peek tiles for the three most popular
          stacks. Hidden during browse so search results aren't pushed down. */}
      {!isBrowsing && (
        <section className="mx-auto max-w-6xl px-4 mt-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-sm font-bold text-fg">Most popular</h2>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted/60">
              Featured starters
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((t) => (
              <CodePeekCard key={t.id} t={t} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section className="mx-auto max-w-6xl px-4 mt-12">
        {!isBrowsing ? (
          groupedItems.map(({ group, items }) => {
            if (!items.length) return null;
            return (
              <div key={group.key} className="mb-12 last:mb-0">
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="text-sm font-bold text-fg">{group.label}</h3>
                  <span className="text-[10px] text-muted/60 tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <CodePeekCard key={t.id} t={t} />
                  ))}
                </div>
              </div>
            );
          })
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <CodePeekCard key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md text-center rounded-xl border border-border bg-surface/60 p-8 text-sm text-muted">
            No playgrounds match “{query}”.
            <button
              className="block mx-auto mt-3 text-accent hover:underline text-xs font-semibold"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Subtle footer note */}
      <div className="mx-auto max-w-6xl px-4 mt-20 text-center text-xs text-muted/70">
        Missing a stack? We&apos;re adding new playgrounds every release.
      </div>
    </div>
  );
}
