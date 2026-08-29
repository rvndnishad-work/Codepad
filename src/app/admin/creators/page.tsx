import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { ShieldCheck, Store, Users, LayoutGrid, CheckCircle, AlertTriangle, ExternalLink, Search } from "lucide-react";
import CreatorApplicationRow from "./CreatorApplicationRow";

export const metadata = {
  title: "Creator Management — Admin",
  robots: { index: false, follow: false },
};

const STATUS_ORDER: Record<string, number> = { PENDING: 0, REJECTED: 1, APPROVED: 2 };

type PageProps = { searchParams?: Promise<{ page?: string; q?: string; status?: string; sort?: string }> };

export default async function AdminCreatorsPage({ searchParams }: PageProps) {
  await requireAdminAccess("creator:review");

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = sp.status ?? "";
  const sort = sp.sort ?? "newest";
  const pageSize = 20;

  // Fetch applications (keep 200 cap, filtered server-side for q/status)
  const appsRaw = await prisma.creatorApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const apps = appsRaw.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (!q) return true;
    return a.profileUrl.toLowerCase().includes(q) || a.platform.toLowerCase().includes(q);
  });

  const userIds = apps.map((a) => a.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const sortedApps = [...apps].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );
  const pendingCount = apps.filter((a) => a.status === "PENDING").length;

  // Fetch spaces — filtered + sorted before pagination
  const allSpacesRaw = await prisma.creatorSpace.findMany({ orderBy: { createdAt: "desc" } });
  const allSpacesFiltered = allSpacesRaw.filter((s) => {
    if (!q) return true;
    return s.handle.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });
  // sort
  const sortedSpaces =
    sort === "name"
      ? [...allSpacesFiltered].sort((a, b) => a.name.localeCompare(b.name))
      : sort === "members"
        ? [...allSpacesFiltered] // will sort after counts fetched for page slice only; keep stable for now
        : allSpacesFiltered;
  const totalSpaces = sortedSpaces.length;
  const totalPages = Math.max(1, Math.ceil(totalSpaces / pageSize));
  const safePage = Math.min(page, totalPages);
  const spaces = sortedSpaces.slice((safePage - 1) * pageSize, safePage * pageSize);

  const spaceIds = spaces.map((s) => s.id);
  const spaceOwnerIds = [...new Set(spaces.map((s) => s.ownerId))];
  const [spaceOwners, creatorAccounts, contentAgg, memberAgg] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: spaceOwnerIds } }, select: { id: true, name: true, email: true } }),
    prisma.creatorAccount.findMany({ where: { userId: { in: spaceOwnerIds } } }),
    spaceIds.length
      ? prisma.spaceContent.groupBy({ by: ["spaceId"], where: { spaceId: { in: spaceIds } }, _count: { _all: true } })
      : Promise.resolve([] as { spaceId: string; _count: { _all: number } }[]),
    spaceIds.length
      ? prisma.spaceMembership.groupBy({
          by: ["spaceId"],
          where: { spaceId: { in: spaceIds }, status: "active" },
          _count: { _all: true },
        })
      : Promise.resolve([] as { spaceId: string; _count: { _all: number } }[]),
  ]);
  const spaceOwnerMap = new Map(spaceOwners.map((o) => [o.id, o]));
  const accountMap = new Map(creatorAccounts.map((a) => [a.userId, a]));
  const contentCountMap = new Map(contentAgg.map((r) => [r.spaceId, r._count._all]));
  const memberCountMap = new Map(memberAgg.map((r) => [r.spaceId, r._count._all]));

  // Optional members sort for current page slice (cheap — pageSize ≤20)
  let activeSpacesList = spaces.map((s) => {
    const owner = spaceOwnerMap.get(s.ownerId);
    const account = accountMap.get(s.ownerId);
    let payoutsStatus: "active" | "incomplete" | "none" = "none";
    if (account?.chargesEnabled) payoutsStatus = "active";
    else if (account?.stripeAccountId) payoutsStatus = "incomplete";
    return {
      id: s.id,
      name: s.name,
      handle: s.handle,
      published: s.published,
      ownerName: owner?.name || "Unknown Owner",
      ownerEmail: owner?.email || "No Email",
      contentCount: contentCountMap.get(s.id) ?? 0,
      subscriberCount: memberCountMap.get(s.id) ?? 0,
      payoutsStatus,
    };
  });
  if (sort === "members") activeSpacesList = [...activeSpacesList].sort((a, b) => b.subscriberCount - a.subscriberCount);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-violet-400" />
        <div>
          <h1 className="text-xl font-bold text-fg">Creator Management</h1>
          <p className="text-xs text-muted mt-0.5">
            Review incoming creator onboarding requests and manage existing creator pages.
          </p>
        </div>
      </div>

      {/* Filters — Stage 6: searchable, sortable */}
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search handle, name, profile…"
            className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/40"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="px-2 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs"
          title="Application status filter"
        >
          <option value="">All apps</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="px-2 py-1.5 rounded-lg border border-border bg-bg text-fg text-xs"
          title="Sort spaces"
        >
          <option value="newest">Newest</option>
          <option value="name">Name A→Z</option>
          <option value="members">Members ↓</option>
        </select>
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft">
          Filter
        </button>
        {(q || statusFilter || sort !== "newest") && (
          <Link href="/admin/creators" className="text-xs text-muted hover:text-fg px-2">
            Clear
          </Link>
        )}
        <span className="ml-auto text-[10px] text-muted">
          {totalSpaces} spaces · page {safePage}/{totalPages}
        </span>
      </form>

      {/* Active Creator Spaces */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-tile">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-panel/30">
          <h2 className="text-sm font-bold text-fg flex items-center gap-2">
            <Store className="w-4 h-4 text-accent" /> Active Creator Pages ({totalSpaces})
          </h2>
          {totalSpaces > pageSize && <span className="text-[10px] text-muted">20 per page</span>}
        </div>

        {activeSpacesList.length === 0 ? (
          <div className="px-5 py-10 text-center max-w-sm mx-auto text-muted">
            No active creator pages have been created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-panel/10 text-muted uppercase font-bold tracking-wider">
                  <th className="px-5 py-3">Page Name / Handle</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Subscribers</th>
                  <th className="px-5 py-3">Gated Content</th>
                  <th className="px-5 py-3">Health</th>
                  <th className="px-5 py-3">Payouts</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeSpacesList.map((s) => (
                  <tr key={s.id} className="hover:bg-panel/20 transition-colors">
                    {/* Page details */}
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/creators/${s.handle}`} className="font-semibold text-fg hover:text-accent hover:underline">
                        {s.name}
                      </Link>
                      <div className="text-[10px] text-muted font-mono mt-0.5">/c/{s.handle}</div>
                    </td>

                    {/* Owner details */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-fg">{s.ownerName}</div>
                      <div className="text-[10px] text-muted mt-0.5">{s.ownerEmail}</div>
                    </td>

                    {/* Subscriber count */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-fg">
                        <Users className="w-3.5 h-3.5 text-muted" /> {s.subscriberCount}
                      </span>
                    </td>

                    {/* Gated content count */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-fg">
                        <LayoutGrid className="w-3.5 h-3.5 text-muted" /> {s.contentCount}
                      </span>
                    </td>

                    {/* Health */}
                    <td className="px-5 py-3.5">
                      {s.contentCount === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-700">Empty</span>
                      ) : s.subscriberCount === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-700">Needs growth</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Healthy</span>
                      )}
                    </td>

                    {/* Payouts Connect Status */}
                    <td className="px-5 py-3.5">
                      {s.payoutsStatus === "active" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : s.payoutsStatus === "incomplete" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted font-bold uppercase tracking-wider">
                          Not Setup
                        </span>
                      )}
                    </td>

                    {/* Status live/draft */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                          s.published
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                            : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                        }`}
                      >
                        {s.published ? "Live" : "Draft"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right flex justify-end gap-2">
                      <a
                        href={`/c/${s.handle}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-panel hover:bg-panel-strong border border-border text-[10px] font-semibold text-fg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                      <a
                        href={`/creator/${s.handle}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent hover:bg-accent-soft text-[10px] font-bold text-bg transition-colors"
                      >
                        Manage
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-panel/20 text-xs">
            <span className="text-muted">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalSpaces)} of {totalSpaces}
            </span>
            <span className="flex items-center gap-1">
              {safePage > 1 ? (
                <Link
                  href={`/admin/creators?page=${safePage - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${sort !== "newest" ? `&sort=${sort}` : ""}`}
                  className="px-2.5 py-1 rounded-lg border border-border bg-bg hover:border-accent/40"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="px-2.5 py-1 rounded-lg border border-border bg-bg opacity-40">← Prev</span>
              )}
              <span className="px-2 py-1 text-muted">
                {safePage} / {totalPages}
              </span>
              {safePage < totalPages ? (
                <Link
                  href={`/admin/creators?page=${safePage + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${sort !== "newest" ? `&sort=${sort}` : ""}`}
                  className="px-2.5 py-1 rounded-lg border border-border bg-bg hover:border-accent/40"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-2.5 py-1 rounded-lg border border-border bg-bg opacity-40">Next →</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-sm font-bold text-fg">
            Applications ({pendingCount} pending)
          </h2>
        </div>

        {sortedApps.length === 0 && (
          <p className="text-sm text-muted">No applications yet.</p>
        )}

        <div className="space-y-3">
          {sortedApps.map((a) => {
            const u = userMap.get(a.userId);
            return (
              <CreatorApplicationRow
                key={a.id}
                app={{
                  id: a.id,
                  userName: u?.name ?? null,
                  userEmail: u?.email ?? null,
                  platform: a.platform,
                  profileUrl: a.profileUrl,
                  followerCount: a.followerCount,
                  note: a.note,
                  status: a.status,
                  reviewNote: a.reviewNote,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
