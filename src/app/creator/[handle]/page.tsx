import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Layers,
  LayoutGrid,
  CreditCard,
  ExternalLink,
  Wallet,
  Users,
  Sparkles,
} from "lucide-react";
import OnboardingCard from "../OnboardingCard";
import { userCan } from "@/lib/permissions/access";

type Props = {
  params: Promise<{ handle: string }>;
};

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );

export default async function CreatorSpaceDashboardHome({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({ where: { handle } });
  if (!space) notFound();

  const isModerator = await userCan(userId, "content:moderate");
  if (space.ownerId !== userId && !isModerator) notFound();

  // Fetch count stats and account details using space owner's ID
  const [account, contentCount, tiersCount, subscriberCount, earningsList] = await Promise.all([
    prisma.creatorAccount.findUnique({ where: { userId: space.ownerId } }),
    prisma.spaceContent.count({ where: { spaceId: space.id } }),
    prisma.spaceTier.count({ where: { spaceId: space.id } }),
    prisma.spaceMembership.count({ where: { spaceId: space.id, status: "active" } }),
    prisma.creatorEarning.findMany({ where: { creatorId: space.ownerId } }),
  ]);

  const totals = earningsList.reduce(
    (acc, e) => ({
      gross: acc.gross + e.grossCents,
      net: acc.net + e.netCents,
    }),
    { gross: 0, net: 0 }
  );

  const chargesEnabled = !!account?.chargesEnabled;
  const hasAccount = !!account?.stripeAccountId;

  return (
    <div className="space-y-7">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-tile">
        <div
          className="absolute top-[-30%] right-[-10%] w-[45%] h-[80%] bg-accent opacity-[0.07] blur-[110px] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-[-40%] left-[-10%] w-[35%] h-[70%] bg-accent-soft opacity-[0.05] blur-[100px] pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-glow px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              <Store className="w-3.5 h-3.5" /> Dashboard Home
            </div>
            <h1 className="mt-3.5 text-3xl md:text-4xl font-black tracking-tight text-fg">
              {space.name}
            </h1>
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

      {/* Stats Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Earnings Net Stat */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-5 py-4 shadow-tile">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-500 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-fg leading-none">{money(totals.net)}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1.5">Net Earnings</div>
          </div>
        </div>

        {/* Subscriber Count Stat */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-5 py-4 shadow-tile">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center text-blue-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-fg leading-none">{subscriberCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1.5">Active Subscribers</div>
          </div>
        </div>

        {/* Content Count Stat */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-5 py-4 shadow-tile">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-500 shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-fg leading-none">{contentCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1.5">Gated Content</div>
          </div>
        </div>

        {/* Tiers Count Stat */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-5 py-4 shadow-tile">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 grid place-items-center text-violet-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-fg leading-none">{tiersCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1.5">Membership Tiers</div>
          </div>
        </div>
      </div>

      {/* Quick Start Panel */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-tile relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-base font-bold text-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Get Started with {space.name}
          </h2>
          <p className="text-xs text-muted mt-1 max-w-xl leading-relaxed">
            Use the sidebar to design your public page, add and gate content, set membership tiers and payouts, and edit your space details.
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href={`/creator/${handle}/layout`}
              className="p-3.5 rounded-xl border border-border bg-bg/50 hover:bg-panel/40 transition-colors group block text-left"
            >
              <div className="text-xs font-bold text-fg group-hover:text-accent transition-colors">1. Customize your page</div>
              <p className="text-[11px] text-muted mt-1">Upload a banner, set your avatar, order sections.</p>
            </Link>
            <Link
              href={`/creator/${handle}/content`}
              className="p-3.5 rounded-xl border border-border bg-bg/50 hover:bg-panel/40 transition-colors group block text-left"
            >
              <div className="text-xs font-bold text-fg group-hover:text-accent transition-colors">2. Add content</div>
              <p className="text-[11px] text-muted mt-1">Attach tutorials, Q&amp;A, experiences, and set access.</p>
            </Link>
            <Link
              href={`/creator/${handle}/payment`}
              className="p-3.5 rounded-xl border border-border bg-bg/50 hover:bg-panel/40 transition-colors group block text-left"
            >
              <div className="text-xs font-bold text-fg group-hover:text-accent transition-colors">3. Tiers &amp; payouts</div>
              <p className="text-[11px] text-muted mt-1">Create membership tiers and connect Stripe.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
