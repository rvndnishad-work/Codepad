import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Pagination from "../Pagination";
import CommentsTable, { type CommentRow } from "./CommentsTable";
import type { CommunitySearch } from "./page";

const PAGE_SIZE = 25;
/** "All" merges two tables, which costs page × size rows from each; stop deep paging there. */
const MAX_MERGED_PAGE = 40;

export default async function CommentsTab({ sp }: { sp: CommunitySearch }) {
  const source = sp.source === "blog" || sp.source === "question" ? sp.source : "all";
  const q = (sp.q ?? "").trim();
  let page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  if (source === "all") page = Math.min(page, MAX_MERGED_PAGE);
  const contains = { contains: q, mode: "insensitive" as const };

  const blogWhere: Prisma.BlogCommentWhereInput = q
    ? { OR: [{ content: contains }, { user: { name: contains } }, { user: { email: contains } }, { post: { title: contains } }] }
    : {};
  const questionWhere: Prisma.PrepQuestionCommentWhereInput = q
    ? { OR: [{ content: contains }, { user: { name: contains } }, { user: { email: contains } }, { question: { title: contains } }] }
    : {};

  // Paging one table is skip/take. Paging the merge of two takes the first
  // page × size rows of each, merges by time and slices the page out.
  const skip = source === "all" ? 0 : (page - 1) * PAGE_SIZE;
  const take = source === "all" ? page * PAGE_SIZE : PAGE_SIZE;
  const user = { select: { id: true, name: true, email: true } } as const;

  const [blogCount, questionCount, blogRows, questionRows] = await Promise.all([
    source !== "question" ? prisma.blogComment.count({ where: blogWhere }) : 0,
    source !== "blog" ? prisma.prepQuestionComment.count({ where: questionWhere }) : 0,
    source !== "question"
      ? prisma.blogComment.findMany({
          where: blogWhere,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          select: { id: true, content: true, createdAt: true, parentId: true, user, post: { select: { slug: true, title: true } }, _count: { select: { replies: true } } },
        })
      : [],
    source !== "blog"
      ? prisma.prepQuestionComment.findMany({
          where: questionWhere,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          select: { id: true, content: true, createdAt: true, user, question: { select: { slug: true, title: true } } },
        })
      : [],
  ]);

  const merged: CommentRow[] = [
    ...blogRows.map((c) => ({
      type: "blog_comment" as const,
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
      where: { title: c.post.title, href: `/blog/${c.post.slug}` },
      replies: c._count.replies,
      isReply: c.parentId !== null,
      reports: 0,
    })),
    ...questionRows.map((c) => ({
      type: "question_comment" as const,
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
      where: { title: c.question.title, href: `/interview-question/${c.question.slug}` },
      replies: 0,
      isReply: false,
      reports: 0,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = source === "all" ? merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : merged;
  if (rows.length) {
    const open = await prisma.contentReport.groupBy({
      by: ["targetType", "targetId"],
      where: { status: "open", OR: rows.map((r) => ({ targetType: r.type, targetId: r.id })) },
      _count: { _all: true },
    });
    const n = new Map(open.map((o) => [`${o.targetType}:${o.targetId}`, o._count._all]));
    for (const r of rows) r.reports = n.get(`${r.type}:${r.id}`) ?? 0;
  }
  const total = blogCount + questionCount;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const href = (s: string) => {
    const p = new URLSearchParams({ tab: "comments" });
    if (s !== "all") p.set("source", s);
    if (q) p.set("q", q);
    return `/admin/community?${p}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {[
            ["all", "All"],
            ["blog", "Blog posts"],
            ["question", "Questions"],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={href(id)}
              className={`h-7 inline-flex items-center px-2.5 rounded-md text-xs font-medium ${source === id ? "bg-panel text-fg" : "text-muted hover:text-fg"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <form className="flex items-center gap-2">
          <input type="hidden" name="tab" value="comments" />
          {source !== "all" && <input type="hidden" name="source" value={source} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Text, author or page"
            className="h-8 w-64 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-border-strong"
          />
        </form>
        <span className="text-sm text-muted ml-auto tabular-nums">{total.toLocaleString()} comments</span>
      </div>

      <p className="text-xs text-muted">
        Comments have no hidden state, so removing one deletes it (and, on blogs, its replies).
      </p>

      <CommentsTable rows={rows} emptyText={q ? "No comments match." : "No comments yet."} />

      <div className="rounded-xl border border-border overflow-hidden empty:hidden">
        <Pagination
          currentPage={page}
          totalPages={source === "all" ? Math.min(totalPages, MAX_MERGED_PAGE) : totalPages}
          totalItems={total}
          itemsPerPage={PAGE_SIZE}
          baseUrl="/admin/community"
          currentParams={{ tab: "comments", source: source !== "all" ? source : undefined, q: q || undefined }}
        />
      </div>
    </div>
  );
}
