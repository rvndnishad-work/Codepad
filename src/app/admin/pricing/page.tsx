import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { getPricingSettingsVersioned, resolveStarterPrice, starterSeatChargeCents } from "@/lib/billing/pricing-copy-store";
import { resolvePrices } from "@/lib/billing/prices";
import { checkoutSeatChargeCents, formatUsd } from "@/lib/billing/plans";
import { videoAddonCents } from "@/lib/video/addon";
import { Empty, Pager, Pill, Section, Table, tdCls, thCls } from "../interviews/_components/list";
import { hrefWith, one, pageWindow, utcStamp, type SearchParams } from "../interviews/_components/params";
import PricingCopyForm from "./PricingCopyForm";
import { pricingDiff } from "./diff";

export const metadata = {
  title: "Pricing — Admin",
};

const HISTORY_PAGE = 10;

/**
 * Edits /pricing and the /hire teaser: the wording, and the prices Stripe
 * checkout charges (Growth and Starter seats, credit packs, video add-on).
 * Everything is stored in one SiteSetting row and read by
 * getEffectivePricing(), which the checkouts and every price label use, so
 * the page and Stripe always agree. Every save and reset writes a
 * PricingChange row, listed under History.
 */
export default async function AdminPricingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminAccess();
  const sp = await searchParams;
  const hpage = Number.parseInt(one(sp.hpage), 10) || 1;

  const [settings, historyCount, subs] = await Promise.all([
    getPricingSettingsVersioned(),
    prisma.pricingChange.count(),
    prisma.workspace.groupBy({ by: ["stripeStatus"], where: { stripeSubscriptionId: { not: null } }, _count: { _all: true } }),
  ]);
  const win = pageWindow(hpage, historyCount, HISTORY_PAGE);
  const history = historyCount
    ? await prisma.pricingChange.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: win.skip, take: win.take })
    : [];

  const prices = resolvePrices(settings.prices);
  const starter = resolveStarterPrice(settings.starter);
  const stripeKeySet = Boolean(process.env.STRIPE_SECRET_KEY);
  const charged: { item: string; amount: number; period: string; where: string }[] = [
    { item: "Growth seat, monthly", amount: checkoutSeatChargeCents("GROWTH", "monthly", prices.growth), period: "per seat, every month", where: "Seat checkout" },
    { item: "Growth seat, yearly", amount: checkoutSeatChargeCents("GROWTH", "annual", prices.growth), period: "per seat, every year", where: "Seat checkout" },
    { item: "Starter seat, monthly", amount: starterSeatChargeCents("monthly", starter), period: "per seat, every month", where: "Seat checkout (legacy)" },
    { item: "Starter seat, yearly", amount: starterSeatChargeCents("annual", starter), period: "per seat, every year", where: "Seat checkout (legacy)" },
    { item: "Video add-on, monthly", amount: videoAddonCents("month", prices.videoAddon), period: "per workspace, every month", where: "Seat checkout and Billing" },
    { item: "Video add-on, yearly", amount: videoAddonCents("year", prices.videoAddon), period: "per workspace, every year", where: "Seat checkout and Billing" },
    ...prices.packs.map((p) => ({ item: `${p.label} credit pack (${p.credits.toLocaleString("en-US")} credits)`, amount: p.priceCents, period: "once", where: "Credit checkout" })),
  ];
  const subTotal = subs.reduce((n, s) => n + s._count._all, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Pricing</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Edit what <Link href="/pricing" className="underline">/pricing</Link> and the pricing section of{" "}
            <Link href="/hire" className="underline">/hire</Link> say, and the prices Stripe checkout charges: the Growth and
            Starter seats, AI credit packs and the built-in video add-on. The public pages, the workspace billing page and
            checkout all read the same prices, so what people see is what they pay.
          </p>
          <p className="mt-2 text-xs text-muted">
            Empty fields use the defaults in <code>src/lib/billing/plans.ts</code>, <code>src/lib/ai-interview/credit-packs.ts</code>{" "}
            and <code>src/lib/video/addon.ts</code>. Every save needs a note and is kept in the history below.
          </p>
        </div>
        <Link
          href="/pricing"
          target="_blank"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg hover:bg-panel"
        >
          View /pricing <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <PricingCopyForm
        initialCopy={settings.copy}
        initialPrices={settings.prices}
        initialStarter={settings.starter}
        initialVersion={settings.version}
      />

      <Section
        title="Stripe check"
        description="What each checkout sends to Stripe right now, worked out by the same code the checkouts run."
      >
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <p>
            <span className="font-medium text-fg">There are no Stripe Price objects to compare against.</span> The seat, video add-on
            and credit pack checkouts build the price inline with <code className="font-mono text-xs">price_data</code> from these
            numbers, so a new checkout always charges what /pricing shows. Subscription items that already exist keep the amount they
            were created with until the workspace subscribes again.
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <Pill tone={stripeKeySet ? "ok" : "bad"}>{stripeKeySet ? "Stripe key set" : "Stripe key missing"}</Pill>
            <span>
              {subTotal.toLocaleString("en-US")} workspaces have a Stripe subscription
              {subs.length > 0 &&
                `: ${subs
                  .map((s) => `${s._count._all} ${s.stripeStatus ? s.stripeStatus.replace(/_/g, " ") : "not synced yet"}`)
                  .join(", ")}`}
              .
            </span>
          </p>
        </div>
        <Table
          minWidth={640}
          head={
            <>
              <th className={thCls}>Item</th>
              <th className={`${thCls} text-right`}>Stripe charges</th>
              <th className={thCls}>Billed</th>
              <th className={thCls}>Sent by</th>
            </>
          }
        >
          {charged.map((c) => (
            <tr key={c.item}>
              <td className={tdCls}>{c.item}</td>
              <td className={`${tdCls} text-right font-mono tabular-nums`}>{formatUsd(c.amount)}</td>
              <td className={`${tdCls} text-muted`}>{c.period}</td>
              <td className={`${tdCls} text-muted`}>{c.where}, price_data</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="History" description="Every save and reset, newest first. Times are UTC.">
        {history.length === 0 ? (
          <Empty title="No changes yet">Changes are recorded from now on.</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {history.map((h) => {
              const diff = pricingDiff(h.before, h.after);
              const reset = typeof h.after === "object" && h.after !== null && Object.keys(h.after).length === 0;
              return (
                <li key={h.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-medium text-fg">{reset ? "Reset to defaults" : "Saved"}</span>
                    {h.actorEmail ? (
                      <Link href={`/admin/users?q=${encodeURIComponent(h.actorEmail)}`} className="text-muted hover:underline">
                        {h.actorEmail}
                      </Link>
                    ) : (
                      <span className="text-muted">Unknown</span>
                    )}
                    <span className="text-xs text-subtle">{utcStamp(h.createdAt)}</span>
                  </div>
                  {h.note && <p className="text-muted">“{h.note}”</p>}
                  {diff.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {diff.slice(0, 12).map((d) => (
                        <li key={d.path} className="flex flex-wrap gap-x-2">
                          <span className="text-muted">{d.label}:</span>
                          <span className="text-subtle line-through">{d.from}</span>
                          <span aria-hidden className="text-subtle">→</span>
                          <span className="text-fg">{d.to}</span>
                        </li>
                      ))}
                      {diff.length > 12 && <li className="text-xs text-subtle">and {diff.length - 12} more</li>}
                    </ul>
                  ) : (
                    <p className="text-xs text-subtle">No field changed.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Pager win={win} noun="changes" href={(p) => hrefWith("/admin/pricing", {}, { hpage: p > 1 ? p : null })} />
      </Section>
    </div>
  );
}
