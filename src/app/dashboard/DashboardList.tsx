"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TemplateLogo } from "@/lib/icons";
import { templatesById } from "@/lib/templates";
import { Globe, Lock, ArrowUpRight, Star, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import RelativeTime from "@/components/RelativeTime";
import WorkspaceToolbar, { type SortKey } from "./WorkspaceToolbar";
import type { SnippetItem } from "./types";

type VisibilityFilter = "all" | "public" | "private";
const PAGE_SIZE = 20;

export default function DashboardList({ initial }: { initial: SnippetItem[] }) {
  const [items, setItems] = useState<SnippetItem[]>(initial);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [visFilter, setVisFilter] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [pinningIds, setPinningIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const t of i.tags) set.add(t);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items.filter((i) => {
      if (tagFilter && !i.tags.includes(tagFilter)) return false;
      if (visFilter === "public" && i.visibility !== "public") return false;
      if (visFilter === "private" && i.visibility !== "private") return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    return [...base].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.updatedAt.localeCompare(b.updatedAt);
        case "title":
          return a.title.localeCompare(b.title);
        case "views":
          return b.viewCount - a.viewCount;
        case "recent":
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
  }, [items, query, tagFilter, visFilter, sort]);

  const pinned = filtered.filter((i) => i.pinned);
  const others = filtered.filter((i) => !i.pinned);
  const othersVisible = others.slice(0, visibleCount);

  async function togglePin(item: SnippetItem) {
    if (pinningIds.has(item.id)) return;
    const next = !item.pinned;
    setPinningIds((prev) => new Set(prev).add(item.id));
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, pinned: next } : i))
    );
    try {
      const res = await fetch(`/api/snippets/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned: next }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, pinned: !next } : i))
      );
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't update pin", { description: msg });
    } finally {
      setPinningIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }

  async function handleDelete(item: SnippetItem) {
    if (deletingId) return;
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/snippets/${item.id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Snippet deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeletingId(null);
    }
  }

  function renderRow(s: SnippetItem) {
    const tpl = templatesById[s.template];
    return (
      <li key={s.id} className="group">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-panel/70 hover:bg-elevated px-4 py-3 transition">
          <button
            onClick={() => togglePin(s)}
            disabled={pinningIds.has(s.id)}
            title={s.pinned ? "Unpin" : "Pin"}
            className={`shrink-0 transition disabled:opacity-40 disabled:cursor-wait ${
              s.pinned
                ? "text-amber-400"
                : "text-muted opacity-0 group-hover:opacity-100 hover:text-amber-400"
            }`}
          >
            <Star className="w-4 h-4" fill={s.pinned ? "currentColor" : "none"} />
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
                {tpl?.title ?? s.template} · {s.viewCount} {s.viewCount === 1 ? "view" : "views"} · updated{" "}
                <RelativeTime iso={s.updatedAt} />
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-fg transition shrink-0" />
          </Link>
          <button
            onClick={() => handleDelete(s)}
            disabled={deletingId === s.id}
            className="shrink-0 p-1.5 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition disabled:opacity-40"
            title="Delete snippet"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <WorkspaceToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setVisibleCount(PAGE_SIZE);
        }}
        status={
          visFilter === "all" ? "all" : visFilter === "public" ? "published" : "draft"
        }
        onStatus={(v) => {
          setVisFilter(v === "all" ? "all" : v === "published" ? "public" : "private");
          setVisibleCount(PAGE_SIZE);
        }}
        sort={sort}
        onSort={setSort}
        placeholder="Search snippets by title or tag…"
        statusLabels={{ published: "Public", draft: "Private" }}
      />

      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={`px-2 py-1 rounded-full text-[11px] border transition ${
              !tagFilter
                ? "bg-accent text-bg border-accent"
                : "bg-panel border-border text-subtle hover:text-fg"
            }`}
          >
            All tags
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t === tagFilter ? null : t)}
              className={`px-2 py-1 rounded-full text-[11px] border transition ${
                t === tagFilter
                  ? "bg-accent text-bg border-accent"
                  : "bg-panel border-border text-subtle hover:text-fg"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {pinned.length > 0 && (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
            Pinned
          </h3>
          <ul className="grid gap-2">{pinned.map(renderRow)}</ul>
        </section>
      )}

      {othersVisible.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
              All snippets
            </h3>
          )}
          <ul className="grid gap-2">{othersVisible.map(renderRow)}</ul>
        </section>
      )}

      {others.length > othersVisible.length && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-4 py-2 rounded-lg bg-panel border border-border text-sm text-fg hover:bg-elevated transition"
          >
            Show more ({others.length - othersVisible.length} hidden)
          </button>
        </div>
      )}

      {filtered.length === 0 && items.length > 0 && (
        <div className="rounded-xl border border-border bg-panel/60 p-8 text-center text-sm text-muted">
          No snippets match your filter.
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted flex flex-col items-center gap-3">
          <span>You haven't saved any snippets yet.</span>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-semibold hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Snippet
          </Link>
        </div>
      )}
    </div>
  );
}
