"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  templates,
  groups,
  type TemplateDef,
  templatesById,
} from "@/lib/templates";
import { templateIcon, TemplateLogo } from "@/lib/icons";
import {
  Search,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  Zap,
  ShieldCheck,
  Share2,
  Code2,
} from "lucide-react";
import LandingDemo from "./LandingDemo";

type Welcome = {
  name: string | null;
  image: string | null;
  snippetCount: number;
  recent: { slug: string; title: string; template: string } | null;
} | null;

type FeaturedSnippet = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  tags: string[];
  author: { name: string | null; image: string | null } | null;
};

const FEATURED_IDS = ["react", "javascript", "typescript"] as const;

const FEATURED_DESCRIPTIONS: Record<string, string> = {
  react: "Hooks, state, JSX — modern React with hot reload.",
  javascript: "Pure ES modules. No setup, no transpilation overhead.",
  typescript: "Strict types out of the box, ready to break things safely.",
};

function Tile({ t }: { t: TemplateDef }) {
  const meta = templateIcon[t.id];
  const Icon = meta?.Icon;
  const chips = tileChips(t);
  const accentColor = meta?.color ?? "var(--accent)";

  return (
    <Link
      href={`/play?template=${t.id}`}
      className="group relative flex items-center gap-5 p-3.5 rounded-[2rem] border border-border bg-surface hover:bg-elevated transition-all duration-500 hover:scale-[1.02] hover:rotate-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {/* Background Glow */}
      <div
        className="absolute -left-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"
        style={{ background: accentColor }}
      />

      {/* Icon Stage */}
      <div className="relative w-[32%] aspect-square shrink-0 flex items-center justify-center">
        {/* Wobbly Background (The 'Stage') */}
        <div 
          className="absolute inset-0 rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%] animate-[blobby_10s_ease-in-out_infinite] opacity-20 group-hover:opacity-40 transition-all duration-700 blur-[2px] border border-white/10"
          style={{ background: accentColor }}
        />
        
        {/* The Icon itself (A balanced emblem inside the wobbly stage) */}
        <div className="relative w-[50%] h-[50%] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
          {Icon ? (
            <Icon 
              className="w-full h-full drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" 
              style={{ 
                color: accentColor,
                filter: "drop-shadow(0 0 2px rgba(0,0,0,0.1))"
              }} 
            />
          ) : (
            <span className="text-xl font-black">{t.label}</span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-black text-fg tracking-tight group-hover:text-accent transition-colors leading-tight truncate">
            {t.title}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>
        
        <span className="text-[11px] font-black text-muted uppercase tracking-[0.15em] truncate">
          {t.subtitle ?? groupLabel(t.group)}
        </span>

        <div className="flex flex-wrap gap-1 mt-2">
          {chips.map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded-lg border border-border bg-bg/50 text-[10px] font-bold text-muted uppercase tracking-tight"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function FeaturedTile({ t }: { t: TemplateDef }) {
  const meta = templateIcon[t.id];
  const Icon = meta?.Icon;
  const accentColor = meta?.color ?? "var(--accent)";

  return (
    <Link
      href={`/play?template=${t.id}`}
      className="group relative flex items-center gap-4 p-3.5 rounded-[1.75rem] border border-border bg-surface hover:bg-elevated transition-all duration-500 hover:scale-[1.02] hover:rotate-1 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {/* Background Glow */}
      <div
        className="absolute -left-10 -top-10 w-28 h-28 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"
        style={{ background: accentColor }}
      />

      {/* Icon Stage */}
      <div className="relative w-[32%] aspect-square shrink-0 flex items-center justify-center">
        <div 
          className="absolute inset-0 rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%] animate-[blobby_10s_ease-in-out_infinite] opacity-20 group-hover:opacity-40 transition-all duration-700 blur-[2px] border border-white/10"
          style={{ background: accentColor }}
        />
        <div className="relative w-[50%] h-[50%] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
          {Icon ? (
            <Icon 
              className="w-full h-full drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" 
              style={{ color: accentColor }} 
            />
          ) : (
            <span className="text-base font-black">{t.label}</span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-base font-black text-fg tracking-tight group-hover:text-accent transition-colors leading-tight truncate">
            {t.title}
          </span>
          <ArrowUpRight className="w-4 h-4 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>
        
        <p className="text-xs text-muted leading-tight line-clamp-2 mt-0.5">
          {FEATURED_DESCRIPTIONS[t.id] ?? t.subtitle ?? groupLabel(t.group)}
        </p>

        <div className="flex items-center gap-1.5 mt-auto pt-2">
          {tileChips(t).map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded border border-border bg-bg/50 text-[10px] font-bold text-muted uppercase tracking-tight"
            >
              {c}
            </span>
          ))}
          <span className="ml-auto text-xs text-accent font-black">
            Start →
          </span>
        </div>
      </div>
    </Link>
  );
}

function tileChips(t: TemplateDef): string[] {
  const chips: string[] = [];
  const isTS =
    t.id.includes("ts") ||
    Object.keys(t.files).some((p) => p.endsWith(".ts") || p.endsWith(".tsx"));
  chips.push(isTS ? "TS" : "JS");
  const deps = t.dependencies ? Object.keys(t.dependencies).length : 0;
  chips.push(deps > 0 ? `${deps} ${deps === 1 ? "dep" : "deps"}` : "0 deps");
  return chips;
}

function groupLabel(key: string) {
  return groups.find((g) => g.key === key)?.label ?? "";
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  ...groups.map((g) => ({ key: g.key, label: g.label })),
];

const FEATURES = [
  {
    icon: Zap,
    title: "Zero install",
    body: "Code, run, and reload — all without leaving the tab. No CLI, no toolchain, no Node version juggling.",
  },
  {
    icon: ShieldCheck,
    title: "Sandboxed",
    body: "Every snippet runs inside an isolated iframe on a separate origin. Your code never touches our servers.",
  },
  {
    icon: Share2,
    title: "Save & share",
    body: "Sign in to save snippets, mark them public, fork others, or grab an embed link. GitHub, Google, or email — your call.",
  },
];

export default function TemplatePicker({
  welcome,
  featured = [],
  hideHero = false,
}: {
  welcome?: Welcome;
  featured?: FeaturedSnippet[];
  hideHero?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const popularTemplates = useMemo(
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
      Object.keys(t.files).some((p) => p.endsWith(".ts") || p.endsWith(".tsx"))
    ).length;
    return { total: templates.length, ts: tsCount };
  }, []);

  return (
    <div className="relative">
      {!hideHero && (
        <>
          {/* ───────────── HERO ───────────── */}
          <div className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
            <div
              className="absolute inset-0 bg-grid-pattern opacity-10"
              style={{ backgroundSize: "24px 24px" }}
            />
            <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
              {(() => {
                const isReturning = Boolean(welcome && welcome.snippetCount > 0);
                const isFresh = Boolean(welcome && welcome.snippetCount === 0);
                const firstName = welcome?.name?.split(" ")[0] ?? "there";
                return (
                  <>
                    {isReturning ? (
                      <WelcomeCard w={welcome!} />
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/60 px-3 py-1.5 text-xs font-medium text-subtle mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span>Sandboxed iframe — code runs only in your browser</span>
                      </div>
                    )}

                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-fg leading-[1.05]">
                      {isReturning ? (
                        "Pick up where you left off"
                      ) : isFresh ? (
                        <>
                          Welcome to Interviewpad,
                          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-accent to-violet-400 mt-1">
                            {firstName}.
                          </span>
                        </>
                      ) : (
                        <>
                          Spin up a JavaScript playground
                          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-accent to-violet-400 mt-1">
                            in three seconds.
                          </span>
                        </>
                      )}
                    </h1>

                    <p className="mt-5 text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                      {isReturning
                        ? "Continue your last snippet, or spin up a new one from any template below."
                        : isFresh
                          ? "You're all set. Pick a template below to create your first snippet — or jump straight into React with one click."
                          : "Pre-wired templates for React, Vue, Angular, Svelte, Solid, plus pure JS and TypeScript. Save it, share it, embed it — no install, no signup needed to try."}
                    </p>

                    {!isReturning && (
                      <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
                        <Link
                          href="/play?template=react"
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-medium shadow-soft transition"
                        >
                          <Code2 className="w-4 h-4" />
                          {isFresh ? "Create your first snippet" : "Start with React"}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <a
                          href="#templates"
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-panel hover:bg-elevated text-fg text-sm font-medium transition"
                        >
                          Browse all templates
                        </a>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400/80" />
                  {stats.total} templates
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  {stats.ts} with TypeScript
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-400/80" />
                  Free forever
                </span>
              </div>
            </div>
          </div>

          {/* ───────────── FEATURE TRIPLET ───────────── */}
          <section className="mx-auto max-w-6xl px-4 py-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-border hover:border-border-strong bg-panel/40 p-5 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent-glow border border-accent/30 grid place-items-center mb-3">
                    <Icon className="w-4.5 h-4.5 text-accent" style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="text-sm font-semibold text-fg mb-1">{f.title}</div>
                  <p className="text-sm text-muted leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </section>

          {/* ───────────── LIVE DEMO ───────────── */}
          <LandingDemo />

          {/* ───────────── FEATURED TEMPLATES ───────────── */}
          <section className="mx-auto max-w-6xl px-4 pb-10">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-xs font-black tracking-widest text-muted uppercase mb-1">
                  Most popular
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  Quick starts
                </h2>
              </div>
              <a
                href="#templates"
                className="text-xs text-muted hover:text-fg transition"
              >
                See all {stats.total} →
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {popularTemplates.map((t) => (
                <FeaturedTile key={t.id} t={t} />
              ))}
            </div>
          </section>

          {/* ───────────── FEATURED FROM COMMUNITY ───────────── */}
          {featured.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 pb-10">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-xs font-black tracking-widest text-muted uppercase mb-1">
                    From the community
                  </div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">
                    Featured public snippets
                  </h2>
                </div>
                <Link
                  href="/explore"
                  className="text-xs text-muted hover:text-fg transition"
                >
                  Explore all →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {featured.slice(0, 6).map((s) => {
                  const meta = templateIcon[s.template];
                  const accentColor = meta?.color ?? "var(--accent)";
                  return (
                    <Link
                      key={s.id}
                      href={`/play/${s.slug}`}
                      className="group relative flex items-center gap-4 p-3.5 rounded-[2rem] border border-border bg-surface hover:bg-elevated transition-all duration-500 hover:scale-[1.02] hover:rotate-1 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                      {/* Background Glow */}
                      <div
                        className="absolute -left-10 -top-10 w-28 h-28 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                        style={{ background: accentColor }}
                      />

                      {/* Icon Stage */}
                      <div className="relative w-[32%] aspect-square shrink-0 flex items-center justify-center">
                        <div 
                          className="absolute inset-0 rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%] animate-[blobby_10s_ease-in-out_infinite] opacity-20 group-hover:opacity-40 transition-all duration-700 blur-[2px] border border-white/10"
                          style={{ background: accentColor }}
                        />
                        <div className="relative w-[50%] h-[50%] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                          <TemplateLogo id={s.template} className="w-full h-full drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-black text-fg tracking-tight group-hover:text-accent transition-colors leading-tight truncate">
                            {s.title}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] text-muted mb-1 truncate">
                          {s.author?.image ? (
                            <Image
                              src={s.author.image}
                              alt={s.author.name ?? ""}
                              width={14}
                              height={14}
                              className="rounded-full border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-surface border border-border shrink-0" />
                          )}
                          <span className="truncate">{s.author?.name ?? "anonymous"}</span>
                        </div>

                        {s.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto pt-1">
                            {s.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded border border-border bg-bg/50 text-[8px] font-bold text-muted uppercase tracking-tighter"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ───────────── BROWSE ALL TEMPLATES ───────────── */}
      <section
        id="templates"
        className="mx-auto max-w-6xl px-4 py-10 scroll-mt-20"
      >
        <div className="mb-6">
          <div className="text-xs font-black tracking-widest text-muted uppercase mb-1">
            Browse
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            All templates
          </h2>
        </div>

        {/* Search inside the section */}
        <div className="relative mb-4 group max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates — try “react”, “svelte”, “mobx”…"
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface border border-border focus:border-accent/40 text-sm outline-none placeholder:text-muted/50 transition-all focus:shadow-[0_0_20px_rgba(var(--accent-rgb),0.05)]"
          />
        </div>
 
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center mb-10">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                  active
                    ? "bg-accent text-bg border-accent shadow-[0_10px_20px_-5px_rgba(var(--accent-rgb),0.3)]"
                    : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <span className="ml-auto text-[10px] font-black uppercase tracking-[0.2em] text-muted/50">
            {filtered.length}{" "}
            {filtered.length === 1 ? "Result" : "Results"}
          </span>
        </div>

        {/* Grid */}
        {filter === "all" && !query ? (
          groups.map((g) => {
            const items = filtered.filter((t) => t.group === g.key);
            if (!items.length) return null;
            return (
              <section key={g.key} className="mb-16 last:mb-0">
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-fg tracking-tight">
                      {g.label}
                    </h3>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mt-0.5">
                      {items.length} {items.length === 1 ? "Technology" : "Technologies"}
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <Tile key={t.id} t={t} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <Tile key={t.id} t={t} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="mx-auto max-w-md text-center rounded-xl border border-border bg-panel/60 p-10 text-muted">
            No templates match “{query}”.
            <button
              className="block mx-auto mt-3 text-accent hover:underline"
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
    </div>
  );
}

function WelcomeCard({ w }: { w: NonNullable<Welcome> }) {
  const tpl = w.recent ? templatesById[w.recent.template] : null;
  const firstName = w.name?.split(" ")[0] ?? "there";
  return (
    <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-border bg-panel/60 backdrop-blur p-4 text-left shadow-soft">
      <div className="flex items-center gap-3">
        {w.image ? (
          <Image
            src={w.image}
            alt={w.name ?? ""}
            width={36}
            height={36}
            className="rounded-full border border-border shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-surface border border-border grid place-items-center shrink-0 text-sm">
            {firstName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-fg">
            Welcome back, {firstName}
          </div>
          <div className="text-xs text-muted">
            {w.snippetCount === 0
              ? "No snippets saved yet."
              : `${w.snippetCount} ${w.snippetCount === 1 ? "snippet" : "snippets"} saved`}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-elevated text-xs text-subtle hover:text-fg transition shrink-0"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          My snippets
        </Link>
      </div>

      {w.recent && (
        <Link
          href={`/play/${w.recent.slug}`}
          className="group mt-3 flex items-center gap-3 rounded-lg border border-border hover:border-border-strong bg-surface/70 hover:bg-elevated p-3 transition"
        >
          <div className="w-8 h-8 rounded-lg border border-border bg-panel grid place-items-center shrink-0">
            <TemplateLogo id={w.recent.template} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black uppercase tracking-wide text-muted">
              Continue editing
            </div>
            <div className="text-sm font-medium truncate text-fg">
              {w.recent.title}
            </div>
          </div>
          <span className="hidden sm:inline text-xs text-muted shrink-0">
            {tpl?.title ?? w.recent.template}
          </span>
          <ArrowRight className="w-4 h-4 text-muted group-hover:text-fg transition shrink-0" />
        </Link>
      )}
    </div>
  );
}
