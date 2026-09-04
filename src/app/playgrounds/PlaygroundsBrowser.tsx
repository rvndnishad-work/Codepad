"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  LayoutGrid,
  Search,
  Rocket,
  ChevronDown,
  User,
  List,
  FlaskConical,
} from "lucide-react";
import {
  templates,
  groups,
  templatesById,
  type TemplateDef,
} from "@/lib/templates";
import { TemplateLogo } from "@/lib/icons";
import { CodePeekCard } from "./CodePeekCard";
import WowReveal from "@/components/wow/WowReveal";

type Welcome = {
  name: string | null;
  image: string | null;
  snippetCount: number;
  recent: { slug: string; title: string; template: string } | null;
} | null;

const FEATURED_IDS = ["react", "python", "typescript", "empty-js"] as const;

function WelcomeStrip({ w }: { w: NonNullable<Welcome> }) {
  const firstName = w.name?.split(" ")[0] ?? "Developer";

  return (
    <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] p-4 backdrop-blur-md sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {w.image ? (
            <Image
              src={w.image}
              alt={w.name ?? ""}
              width={44}
              height={44}
              className="shrink-0 rounded-2xl border border-white/20"
            />
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10">
              <User className="h-5 w-5 text-white/60" />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0b0d16] bg-emerald-400" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-bold leading-snug text-white">
            Welcome back, {firstName}
          </div>
          <div className="mt-0.5 text-xs text-white/60">
            {w.snippetCount === 0 ? (
              <span className="italic">No saved sandboxes yet.</span>
            ) : (
              <span>
                <strong className="font-black tabular-nums text-white">
                  {w.snippetCount}
                </strong>{" "}
                saved sandbox{w.snippetCount === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {w.recent && (
          <Link
            href={`/play/${w.recent.slug}`}
            className="group/continue flex max-w-xs shrink-0 items-center gap-3 rounded-2xl border border-white/12 bg-black/30 px-3 py-2 transition hover:border-[#8b93ff]/60"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5">
              <TemplateLogo id={w.recent.template} size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                Continue editing
              </div>
              <div className="mt-0.5 max-w-[140px] truncate text-xs font-bold text-white">
                {w.recent.title}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-all group-hover/continue:translate-x-0.5 group-hover/continue:text-white" />
          </Link>
        )}

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition hover:scale-105"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function GuestWelcomeStrip() {
  return (
    <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] p-4 backdrop-blur-md sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8b93ff] to-[#ff2fb3]">
          <Rocket className="h-5 w-5 animate-pulse text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-snug text-white">
            Save and share your custom sandboxes
          </div>
          <div className="mt-0.5 text-xs text-white/60">
            Sign in to persist your modifications, fork popular templates, and build your portfolio.
          </div>
        </div>
      </div>

      <div className="relative shrink-0">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe600] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:scale-105"
        >
          Sign In / Sign Up
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}


/**
 * Mouse-tracked glow that washes the grid and brightens whatever card sits
 * under the cursor. DOM-driven at ~60fps (no re-renders), pointer-events-none
 * so clicks still land, plus-lighter blending for real lift on dark cards.
 */
function SpotlightGrid({
  children,
  gridClassName,
}: {
  children: React.ReactNode;
  gridClassName: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    const overlay = overlayRef.current;
    if (!el || !overlay) return;

    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);

    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const card = hit?.closest<HTMLElement>("[data-accent-rgb]");
    if (card) {
      const rgb = card.dataset.accentRgb;
      if (rgb) el.style.setProperty("--spot-color", rgb);
      overlay.style.opacity = "1";
    } else {
      overlay.style.opacity = "0";
    }
  };

  const handleLeave = () => {
    if (overlayRef.current) overlayRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative"
    >
      <div className={gridClassName}>{children}</div>
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(440px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(var(--spot-color, 139, 147, 255), 0.3), rgba(var(--spot-color, 139, 147, 255), 0.1) 28%, transparent 55%)",
          mixBlendMode: "plus-lighter",
        }}
      />
    </div>
  );
}

function GroupPanel({
  label,
  count,
  defaultOpen = true,
  gridClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  children,
}: {
  label: string;
  count: number;
  defaultOpen?: boolean;
  gridClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 transition hover:bg-[var(--wow-stage)] md:px-6"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="wow-font-display text-2xl tabular-nums text-[var(--wow-fg)]">{String(count).padStart(2, "0")}</span>
          <h3 className="text-base font-extrabold tracking-tight text-[var(--wow-fg)]">{label}</h3>
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-full border border-[var(--wow-card-border)] transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4 text-[var(--wow-faint)]" />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <SpotlightGrid gridClassName={gridClassName}>
            {children}
          </SpotlightGrid>
        </div>
      )}
    </section>
  );
}

