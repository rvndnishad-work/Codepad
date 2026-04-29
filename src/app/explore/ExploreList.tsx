"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { TemplateLogo } from "@/lib/icons";
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
    <div className="relative">
      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div
          className="absolute inset-0 bg-grid-pattern opacity-40"
          style={{ backgroundSize: "24px 24px" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/30 grid place-items-center">
              <Compass className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase mb-1">
                Community
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Explore</h1>
            </div>
          </div>
          <p className="text-muted text-sm max-w-xl">
            Public snippets shared by Codepad users. Open one to read, fork it
            to your account, or grab the embed link.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, tag, or author…"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-panel border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
          />
        </div>
        <span className="text-xs text-muted ml-auto">
          {visible.length} {visible.length === 1 ? "snippet" : "snippets"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === f.key
                ? "bg-accent text-white border-accent"
                : "bg-panel border-border text-subtle hover:text-fg hover:border-border-strong"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel/60 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-accent-glow border border-accent/30 grid place-items-center mb-4">
            <Compass className="w-5 h-5 text-accent" />
          </div>
          <h2 className="font-medium text-fg">
            {loading
              ? "Loading snippets…"
              : query.trim()
                ? `No matches for “${query.trim()}”`
                : "Nothing here yet"}
          </h2>
          {!loading && !query.trim() && (
            <>
              <p className="text-muted text-sm mt-1 mb-5 max-w-sm mx-auto">
                Be the first to share a public snippet. Pick a template, build
                something cool, then mark it public from the Share menu.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white text-sm shadow-soft transition"
              >
                <Plus className="w-4 h-4" />
                Browse templates
              </Link>
            </>
          )}
          {query.trim() && (
            <button
              onClick={() => setQuery("")}
              className="mt-3 text-accent hover:underline text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((s) => {
              const tpl = templatesById[s.template];
              return (
                <li key={s.id}>
                  <Link
                    href={`/play/${s.slug}`}
                    className="group flex flex-col gap-3 rounded-xl border border-border bg-panel/70 hover:bg-elevated p-4 transition h-full"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-border bg-surface grid place-items-center shrink-0">
                        <TemplateLogo id={s.template} size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-sm">
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
                        {s.tags.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-subtle"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        {s.author?.image ? (
                          <Image
                            src={s.author.image}
                            alt={s.author.name ?? ""}
                            width={20}
                            height={20}
                            className="rounded-full border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-surface border border-border shrink-0" />
                        )}
                        <span className="text-[11px] text-muted truncate">
                          {s.author?.name ?? "anonymous"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted shrink-0">
                        {timeAgo(s.updatedAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {cursor && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-border bg-panel hover:bg-elevated text-xs disabled:opacity-50 transition"
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
