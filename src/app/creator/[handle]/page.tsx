import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Store,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Circle,
  Heart,
  Wallet,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import OnboardingCard from "../OnboardingCard";
import { userCan } from "@/lib/permissions/access";
import OverviewCharts from "./OverviewCharts";
import CopyLinkButton from "./CopyLinkButton";

type Props = {
  params: Promise<{ handle: string }>;
};

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

/** Bucket timestamps into a per-day series for the last 30 days. */
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

export default async function CreatorSpaceDashboardHome({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space) notFound();

  const isModerator = await userCan(userId, "content:moderate");
  if (space.ownerId !== userId && !isModerator) notFound();

  // Server component rendered per-request — reading the clock here is the
  // intended behavior (the 30-day analytics window is anchored to "now").
  // eslint-disable-next-line react-hooks/purity
  const windowStart = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const [
    account,
    contentCount,
    tiersCount,
    memberCount,
    followerCount,
    earningsList,
    viewEvents,
    recentFollowRows,
    recentEarnings,
  ] = await Promise.all([
    prisma.creatorAccount.findUnique({ where: { userId: space.ownerId } }),
    prisma.spaceContent.count({ where: { spaceId: space.id } }),
    prisma.spaceTier.count({ where: { spaceId: space.id } }),
    prisma.spaceMembership.count({ where: { spaceId: space.id, status: "active" } }),
    prisma.spaceFollow.count({ where: { spaceId: space.id } }),
    prisma.creatorEarning.findMany({ where: { creatorId: space.ownerId } }),
    prisma.spaceEvent.findMany({
      where: { spaceId: space.id, kind: { in: ["SPACE_VIEW", "CONTENT_VIEW"] }, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.spaceFollow.findMany({
      where: { spaceId: space.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.creatorEarning.findMany({
      where: { creatorId: space.ownerId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const [followRows30d, memberRows30d, followerUsers] = await Promise.all([
    prisma.spaceFollow.findMany({
      where: { spaceId: space.id, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.spaceMembership.findMany({
      where: { spaceId: space.id, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { id: { in: recentFollowRows.map((f) => f.userId) } },
      select: { id: true, name: true },
    }),
  ]);

  const totals = earningsList.reduce(
    (acc, e) => ({ gross: acc.gross + e.grossCents, net: acc.net + e.netCents }),
    { gross: 0, net: 0 },
  );
  const earnings30d = earningsList.filter((e) => e.createdAt >= windowStart);
  const views30d = viewEvents.length;

  const chargesEnabled = !!account?.chargesEnabled;
  const hasAccount = !!account?.stripeAccountId;

  const tiles = [
    {
      key: "views",
      label: "Views",
      icon: "views" as const,
      color: "#2563eb",
      total: views30d.toLocaleString(),
      series: dailySeries(viewEvents.map((e) => e.createdAt)),
      unit: "views" as const,
    },
    {
      key: "follows",
      label: "Followers",
      icon: "follows" as const,
      color: "#d97706",
      total: followerCount.toLocaleString(),
      series: dailySeries(followRows30d.map((f) => f.createdAt)),
      unit: "new" as const,
    },
    {
      key: "members",
      label: "Members",
      icon: "members" as const,
      color: "#7c3aed",
      total: memberCount.toLocaleString(),
      series: dailySeries(memberRows30d.map((m) => m.createdAt)),
      unit: "joined" as const,
    },
    {
      key: "earnings",
      label: "Net earnings",
      icon: "earnings" as const,
      color: "#059669",
      total: money(totals.net),
      series: dailySeries(
        earnings30d.map((e) => e.createdAt),
        earnings30d.map((e) => e.netCents / 100),
      ),
      unit: "money" as const,
    },
  ];

  const checklist: { label: string; done: boolean; href: string; hint: string }[] = [
    {
      label: "Connect Stripe payouts",
      done: chargesEnabled,
      href: `/creator/${handle}/payment`,
      hint: "Required to sell memberships and one-time content.",
    },
    {
      label: "Create a membership tier",
      done: tiersCount > 0,
      href: `/creator/${handle}/payment`,
      hint: "Name it, price it, list what members get.",
    },
    {
      label: "Add your first content",
      done: contentCount > 0,
      href: `/creator/${handle}/content`,
      hint: "Tutorials, Q&A guides, experiences, playgrounds.",
    },
    {
      label: "Publish your space",
      done: space.published,
      href: `/creator/${handle}/settings`,
      hint: "Until published, /c/" + handle + " is a 404.",
    },
    {
      label: "Share your page with your audience",
      done: followerCount > 0,
      href: `/c/${handle}`,
      hint: "Post it on YouTube, LinkedIn, X — followers get notified when you publish.",
    },
  ];
  const remaining = checklist.filter((c) => !c.done).length;

  const nameById = new Map(followerUsers.map((u) => [u.id, u.name]));
  type Activity = { key: string; icon: LucideIcon; tone: string; text: string; at: Date };
  const activity: Activity[] = [
    ...recentFollowRows.map((f) => ({
      key: `f${f.userId}${f.createdAt.getTime()}`,
      icon: Heart,
      tone: "text-rose-500 bg-rose-500/10",
      text: `${nameById.get(f.userId) || "Someone"} followed your space`,
      at: f.createdAt,
    })),
    ...recentEarnings.map((e) => ({
      key: `e${e.id}`,
      icon: Wallet,
      tone: "text-emerald-500 bg-emerald-500/10",
      text: `Earned ${money(e.netCents)} net (${e.sourceKind === "TIER" ? "membership" : "content sale"})`,
      at: e.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-tile">
        <div
          className="absolute top-[-30%] right-[-10%] w-[45%] h-[80%] bg-accent opacity-[0.07] blur-[110px] pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-glow px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              <Store className="w-3.5 h-3.5" /> Overview
            </div>
            <h1 className="mt-3.5 text-3xl md:text-4xl font-black tracking-tight text-fg">{space.name}</h1>
            <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
              <code className="text-xs font-mono text-muted bg-panel/60 border border-border rounded-md px-2 py-0.5">
                /c/{space.handle}
              </code>
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border ${
                  space.published
                    ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                    : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${space.published ? "bg-emerald-500" : "bg-amber-500"}`} />
                {space.published ? "Live" : "Draft"}
              </span>
              {isModerator && space.ownerId !== userId && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border text-violet-500 border-violet-500/30 bg-violet-500/10">
                  Moderator View
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <CopyLinkButton path={`/c/${space.handle}`} label="Copy page link" />
            {space.published && (
              <Link
                href={`/c/${space.handle}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" /> View public page
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stripe onboarding alert if not connected */}
      {!chargesEnabled && <OnboardingCard hasAccount={hasAccount} />}

      {/* 30-day stat tiles with sparklines */}
      <OverviewCharts tiles={tiles} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Launch checklist */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-tile">
          <h2 className="text-sm font-bold text-fg flex items-center gap-2">
            <Rocket className="w-4 h-4 text-accent" /> Launch checklist
            {remaining === 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 rounded-full px-2 py-0.5 ml-1">
                Complete
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted ml-1">{checklist.length - remaining}/{checklist.length}</span>
            )}
          </h2>
          <ul className="mt-4 space-y-1">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-panel/40 transition-colors"
                >
                  {c.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted/50 shrink-0 mt-0.5" />
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-bold transition-colors ${
                        c.done ? "text-muted line-through decoration-muted/40" : "text-fg group-hover:text-accent"
                      }`}
                    >
                      {c.label}
                    </span>
                    {!c.done && <span className="block text-[10px] text-muted mt-0.5 leading-relaxed">{c.hint}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-tile">
          <h2 className="text-sm font-bold text-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-xs text-muted mt-4 leading-relaxed">
              Nothing yet — publish content and share your page to get the first followers rolling in.
            </p>
          ) : (
            <ul className="mt-4 space-y-1">
              {activity.map((a) => (
                <li key={a.key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${a.tone}`}>
                    <a.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs text-fg flex-1 min-w-0 truncate">{a.text}</span>
                  <span className="text-[10px] text-muted shrink-0">{a.at.toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
