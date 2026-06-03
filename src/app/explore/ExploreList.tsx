"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { TemplateLogo, templateIcon } from "@/lib/icons";
import { templatesById, groups } from "@/lib/templates";
import { 
  ArrowUpRight, 
  Compass, 
  Plus, 
  Search, 
  Sparkles, 
  Cpu, 
  Users, 
  Code2, 
  TrendingUp, 
  FolderGit2,
  Calendar,
  Layers,
  SearchIcon
} from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import { motion, AnimatePresence } from "framer-motion";

export type ExploreItem = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  tags: string[];
  author: { name: string | null; image: string | null } | null;
};

const FILTERS = [
  { key: "all", label: "All Codebases" },
  ...groups.map((g) => ({ key: g.key, label: g.label })),
];

export default function ExploreList({
  initial,
  initialCursor,
}: {
  initial: ExploreItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState<ExploreItem[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const isInitialMount = useRef(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Spotlight effect tracker
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const visible = useMemo(() => {
    return items.filter((s) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.template.toLowerCase().includes(q) ||
        (templatesById[s.template]?.title?.toLowerCase().includes(q) ?? false) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        (s.author?.name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query]);

  // Trending snippets: pick first 3 fresh, high-quality snippets to promote in the gallery hero section
  const trendingSnippets = useMemo(() => {
    return items.slice(0, 3);
  }, [items]);

  // Refetch when filter changes (skip initial mount since SSR provides data)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("group", filter);
      }
      try {
        const res = await fetch(`/api/explore?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const filtered =
          filter === "all"
            ? data.items
            : data.items.filter(
                (it: ExploreItem) =>
                  templatesById[it.template]?.group === filter
              );
        setItems(filtered);
        setCursor(data.nextCursor);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filter]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/explore?cursor=${cursor}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: ExploreItem[] =
        filter === "all"
          ? data.items
          : data.items.filter(
              (it: ExploreItem) =>
                templatesById[it.template]?.group === filter
            );
      setItems((prev) => [...prev, ...incoming]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-bg overflow-hidden pb-24"
    >
      {/* Immersive Perspective Grid & Dynamic Spotlight */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div 
          className="absolute inset-0 transition-opacity duration-300 opacity-100"
          style={{
            background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--accent-rgb), 0.045), transparent 50%)`,
          }}
        />
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16">
        
        {/* Dynamic Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-black text-accent mb-4 uppercase tracking-widest">
              <Compass className="w-3.5 h-3.5" />
              <span>Developer Ecosystem</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-fg leading-none mb-4">
              Community Gallery
            </h1>
            <p className="text-muted text-sm md:text-base max-w-lg leading-relaxed font-medium">
              Explore public sandboxes shared by programmers worldwide. Fork custom layouts directly 
              into your workspace to prototype modern applications in seconds.
            </p>
          </div>

          {/* Quick Floating Stat Cards */}
          <div className="flex gap-4 shrink-0 bg-surface/50 border border-border backdrop-blur-md p-4 rounded-2xl">
            <div className="border-r border-border pr-4">
              <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Total shared</div>
              <div className="text-xl font-black text-fg tracking-tight">{items.length}+</div>
            </div>
            <div>
              <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Active tech</div>
              <div className="text-xl font-black text-accent tracking-tight">10+ languages</div>
            </div>
          </div>
        </div>

        {/* ── Trending Showcase Banner ── */}
        {filter === "all" && !query.trim() && trendingSnippets.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs font-black text-fg uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent animate-pulse" />
              Trending Prototypes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingSnippets.map((s, idx) => {
                const tpl = templatesById[s.template];
                const icon = templateIcon[s.template];
                const accentColor = icon?.color ?? "var(--accent)";
                
                return (
                  <motion.div
                    key={`trending-${s.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative group rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/5 via-panel/30 to-panel/10 p-6 hover:bg-elevated/40 hover:border-accent/40 transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[190px] shadow-[0_4px_30px_rgba(var(--accent-rgb),0.02)]"
                  >
                    {/* Glowing Accent Orb */}
                    <div 
                      className="absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-40 transition-transform group-hover:scale-125"
                      style={{ backgroundColor: accentColor.startsWith("var") ? "rgba(var(--accent-rgb), 0.5)" : accentColor }}
                    />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ 
                            backgroundColor: accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.1)` : `${accentColor}18`, 
                            border: `1px solid ${accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.2)` : `${accentColor}33`}`
                          }}
                        >
                          <TemplateLogo id={s.template} size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-muted bg-surface/80 px-2 py-0.5 rounded-full border border-border uppercase">
                          {tpl?.title ?? s.template}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-fg leading-snug group-hover:text-accent transition-colors line-clamp-2">
                        {s.title}
                      </h3>
                    </div>

                    <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        {s.author?.image ? (
                          <Image
                            src={s.author.image}
                            alt={s.author.name ?? ""}
                            width={22}
                            height={22}
                            className="rounded-full border border-border"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-surface border border-border" />
                        )}
                        <span className="text-[11px] text-muted font-bold truncate max-w-[80px]">
                          {s.author?.name ?? "Anonymous"}
                        </span>
                      </div>
                      
                      <Link
                        href={`/play/${s.slug}`}
                        className="w-7 h-7 rounded-lg bg-accent text-bg flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Search & Dynamic Filter Hub ── */}
        <div className="bg-surface/30 border border-border backdrop-blur-xl rounded-3xl p-6 mb-10 shadow-[0_4px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Spotlight Search prompt */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search public blueprints, tools, creators..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-panel border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none placeholder:text-muted/70 transition-all duration-300 font-medium"
              />
            </div>

            {/* Snippets Count Indicator */}
            <div className="text-xs text-muted font-mono self-end lg:self-center bg-panel px-3 py-1.5 rounded-lg border border-border tabular-nums font-bold">
              Found: <span className="text-accent">{visible.length}</span> snippets
            </div>
          </div>

          {/* Categorized Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-border">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 border ${
                  filter === f.key
                    ? "bg-accent text-bg border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"
                    : "bg-panel/40 border-border text-muted hover:text-fg hover:border-border-strong hover:bg-elevated"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Immersive Bento Card Grid ── */}
        <AnimatePresence mode="popLayout">
          {visible.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-3xl border border-border bg-panel/30 p-16 text-center"
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center mb-5">
                <Compass className="w-6 h-6 text-accent" />
              </div>
              <h2 className="font-black text-fg text-lg tracking-tight">
                {loading
                  ? "Resolving compiler files..."
                  : query.trim()
                    ? `No matching public blueprints for "${query.trim()}"`
                    : "No snippets shared in this category yet"}
              </h2>
              {!loading && !query.trim() && (
                <>
                  <p className="text-muted text-xs md:text-sm mt-2 mb-6 max-w-sm mx-auto leading-relaxed font-medium">
                    Be the pioneer developer. Build something stellar in the playground and toggling its visibility to public!
                  </p>
                  <Link
                    href="/playgrounds"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black shadow-md transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Open Developer Playground
                  </Link>
                </>
              )}
              {query.trim() && (
                <button
                  onClick={() => setQuery("")}
                  className="mt-4 text-accent hover:underline text-xs font-bold uppercase tracking-wider"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {visible.map((s, idx) => {
                const tpl = templatesById[s.template];
                const icon = templateIcon[s.template];
                const accentColor = icon?.color ?? "var(--accent)";

                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="group relative rounded-3xl border border-border bg-panel/30 hover:bg-elevated/40 hover:border-border-strong p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[220px]"
                  >
                    {/* Visual Card Accent Glow */}
                    <div 
                      className="absolute -left-12 -top-12 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                      style={{ backgroundColor: accentColor.startsWith("var") ? "rgba(var(--accent-rgb), 0.5)" : accentColor }}
                    />

                    <div>
                      {/* Card Header (Logo + Tech badge) */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{ 
                            backgroundColor: accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.08)` : `${accentColor}12`, 
                            border: `1px solid ${accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.15)` : `${accentColor}25`}`
                          }}
                        >
                          <TemplateLogo id={s.template} size={22} />
                        </div>

                        <span 
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{ 
                            color: accentColor.startsWith("var") ? accentColor : accentColor,
                            backgroundColor: accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.08)` : `${accentColor}12`
                          }}
                        >
                          {tpl?.title ?? s.template}
                        </span>
                      </div>

                      {/* Card Body Title */}
                      <h3 className="text-base font-black text-fg group-hover:text-fg-strong transition-colors line-clamp-2 leading-snug mb-3">
                        {s.title}
                      </h3>

                      {/* Code Tag pills */}
                      {s.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-6">
                          {s.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-panel border border-border text-[9px] text-muted font-bold group-hover:border-border-strong transition-colors"
                            >
                              #{t}
                            </span>
                          ))}
                          {s.tags.length > 3 && (
                            <span className="text-[9px] text-muted/50 font-mono font-bold">
                              +{s.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer (Author avatar + launch buttons) */}
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.author?.image ? (
                          <Image
                            src={s.author.image}
                            alt={s.author.name ?? ""}
                            width={22}
                            height={22}
                            className="rounded-full border border-border"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-surface border border-border" />
                        )}
                        <div className="min-w-0">
                          <div className="text-[10px] text-fg font-black truncate max-w-[85px] leading-none">
                            {s.author?.name ?? "Anonymous"}
                          </div>
                          <div className="text-[8px] text-muted/60 mt-0.5 uppercase tracking-wider font-bold">
                            Creator
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {s.updatedAt && (
                          <RelativeTime
                            iso={s.updatedAt}
                            className="text-[9px] text-muted/50 font-mono tabular-nums mr-1"
                          />
                        )}
                        
                        <Link
                          href={`/play/${s.slug}`}
                          className="w-8 h-8 rounded-xl bg-surface border border-border hover:border-accent/40 text-muted hover:text-accent flex items-center justify-center transition-all group-hover:scale-105 shadow-sm"
                          aria-label="Open snippet playground"
                        >
                          <ArrowUpRight className="w-4 h-4 stroke-[2]" />
                        </Link>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load More Button */}
        {cursor && !loading && visible.length > 0 && (
          <div className="flex justify-center mt-12">
            <button
              type="button"
              onClick={loadMore}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-border bg-surface/50 hover:bg-elevated hover:border-border-strong text-xs font-black uppercase tracking-wider text-muted hover:text-fg transition-all duration-300"
            >
              <span>Extend Gallery Grid</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}
