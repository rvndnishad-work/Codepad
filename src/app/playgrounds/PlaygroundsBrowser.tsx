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

function WelcomeStrip({ w }: { w: NonNullable<Welcome> }) {
  const firstName = w.name?.split(" ")[0] ?? "Developer";

  return (
    <div className="group/welcome relative rounded-2xl border border-border bg-surface/50 dark:bg-[#11131a]/60 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden shadow-soft dark:shadow-[0_0_50px_-12px_rgba(139,92,246,0.12)] hover:border-violet-500/30 dark:hover:border-violet-500/20 transition-all duration-300">
      <div className="absolute -top-20 -left-20 w-44 h-44 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-3xl pointer-events-none group-hover/welcome:scale-110 transition-transform duration-500" />
      <div className="absolute -bottom-20 -right-20 w-44 h-44 rounded-full bg-fuchsia-500/5 dark:bg-fuchsia-500/10 blur-3xl pointer-events-none group-hover/welcome:scale-110 transition-transform duration-500" />

      <div className="flex items-center gap-4 relative">
        <div className="relative">
          {w.image ? (
            <Image
              src={w.image}
              alt={w.name ?? ""}
              width={44}
              height={44}
              className="rounded-xl shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-bg grid place-items-center shrink-0">
              <User className="w-5 h-5 text-muted" />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-bold text-fg leading-snug">
            Welcome back, {firstName}
          </div>
          <div className="text-xs text-muted mt-0.5">
            {w.snippetCount === 0 ? (
              <span className="italic">No saved sandboxes yet.</span>
            ) : (
              <span>
                <strong className="text-fg font-black tabular-nums">
                  {w.snippetCount}
                </strong>{" "}
                saved sandbox{w.snippetCount === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {w.recent && (
          <Link
            href={`/play/${w.recent.slug}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg/50 hover:bg-elevated hover:border-border-strong px-3 py-2 transition-all shrink-0 max-w-xs group/continue"
          >
            <div className="w-8 h-8 rounded-md bg-panel border border-border grid place-items-center shrink-0">
              <TemplateLogo id={w.recent.template} size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-wider text-muted">
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
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-bg/60 hover:bg-fg hover:text-bg text-xs font-bold text-fg transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

/**
 * Soft mouse-tracked "bulb" that washes the grid in a violet glow and
 * brightens whatever cards happen to sit under the cursor. The overlay sits
 * above the grid with `pointer-events-none` so card clicks/hover still work,
 * and uses `plus-lighter` blending so dark cards get a real lift rather than
 * just a tinted veil.
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

  // We drive position, color, and opacity straight onto the DOM so the
  // ~60fps mousemove never triggers a re-render. The CSS transition
  // (opacity) and the bulb position respond instantly.
  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    const overlay = overlayRef.current;
    if (!el || !overlay) return;

    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);

    // Hit-test the cursor; only light the bulb when it's actually over a
    // card. In an empty grid cell or a wide gap, the bulb fades out so it
    // doesn't read as a stray container.
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
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 z-10"
        style={{
          background:
            "radial-gradient(440px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(var(--spot-color, 167, 139, 250), 0.3), rgba(var(--spot-color, 167, 139, 250), 0.1) 28%, transparent 55%)",
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
  children,
}: {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-2 hover:opacity-80 transition-opacity"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-violet-500" />
          <h3 className="text-base font-bold text-fg">{label}</h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 tabular-nums">
            {count}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="mt-4">
          <SpotlightGrid gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

  return (
    <div className="bg-bg min-h-screen pb-32 relative overflow-hidden">
      {/* Ambient background — subtle dot grid + soft accent blobs, matches
          the launchpad reference. Sits behind every section. */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "rgb(148 163 184)",
        }}
      />
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-violet-500/10 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[300px] right-[-150px] w-[500px] h-[500px] rounded-full bg-fuchsia-500/[0.04] blur-[120px] pointer-events-none -z-10" />

      {/* Centered hero */}
      <header className="mx-auto max-w-3xl px-4 pt-16 md:pt-24 text-center relative">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] bg-clip-text text-transparent bg-gradient-to-b from-fg via-fg to-violet-400">
          Playgrounds
        </h1>
        <p className="mt-5 text-muted text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Pick a sandbox, start coding instantly. No setup, no config — just
          you and the problem.
        </p>

        {/* Pill search with ⌘K hint */}
        <div className="mt-9 relative max-w-xl mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            id="playgrounds-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sandboxes…"
            className="w-full pl-12 pr-16 py-3.5 rounded-full border border-border bg-surface/60 dark:bg-[#11131a]/70 text-sm outline-none placeholder:text-muted/60 backdrop-blur-md transition-all duration-300 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_0_30px_-10px_rgba(139,92,246,0.12)] hover:border-violet-500/30 dark:hover:border-violet-500/20 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
          />
          <kbd className="hidden sm:inline-flex absolute right-4 top-1/2 -translate-y-1/2 items-center gap-0.5 px-2 py-1 rounded-md bg-bg/60 text-[10px] font-mono text-muted">
            ⌘K
          </kbd>
        </div>

        {/* Inline stats row */}
        <div className="mt-7 flex items-center justify-center gap-6 sm:gap-8 text-sm text-muted flex-wrap">
          <span>
            <strong className="text-fg font-black tabular-nums">
              {stats.total}+
            </strong>{" "}
            Sandboxes
          </span>
          <span>
            <strong className="text-fg font-black tabular-nums">
              {stats.languages}
            </strong>{" "}
            Languages
          </span>
          <span>
            <strong className="text-fg font-black">100%</strong> Zero config
          </span>
        </div>

        {welcome && welcome.snippetCount > 0 && (
          <div className="mt-10 text-left">
            <WelcomeStrip w={welcome} />
          </div>
        )}
      </header>

      {/* Most Popular — Fast Track section */}
      {!isBrowsing && (
        <section className="mx-auto max-w-6xl px-4 mt-20">
          <div className="flex items-end justify-between mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-bold uppercase tracking-wider">
                <Rocket className="w-3 h-3" />
                Fast Track
              </span>
              <h2 className="text-2xl font-black text-fg tracking-tight">
                Most Popular
              </h2>
            </div>
            <span className="text-xs text-muted">Top picks</span>
          </div>
          <SpotlightGrid gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((t) => (
              <CodePeekCard key={t.id} t={t} variant="featured" />
            ))}
          </SpotlightGrid>
        </section>
      )}

      {/* Catalog — grouped collapsible panels, or flat filtered grid */}
      <section className="mx-auto max-w-6xl px-4 mt-12 space-y-6">
        {!isBrowsing ? (
          groupedItems.map(({ group, items }) => {
            if (!items.length) return null;
            return (
              <GroupPanel
                key={group.key}
                label={group.label}
                count={items.length}
              >
                {items.map((t) => (
                  <CodePeekCard key={t.id} t={t} />
                ))}
              </GroupPanel>
            );
          })
        ) : filtered.length > 0 ? (
          <SpotlightGrid gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <CodePeekCard key={t.id} t={t} />
            ))}
          </SpotlightGrid>
        ) : (
          <div className="mx-auto max-w-md text-center rounded-xl bg-surface/60 p-8 text-sm text-muted">
            No playgrounds match “{query}”.
            <button
              className="block mx-auto mt-3 text-violet-400 hover:underline text-xs font-semibold"
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
