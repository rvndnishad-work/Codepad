import { prisma } from "@/lib/prisma";
import { FileText, Search, Filter, CheckCircle2, Clock, AlertCircle, Star } from "lucide-react";
import AdminBlogRow from "./AdminBlogRow";
import Link from "next/link";

interface AdminBlogsPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminBlogsPage({ searchParams }: AdminBlogsPageProps) {
  const { q, status } = await searchParams;

  const blogs = await prisma.blogPost.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { title: { contains: q } },
            { slug: { contains: q } },
          ],
        } : {},
        status ? { status } : {},
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          reactions: true,
          comments: true,
        },
      },
    },
  });

  const stats = {
    total: blogs.length,
    pending: blogs.filter(b => b.status === "PENDING").length,
    published: blogs.filter(b => b.status === "PUBLISHED").length,
    featured: blogs.filter(b => b.featured).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Blogs</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-muted">
              {stats.total} total
            </p>
            {stats.pending > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                <Clock className="w-3 h-3" />
                {stats.pending} Pending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search blogs..."
              className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
          </form>
          
          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            <FilterLink current={status} value="" label="All" />
            <FilterLink current={status} value="PENDING" label="Pending" />
            <FilterLink current={status} value="PUBLISHED" label="Published" />
            <FilterLink current={status} value="NEEDS_CHANGES" label="Changes" />
          </div>
        </div>
      </div>

      {blogs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No blogs found.</p>
          {(q || status) && (
            <Link
              href="/admin/blogs"
              className="mt-4 text-xs font-bold text-accent hover:underline"
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
                  <th className="px-6 py-4 font-bold">Blog Post</th>
                  <th className="px-6 py-4 font-bold">Author</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Stats</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {blogs.map((blog) => (
                  <AdminBlogRow key={blog.id} blog={blog} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLink({ current, value, label }: { current?: string, value: string, label: string }) {
  const isActive = (current || "") === value;
  return (
    <Link
      href={`/admin/blogs${value ? `?status=${value}` : ""}`}
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