export default function PlaygroundsBrowser({ welcome }: { welcome: Welcome }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");

  // ⌘K / Ctrl+K focuses the search box, matching the kbd hint in the hero.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById("playgrounds-search");
        if (el instanceof HTMLInputElement) {
          el.focus();
          el.select();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
    // Distinct base templates as a proxy for "languages" the user can
    // reach without setup — close enough for the hero stat.
    const languages = new Set(templates.map((t) => t.base)).size;
    return { total: templates.length, ts: tsCount, languages };
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

  const gridClasses = viewMode === "compact"
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] pb-32 transition-colors">
      {/* ── Dark cinematic hero (starts under the transparent bar) ── */}
      <header className="wow-noise relative -mt-16 overflow-hidden bg-[#08080f] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-200px] h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[#8b93ff]/20 blur-[130px]" />
          <div className="absolute right-[-140px] top-1/3 h-[380px] w-[380px] rounded-full bg-[#ff2fb3]/10 blur-[110px]" />
          <div className="wow-grid-bg absolute inset-0" />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08080f]" />

        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-24 text-center md:pt-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            <FlaskConical className="h-3.5 w-3.5 text-[#8b93ff]" />
            Zero-install sandboxes
          </p>
          <h1 className="wow-font-display mt-6 text-6xl md:text-8xl">
            PICK A BOX.<br /><span className="wow-gradient-text">START CODING.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/65 md:text-base">
            Pick a sandbox, start coding instantly. Experience zero-latency runs with our new{" "}
            <strong className="rounded border border-[#8b93ff]/30 bg-[#8b93ff]/15 px-1.5 py-0.5 font-extrabold text-[#c7d2fe]">
              AuraSandbox™ JIT Engine
            </strong>{" "}
            for backend systems.
          </p>

          {/* Pill search with ⌘K hint */}
          <div className="relative mx-auto mt-9 max-w-xl">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="playgrounds-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sandboxes…"
              className="w-full rounded-full border border-white/15 bg-white/[0.06] py-3.5 pl-12 pr-16 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/40 hover:border-white/25 focus:border-[#8b93ff]/60 focus:shadow-[0_0_40px_-10px_rgba(139,147,255,0.5)]"
            />
            <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-white/50 sm:inline-flex">
              ⌘K
            </kbd>
          </div>

          {/* Inline stats row */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55 sm:gap-8">
            <span><strong className="wow-font-display text-xl tabular-nums normal-case tracking-normal text-white">{stats.total}+</strong> Sandboxes</span>
            <span><strong className="wow-font-display text-xl tabular-nums normal-case tracking-normal text-white">{stats.languages}</strong> Languages</span>
            <span><strong className="wow-font-display text-xl tabular-nums normal-case tracking-normal text-[#ffe600]">100%</strong> Zero config</span>
          </div>

          {/* Category Filters Bar */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
                  filter === "all"
                    ? "bg-[#ffe600] font-bold text-black shadow-[0_0_30px_-8px_#ffe600]"
                    : "border border-white/15 bg-white/[0.06] text-white/60 backdrop-blur hover:border-white/30 hover:text-white"
                }`}
              >
                All Sandboxes
              </button>
              {groups.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setFilter(g.key)}
                  className={`rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
                    filter === g.key
                      ? "bg-[#ffe600] font-bold text-black shadow-[0_0_30px_-8px_#ffe600]"
                      : "border border-white/15 bg-white/[0.06] text-white/60 backdrop-blur hover:border-white/30 hover:text-white"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur">
                <button
                  onClick={() => setViewMode("card")}
                  className={`rounded-full p-1.5 transition ${viewMode === "card" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                  title="Card View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`rounded-full p-1.5 transition ${viewMode === "compact" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                  title="Compact View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 text-left">
            {welcome ? (
              <WelcomeStrip w={welcome} />
            ) : (
              <GuestWelcomeStrip />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* Most Popular — Fast Track section */}
        {!isBrowsing && (
          <section className="mt-14">
            <WowReveal>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff2fb3]">
                    <Rocket className="h-3.5 w-3.5" /> Fast track
                  </p>
                  <h2 className="wow-font-display mt-2 text-4xl text-[var(--wow-fg)] md:text-5xl">MOST POPULAR.</h2>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--wow-faint)]">Top picks</span>
              </div>
            </WowReveal>
            <SpotlightGrid gridClassName={gridClasses}>
              {featured.map((t) => (
                <CodePeekCard key={t.id} t={t} variant="featured" compact={viewMode === "compact"} />
              ))}
            </SpotlightGrid>
          </section>
        )}

        {/* Catalog — grouped collapsible panels, or flat filtered grid */}
        <section className="mt-10 space-y-5">
          {!isBrowsing ? (
            groupedItems.map(({ group, items }) => {
              if (!items.length) return null;
              return (
                <GroupPanel
                  key={group.key}
                  label={group.label}
                  count={items.length}
                  gridClassName={gridClasses}
                >
                  {items.map((t) => (
                    <CodePeekCard key={t.id} t={t} compact={viewMode === "compact"} />
                  ))}
                </GroupPanel>
              );
            })
          ) : filtered.length > 0 ? (
            <SpotlightGrid gridClassName={gridClasses}>
              {filtered.map((t) => (
                <CodePeekCard key={t.id} t={t} compact={viewMode === "compact"} />
              ))}
            </SpotlightGrid>
          ) : (
            <div className="mx-auto max-w-md rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-8 text-center text-sm text-[var(--wow-muted)]">
              No playgrounds match “{query}”.
              <button
                className="mx-auto mt-3 block text-xs font-bold text-[#8b93ff] hover:underline"
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
        <div className="mt-16 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--wow-faint)]">
          Missing a stack? New playgrounds ship every release.
        </div>
      </main>
    </div>
  );
}
