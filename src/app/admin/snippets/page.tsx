import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AlertCircle, Pin, Search, Sparkles } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import AdminSnippetRow from "./AdminSnippetRow";

interface AdminSnippetsPageProps {
  searchParams: Promise<{ q?: string; filter?: string }>;
}

// Hard cap shown on the homepage — must stay in sync with the `take: 6` in
// src/app/page.tsx. If you change one, change the other.
const HOMEPAGE_SLOTS = 6;

export default async function AdminSnippetsPage({ searchParams }: AdminSnippetsPageProps) {
  await requireAdminAccess("content:curate");
  const { q, filter } = await searchParams;

  const where: {
    visibility: "public";
    OR?: Array<{ title: { contains: string } } | { slug: { contains: string } }>;
    pinned?: boolean;
  } = { visibility: "public" };
  if (q) {
    where.OR = [{ title: { contains: q } }, { slug: { contains: q } }];
  }
  if (filter === "pinned") where.pinned = true;
  else if (filter === "unpinned") where.pinned = false;

  const [snippets, totalPinned] = await Promise.all([
    prisma.snippet.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { viewCount: "desc" }, { updatedAt: "desc" }],
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.snippet.count({ where: { visibility: "public", pinned: true } }),
  ]);

  const overflow = totalPinned > HOMEPAGE_SLOTS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Trends</h2>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Pin public snippets to feature them in the homepage{" "}
            <strong className="text-fg">Explore Trends</strong> section.
            Up to {HOMEPAGE_SLOTS} appear at a time — pinned ones lead, then top-viewed fill the rest.
          </p>
          <div className="flex items-center gap-3 mt-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-bold">
              <Pin className="w-3 h-3 fill-current" />
              {totalPinned} pinned
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Sparkles className="w-3 h-3" />
              {HOMEPAGE_SLOTS} homepage slots
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search snippets..."
              className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
            {filter && <input type="hidden" name="filter" value={filter} />}
          </form>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            <FilterLink current={filter} q={q} value="" label="All" />
            <FilterLink current={filter} q={q} value="pinned" label="Pinned" />
            <FilterLink current={filter} q={q} value="unpinned" label="Unpinned" />
          </div>
        </div>
      </div>

      {overflow && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-amber-500">{totalPinned} snippets pinned</strong> —
            only the {HOMEPAGE_SLOTS} most recently pinned will appear on the homepage.
            Unpin some to give others visibility.
          </div>
        </div>
      )}

      {snippets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <Pin className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No snippets match.</p>
          {(q || filter) && (
            <Link
              href="/admin/snippets"
              className="mt-4 inline-block text-xs font-bold text-accent hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-elevated/50 text-[10px] uppercase tracking-[0.15em] text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">Snippet</th>
                  <th className="px-6 py-4 font-bold">Author</th>
                  <th className="px-6 py-4 font-bold text-center">Views</th>
                  <th className="px-6 py-4 font-bold">Updated</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snippets.map((s, i) => (
                  <AdminSnippetRow
                    key={s.id}
                    snippet={{
                      id: s.id,
                      slug: s.slug,
                      title: s.title,
                      template: s.template,
                      pinned: s.pinned,
                      viewCount: s.viewCount,
                      updatedAt: s.updatedAt.toISOString(),
                      user: s.user,
                    }}
                    // Pinned snippets beyond the homepage limit get a subtle
                    // amber indicator so the admin can see what's overflowing.
                    overflow={s.pinned && i >= HOMEPAGE_SLOTS && filter !== "unpinned"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLink({
  current,
  q,
  value,
  label,
}: {
  current?: string;
  q?: string;
  value: string;
  label: string;
}) {
  const isActive = (current ?? "") === value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (value) params.set("filter", value);
  const qs = params.toString();
  return (
    <Link
      href={`/admin/snippets${qs ? `?${qs}` : ""}`}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
        isActive
          ? "bg-accent text-bg"
          : "text-muted hover:text-fg hover:bg-elevated"
      }`}
    >
      {label}
    </Link>
  );
}
