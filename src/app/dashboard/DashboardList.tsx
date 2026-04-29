"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TemplateLogo } from "@/lib/icons";
import { templatesById } from "@/lib/templates";
import { Globe, Lock, ArrowUpRight, Star, Search } from "lucide-react";
import { toast } from "sonner";

type Item = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  visibility: "public" | "private";
  tags: string[];
  pinned: boolean;
};

export default function DashboardList({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const t of i.tags) set.add(t);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (tagFilter && !i.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, tagFilter]);

  const pinned = filtered.filter((i) => i.pinned);
  const others = filtered.filter((i) => !i.pinned);

  async function togglePin(item: Item) {
    const next = !item.pinned;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, pinned: next } : i))
    );
    try {
      const res = await fetch(`/api/snippets/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, pinned: !next } : i
        )
      );
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't update pin", { description: msg });
    }
  }

  function renderRow(s: Item) {
    const tpl = templatesById[s.template];
    return (
      <li key={s.id} className="group">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-panel/70 hover:bg-elevated px-4 py-3 transition">
          <button
            onClick={() => togglePin(s)}
            title={s.pinned ? "Unpin" : "Pin"}
            className={`shrink-0 transition ${
              s.pinned
                ? "text-amber-400"
                : "text-muted opacity-0 group-hover:opacity-100 hover:text-amber-400"
            }`}
          >
            <Star
              className="w-4 h-4"
              fill={s.pinned ? "currentColor" : "none"}
            />
          </button>
          <Link
            href={`/play/${s.slug}`}
            className="flex items-center gap-4 flex-1 min-w-0"
          >
            <div className="w-10 h-10 rounded-lg border border-border bg-surface grid place-items-center shrink-0">
              <TemplateLogo id={s.template} size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{s.title}</span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                    s.visibility === "public"
                      ? "border-accent/40 bg-accent-glow text-accent"
                      : "border-border bg-panel text-muted"
                  }`}
                >
                  {s.visibility === "public" ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                  {s.visibility}
                </span>
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-subtle"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {tpl?.title ?? s.template} · updated{" "}
                {new Date(s.updatedAt).toLocaleString()}
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-fg transition shrink-0" />
          </Link>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or tag…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-panel border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTagFilter(null)}
              className={`px-2 py-1 rounded-full text-[11px] border transition ${
                !tagFilter
                  ? "bg-accent text-white border-accent"
                  : "bg-panel border-border text-subtle hover:text-fg"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={`px-2 py-1 rounded-full text-[11px] border transition ${
                  t === tagFilter
                    ? "bg-accent text-white border-accent"
                    : "bg-panel border-border text-subtle hover:text-fg"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {pinned.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
            Pinned
          </h2>
          <ul className="grid gap-2">{pinned.map(renderRow)}</ul>
        </section>
      )}

      {others.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
              All snippets
            </h2>
          )}
          <ul className="grid gap-2">{others.map(renderRow)}</ul>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-panel/60 p-8 text-center text-sm text-muted">
          No snippets match your filter.
        </div>
      )}
    </div>
  );
}
