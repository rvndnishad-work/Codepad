import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { ShieldCheck, Store, ExternalLink, Users, LayoutGrid, CalendarDays } from "lucide-react";
import OverviewCharts from "@/app/creator/[handle]/OverviewCharts";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

function dailySeries(dates: Date[], weights?: number[]): { date: string; value: number }[] {
  const start = new Date(Date.now() - (WINDOW_DAYS - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  const buckets = new Array(WINDOW_DAYS).fill(0);
  dates.forEach((d, i) => {
    const idx = Math.floor((d.getTime() - start.getTime()) / DAY_MS);
    if (idx >= 0 && idx < WINDOW_DAYS) buckets[idx] += weights ? weights[i] : 1;
  });
  return buckets.map((value, i) => {
    const d = new Date(start.getTime() + i * DAY_MS);
    return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value };
  });
}

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export const metadata = { title: "Creator Drill — Admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ handle: string }> };

export default async function AdminCreatorDrillPage({ params }: Props) {
  await requireAdminAccess("creator:review");
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space) notFound();

  const windowStart = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const [owner, tiers, account, contentCount, viewEvents, followRows30d, memberRows30d, earningsList, versions, recentEvents] = await Promise.all([
    prisma.user.findUnique({ where: { id: space.ownerId }, select: { name: true, email: true, image: true } }),
    prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" } }),
    prisma.creatorAccount.findUnique({ where: { userId: space.ownerId } }),
    prisma.spaceContent.count({ where: { spaceId: space.id } }),
    prisma.spaceEvent.findMany({ where: { spaceId: space.id, kind: { in: ["SPACE_VIEW", "CONTENT_VIEW"] }, createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.spaceFollow.findMany({ where: { spaceId: space.id, createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.spaceMembership.findMany({ where: { spaceId: space.id, createdAt: { gte: windowStart } }, select: { createdAt: true } }),
    prisma.creatorEarning.findMany({ where: { creatorId: space.ownerId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.spaceVersion.findMany({ where: { spaceId: space.id }, orderBy: { publishedAt: "desc" }, take: 10 }),
    prisma.spaceEvent.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const totals = earningsList.reduce((acc, e) => ({ gross: acc.gross + e.grossCents, net: acc.net + e.netCents }), { gross: 0, net: 0 });
  const earnings30d = earningsList.filter((e) => e.createdAt >= windowStart);
  const views30d = viewEvents.length;
  const followerCount = await prisma.spaceFollow.count({ where: { spaceId: space.id } });
  const memberCount = await prisma.spaceMembership.count({ where: { spaceId: space.id, status: "active" } });

  const tiles = [
    { key: "views", label: "Views", icon: "views" as const, color: "#2563eb", total: views30d.toLocaleString(), series: dailySeries(viewEvents.map((e) => e.createdAt)), unit: "views" as const },
    { key: "follows", label: "Followers", icon: "follows" as const, color: "#d97706", total: followerCount.toLocaleString(), series: dailySeries(followRows30d.map((f) => f.createdAt)), unit: "new" as const },
    { key: "members", label: "Members", icon: "members" as const, color: "#7c3aed", total: memberCount.toLocaleString(), series: dailySeries(memberRows30d.map((m) => m.createdAt)), unit: "joined" as const },
    { key: "earnings", label: "Net earnings", icon: "earnings" as const, color: "#059669", total: money(totals.net), series: dailySeries(earnings30d.map((e) => e.createdAt), earnings30d.map((e) => e.netCents / 100)), unit: "money" as const },
  ];

  const payoutsStatus = account?.chargesEnabled ? "active" : account?.stripeAccountId ? "incomplete" : "none";
  const mrr = tiers.reduce((acc, t) => acc + t.priceCents * memberCount, 0); // rough, uses max members per tier approx

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-violet-400" />
        <div>
          <h1 className="text-xl font-bold text-fg flex items-center gap-2">
            <Store className="w-4 h-4 text-accent" /> {space.name} <span className="text-muted font-mono text-xs">/c/{space.handle}</span>
            {space.featured && <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-500 text-white rounded-full px-2 py-0.5">Featured</span>}
            {space.published ? <span className="text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5">Live</span> : <span className="text-[10px] font-bold uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5">Draft</span>}
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Owner: {owner?.name ?? "Unknown"} {owner?.email ? `· ${owner.email}` : ""} · {tiers.length} tiers · {contentCount} content · {views30d} views 30d
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href={`/c/${space.handle}`} target="_blank" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold">
            <ExternalLink className="w-3.5 h-3.5" /> View
          </a>
          <Link href={`/creator/${space.handle}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-bold">
            Manage
          </Link>
        </div>
      </div>

      <OverviewCharts tiles={tiles} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" /> Earnings & Payouts
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted">30d gross/net</span>
              <span className="font-bold">
                {money(totals.gross)} / {money(totals.net)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">MRR rough</span>
              <span className="font-bold">{money(mrr)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Payouts</span>
              <span className={`text-xs font-bold uppercase ${payoutsStatus === "active" ? "text-emerald-600" : payoutsStatus === "incomplete" ? "text-amber-600" : "text-muted"}`}>{payoutsStatus}</span>
            </div>
            <div className="pt-2 divide-y divide-border/60">
              {earningsList.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2">
                  <span className="text-muted">
                    {e.sourceKind} {e.sourceId?.slice(0, 6)} · {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-bold">{money(e.netCents)}</span>
                </div>
              ))}
              {earningsList.length === 0 && <p className="text-muted py-2">No earnings yet.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold">Space Versions (diff)</h2>
          <p className="text-xs text-muted mt-1">Latest 10 publishes — diff blocks JSON to see what changed.</p>
          <div className="mt-3 space-y-2 max-h-[280px] overflow-auto pr-1">
            {versions.length === 0 && <p className="text-xs text-muted">No versions yet — publish from Design.</p>}
            {versions.map((v) => (
              <div key={v.id} className="rounded-xl border border-border bg-panel/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{new Date(v.publishedAt).toLocaleString()}</span>
                  <span className="text-muted font-mono text-[10px]">{v.actorId?.slice(0, 8) ?? "unknown"}</span>
                </div>
                <pre className="mt-2 text-[10px] bg-bg border border-border rounded-lg p-2 overflow-auto max-h-32">{JSON.stringify(v.blocks, null, 2).slice(0, 800)}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Recent Events
        </h2>
        <div className="mt-3 divide-y divide-border/60">
          {recentEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-panel border border-border px-2 py-0.5 text-[10px] font-bold">{e.kind}</span>
              <span className="text-muted">
                {e.contentType ?? "-"} {e.contentId ? e.contentId.slice(0, 6) : ""} {e.userId ? `by ${e.userId.slice(0, 6)}` : ""}
              </span>
              <span className="ml-auto text-muted">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {recentEvents.length === 0 && <p className="text-xs text-muted">No events yet.</p>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted">Quick links:</span>
          <a href={`/c/${space.handle}`} target="_blank" className="text-xs text-accent hover:underline">
            Public
          </a>
          <Link href={`/creator/${space.handle}/users`} className="text-xs text-accent hover:underline">
            Audience
          </Link>
          <Link href={`/creator/${space.handle}/payment`} className="text-xs text-accent hover:underline">
            Tiers
          </Link>
        </div>
      </div>
    </div>
  );
}
