import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import ContentTabs from "../content/_components/ContentTabs";
import Pagination from "../Pagination";
import AdminSnippetRow from "./AdminSnippetRow";

export const metadata = { title: "Content — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface AdminSnippetsPageProps {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}

/**
 * Public snippets ("Trends"). Snippet.viewCount is never incremented by the
 * playground, so there is no views column or views sort here: it would
 * always read zero.
 */
export default async function AdminSnippetsPage({ searchParams }: AdminSnippetsPageProps) {
  await requireAdminAccess("content:curate");
  const { q: qRaw, filter, page: pageRaw } = await searchParams;
  const q = (qRaw ?? "").trim();
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const where: Prisma.SnippetWhereInput = {
    visibility: "public",
    ...(filter === "pinned" ? { pinned: true } : filter === "unpinned" ? { pinned: false } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, snippets, totalPublic, totalPinned] = await Promise.all([
    prisma.snippet.count({ where }),
    prisma.snippet.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        template: true,
        pinned: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.snippet.count({ where: { visibility: "public" } }),
    prisma.snippet.count({ where: { visibility: "public", pinned: true } }),
  ]);

  const reports = snippets.length
    ? await prisma.contentReport.groupBy({
        by: ["targetId"],
        where: { targetType: "snippet", status: "open", targetId: { in: snippets.map((s) => s.id) } },
        _count: { _all: true },
      })
    : [];
  const reportCount = new Map(reports.map((r) => [r.targetId, r._count._all]));

  return (
    <div className="space-y-6">
      <ContentTabs active="trends" />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="text-sm text-muted max-w-2xl space-y-1">
          <p>
            {totalPublic.toLocaleString()} public snippets, {totalPinned.toLocaleString()} pinned. Public snippets are listed on Explore, newest first.
          </p>
          <p className="text-subtle">
            Pinning does not feature a snippet anywhere public today: the homepage has no trends section. It sets the owner&apos;s own pin, which keeps the snippet at the top of their dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Title, slug or owner email"
              className="w-64 h-8 rounded-lg border border-border bg-bg pl-8 pr-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-border-strong"
            />
            {filter && <input type="hidden" name="filter" value={filter} />}
          </form>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
            <FilterLink current={filter} q={q} value="" label="All" />
            <FilterLink current={filter} q={q} value="pinned" label="Pinned" />
            <FilterLink current={filter} q={q} value="unpinned" label="Not pinned" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Snippet</th>
                <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                <th className="px-4 py-2.5 text-left font-medium">Updated</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {snippets.map((s) => (
                <AdminSnippetRow
                  key={s.id}
                  snippet={{ ...s, updatedAt: s.updatedAt.toISOString(), openReports: reportCount.get(s.id) ?? 0 }}
                />
              ))}
              {snippets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted">
                    No snippets match.{" "}
                    {(q || filter) && (
                      <Link href="/admin/snippets" className="text-fg underline">
                        Clear filters
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          itemsPerPage={PAGE_SIZE}
          baseUrl="/admin/snippets"
          currentParams={{ q: q || undefined, filter: filter || undefined }}
        />
      </div>
    </div>
  );
}

function FilterLink({ current, q, value, label }: { current?: string; q?: string; value: string; label: string }) {
  const isActive = (current ?? "") === value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (value) params.set("filter", value);
  const qs = params.toString();
  return (
    <Link
      href={`/admin/snippets${qs ? `?${qs}` : ""}`}
      className={`h-7 inline-flex items-center px-2.5 rounded-md text-xs font-medium transition ${
        isActive ? "bg-panel text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );
}
