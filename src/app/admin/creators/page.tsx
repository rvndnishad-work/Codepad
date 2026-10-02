import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { Search } from "lucide-react";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import Pagination from "../Pagination";
import Pill from "../content/_components/Pill";
import ConfirmButton from "../content/_components/ConfirmButton";
import CreatorApplicationRow from "./CreatorApplicationRow";
import { setSpacePublished } from "./actions";

export const metadata = {
  title: "Creators — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type PageProps = { searchParams?: Promise<{ tab?: string; page?: string; q?: string; status?: string; sort?: string; live?: string }> };

const SPACE_SORTS = {
  newest: { label: "Newest", sql: Prisma.sql`s."createdAt" DESC` },
  name: { label: "Name A to Z", sql: Prisma.sql`lower(s."name") ASC` },
  members: { label: "Most members", sql: Prisma.sql`COALESCE(m.members, 0) DESC, s."createdAt" DESC` },
} as const;
type SpaceSort = keyof typeof SPACE_SORTS;

export default async function AdminCreatorsPage({ searchParams }: PageProps) {
  await requireAdminAccess("creator:review");
  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "applications" ? "applications" : "spaces";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [pendingApps, spaceCount] = await Promise.all([
    prisma.creatorApplication.count({ where: { status: "PENDING" } }),
    prisma.creatorSpace.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Creators</h1>
        <p className="text-sm text-muted mt-1">Creator spaces, their payouts, and applications to become a creator.</p>
      </div>
      <UnderlineTabs
        label="Creator sections"
        active={tab}
        tabs={[
          { id: "spaces", label: "Spaces", href: "/admin/creators", count: spaceCount },
          { id: "applications", label: "Applications", href: "/admin/creators?tab=applications", count: pendingApps },
        ]}
      />
      {tab === "spaces" ? (
        <Spaces q={q} page={page} sort={(sp.sort && sp.sort in SPACE_SORTS ? sp.sort : "newest") as SpaceSort} live={sp.live ?? ""} />
      ) : (
        <Applications q={q} page={page} status={["PENDING", "APPROVED", "REJECTED"].includes(sp.status ?? "") ? sp.status! : "PENDING"} />
      )}
    </div>
  );
}

async function Spaces({ q, page, sort, live }: { q: string; page: number; sort: SpaceSort; live: string }) {
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const filters: Prisma.Sql[] = [];
  if (q) filters.push(Prisma.sql`(s."handle" ILIKE ${like} OR s."name" ILIKE ${like})`);
  if (live === "1") filters.push(Prisma.sql`s."published" = true`);
  if (live === "0") filters.push(Prisma.sql`s."published" = false`);
  const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}` : Prisma.empty;

  // Member counts live in SpaceMembership, which has no relation to sort
  // through, so the page of ids is picked in SQL and the rows loaded after.
  const [idRows, totalRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT s."id" FROM "CreatorSpace" s
      LEFT JOIN (
        SELECT "spaceId", COUNT(*)::int AS members FROM "SpaceMembership" WHERE "status" = 'active' GROUP BY "spaceId"
      ) m ON m."spaceId" = s."id"
      ${whereSql}
      ORDER BY ${SPACE_SORTS[sort].sql}
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`),
    prisma.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS n FROM "CreatorSpace" s ${whereSql}`),
  ]);
  const ids = idRows.map((r) => r.id);
  const total = totalRows[0]?.n ?? 0;

  const spaces = ids.length ? await prisma.creatorSpace.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, handle: true, published: true, featured: true, ownerId: true } }) : [];
  const ownerIds = [...new Set(spaces.map((s) => s.ownerId))];
  const [owners, accounts, contentAgg, memberAgg, earnings] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true } }),
    prisma.creatorAccount.findMany({ where: { userId: { in: ownerIds } }, select: { userId: true, stripeAccountId: true, payoutsEnabled: true } }),
    prisma.spaceContent.groupBy({ by: ["spaceId"], where: { spaceId: { in: ids } }, _count: { _all: true } }),
    prisma.spaceMembership.groupBy({ by: ["spaceId"], where: { spaceId: { in: ids }, status: "active" }, _count: { _all: true } }),
    prisma.creatorEarning.groupBy({ by: ["creatorId"], where: { creatorId: { in: ownerIds } }, _sum: { netCents: true } }),
  ]);
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const owner = new Map(owners.map((o) => [o.id, o]));
  const account = new Map(accounts.map((a) => [a.userId, a]));
  const content = new Map(contentAgg.map((r) => [r.spaceId, r._count._all]));
  const members = new Map(memberAgg.map((r) => [r.spaceId, r._count._all]));
  const net = new Map(earnings.map((e) => [e.creatorId, e._sum.netCents ?? 0]));
  const rows = ids.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s);

  const field = "h-8 rounded-lg border border-border bg-bg px-2 text-sm text-fg focus:outline-none focus:border-border-strong";
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
          <input name="q" defaultValue={q} placeholder="Handle or name" className={`${field} w-full pl-8`} />
        </div>
        <select name="live" defaultValue={live} className={field} aria-label="Status">
          <option value="">Live and draft</option>
          <option value="1">Live</option>
          <option value="0">Draft or offline</option>
        </select>
        <select name="sort" defaultValue={sort} className={field} aria-label="Sort">
          {Object.entries(SPACE_SORTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button type="submit" className="h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-panel">Apply</button>
        {(q || live || sort !== "newest") && <Link href="/admin/creators" className="text-sm text-muted hover:text-fg">Clear</Link>}
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Space</th>
                <th className="px-3 py-2.5 text-left font-medium">Owner</th>
                <th className="px-3 py-2.5 text-right font-medium">Members</th>
                <th className="px-3 py-2.5 text-right font-medium">Content</th>
                <th className="px-3 py-2.5 text-right font-medium">Lifetime net</th>
                <th className="px-3 py-2.5 text-left font-medium">Payouts</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 pr-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => {
                const o = owner.get(s.ownerId);
                const a = account.get(s.ownerId);
                return (
                  <tr key={s.id} className="align-top hover:bg-panel/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/creators/${s.handle}`} className="font-medium text-fg hover:underline">{s.name}</Link>
                      <div className="text-xs text-muted font-mono">/c/{s.handle}</div>
                    </td>
                    <td className="px-3 py-3">
                      {o ? (
                        <Link href={`/admin/users/${o.id}`} className="text-fg hover:underline">{o.name ?? o.email}</Link>
                      ) : (
                        <span className="text-subtle">Unknown</span>
                      )}
                      {o?.name && <div className="text-xs text-muted">{o.email}</div>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{members.get(s.id) ?? 0}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{content.get(s.id) ?? 0}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(net.get(s.ownerId) ?? 0)}</td>
                    <td className="px-3 py-3">
                      {a?.payoutsEnabled ? <Pill tone="ok">Active</Pill> : a?.stripeAccountId ? <Pill tone="warn">Incomplete</Pill> : <Pill tone="off">Not set up</Pill>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        {s.published ? <Pill tone="ok">Live</Pill> : <Pill tone="off">Draft</Pill>}
                        {s.featured && <Pill tone="info">Featured</Pill>}
                      </div>
                    </td>
                    <td className="px-3 py-3 pr-4">
                      <div className="flex items-start justify-end gap-1.5">
                        {s.published && (
                          <ConfirmButton
                            action={setSpacePublished.bind(null, s.id, false)}
                            label="Unpublish"
                            prompt="Take the space offline. The owner gets your reason and can publish again from the studio."
                            requireNote
                            tone="danger"
                          />
                        )}
                        <a href={`/c/${s.handle}`} target="_blank" className="inline-flex items-center h-7 px-2.5 rounded-md border border-border text-xs font-medium text-fg hover:bg-panel">View</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">{q || live ? "No spaces match." : "No creator spaces yet."}</td>
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
          baseUrl="/admin/creators"
          currentParams={{ q: q || undefined, live: live || undefined, sort: sort !== "newest" ? sort : undefined }}
        />
      </div>
    </div>
  );
}

