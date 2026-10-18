import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import ContentTabs from "../content/_components/ContentTabs";
import Pagination from "../Pagination";
import AdminChallengeRow from "./AdminChallengeRow";
import ChallengesBulkTable, { BulkHeaderCheckbox } from "./ChallengesBulkTable";

export const metadata = { title: "Content — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZES = [25, 50, 100];

const STATUS: Record<string, { label: string; where: Prisma.ChallengeWhereInput }> = {
  active: { label: "Not archived", where: { archivedAt: null } },
  published: { label: "Published", where: { archivedAt: null, published: true } },
  draft: { label: "Draft", where: { archivedAt: null, published: false, scheduledAt: null } },
  scheduled: { label: "Scheduled", where: { archivedAt: null, published: false, scheduledAt: { not: null } } },
  archived: { label: "Archived", where: { archivedAt: { not: null } } },
  all: { label: "All", where: {} },
};

const SORTS: Record<string, { label: string; orderBy: Prisma.ChallengeOrderByWithRelationInput[] }> = {
  updated: { label: "Recently edited", orderBy: [{ updatedAt: "desc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  title: { label: "Title A to Z", orderBy: [{ title: "asc" }] },
  attempts: { label: "Most attempts", orderBy: [{ attempts: { _count: "desc" } }, { updatedAt: "desc" }] },
  published: { label: "Recently published", orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }] },
};

type SP = { q?: string; status?: string; difficulty?: string; tier?: string; sort?: string; page?: string; per?: string };

export default async function AdminChallengesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminAccess("content:curate");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status && sp.status in STATUS ? sp.status : "active";
  const difficulty = ["easy", "medium", "hard"].includes(sp.difficulty ?? "") ? sp.difficulty! : "";
  const tier = sp.tier === "premium" || sp.tier === "free" ? sp.tier : "";
  const sort = sp.sort && sp.sort in SORTS ? sp.sort : "updated";
  const per = PAGE_SIZES.includes(Number(sp.per)) ? Number(sp.per) : 25;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ChallengeWhereInput = {
    ...STATUS[status].where,
    ...(difficulty ? { difficulty } : {}),
    ...(tier ? { premium: tier === "premium" } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows, byState, archived, attemptsTotal] = await Promise.all([
    prisma.challenge.count({ where }),
    prisma.challenge.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        category: true,
        published: true,
        premium: true,
        featured: true,
        archivedAt: true,
        scheduledAt: true,
        updatedAt: true,
        _count: { select: { attempts: true, takeHomeAssignments: true } },
      },
    }),
    prisma.challenge.groupBy({ by: ["published", "premium"], where: { archivedAt: null }, _count: { _all: true } }),
    prisma.challenge.count({ where: { archivedAt: { not: null } } }),
    prisma.challengeAttempt.count(),
  ]);

  const sum = (f: (r: (typeof byState)[number]) => boolean) => byState.filter(f).reduce((n, r) => n + r._count._all, 0);
  const live = sum(() => true);
  const stats = [
    { label: "Challenges", value: live, sub: `${archived} archived` },
    { label: "Published", value: sum((r) => r.published), sub: `${sum((r) => !r.published)} drafts` },
    { label: "Premium", value: sum((r) => r.premium), sub: `${sum((r) => !r.premium)} free` },
    { label: "Attempts", value: attemptsTotal, sub: "all time" },
  ];

  const params = { q: q || undefined, status: status !== "active" ? status : undefined, difficulty: difficulty || undefined, tier: tier || undefined, sort: sort !== "updated" ? sort : undefined, per: per !== 25 ? String(per) : undefined };
  const filtering = Boolean(q || difficulty || tier || status !== "active");
  const select = "h-8 rounded-lg border border-border bg-bg px-2 text-sm text-fg focus:outline-none focus:border-border-strong";

  return (
    <div className="space-y-6">
      <ContentTabs active="challenges" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface px-4 py-3">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="text-xl font-semibold tabular-nums mt-0.5">{s.value.toLocaleString()}</div>
            <div className="text-xs text-subtle mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Title, slug or category"
            className="w-full h-8 rounded-lg border border-border bg-bg pl-8 pr-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-border-strong"
          />
        </div>
        <select name="status" defaultValue={status} className={select} aria-label="Status">
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select name="difficulty" defaultValue={difficulty} className={select} aria-label="Difficulty">
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select name="tier" defaultValue={tier} className={select} aria-label="Tier">
          <option value="">Free and premium</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <select name="sort" defaultValue={sort} className={select} aria-label="Sort">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select name="per" defaultValue={String(per)} className={select} aria-label="Rows per page">
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} a page</option>
          ))}
        </select>
        <button type="submit" className="h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-panel">
          Apply
        </button>
        {filtering && (
          <Link href="/admin/challenges" className="text-sm text-muted hover:text-fg">Clear</Link>
        )}
        <Link
          href="/admin/challenges/new"
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-soft"
        >
          <Plus className="w-4 h-4" /> New challenge
        </Link>
      </form>

      <ChallengesBulkTable>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-panel text-xs text-muted">
                <tr>
                  <th className="pl-4 pr-2 py-2.5 w-8 text-left">
                    <BulkHeaderCheckbox ids={rows.map((r) => r.id)} />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">Challenge</th>
                  <th className="px-3 py-2.5 text-left font-medium">Difficulty</th>
                  <th className="px-3 py-2.5 text-left font-medium hidden lg:table-cell">Category</th>
                  <th className="px-3 py-2.5 text-right font-medium">Attempts</th>
                  <th className="px-3 py-2.5 text-left font-medium">Tier</th>
                  <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  <th className="px-3 py-2.5 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((c) => (
                  <AdminChallengeRow
                    key={c.id}
                    challenge={{
                      id: c.id,
                      slug: c.slug,
                      title: c.title,
                      difficulty: c.difficulty,
                      category: c.category,
                      published: c.published,
                      premium: c.premium,
                      featured: c.featured,
                      attempts: c._count.attempts,
                      takeHomes: c._count.takeHomeAssignments,
                      archivedAt: c.archivedAt?.toISOString() ?? null,
                      scheduledAt: c.scheduledAt?.toISOString() ?? null,
                      updatedAt: c.updatedAt.toISOString(),
                    }}
                  />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted">
                      {filtering ? "No challenges match these filters." : "No challenges yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / per)}
            totalItems={total}
            itemsPerPage={per}
            baseUrl="/admin/challenges"
            currentParams={params}
          />
        </div>
      </ChallengesBulkTable>
    </div>
  );
}
