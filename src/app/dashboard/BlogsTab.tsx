"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Edit3, Newspaper, Trash2 } from "lucide-react";
import { toast } from "sonner";
import WorkspaceToolbar, {
  type StatusFilter,
  type SortKey,
} from "./WorkspaceToolbar";
import RelativeTime from "@/components/RelativeTime";
import type { BlogItem } from "./types";

const PAGE_SIZE = 12;

export default function BlogsTab({ initial }: { initial: BlogItem[] }) {
  const [items, setItems] = useState<BlogItem[]>(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items.filter((b) => {
      if (status === "published" && !b.published) return false;
      if (status === "draft" && b.published) return false;
      if (q && !b.title.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...base].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "title":
          return a.title.localeCompare(b.title);
        case "views":
          return b.viewCount - a.viewCount;
        case "recent":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return sorted;
  }, [items, query, status, sort]);

  const visible = filtered.slice(0, visibleCount);

  async function handleDelete(b: BlogItem) {
    if (deletingId) return;
    if (!confirm(`Delete "${b.title}"? This can't be undone.`)) return;
    setDeletingId(b.id);
    try {
      const res = await fetch(`/api/blogs/${b.id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.id !== b.id));
      toast.success("Blog deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <WorkspaceToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setVisibleCount(PAGE_SIZE);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setVisibleCount(PAGE_SIZE);
        }}
        sort={sort}
        onSort={setSort}
        placeholder="Search blog posts…"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/blogs/new"
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border hover:border-accent hover:bg-accent/5 transition-all group min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Newspaper className="w-5 h-5 text-accent" />
          </div>
          <span className="text-sm font-bold text-fg">New Blog</span>
          <span className="text-xs text-muted">Share your knowledge</span>
        </Link>

        {visible.map((blog) => (
          <div
            key={blog.id}
            className="group relative flex flex-col p-5 rounded-2xl border border-border bg-panel hover:border-border-strong transition-all"
          >
            <Link
              href={`/dashboard/blogs/${blog.id}/edit`}
              className="absolute inset-0 rounded-2xl"
              aria-label={`Edit ${blog.title}`}
            />
            <div className="relative flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                  blog.published
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : "text-muted bg-surface border-border"
                }`}
              >
                {blog.published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                {blog.published ? "Published" : "Draft"}
              </span>
              <span className="text-[10px] font-bold text-muted/60 uppercase tabular-nums">
                <RelativeTime iso={blog.createdAt} />
              </span>
            </div>
            <h3 className="relative font-bold text-fg group-hover:text-accent transition-colors line-clamp-2">
              {blog.title}
            </h3>
            <div className="relative mt-auto pt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                {blog.viewCount} {blog.viewCount === 1 ? "view" : "views"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(blog);
                  }}
                  disabled={deletingId === blog.id}
                  className="relative p-1 rounded text-muted hover:text-red-400 transition disabled:opacity-40"
                  title="Delete blog"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Edit3 className="w-3 h-3 text-muted group-hover:text-fg transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && items.length > 0 && (
        <div className="rounded-xl border border-border bg-panel/60 p-8 text-center text-sm text-muted">
          No blog posts match your filter.
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          You haven't written any blog posts yet. Click <strong className="text-fg">New Blog</strong> to start.
        </div>
      )}

      {filtered.length > visibleCount && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-4 py-2 rounded-lg bg-panel border border-border text-sm text-fg hover:bg-elevated transition"
          >
            Show more ({filtered.length - visibleCount} hidden)
          </button>
        </div>
      )}
    </div>
  );
}
