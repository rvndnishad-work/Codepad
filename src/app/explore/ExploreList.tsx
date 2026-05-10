"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { TemplateLogo, templateIcon } from "@/lib/icons";
import { templatesById, groups } from "@/lib/templates";
import { ArrowUpRight, Compass, Plus, Search } from "lucide-react";

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

  const visible = items.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      (s.author?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  // Refetch when filter changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") {
        // Filter is a group key — server expects template id, so we
        // fetch all and filter client-side per group.
        params.set("group", filter);
      }
      const res = await fetch(`/api/explore?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      const filtered =
        filter === "all"
          ? data.items
          : data.items.filter(
              (it: ExploreItem) =>
                templatesById[it.template]?.group === filter
            );
      setItems(filtered);
      setCursor(data.nextCursor);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    const res = await fetch(`/api/explore?cursor=${cursor}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
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
    setLoading(false);
  }

  return (
    <div className="relative min-h-screen">
      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FFE600]/10 border border-[#FFE600]/20 grid place-items-center">
              <Compass className="w-5 h-5 text-[#FFE600]" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-0.5">
                Community
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Explore</h1>
            </div>
          </div>
          <p className="text-white/50 text-sm max-w-lg leading-relaxed">
            Public snippets shared by Interviewpad users. Open one to read, fork it
            to your account, or grab the embed link.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, tag, or author…"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-[#FFE600]/40 focus:bg-white/[0.04] text-sm text-white/90 outline-none placeholder:text-white/25 transition-all duration-200"
            />
          </div>
          <span className="text-[11px] text-white/30 font-mono ml-auto tabular-nums">
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
                  ? "bg-[#FFE600] text-black border-[#FFE600] shadow-[0_0_12px_rgba(255,230,0,0.25)]"
                  : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white/80 hover:border-white/15 hover:bg-white/[0.05]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFE600]/10 border border-[#FFE600]/20 grid place-items-center mb-5">
              <Compass className="w-6 h-6 text-[#FFE600]" />
            </div>
            <h2 className="font-semibold text-white text-lg">
              {loading
                ? "Loading snippets…"
                : query.trim()
                  ? `No matches for "${query.trim()}"`
                  : "Nothing here yet"}
            </h2>
            {!loading && !query.trim() && (
              <>
                <p className="text-white/40 text-sm mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
                  Be the first to share a public snippet. Pick a template, build
                  something cool, then mark it public from the Share menu.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFE600] hover:bg-[#FFD700] text-black text-sm font-semibold shadow-[0_0_20px_rgba(255,230,0,0.2)] transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Browse templates
                </Link>
              </>
            )}
            {query.trim() && (
              <button
                onClick={() => setQuery("")}
                className="mt-4 text-[#FFE600] hover:underline text-sm font-medium"
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
                const accentColor = icon?.color ?? "#FFE600";

                return (
                  <li key={s.id}>
                    <Link
                      href={`/play/${s.slug}`}
                      className="group relative flex items-center gap-5 w-full rounded-xl bg-[#0e0e10] border border-white/[0.07] hover:border-white/[0.14] p-4 sm:p-5 transition-all duration-200 hover:bg-[#111114] overflow-hidden"
                    >
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundColor: accentColor }}
                      />

                      {/* Icon */}
                      <div
                        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundColor: `${accentColor}14`, border: `1px solid ${accentColor}25` }}
                      >
                        <TemplateLogo id={s.template} size={22} />
                      </div>

                      {/* Title + Template */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white/90 group-hover:text-white truncate transition-colors">
                          {s.title}
                        </h3>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.15em] mt-0.5"
                          style={{ color: `${accentColor}90` }}
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
                              className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40 font-mono group-hover:text-white/60 group-hover:border-white/[0.10] transition-colors"
                            >
                              {t}
                            </span>
                          ))}
                          {s.tags.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] text-white/25 font-mono">
                              +{s.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Author */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0 border-l border-white/[0.06] pl-4">
                        {s.author?.image ? (
                          <Image
                            src={s.author.image}
                            alt={s.author.name ?? ""}
                            width={20}
                            height={20}
                            className="rounded-full border border-white/10"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10" />
                        )}
                        <span className="text-xs text-white/50 font-medium group-hover:text-white/70 transition-colors max-w-[100px] truncate">
                          {s.author?.name ?? "Anonymous"}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-white/25 font-mono tabular-nums shrink-0 hidden sm:block">
                        {timeAgo(s.updatedAt)}
                      </span>

                      {/* Arrow */}
                      <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                        <ArrowUpRight className="w-3.5 h-3.5 text-white/50" />
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
                  className="px-6 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] text-xs font-semibold text-white/60 disabled:opacity-40 transition-all duration-200"
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

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
