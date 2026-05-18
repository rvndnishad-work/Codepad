import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageCircle, Search, ChevronLeft, ChevronRight, CornerDownRight } from "lucide-react";
import AdminCommentRow from "./AdminCommentRow";

interface AdminCommentsPageProps {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}

const PAGE_SIZE = 25;

export default async function AdminCommentsPage({ searchParams }: AdminCommentsPageProps) {
  const { q, filter, page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { content: { contains: q } },
              { user: { name: { contains: q } } },
              { user: { email: { contains: q } } },
              { post: { title: { contains: q } } },
              { post: { slug: { contains: q } } },
            ],
          }
        : {},
      filter === "top-level" ? { parentId: null } : {},
      filter === "replies" ? { parentId: { not: null } } : {},
    ],
  };

  const [totalCount, comments, topLevelCount, replyCount] = await Promise.all([
    prisma.blogComment.count({ where }),
    prisma.blogComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true } },
        post: { select: { id: true, slug: true, title: true } },
        _count: { select: { replies: true } },
      },
    }),
    prisma.blogComment.count({ where: { parentId: null } }),
    prisma.blogComment.count({ where: { parentId: { not: null } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const rows = comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    parentId: c.parentId,
    replyCount: c._count.replies,
    user: c.user,
    post: c.post,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Blog comments</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-muted">{totalCount.toLocaleString()} total</p>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/10 text-muted text-[10px] font-black uppercase tracking-wider border border-border">
              <MessageCircle className="w-3 h-3" />
              {topLevelCount.toLocaleString()} top-level
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/10 text-muted text-[10px] font-black uppercase tracking-wider border border-border">
              <CornerDownRight className="w-3 h-3" />
              {replyCount.toLocaleString()} replies
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <form className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search content, author, post…"
              className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
            {filter && <input type="hidden" name="filter" value={filter} />}
          </form>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            <FilterLink current={filter} value="" label="All" />
            <FilterLink current={filter} value="top-level" label="Top-level" />
            <FilterLink current={filter} value="replies" label="Replies" />
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <MessageCircle className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No comments found.</p>
          {(q || filter) && (
            <Link
              href="/admin/comments"
              className="mt-4 inline-block text-xs font-bold text-accent hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-elevated/50 text-[10px] uppercase tracking-[0.15em] text-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">Author</th>
                    <th className="px-6 py-4 font-bold">Comment</th>
                    <th className="px-6 py-4 font-bold">Post</th>
                    <th className="px-6 py-4 font-bold">Posted</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((c) => (
                    <AdminCommentRow key={c.id} comment={c} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} q={q} filter={filter} />
          )}
        </>
      )}
    </div>
  );
}

function FilterLink({
  current,
  value,
  label,
}: {
  current?: string;
  value: string;
  label: string;
}) {
  const isActive = (current || "") === value;
  return (
    <Link
      href={`/admin/comments${value ? `?filter=${value}` : ""}`}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
        isActive ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-elevated"
      }`}
    >
      {label}
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  q,
  filter,
}: {
  page: number;
  totalPages: number;
  q?: string;
  filter?: string;
}) {
  function url(n: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter) params.set("filter", filter);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return `/admin/comments${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="text-muted">
        Page <span className="text-fg font-bold">{page}</span> of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={url(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:bg-elevated transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted/40 cursor-not-allowed">
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={url(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:bg-elevated transition"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted/40 cursor-not-allowed">
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
