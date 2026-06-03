"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Edit3, Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import WorkspaceToolbar, {
  type StatusFilter,
  type SortKey,
} from "./WorkspaceToolbar";
import type { ChallengeItem } from "./types";

const PAGE_SIZE = 12;

export default function ChallengesTab({ initial }: { initial: ChallengeItem[] }) {
  const [items, setItems] = useState<ChallengeItem[]>(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items.filter((c) => {
      if (status === "published" && !c.published) return false;
      if (status === "draft" && c.published) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...base].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.updatedAt.localeCompare(b.updatedAt);
        case "title":
          return a.title.localeCompare(b.title);
        case "views":
          return b.attemptCount - a.attemptCount;
        case "recent":
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
  }, [items, query, status, sort]);

  const visible = filtered.slice(0, visibleCount);

  async function handleDelete(c: ChallengeItem) {
    if (deletingId) return;
    if (!confirm(`Delete "${c.title}"? This can't be undone.`)) return;
    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/challenges/${c.slug}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Challenge deleted");
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
        placeholder="Search challenges by title or slug…"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/challenges/new"
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border hover:border-accent hover:bg-accent/5 transition-all group min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-accent" />
          </div>
          <span className="text-sm font-bold text-fg">New Challenge</span>
          <span className="text-xs text-muted text-center">Single or multi-step</span>
        </Link>

        {visible.map((c) => (
          <div
            key={c.id}
            className="group relative flex flex-col p-5 rounded-2xl border border-border bg-panel hover:border-border-strong transition-all"
          >
            <Link
              href={`/dashboard/challenges/${c.id}/edit`}
              className="absolute inset-0 rounded-2xl"
              aria-label={`Edit ${c.title}`}
            />
            <div className="relative flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                  c.published
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : "text-muted bg-surface border-border"
                }`}
              >
                {c.published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                {c.published ? "Published" : "Draft"}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted/70 uppercase tracking-wider">
                {c.stepCount > 1 ? (
                  <>
                    <Layers className="w-2.5 h-2.5" />
                    {c.stepCount} steps
                  </>
                ) : (
                  c.difficulty
                )}
              </span>
            </div>
            <h3 className="relative font-bold text-fg group-hover:text-accent transition-colors line-clamp-2">
              {c.title}
            </h3>
            <p className="relative text-xs text-muted line-clamp-1 mt-1 leading-relaxed font-mono">
              /{c.slug}
            </p>
            <div className="relative mt-auto pt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                {c.attemptCount} {c.attemptCount === 1 ? "attempt" : "attempts"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(c);
                  }}
                  disabled={deletingId === c.id}
                  className="relative p-1 rounded text-muted hover:text-red-400 transition disabled:opacity-40"
                  title="Delete challenge"
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
          No challenges match your filter.
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          You haven't authored any challenges yet. Click <strong className="text-fg">New Challenge</strong> to start.
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
