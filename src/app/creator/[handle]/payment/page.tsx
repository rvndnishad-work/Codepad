import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Wallet, TrendingUp, Receipt } from "lucide-react";
import OnboardingCard from "../../OnboardingCard";
import TiersManager from "./TiersManager";

type Props = {
  params: Promise<{ handle: string }>;
};

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );

export default async function CreatorSpacePaymentPage({ params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");

  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
  });

  if (!space || space.ownerId !== userId) notFound();

  const [account, earnings, tierRows] = await Promise.all([
    prisma.creatorAccount.findUnique({ where: { userId } }),
    prisma.creatorEarning.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.spaceTier.findMany({ where: { spaceId: space.id }, orderBy: { rank: "asc" } }),
  ]);

  const totals = earnings.reduce(
    (acc, e) => ({
      gross: acc.gross + e.grossCents,
      fee: acc.fee + e.feeCents,
      net: acc.net + e.netCents,
    }),
    { gross: 0, fee: 0, net: 0 }
  );

  const stats = [
    {
      label: "Gross Earnings",
      value: totals.gross,
      tone: "text-fg",
      icon: TrendingUp,
      card: "border-border bg-surface",
      iconTone: "text-accent bg-accent-glow border-accent/20",
    },
    {
      label: "Platform Fee",
      value: totals.fee,
      tone: "text-muted",
      icon: Receipt,
      card: "border-border bg-surface",
      iconTone: "text-muted bg-panel border-border",
    },
    {
      label: "Net Earnings (Yours)",
      value: totals.net,
      tone: "text-emerald-500",
      icon: Wallet,
      card: "border-emerald-500/25 bg-emerald-500/5",
      iconTone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
    },
  ];

  const hasAccount = !!account?.stripeAccountId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Payment & Payouts</h1>
          <p className="text-xs text-muted mt-0.5">Manage payouts, connect your bank account, and view payment ledger.</p>
        </div>
      </div>

      {/* Stripe payouts setup banner */}
      <OnboardingCard hasAccount={hasAccount} />

      {/* Membership tiers */}
      <TiersManager
        spaceId={space.id}
        tiers={tierRows.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          benefits: t.benefits,
          rank: t.rank,
          priceCents: t.priceCents,
          currency: t.currency,
          published: t.published,
          hasStripePrice: !!t.stripePriceId,
        }))}
      />

      {/* Totals overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((t) => (
          <div key={t.label} className={`rounded-2xl border p-4 shadow-tile ${t.card}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{t.label}</div>
              <div className={`w-7 h-7 rounded-lg border grid place-items-center ${t.iconTone}`}>
                <t.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-xl font-black tracking-tight mt-2.5 ${t.tone}`}>{money(t.value)}</div>
          </div>
        ))}
      </div>

      {/* Earnings transaction history list */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-tile">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-panel/30">
          <h2 className="text-sm font-bold text-fg">Payment Ledger</h2>
        </div>

        <div className="grid grid-cols-4 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border bg-panel/10">
          <span>Date</span>
          <span className="text-right">Gross</span>
          <span className="text-right">Fee</span>
          <span className="text-right">Net</span>
        </div>

        {earnings.length === 0 ? (
          <div className="px-5 py-12 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-panel border border-border grid place-items-center mx-auto text-muted mb-3.5">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-fg">No sales yet</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Once users subscribe to memberships or purchase individual content, your payouts will show up here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {earnings.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-4 gap-2 px-5 py-3 text-xs hover:bg-panel/10 transition-colors"
              >
                <span className="text-muted">{e.createdAt.toLocaleDateString()}</span>
                <span className="text-right text-fg">{money(e.grossCents, e.currency)}</span>
                <span className="text-right text-muted">{money(e.feeCents, e.currency)}</span>
                <span className="text-right font-semibold text-emerald-500">{money(e.netCents, e.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
