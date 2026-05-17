"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TemplateLogo, templateIcon } from "@/lib/icons";
import { templatesById, groups } from "@/lib/templates";
import { ArrowUpRight, Compass, Plus, Search } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";

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
  { key: "all", label: "All" },
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

  const visible = items.filter((s) => {
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
        // Filter is a group key — server expects template id, so we
        // fetch all and filter client-side per group.
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
    <div className="relative min-h-screen">
      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center">
              <Compass className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-xs font-black tracking-[0.2em] text-muted uppercase mb-0.5">
                Community
              </div>
              <h1 className="text-3xl font-black tracking-tight text-fg">Explore</h1>
            </div>
          </div>
          <p className="text-muted text-sm max-w-lg leading-relaxed">
            Public snippets shared by Interviewpad users. Open one to read, fork it
            to your account, or grab the embed link.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, tag, or author…"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border focus:border-accent/40 focus:bg-elevated text-sm text-fg outline-none placeholder:text-muted transition-all duration-200"
            />
          </div>
          <span className="text-xs text-muted font-mono ml-auto tabular-nums">
            {visible.length} {visible.length === 1 ? "snippet" : "snippets"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                filter === f.key
                  ? "bg-accent text-bg border-accent shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)]"
                  : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong hover:bg-elevated"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 grid place-items-center mb-5">
              <Compass className="w-6 h-6 text-accent" />
            </div>
            <h2 className="font-black text-fg text-lg">
              {loading
                ? "Loading snippets…"
                : query.trim()
                  ? `No matches for "${query.trim()}"`
                  : "Nothing here yet"}
            </h2>
            {!loading && !query.trim() && (
              <>
                <p className="text-muted text-sm mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
                  Be the first to share a public snippet. Pick a template, build
                  something cool, then mark it public from the Share menu.
                </p>
                <Link
                  href="/playgrounds"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Browse playgrounds
                </Link>
              </>
            )}
            {query.trim() && (
              <button
                onClick={() => setQuery("")}
                className="mt-4 text-accent hover:underline text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {visible.map((s) => {
                const tpl = templatesById[s.template];
                const icon = templateIcon[s.template];
                const accentColor = icon?.color ?? "var(--accent)";

                return (
                  <li key={s.id}>
                    <Link
                      href={`/play/${s.slug}`}
                      className="group relative flex items-center gap-5 w-full rounded-xl bg-surface border border-border hover:border-border-strong p-4 sm:p-5 transition-all duration-200 hover:bg-elevated overflow-hidden"
                    >
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundColor: accentColor.startsWith("var") ? accentColor : accentColor }}
                      />

                      {/* Icon */}
                      <div
                        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                        style={{ 
                          backgroundColor: accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.08)` : `${accentColor}14`, 
                          border: `1px solid ${accentColor.startsWith("var") ? `rgba(var(--accent-rgb), 0.15)` : `${accentColor}25`}`,
                          filter: "var(--accent-brightness, none)"
                        }}
                      >
                        <TemplateLogo id={s.template} size={22} />
                      </div>

                      {/* Title + Template */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-fg/90 group-hover:text-fg truncate transition-colors">
                          {s.title}
                        </h3>
                        <p
                          className="text-[11px] font-bold uppercase tracking-[0.12em] mt-0.5 transition-colors"
                          style={{ 
                            color: accentColor.startsWith("var") ? accentColor : accentColor,
                            filter: "var(--accent-brightness, none)"
                          }}
                        >
                          {tpl?.title ?? s.template}
                        </p>
                      </div>

                      {/* Tags — hidden on small screens */}
                      {s.tags.length > 0 && (
                        <div className="hidden md:flex items-center gap-1.5 shrink-0">
                          {s.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-muted group-hover:text-fg/60 group-hover:border-border-strong transition-colors"
                            >
                              {t}
                            </span>
                          ))}
                          {s.tags.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-surface text-[10px] text-muted/40 font-mono">
                              +{s.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Author */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0 border-l border-border pl-4">
                        {s.author?.image ? (
                          <Image
                            src={s.author.image}
                            alt={s.author.name ?? ""}
                            width={20}
                            height={20}
                            className="rounded-full border border-border"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-surface border border-border" />
                        )}
                        <span className="text-xs text-muted font-medium group-hover:text-fg/70 transition-colors max-w-[100px] truncate">
                          {s.author?.name ?? "Anonymous"}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <RelativeTime
                        iso={s.updatedAt}
                        className="text-xs text-muted/40 font-mono tabular-nums shrink-0 hidden sm:block"
                      />

                      {/* Arrow */}
                      <div className="w-7 h-7 rounded-lg bg-surface/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {cursor && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl border border-border bg-surface/50 hover:bg-elevated hover:border-border-strong text-xs font-semibold text-muted disabled:opacity-40 transition-all duration-200"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

