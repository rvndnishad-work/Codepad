"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  LayoutGrid,
  Search,
  Sparkles,
  Terminal,
  Code2,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  User,
} from "lucide-react";
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
  { key: "all", label: "All Sandbox templates" },
  ...groups.map((g) => ({ key: g.key, label: g.label })),
];

function WelcomeStrip({ w }: { w: NonNullable<Welcome> }) {
  const firstName = w.name?.split(" ")[0] ?? "Developer";

  return (
    <div className="relative rounded-2xl border border-border/80 bg-surface/50 dark:bg-[#11131a]/60 backdrop-blur-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden transition-all hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.15)] group">
      {/* Light glow inside the welcome panel */}
      <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-accent/5 blur-2xl group-hover:bg-accent/10 transition-all duration-700 pointer-events-none" />

      <div className="flex items-center gap-4 relative">
        <div className="relative">
          {w.image ? (
            <Image
              src={w.image}
              alt={w.name ?? ""}
              width={48}
              height={48}
              className="rounded-xl border border-border/80 shadow-inner shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-bg border border-border/80 grid place-items-center shrink-0 shadow-sm">
              <User className="w-5 h-5 text-muted" />
            </div>
          )}
          {/* Active green presence indicator */}
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-surface shadow-sm animate-pulse" />
        </div>
        
        <div className="min-w-0">
          <div className="text-base font-bold text-fg leading-snug flex items-center gap-1.5">
            Welcome back, {firstName} 👋
          </div>
          <div className="text-xs text-muted mt-0.5 font-medium">
            {w.snippetCount === 0 ? (
              <span className="text-muted/60 italic">You haven&apos;t saved any custom sandboxes yet.</span>
            ) : (
              <span>
                You have <strong className="text-fg font-black tabular-nums">{w.snippetCount}</strong> saved sandbox{w.snippetCount === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 relative">
        {w.recent && (
          <Link
            href={`/play/${w.recent.slug}`}
            className="flex items-center gap-3.5 rounded-xl border border-border/80 hover:border-accent/30 bg-bg/50 dark:bg-[#07090e]/50 hover:bg-elevated px-4 py-2.5 transition-all shrink-0 max-w-xs shadow-sm hover:shadow-md group/continue"
          >
            <div className="w-8.5 h-8.5 rounded-lg border border-border/80 bg-panel dark:bg-[#11131a] grid place-items-center shrink-0 group-hover/continue:scale-105 transition-transform duration-300">
              <TemplateLogo id={w.recent.template} size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-wider text-muted group-hover/continue:text-accent transition-colors">
                Continue editing
              </div>
              <div className="text-xs font-bold truncate text-fg mt-0.5 max-w-[140px]">
                {w.recent.title}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover/continue:text-fg group-hover/continue:translate-x-0.5 transition-all shrink-0" />
          </Link>
        )}

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-bg/60 hover:bg-fg hover:text-bg hover:border-fg text-xs font-bold text-fg transition-all shadow-sm"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function PlaygroundsBrowser({ welcome }: { welcome: Welcome }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll detection to add elevation styling to sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const groupedItems = useMemo(() => {
    return groups.map((g) => ({
      group: g,
      items: templates.filter(
        (t) => t.group === g.key && !featuredIds.has(t.id)
      ),
    }));
  }, [featuredIds]);

  return (
    <div className="bg-bg min-h-screen pb-32 relative overflow-hidden">
      {/* Dynamic ambient blurs in the background for cutting-edge aesthetic */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,230,0,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,230,0,0.04)_0%,transparent_65%)] blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] left-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.04)_0%,transparent_65%)] blur-[100px] pointer-events-none -z-10" />
      
      {/* Dot pattern mesh layer */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none -z-10 opacity-70" />

      {/* Hero Header */}
      <header className="mx-auto max-w-6xl px-4 pt-16 pb-8 relative">
        {/* Floating tech badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-border/80 bg-surface/80 dark:bg-[#11131a]/85 backdrop-blur-md text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
          Pre-Configured Sandboxes
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl md:text-[54px] font-black tracking-tight leading-[1.08] text-fg">
              Instant playgrounds.
              <br />
              See the <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-amber-400 to-[#f87171] drop-shadow-sm font-black">starter code</span> first.
            </h1>
            <p className="mt-4 text-base text-muted max-w-xl font-medium leading-relaxed">
              Explore {stats.total} interactive development sandboxes. Click any card to launch immediately in the browser. Zero-install, saved with your work.
            </p>
          </div>
          
          {/* Modern Visual Stats Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-5 py-3.5 rounded-2xl border border-border/80 bg-surface/50 dark:bg-[#11131a]/50 backdrop-blur-sm flex flex-col items-start min-w-[120px] shadow-sm">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Environments</span>
              <span className="text-2xl font-black text-fg mt-1 flex items-center gap-1.5 leading-none">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 shadow-sm" />
                {stats.total}
              </span>
            </div>
            <div className="px-5 py-3.5 rounded-2xl border border-border/80 bg-surface/50 dark:bg-[#11131a]/50 backdrop-blur-sm flex flex-col items-start min-w-[120px] shadow-sm">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">TypeScript-ready</span>
              <span className="text-2xl font-black text-fg mt-1 flex items-center gap-1.5 leading-none">
                <span className="w-2.5 h-2.5 rounded-full bg-accent border border-accent/80 shadow-sm" />
                {stats.ts}
              </span>
            </div>
          </div>
        </div>

        {/* User Workspace Status */}
        {welcome && welcome.snippetCount > 0 && (
          <div className="mt-8">
            <WelcomeStrip w={welcome} />
          </div>
        )}
      </header>

      {/* Floating Filter Bar */}
      <div 
        className={`sticky top-16 z-20 transition-all duration-300 border-y ${
          isScrolled 
            ? "bg-bg/85 dark:bg-[#0a0b10]/90 backdrop-blur-2xl border-border shadow-[0_12px_32px_-12px_rgba(0,0,0,0.15)] py-2.5" 
            : "bg-bg/60 backdrop-blur-xl border-border/50 py-3.5"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          
          {/* Dynamic Search Box */}
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted group-hover:text-fg transition-colors duration-300 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by language, framework, dependencies..."
              className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-surface/70 dark:bg-[#11131a]/80 border border-border hover:border-border-strong focus:border-accent/40 focus:bg-bg dark:focus:bg-[#0b0f17] text-sm outline-none placeholder:text-muted/50 transition-all font-medium shadow-sm hover:shadow-inner"
            />
            {/* keyboard hotkey visual help */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/80 bg-bg text-[8px] font-bold text-muted pointer-events-none">
              CTRL K
            </div>
          </div>

          {/* Capsule Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-muted text-xs mr-1 font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted/60" />
              <span>Filter:</span>
            </div>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              
              // Custom dots colored according to category
              let dotColor = "bg-muted/40";
              if (f.key === "core") dotColor = "bg-accent";
              if (f.key === "framework") dotColor = "bg-emerald-500";
              if (f.key === "react-ecosystem") dotColor = "bg-cyan-400";
              if (f.key === "empty") dotColor = "bg-slate-400";

              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`group/btn px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center gap-2 shadow-sm ${
                    active
                      ? "bg-fg text-bg border-fg scale-102 hover:bg-fg/95"
                      : "bg-surface/50 dark:bg-[#11131a]/50 border-border text-muted hover:text-fg hover:border-border-strong hover:-translate-y-0.25"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-bg" : dotColor} transition-colors`} />
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Matches Counter */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-muted/70 tabular-nums">
            <Code2 className="w-3.5 h-3.5 text-muted/40" />
            <span>
              {filtered.length} matching template{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Featured Starters Section - High Impact Layout */}
      {!isBrowsing && (
        <section className="mx-auto max-w-6xl px-4 mt-12">
          <div className="flex items-center justify-between mb-5 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-black uppercase tracking-wider text-fg">
                Most popular sandboxes
              </h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted/50 bg-surface/50 border border-border/80 px-2 py-0.5 rounded-md">
              Fast Track
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((t) => (
              <CodePeekCard key={t.id} t={t} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Sandboxes Catalog */}
      <main className="mx-auto max-w-6xl px-4 mt-16">
        {!isBrowsing ? (
          groupedItems.map(({ group, items }) => {
            if (!items.length) return null;
            return (
              <div key={group.key} className="mb-14 last:mb-0">
                
                {/* Group Heading Chrome Layout */}
                <div className="flex items-center justify-between gap-4 mb-6 border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted/40" />
                    <h3 className="text-base font-black text-fg">{group.label}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface/60 border border-border/80 text-muted tabular-nums">
                    {items.length} starter{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((t) => (
                    <CodePeekCard key={t.id} t={t} />
                  ))}
                </div>
              </div>
            );
          })
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <CodePeekCard key={t.id} t={t} />
            ))}
          </div>
        ) : (
          /* Sleek Custom Terminal Error Card Empty State */
          <div className="mx-auto max-w-lg text-center rounded-2xl border border-border/80 bg-surface/30 dark:bg-[#11131a]/40 backdrop-blur-md p-10 shadow-sm border-dashed">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <h4 className="text-sm font-bold text-fg">No playgrounds found</h4>
            <p className="mt-2 text-xs text-muted/70 max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find any sandboxes matching <strong className="text-fg font-black">&ldquo;{query}&rdquo;</strong>. Try adjusting your keywords or clearing the category filter.
            </p>
            <button
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fg text-bg hover:bg-fg/90 text-xs font-bold transition-all shadow"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Reset Search
            </button>
          </div>
        )}
      </main>

      {/* Subtle Footer Note */}
      <footer className="mx-auto max-w-6xl px-4 mt-24 text-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-border bg-surface/50 dark:bg-[#11131a]/40 backdrop-blur-sm text-xs font-medium text-muted">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <span>Missing a custom stack or boilerplate? We add new templates in every weekly sprint.</span>
        </div>
      </footer>
    </div>
  );
}
