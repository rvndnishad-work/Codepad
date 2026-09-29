"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Bookmark, LayoutGrid, List, Search, FlaskConical } from "lucide-react";
import {
  templates,
  groups,
  templatesById,
  type TemplateDef,
} from "@/lib/templates";
import { FALLBACK_POPULAR_IDS } from "@/lib/popular-templates";
import { catalogSections, shortGroupLabel } from "@/lib/playground-catalog";
import { TemplateLogo } from "@/lib/icons";
import { CatalogCard, CodePeekCard, LogoBlob } from "./CodePeekCard";
import "./playgrounds.css";

gsap.registerPlugin(ScrollTrigger);

/** Where the filter bar sticks: just below the floating nav pill (keep in
 *  step with `md:top-[84px]` on the bar). */
const BAR_TOP = 84;

const BlackHoleScene3D = dynamic(() => import("./_wow/BlackHoleScene3D"), { ssr: false });

type Welcome = {
  name: string | null;
  image: string | null;
  snippetCount: number;
  recent: { slug: string; title: string; template: string } | null;
} | null;

/** Pill on the hero for signed-in people: who they are, where they left off. */
function WelcomeStrip({ w }: { w: NonNullable<Welcome> }) {
  const firstName = w.name?.split(" ")[0] ?? "Developer";
  const initials =
    (w.name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  const recentTemplate = w.recent ? templatesById[w.recent.template] : undefined;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3 rounded-[20px] border border-white/[0.14] bg-[#08080f]/75 p-3.5 backdrop-blur-md md:h-16 md:flex-row md:items-center md:gap-3.5 md:rounded-full md:py-0 md:pl-3 md:pr-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-3.5">
        {w.image ? (
          <Image
            src={w.image}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full border border-white/20"
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#373d47] bg-[#272c34] text-[13px] font-semibold text-[#cdd1d7]">
            {initials}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold text-white">Welcome back, {firstName}</span>
          <span className="text-[13px] text-[#949aa3]">
            {w.snippetCount === 0
              ? "No saved sandboxes yet"
              : `${w.snippetCount} saved sandbox${w.snippetCount === 1 ? "" : "es"}`}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {w.recent && (
          <Link
            href={`/play/${w.recent.slug}`}
            className="flex h-[46px] min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/[0.14] pl-2 pr-3.5 text-white transition-colors hover:border-[#ffe600]/50 hover:bg-white/[0.06] motion-reduce:transition-none md:flex-none"
          >
            {recentTemplate ? (
              <LogoBlob t={recentTemplate} size={30} />
            ) : (
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center">
                <TemplateLogo id={w.recent.template} size={15} />
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-[#949aa3]">Continue editing</span>
              <span className="max-w-[160px] truncate text-sm font-medium">{w.recent.title}</span>
            </span>
            <span aria-hidden className="ml-1 text-[#ffe600]">
              →
            </span>
          </Link>
        )}
        <Link
          href="/dashboard"
          className="flex h-[46px] shrink-0 items-center rounded-full bg-[#f5f6f7] px-[18px] text-sm font-semibold text-[#0f1115] transition-colors hover:bg-white motion-reduce:transition-none"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

/** Pill on the hero for guests: saving needs an account. */
function GuestWelcomeStrip() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3 rounded-[20px] border border-white/[0.14] bg-[#08080f]/75 p-3.5 backdrop-blur-md md:h-[60px] md:flex-row md:items-center md:gap-3.5 md:rounded-full md:py-0 md:pl-2.5 md:pr-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe600]/[0.12]">
          <Bookmark className="h-[18px] w-[18px] text-[#ffe600]" aria-hidden />
        </span>
        <p className="m-0 text-[15px] leading-snug text-[#cdd1d7]">
          <strong className="font-semibold text-white">Save your sandboxes</strong> and share them with a link.
        </p>
      </div>
      <div className="flex gap-2 md:items-center md:gap-1">
        <Link
          href="/login?mode=signup&next=/playgrounds"
          className="order-2 flex h-11 flex-1 items-center justify-center rounded-full border border-white/20 text-[15px] font-medium text-white transition-colors hover:border-white/40 motion-reduce:transition-none md:order-1 md:h-auto md:flex-none md:border-0 md:px-1.5 md:text-sm md:font-normal md:text-[#cdd1d7] md:hover:text-white"
        >
          Create account
        </Link>
        <Link
          href="/login?next=/playgrounds"
          className="order-1 flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#ffe600] px-5 text-[15px] font-semibold text-[#0f1115] transition-[filter] hover:brightness-105 motion-reduce:transition-none md:order-2 md:flex-none md:text-sm"
        >
          Sign in
          <ArrowRight className="hidden h-3.5 w-3.5 md:block" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export default function PlaygroundsBrowser({
  welcome,
  popularIds = [...FALLBACK_POPULAR_IDS],
}: {
  welcome: Welcome;
  /** Usage-ranked template ids for "Most popular" (server-computed). */
  popularIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");
  const heroRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [barStuck, setBarStuck] = useState(false);
  const [chipsOverflow, setChipsOverflow] = useState(false);

  // Black-hole loop freezes offscreen / while scrolling / on reduced motion
  // (same perf contract as the other 3D heroes).
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
      return;
    }
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0.02 });
    obs.observe(el);
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setScrolling(false), 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  // Masked-line entrance + backdrop parallax. Skipped for reduced motion
  // (content stays visible — gsap.from only hides when the timeline runs).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".ph-line", { yPercent: 115, duration: 1.05, stagger: 0.12 })
        .from(".ph-fade", { y: 24, opacity: 0, duration: 0.85, stagger: 0.07 }, "-=0.65")
        .from(".ph-3d", { opacity: 0, scale: 1.05, duration: 1.6 }, 0);
      gsap.to(".ph-bg", {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // ⌘K / Ctrl+K focuses the hero search while it is on screen, otherwise
  // the one in the filter bar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const hero = document.getElementById("playgrounds-search");
        const heroOnScreen = hero ? hero.getBoundingClientRect().bottom > 64 : false;
        const el = heroOnScreen ? hero : document.getElementById("playgrounds-search-bar");
        if (el instanceof HTMLInputElement) {
          el.focus();
          el.select();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // The bar sticks just under the floating nav pill (md and up). Once stuck
  // it grows a band behind the pill so cards never show between the two.
  useEffect(() => {
    const onScroll = () => {
      const bar = barRef.current;
      if (!bar) return;
      const stuck =
        window.matchMedia("(min-width: 768px)").matches &&
        bar.getBoundingClientRect().top <= BAR_TOP + 0.5;
      setBarStuck(stuck);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Fade the chip row's edge only when some chips are scrolled out of view.
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const check = () => setChipsOverflow(el.scrollWidth - el.scrollLeft - el.clientWidth > 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);

  const featured = useMemo(
    () =>
      popularIds
        .map((id) => templatesById[id])
        .filter((t): t is TemplateDef => Boolean(t)),
    [popularIds],
  );

  const sections = useMemo(
    () => catalogSections(templates, groups, filter, query),
    [filter, query],
  );
  const resultCount = sections.reduce((n, s) => n + s.items.length, 0);

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

  // Once the filter bar is stuck under the site nav, a new filter should
  // show its results from the top instead of wherever the page was.
  const keepCatalogInView = (smooth: boolean) => {
    const bar = barRef.current;
    const catalog = catalogRef.current;
    if (!bar || !catalog) return;
    const barBottom = bar.getBoundingClientRect().bottom;
    const catalogTop = catalog.getBoundingClientRect().top;
    if (catalogTop >= barBottom - 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: window.scrollY + catalogTop - barBottom,
      behavior: smooth && !reduced ? "smooth" : "auto",
    });
  };

  const pickFromBar = (key: string) => {
    setFilter(key);
    keepCatalogInView(true);
  };

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
    keepCatalogInView(true);
  };

  const gridClasses = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";
  const Card = viewMode === "card" ? CodePeekCard : CatalogCard;

  // Short labels so every chip fits beside the search on a laptop; the
  // section headings below carry the counts.
  const barChips = [
    { key: "all", label: "All sandboxes" },
    ...groups.map((g) => ({ key: g.key, label: shortGroupLabel(g.label).replace(/ Templates$/, "") })),
  ];

  return (
    <div className="min-h-screen bg-bg transition-colors">
      {/* ── Dark cinematic hero (starts under the transparent bar) ── */}
      <header ref={heroRef} data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-[#08080f] text-white">
        <div aria-hidden className="ph-bg pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-200px] h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[#8b93ff]/20 blur-[130px]" />
          <div className="absolute right-[-140px] top-1/3 h-[380px] w-[380px] rounded-full bg-[#ff2fb3]/10 blur-[110px]" />
          <div className="wow-grid-bg absolute inset-0" />
        </div>
        {/* black-hole backdrop, sunk low behind the search/filters */}
        <div aria-hidden className="ph-3d absolute inset-0 transform-gpu opacity-90 will-change-transform">
          <BlackHoleScene3D paused={paused || scrolling} />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08080f]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_58%_46%_at_50%_40%,rgba(8,8,15,0.82),transparent_70%)]" />
        {/* HUD corners */}
        <div aria-hidden className="pointer-events-none absolute inset-4 z-[5] hidden sm:block">
          <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-[#ffb64d]/50" />
          <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-[#ffb64d]/50" />
          <span className="absolute left-10 top-0.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
            Singularity // stable
          </span>
          <span className="absolute right-10 top-0.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
            Escape velocity: c
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-14 pt-24 text-center md:pt-28">
          <p className="ph-fade inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            <FlaskConical className="h-3.5 w-3.5 text-[#8b93ff]" />
            Zero-install sandboxes
          </p>
          <h1 className="wow-font-display mt-6 text-6xl md:text-8xl">
            <span className="block overflow-hidden pb-1"><span className="ph-line block">PICK A BOX.</span></span>
            <span className="block overflow-hidden pb-2"><span className="ph-line wow-gradient-text block pb-2">START CODING.</span></span>
          </h1>
          <p className="ph-fade mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/65 md:text-base">
            Pick a sandbox, start coding instantly. Experience zero-latency runs with our new{" "}
            <strong className="rounded border border-[#8b93ff]/30 bg-[#8b93ff]/15 px-1.5 py-0.5 font-extrabold text-[#c7d2fe]">
              AuraSandbox™ JIT Engine
            </strong>{" "}
            for backend systems.
          </p>

          {/* Pill search with ⌘K hint */}
          <div className="ph-fade relative mx-auto mt-9 max-w-xl">
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
          <div className="ph-fade mt-7 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55 sm:gap-8">
            <span><strong className="wow-font-display text-xl tabular-nums normal-case tracking-normal text-white">{stats.total}+</strong> Sandboxes</span>
            <span><strong className="wow-font-display text-xl tabular-nums normal-case tracking-normal text-white">{stats.languages}</strong> Languages</span>
            <span><strong className="wow-font-display text-xl tabular-nums normal-case tracking-normal text-[#ffe600]">100%</strong> Zero config</span>
          </div>

          {/* Category Filters Bar */}
          <div className="ph-fade mt-8 flex flex-col items-center justify-center gap-4">
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

          <div className="ph-fade mt-10 text-left">
            {welcome ? (
              <WelcomeStrip w={welcome} />
            ) : (
              <GuestWelcomeStrip />
            )}
          </div>
        </div>
      </header>

      {/* Filter bar: stays under the site nav once the hero scrolls away. */}
      <div
        ref={barRef}
        data-stuck={barStuck}
        className="relative z-40 border-y border-border bg-bg/90 backdrop-blur-md md:sticky md:top-[84px]"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-full h-[84px] bg-bg/90 backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none ${
            barStuck ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2.5 py-3 md:h-16 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:py-0">
          <label className="order-1 mx-4 flex h-11 items-center gap-2.5 rounded-xl border border-border-strong bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgb(var(--c-accent)/0.18)] motion-reduce:transition-none md:order-2 md:mx-0 md:h-[38px] md:w-[240px] md:shrink-0 md:rounded-[10px] md:pl-3 md:pr-2.5">
            <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            <span className="sr-only">Search playgrounds</span>
            <input
              id="playgrounds-search-bar"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                keepCatalogInView(false);
              }}
              placeholder="Search sandboxes"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle md:text-sm"
            />
            <kbd className="hidden rounded-[5px] border border-border-strong px-1.5 py-0.5 font-mono text-[11px] text-subtle md:inline">
              ⌘K
            </kbd>
          </label>
          <div
            ref={chipsRef}
            role="group"
            aria-label="Filter playgrounds"
            className={`order-2 flex min-w-0 gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:order-1 md:gap-1.5 md:px-0 [&::-webkit-scrollbar]:hidden ${
              chipsOverflow ? "[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]" : ""
            }`}
          >
            {barChips.map((c) => {
              const on = filter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickFromBar(c.key)}
                  className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors motion-reduce:transition-none md:h-[34px] md:text-[13px] ${
                    on
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-border text-muted hover:border-border-strong hover:text-fg"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main
        ref={catalogRef}
        className="mx-auto flex max-w-[1280px] flex-col gap-12 px-4 pt-10 md:px-6"
      >
        {!isBrowsing && featured.length > 0 && (
          <section aria-labelledby="most-popular" className="flex flex-col gap-[18px]">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="most-popular" className="text-[22px] font-semibold tracking-[-0.015em] text-fg">
                Most popular
              </h2>
              <span className="text-[13px] text-subtle">Ranked by sandboxes saved</span>
            </div>
            {/* A swipe row on phones, a grid from sm up. */}
            <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {featured.map((t) => (
                <div key={t.id} className="w-[272px] shrink-0 snap-start sm:w-auto">
                  <CodePeekCard t={t} />
                </div>
              ))}
            </div>
          </section>
        )}

        {isBrowsing && (
          <div className="-mb-4 flex items-center justify-between gap-4">
            <p role="status" className="text-[15px] text-muted">
              {resultCount === 1 ? "1 playground" : `${resultCount} playgrounds`}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="h-[34px] rounded-lg border border-border-strong px-3 text-[13px] text-muted transition-colors hover:border-subtle hover:text-fg motion-reduce:transition-none"
            >
              Clear filters
            </button>
          </div>
        )}

        {sections.map((s) => (
          <section key={s.key} aria-labelledby={`group-${s.key}`} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2.5">
              <h2 id={`group-${s.key}`} className="text-[22px] font-semibold tracking-[-0.015em] text-fg">
                {s.label}
              </h2>
              <span className="font-mono text-[13px] text-subtle">{s.items.length}</span>
            </div>
            <div className={gridClasses}>
              {s.items.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </div>
          </section>
        ))}

        {resultCount === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
            <p className="text-[17px] font-semibold text-fg">No playground matches that yet</p>
            <p className="text-sm text-subtle">
              Try a framework or language name, or start from a blank template.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-1.5 h-10 rounded-[10px] bg-accent px-4 text-sm font-semibold text-accent-ink transition-[filter] hover:brightness-105 motion-reduce:transition-none"
            >
              Show all playgrounds
            </button>
          </div>
        )}

        <footer className="mt-4 border-t border-border pb-16 pt-7">
          <p className="text-[15px] text-muted">
            Missing a stack you need? New playgrounds ship with every release.
          </p>
        </footer>
      </main>
    </div>
  );
}