async function Applications({ q, page, status }: { q: string; page: number; status: string }) {
  const where: Prisma.CreatorApplicationWhereInput = {
    status,
    ...(q
      ? { OR: [{ profileUrl: { contains: q, mode: "insensitive" } }, { platform: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const [total, apps, byStatus] = await Promise.all([
    prisma.creatorApplication.count({ where }),
    prisma.creatorApplication.findMany({ where, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.creatorApplication.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const users = apps.length
    ? await prisma.user.findMany({ where: { id: { in: apps.map((a) => a.userId) } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const countOf = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;

  const href = (s: string) => {
    const p = new URLSearchParams({ tab: "applications", status: s });
    if (q) p.set("q", q);
    return `/admin/creators?${p}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {[
            ["PENDING", "Pending"],
            ["APPROVED", "Approved"],
            ["REJECTED", "Rejected"],
          ].map(([id, label]) => (
            <Link key={id} href={href(id)} className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium ${status === id ? "bg-panel text-fg" : "text-muted hover:text-fg"}`}>
              {label} <span className="text-subtle tabular-nums">{countOf(id)}</span>
            </Link>
          ))}
        </div>
        <form className="flex items-center gap-2">
          <input type="hidden" name="tab" value="applications" />
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Profile link or platform" className="h-8 w-64 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-border-strong" />
        </form>
      </div>

      {apps.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-muted">No {status.toLowerCase()} applications.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
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
      )}
      <div className="rounded-xl border border-border overflow-hidden empty:hidden">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          itemsPerPage={PAGE_SIZE}
          baseUrl="/admin/creators"
          currentParams={{ tab: "applications", status, q: q || undefined }}
        />
      </div>
    </div>
  );
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
