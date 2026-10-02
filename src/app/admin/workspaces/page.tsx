import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pageOf } from "@/lib/admin/workspace-actions";
import { Kpi, Pager, fmtDate, fmtUsd, one, urlWith } from "./[id]/_ui";
import WorkspacesClientSurface, { type WorkspaceRow } from "./WorkspacesClientSurface";

export const metadata = { title: "Workspaces — Interviewpad Admin" };

const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { id: "past_due", label: "Past due" },
  { id: "trial", label: "On trial" },
  { id: "paying", label: "Paying" },
  { id: "locked", label: "Locked" },
  { id: "deleting", label: "Deletion scheduled" },
] as const;

const PLAN_FILTERS = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function statusWhere(status: string | undefined, now: Date): Prisma.WorkspaceWhereInput {
  switch (status) {
    case "past_due":
      return { stripeStatus: { in: ["past_due", "unpaid"] } };
    case "trial":
      return { planName: "FREE", stripeSubscriptionId: null, trialEndsAt: { gt: now } };
    case "paying":
      return { stripeSubscriptionId: { not: null } };
    case "locked":
      return { lockedAt: { not: null } };
    case "deleting":
      return { deletionScheduledAt: { not: null } };
    default:
      return {};
  }
}

export default async function AdminWorkspacesPage({ searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const plan = PLAN_FILTERS.includes(one(sp.plan) ?? "") ? one(sp.plan)! : "";
  const status = STATUS_FILTERS.some((s) => s.id === one(sp.status)) ? one(sp.status)! : "";
  const now = new Date();

  const where: Prisma.WorkspaceWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
    ...(plan ? { planName: plan } : {}),
    ...statusWhere(status, now),
  };

  const [total, all, paying, pastDue, locked, mrr] = await Promise.all([
    prisma.workspace.count({ where }),
    prisma.workspace.count(),
    prisma.workspace.count({ where: { stripeSubscriptionId: { not: null } } }),
    prisma.workspace.count({ where: { stripeStatus: { in: ["past_due", "unpaid"] } } }),
    prisma.workspace.count({ where: { lockedAt: { not: null } } }),
    prisma.workspace.aggregate({ where: { stripeSubscriptionId: { not: null } }, _sum: { stripeMrrCents: true }, _max: { stripeSyncedAt: true } }),
  ]);
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const workspaces = await prisma.workspace.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: paging.skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      createdAt: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      stripeStatus: true,
      stripePastDueSince: true,
      stripeSeatQuantity: true,
      stripeMrrCents: true,
      lockedAt: true,
      deletionScheduledAt: true,
      _count: { select: { members: true } },
    },
  });
  const ids = workspaces.map((w) => w.id);
  const [balances, activity] = ids.length
    ? await Promise.all([
        prisma.aIInterviewCreditLedger.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids } }, _sum: { amount: true } }),
        prisma.workspaceMember.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids } }, _max: { lastActiveAt: true } }),
      ])
    : [[], []];
  const balanceOf = new Map(balances.map((b) => [b.workspaceId, b._sum.amount ?? 0]));
  const activeOf = new Map(activity.map((a) => [a.workspaceId, a._max.lastActiveAt]));

  const rows: WorkspaceRow[] = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    planName: w.planName,
    createdAt: w.createdAt,
    trialEndsAt: w.trialEndsAt,
    stripeSubscriptionId: w.stripeSubscriptionId,
    stripeStatus: w.stripeStatus,
    stripePastDueSince: w.stripePastDueSince,
    lockedAt: w.lockedAt,
    deletionScheduledAt: w.deletionScheduledAt,
    members: w._count.members,
    seatsBilled: w.stripeSeatQuantity,
    mrrCents: w.stripeMrrCents,
    credits: balanceOf.get(w.id) ?? 0,
    lastActive: activeOf.get(w.id) ?? null,
  }));

  const synced = mrr._max.stripeSyncedAt;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Workspaces</h1>
        <p className="text-sm text-muted">Hiring teams, their plans and their Stripe state.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Workspaces" value={all} />
        <Kpi label="Paying" value={paying} hint={pastDue ? `${pastDue} past due` : "None past due"} />
        <Kpi label="MRR" value={fmtUsd(mrr._sum.stripeMrrCents ?? 0)} hint={synced ? `From Stripe, synced ${fmtDate(synced, true)} UTC` : "From Stripe, not synced yet"} />
        <Kpi label="Locked" value={locked} />
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <form className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border" role="search">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or slug"
            aria-label="Search workspaces"
            className="h-9 flex-1 min-w-[220px] max-w-sm rounded-lg border border-border bg-bg px-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60"
          />
          <select name="plan" defaultValue={plan} aria-label="Plan" className="h-9 rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg">
            <option value="">All plans</option>
            {PLAN_FILTERS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} aria-label="Status" className="h-9 rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg">
            <option value="">Any status</option>
            {STATUS_FILTERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="h-9 px-3.5 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel">Apply</button>
        </form>
        <WorkspacesClientSurface rows={rows} filtered={!!(q || plan || status)} />
        <Pager page={paging.page} pages={paging.pages} total={total} href={(p) => urlWith("/admin/workspaces", { q, plan, status, page: p })} />
      </section>
    </div>
  );
}
