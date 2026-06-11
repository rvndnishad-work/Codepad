import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";

export const metadata = {
  title: "Creator Earnings — Interviewpad",
  robots: { index: false, follow: false },
};

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );

export default async function CreatorEarningsPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator/earnings");
  // Belt-and-suspenders with the proxy guard on /creator.
  if (!(await userCan(userId, "content:author"))) redirect("/dashboard");

  const earnings = await prisma.creatorEarning.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totals = earnings.reduce(
    (acc, e) => ({
      gross: acc.gross + e.grossCents,
      fee: acc.fee + e.feeCents,
      net: acc.net + e.netCents,
    }),
    { gross: 0, fee: 0, net: 0 },
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/creator"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Creator Studio
      </Link>

      <div className="flex items-center gap-2.5">
        <Wallet className="w-5 h-5 text-accent" />
        <h1 className="text-xl font-bold text-fg">Earnings</h1>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Gross", value: totals.gross, tone: "text-fg" },
          { label: "Platform fee", value: totals.fee, tone: "text-muted" },
          { label: "Net (yours)", value: totals.net, tone: "text-emerald-500" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{t.label}</div>
            <div className={`text-lg font-bold mt-1 ${t.tone}`}>{money(t.value)}</div>
          </div>
        ))}
      </div>

      {/* Ledger */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border">
          <span>Date</span>
          <span className="text-right">Gross</span>
          <span className="text-right">Fee</span>
          <span className="text-right">Net</span>
        </div>
        {earnings.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted text-center">No sales yet.</div>
        )}
        {earnings.map((e) => (
          <div
            key={e.id}
            className="grid grid-cols-4 gap-2 px-4 py-2.5 text-xs border-b border-border/50 last:border-0"
          >
            <span className="text-muted">{e.createdAt.toLocaleDateString()}</span>
            <span className="text-right text-fg">{money(e.grossCents, e.currency)}</span>
            <span className="text-right text-muted">{money(e.feeCents, e.currency)}</span>
            <span className="text-right font-semibold text-emerald-500">{money(e.netCents, e.currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
