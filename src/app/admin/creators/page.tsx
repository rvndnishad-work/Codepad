import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { ShieldCheck, Store, Users, LayoutGrid, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import CreatorApplicationRow from "./CreatorApplicationRow";

export const metadata = {
  title: "Creator Management — Admin",
  robots: { index: false, follow: false },
};

const STATUS_ORDER: Record<string, number> = { PENDING: 0, REJECTED: 1, APPROVED: 2 };

export default async function AdminCreatorsPage() {
  await requireAdminAccess("creator:review");

  // Fetch applications
  const apps = await prisma.creatorApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
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

  // Fetch active spaces
  const spaces = await prisma.creatorSpace.findMany({
    orderBy: { createdAt: "desc" },
  });

  const spaceOwnerIds = spaces.map((s) => s.ownerId);
  const spaceOwners = await prisma.user.findMany({
    where: { id: { in: spaceOwnerIds } },
    select: { id: true, name: true, email: true },
  });
  const spaceOwnerMap = new Map(spaceOwners.map((o) => [o.id, o]));

  const creatorAccounts = await prisma.creatorAccount.findMany({
    where: { userId: { in: spaceOwnerIds } },
  });
  const accountMap = new Map(creatorAccounts.map((a) => [a.userId, a]));

  const activeSpacesList = await Promise.all(
    spaces.map(async (s) => {
      const [contentCount, subscriberCount] = await Promise.all([
        prisma.spaceContent.count({ where: { spaceId: s.id } }),
        prisma.spaceMembership.count({ where: { spaceId: s.id, status: "active" } }),
      ]);
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
        contentCount,
        subscriberCount,
        payoutsStatus,
      };
    })
  );

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

      {/* Active Creator Spaces */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-tile">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-panel/30">
          <h2 className="text-sm font-bold text-fg flex items-center gap-2">
            <Store className="w-4 h-4 text-accent" /> Active Creator Pages ({activeSpacesList.length})
          </h2>
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
                      <div className="font-semibold text-fg">{s.name}</div>
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
