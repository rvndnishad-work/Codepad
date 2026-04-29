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
  return (
    <Link
      href={`/play?template=${t.id}`}
      className="group relative rounded-xl border border-border bg-surface/60 hover:bg-elevated transition shadow-tile hover:shadow-tile-hover p-4 flex flex-col gap-3"
    >
      <div
        className="w-11 h-11 rounded-lg grid place-items-center border border-border"
        style={{ background: meta?.bg ?? "rgba(255,255,255,0.03)" }}
      >
        {Icon ? (
          <Icon width={22} height={22} style={{ color: meta?.color }} />
        ) : (
          <span className="text-xs font-semibold">{t.label}</span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-fg">{t.title}</span>
        <span className="text-xs text-muted">
          {t.subtitle ?? groupLabel(t.group)}
        </span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c}
              className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-panel text-[10px] text-subtle"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl pointer-events-none ring-0 group-hover:ring-1 ring-accent/30 transition"
      />
    </Link>
  );
}

function FeaturedTile({ t }: { t: TemplateDef }) {
  const meta = templateIcon[t.id];
  const Icon = meta?.Icon;
  return (
    <Link
      href={`/play?template=${t.id}`}
      className="group relative rounded-2xl border border-border bg-panel/60 hover:bg-elevated p-5 flex flex-col gap-4 shadow-tile hover:shadow-tile-hover transition overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -right-14 -top-14 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition"
        style={{ background: meta?.color ?? "transparent" }}
      />
      <div className="relative flex items-center justify-between">
        <div
          className="w-14 h-14 rounded-xl grid place-items-center border border-border"
          style={{ background: meta?.bg ?? "rgba(255,255,255,0.04)" }}
        >
          {Icon ? (
            <Icon width={30} height={30} style={{ color: meta?.color }} />
          ) : (
            <span className="text-xs font-semibold">{t.label}</span>
          )}
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-fg transition" />
      </div>
      <div className="relative">
        <div className="text-base font-semibold text-fg">{t.title}</div>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          {FEATURED_DESCRIPTIONS[t.id] ?? t.subtitle ?? groupLabel(t.group)}
        </p>
      </div>
      <div className="relative flex items-center gap-1.5 mt-auto">
        {tileChips(t).map((c) => (
          <span
            key={c}
            className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-subtle"
          >
            {c}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-accent font-medium">
          Start →
        </span>
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
}: {
  welcome?: Welcome;
  featured?: FeaturedSnippet[];
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
      {/* ───────────── HERO ───────────── */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div
          className="absolute inset-0 bg-grid-pattern opacity-50"
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
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/60 px-3 py-1 text-[11px] text-subtle mb-6">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Sandboxed iframe — code runs only in your browser</span>
                  </div>
                )}

                <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-fg leading-[1.05]">
                  {isReturning ? (
                    "Pick up where you left off"
                  ) : isFresh ? (
                    <>
                      Welcome to Codepad,
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
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-white text-sm font-medium shadow-soft transition"
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

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-muted">
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
              className="rounded-xl border border-border bg-panel/40 p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-glow border border-accent/30 grid place-items-center mb-3">
                <Icon className="w-4.5 h-4.5 text-accent" style={{ width: 18, height: 18 }} />
              </div>
              <div className="text-sm font-semibold text-fg mb-1">{f.title}</div>
              <p className="text-xs text-muted leading-relaxed">{f.body}</p>
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
            <div className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase mb-1">
              Most popular
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
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
              <div className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase mb-1">
                From the community
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
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
              const tpl = templatesById[s.template];
              return (
                <Link
                  key={s.id}
                  href={`/play/${s.slug}`}
                  className="group flex flex-col gap-2.5 rounded-xl border border-border bg-panel/70 hover:bg-elevated p-4 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border border-border bg-surface grid place-items-center shrink-0">
                      <TemplateLogo id={s.template} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {s.title}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {tpl?.title ?? s.template}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-fg transition" />
                  </div>
                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-subtle"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-muted pt-1">
                    {s.author?.image ? (
                      <Image
                        src={s.author.image}
                        alt={s.author.name ?? ""}
                        width={16}
                        height={16}
                        className="rounded-full border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-surface border border-border shrink-0" />
                    )}
                    <span className="truncate">{s.author?.name ?? "anonymous"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ───────────── BROWSE ALL TEMPLATES ───────────── */}
      <section
        id="templates"
        className="mx-auto max-w-6xl px-4 py-10 scroll-mt-20"
      >
        <div className="mb-5">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase mb-1">
            Browse
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            All templates
          </h2>
        </div>

        {/* Search inside the section */}
        <div className="relative mb-3 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates — try “react”, “svelte”, “mobx”…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-panel border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center mb-6">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? "bg-accent text-white border-accent"
                    : "bg-panel border-border text-subtle hover:text-fg hover:border-border-strong"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted">
            {filtered.length}{" "}
            {filtered.length === 1 ? "template" : "templates"}
          </span>
        </div>

        {/* Grid */}
        {filter === "all" && !query ? (
          groups.map((g) => {
            const items = filtered.filter((t) => t.group === g.key);
            if (!items.length) return null;
            return (
              <section key={g.key} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                    {g.label}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {items.map((t) => (
                    <Tile key={t.id} t={t} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
          <div className="text-[11px] text-muted">
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
          className="group mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface/70 hover:bg-elevated p-3 transition"
        >
          <div className="w-8 h-8 rounded-lg border border-border bg-panel grid place-items-center shrink-0">
            <TemplateLogo id={w.recent.template} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Continue editing
            </div>
            <div className="text-sm font-medium truncate text-fg">
              {w.recent.title}
            </div>
          </div>
          <span className="hidden sm:inline text-[11px] text-muted shrink-0">
            {tpl?.title ?? w.recent.template}
          </span>
          <ArrowRight className="w-4 h-4 text-muted group-hover:text-fg transition shrink-0" />
        </Link>
      )}
    </div>
  );
}
