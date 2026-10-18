import { notFound } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { ArrowLeft, ExternalLink } from "lucide-react";
import OverviewCharts from "@/app/creator/[handle]/OverviewCharts";
import Pill, { type PillTone } from "../../content/_components/Pill";
import ConfirmButton from "../../content/_components/ConfirmButton";
import { setSpacePublished } from "../actions";
import { dayKeys } from "./series";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export const metadata = { title: "Creator — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };
type DayRow = { day: string; n: number };

const PAYOUT_TONE: Record<string, PillTone> = { paid: "ok", in_transit: "info", pending: "warn", failed: "bad", canceled: "off" };

export default async function AdminCreatorDrillPage({ params }: Props) {
  await requireAdminAccess("creator:review");
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space) notFound();

  const windowStart = new Date(Date.now() - (WINDOW_DAYS - 1) * DAY_MS);
  windowStart.setUTCHours(0, 0, 0, 0);
  const perDay = (table: Prisma.Sql, extra: Prisma.Sql, value: Prisma.Sql = Prisma.sql`COUNT(*)`) =>
    prisma.$queryRaw<DayRow[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, (${value})::int AS n
      FROM ${table} WHERE "createdAt" >= ${windowStart} AND ${extra}
      GROUP BY 1`);

  const [owner, tiers, account, contentCount, followerCount, memberCount, lifetime, views, follows, joins, earnedDaily, recentEarnings, payouts, payoutTotals, versions, recentEvents] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: space.ownerId }, select: { id: true, name: true, email: true } }),
      prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" }, select: { id: true, name: true, priceCents: true } }),
      prisma.creatorAccount.findUnique({ where: { userId: space.ownerId } }),
      prisma.spaceContent.count({ where: { spaceId: space.id } }),
      prisma.spaceFollow.count({ where: { spaceId: space.id } }),
      prisma.spaceMembership.count({ where: { spaceId: space.id, status: "active" } }),
      prisma.creatorEarning.aggregate({ where: { creatorId: space.ownerId }, _sum: { grossCents: true, feeCents: true, netCents: true }, _count: { _all: true } }),
      perDay(Prisma.sql`"SpaceEvent"`, Prisma.sql`"spaceId" = ${space.id} AND "kind" IN ('SPACE_VIEW', 'CONTENT_VIEW')`),
      perDay(Prisma.sql`"SpaceFollow"`, Prisma.sql`"spaceId" = ${space.id}`),
      perDay(Prisma.sql`"SpaceMembership"`, Prisma.sql`"spaceId" = ${space.id}`),
      perDay(Prisma.sql`"CreatorEarning"`, Prisma.sql`"creatorId" = ${space.ownerId}`, Prisma.sql`COALESCE(SUM("netCents"), 0)`),
      prisma.creatorEarning.findMany({ where: { creatorId: space.ownerId }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.creatorPayout.findMany({ where: { creatorUserId: space.ownerId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.creatorPayout.groupBy({ by: ["kind", "status"], where: { creatorUserId: space.ownerId }, _sum: { amountCents: true } }),
      prisma.spaceVersion.findMany({ where: { spaceId: space.id }, orderBy: { publishedAt: "desc" }, take: 10 }),
      prisma.spaceEvent.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

  const days = dayKeys(windowStart, WINDOW_DAYS);
  const series = (rows: DayRow[], scale = 1) => {
    const m = new Map(rows.map((r) => [r.day, r.n]));
    return days.map((d) => ({ date: d.label, value: (m.get(d.key) ?? 0) / scale }));
  };
  const sum = (rows: DayRow[]) => rows.reduce((n, r) => n + r.n, 0);
  const net30 = sum(earnedDaily);

  const tiles = [
    { key: "views", label: "Views", icon: "views" as const, color: "#2563eb", total: sum(views).toLocaleString(), series: series(views), unit: "views" as const },
    { key: "follows", label: "Followers", icon: "follows" as const, color: "#d97706", total: followerCount.toLocaleString(), series: series(follows), unit: "new" as const },
    { key: "members", label: "Members", icon: "members" as const, color: "#7c3aed", total: memberCount.toLocaleString(), series: series(joins), unit: "joined" as const },
    { key: "earnings", label: "Net earnings, 30 days", icon: "earnings" as const, color: "#059669", total: money(net30), series: series(earnedDaily, 100), unit: "money" as const },
  ];

  const payoutStatus = account?.payoutsEnabled ? "active" : account?.stripeAccountId ? "incomplete" : "none";
  const paidOut = payoutTotals.filter((p) => p.kind === "payout" && p.status === "paid").reduce((n, p) => n + (p._sum.amountCents ?? 0), 0);
  const inFlight = payoutTotals
    .filter((p) => p.kind === "payout" && (p.status === "pending" || p.status === "in_transit"))
    .reduce((n, p) => n + (p._sum.amountCents ?? 0), 0);
  const transferred = payoutTotals.filter((p) => p.kind === "transfer" && p.status === "paid").reduce((n, p) => n + (p._sum.amountCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/creators" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Creators
      </Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg flex flex-wrap items-center gap-2">
            {space.name}
            {space.published ? <Pill tone="ok">Live</Pill> : <Pill tone="off">Draft or offline</Pill>}
            {space.featured && <Pill tone="info">Featured</Pill>}
          </h1>
          <p className="text-sm text-muted mt-1">
            /c/{space.handle} · owner{" "}
            {owner ? (
              <Link href={`/admin/users/${owner.id}`} className="text-fg hover:underline">{owner.name ?? owner.email}</Link>
            ) : (
              "unknown"
            )}{" "}
            · {tiers.length} tiers · {contentCount} content items
          </p>
        </div>
        <div className="ml-auto flex items-start gap-2">
          {space.published ? (
            <ConfirmButton
              action={setSpacePublished.bind(null, space.id, false)}
              label="Unpublish space"
              prompt="Take the space offline. The owner gets your reason and can publish it again from the studio. To stop them, suspend their account."
              requireNote
              tone="danger"
              size="sm"
            />
          ) : (
            <ConfirmButton action={setSpacePublished.bind(null, space.id, true)} label="Publish again" size="sm" />
          )}
          <a href={`/c/${space.handle}`} target="_blank" className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-panel">
            <ExternalLink className="w-3.5 h-3.5" /> View
          </a>
        </div>
      </div>

      <OverviewCharts tiles={tiles} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="px-4 py-3 border-b border-border text-sm font-medium">Earnings</h2>
          <dl className="grid grid-cols-2 gap-px bg-border">
            {[
              ["Lifetime gross", money(lifetime._sum.grossCents ?? 0)],
              ["Platform fee", money(lifetime._sum.feeCents ?? 0)],
              ["Lifetime net", money(lifetime._sum.netCents ?? 0)],
              ["Sales", (lifetime._count._all ?? 0).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-4 py-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="divide-y divide-border border-t border-border">
            {recentEarnings.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-muted">
                  {e.sourceKind ?? "Sale"} · {e.createdAt.toLocaleDateString("en-GB")}
                </span>
                <span className="tabular-nums">{money(e.netCents, e.currency)}</span>
              </div>
            ))}
            {recentEarnings.length === 0 && <p className="px-4 py-3 text-sm text-muted">No earnings yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Payouts</h2>
            {payoutStatus === "active" ? (
              <Pill tone="ok">Payouts on</Pill>
            ) : payoutStatus === "incomplete" ? (
              <Pill tone="warn" title="Stripe has not enabled payouts on this account yet">Payouts not enabled</Pill>
            ) : (
              <Pill tone="off">No Stripe account</Pill>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-px bg-border">
            {[
              ["Transferred to Stripe", money(transferred)],
              ["Paid to bank", money(paidOut)],
              ["On the way", money(inFlight)],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-4 py-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-panel text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Kind</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 pr-4 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {p.createdAt.toLocaleDateString("en-GB")}
                      {p.arrivalDate && p.kind === "payout" && <div className="text-xs text-muted">arrives {p.arrivalDate.toLocaleDateString("en-GB")}</div>}
                    </td>
                    <td className="px-3 py-2">{p.kind === "payout" ? "Bank payout" : "Transfer"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(p.amountCents, p.currency)}</td>
                    <td className="px-3 py-2 pr-4">
                      <Pill tone={PAYOUT_TONE[p.status] ?? "off"}>{p.status.replace("_", " ")}</Pill>
                      {p.failureMessage && <div className="text-xs text-danger mt-1">{p.failureMessage}</div>}
                    </td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-muted">
                      No payouts recorded yet. They arrive from Stripe Connect webhooks (payout and transfer events).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="px-4 py-3 border-b border-border text-sm font-medium">Published versions</h2>
          <div className="p-4 space-y-2 max-h-[320px] overflow-auto">
            {versions.length === 0 && <p className="text-sm text-muted">No versions yet.</p>}
            {versions.map((v) => (
              <details key={v.id} className="rounded-lg border border-border">
                <summary className="cursor-pointer px-3 py-2 text-sm flex justify-between">
                  <span>{v.publishedAt.toLocaleString("en-GB")}</span>
                  <span className="text-xs text-muted font-mono">{v.actorId?.slice(0, 8) ?? "unknown"}</span>
                </summary>
                <pre className="text-xs bg-bg border-t border-border p-2 overflow-auto max-h-40">{JSON.stringify(v.blocks, null, 2).slice(0, 2000)}</pre>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <h2 className="px-4 py-3 border-b border-border text-sm font-medium">Recent events</h2>
          <div className="divide-y divide-border">
            {recentEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <Pill tone="off">{e.kind.toLowerCase().replace("_", " ")}</Pill>
                <span className="text-muted truncate">
                  {e.contentType ?? ""} {e.contentId ? e.contentId.slice(0, 6) : ""}
                </span>
                <span className="ml-auto text-xs text-muted whitespace-nowrap">{e.createdAt.toLocaleString("en-GB")}</span>
              </div>
            ))}
            {recentEvents.length === 0 && <p className="px-4 py-3 text-sm text-muted">No events yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
