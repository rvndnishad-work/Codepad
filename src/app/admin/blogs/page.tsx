import { prisma } from "@/lib/prisma";
import { FileText, Search, Filter, CheckCircle2, Clock, AlertCircle, Star } from "lucide-react";
import AdminBlogRow from "./AdminBlogRow";
import BlogsBulkTable, { BulkHeaderCheckbox } from "./BlogsBulkTable";
import Link from "next/link";

import Pagination from "../Pagination";
import SortSelect from "./SortSelect";

interface AdminBlogsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sortBy?: string }>;
}

export default async function AdminBlogsPage({ searchParams }: AdminBlogsPageProps) {
  const { q, status, page, sortBy } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const ITEMS_PER_PAGE = 10;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentSort = sortBy || "createdAt_desc";

  const whereClause = {
    AND: [
      q ? {
        OR: [
          { title: { contains: q } },
          { slug: { contains: q } },
        ],
      } : {},
      status === "FEATURED"
        ? { featured: true }
        : status
        ? { status }
        : {},
    ]
  };

  let orderBy: any = { createdAt: "desc" };

  if (currentSort === "createdAt_asc") {
    orderBy = { createdAt: "asc" };
  } else if (currentSort === "viewCount_desc") {
    orderBy = { viewCount: "desc" };
  } else if (currentSort === "reactions_desc") {
    orderBy = {
      reactions: {
        _count: "desc"
      }
    };
  } else if (currentSort === "comments_desc") {
    orderBy = {
      comments: {
        _count: "desc"
      }
    };
  } else if (currentSort === "featured_desc") {
    orderBy = [
      { featured: "desc" },
      { createdAt: "desc" }
    ];
  } else if (currentSort === "author_asc") {
    orderBy = {
      user: {
        name: "asc"
      }
    };
  }

  const totalCount = await prisma.blogPost.count({
    where: whereClause
  });

  const blogs = await prisma.blogPost.findMany({
    where: whereClause,
    orderBy,
    skip,
    take: ITEMS_PER_PAGE,
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

  const allBlogsCount = await prisma.blogPost.count();
  const pendingCount = await prisma.blogPost.count({ where: { status: "PENDING" } });
  const publishedCount = await prisma.blogPost.count({ where: { status: "PUBLISHED" } });
  const featuredCount = await prisma.blogPost.count({ where: { featured: true } });

  const stats = {
    total: allBlogsCount,
    pending: pendingCount,
    published: publishedCount,
    featured: featuredCount,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-panel/40 border border-border flex items-center justify-center text-muted shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-fg">Blogs</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-sm text-muted">
                {stats.total} total · {stats.published} published
              </p>
              {stats.pending > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold uppercase tracking-wide border border-amber-500/20 shadow-sm">
                  <Clock className="w-3 h-3" />
                  {stats.pending} Pending
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <form className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search blogs..."
                className="w-full bg-panel/20 border border-border backdrop-blur-md rounded-xl py-2 pl-10 pr-4 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
              />
            </form>

            <SortSelect />
          </div>
          
          <div className="flex items-center gap-1 bg-panel/20 border border-border backdrop-blur-md rounded-xl p-1 shadow-inner w-fit">
            <FilterLink current={status} value="" label="All" />
            <FilterLink current={status} value="PENDING" label="Pending" />
            <FilterLink current={status} value="PUBLISHED" label="Published" />
            <FilterLink current={status} value="FEATURED" label="Featured" />
            <FilterLink current={status} value="NEEDS_CHANGES" label="Changes" />
          </div>
        </div>
      </div>

      {blogs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel/30 backdrop-blur-md p-16 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-muted/5 flex items-center justify-center mx-auto mb-4 text-muted/60 border border-border">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No blogs found.</p>
          {(q || status) && (
            <Link
              href="/admin/blogs"
              className="mt-4 inline-block text-xs font-bold text-accent hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <BlogsBulkTable>
          <div className="rounded-2xl border border-border bg-panel/30 backdrop-blur-md overflow-hidden shadow-lg">
            <div className="hidden lg:grid lg:grid-cols-[40px_3fr_1.5fr_1.2fr_1.5fr_1.8fr] lg:items-center lg:px-6 lg:py-4 bg-panel/40 text-[11px] uppercase tracking-wide text-muted border-b border-border font-semibold">
              <div className="flex items-center justify-center">
                <BulkHeaderCheckbox ids={blogs.map((b) => b.id)} />
              </div>
              <div>Blog Post</div>
              <div>Author</div>
              <div>Status</div>
              <div>Stats</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {blogs.map((blog) => (
                <AdminBlogRow key={blog.id} blog={blog} />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / ITEMS_PER_PAGE)}
              totalItems={totalCount}
              itemsPerPage={ITEMS_PER_PAGE}
              baseUrl="/admin/blogs"
              currentParams={{ q, status, sortBy }}
            />
          </div>
        </BlogsBulkTable>
      )}
    </div>
  );
}

function FilterLink({ current, value, label }: { current?: string, value: string, label: string }) {
  const isActive = (current || "") === value;
  return (
    <Link
      href={`/admin/blogs${value ? `?status=${value}` : ""}`}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 border ${
        isActive
          ? "bg-elevated text-fg border-border shadow-sm"
          : "border-transparent text-muted hover:text-fg hover:bg-panel/40"
      }`}
    >
      {label}
    </Link>
  );
}
