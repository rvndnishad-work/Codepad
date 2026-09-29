"use client";

/**
 * Billing and usage page. Every number arrives from the server, computed from
 * effectivePlan and the plan config (src/lib/billing/plans.ts); nothing here
 * hard-codes a price or a seat count.
 */
import Link from "next/link";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { Btn, useToasts } from "../candidates/_components/ui";
import { plural } from "@/lib/workspace/display";
import type { PlanSummary } from "@/lib/billing/summary";
import { TRIAL_DURATION_DAYS, TRIAL_SEAT_LIMIT } from "@/lib/billing/trial";
import type { SeatUsage } from "@/lib/workspace/members";
import UsageTab, { type UsageData } from "./UsageTab";
import VideoAddonCard, { type VideoAddonData } from "./VideoAddonCard";
import UnderlineTabs from "../_components/UnderlineTabs";
import { INCLUDED_CREDITS_PER_SEAT } from "@/lib/billing/included-credits";

export type BillingTab = "plan" | "usage" | "invoices";

type Props = {
  slug: string;
  tab: BillingTab;
  notice: "success" | "cancel" | null;
  planName: string;
  summary: PlanSummary;
  seats: SeatUsage;
  credits: number;
  aiScreening: boolean;
  month: { takeHomes: number; aiScreenings: number; interviews: number; label: string };
  canManage: boolean;
  subscribed: boolean;
  stripeConfigured: boolean;
  video: VideoAddonData;
  compare: {
    plans: { key: string; name: string; price: string; seats: string }[];
    rows: { feature: string; cells: string[] }[];
  };
  /** Loaded only on the Usage and credits tab. */
  usage: UsageData | null;
};

export default function BillingClient(props: Props) {
  const { slug, tab, notice, summary, canManage, subscribed, stripeConfigured, planName } = props;
  const [toastNode, toast] = useToasts();
  const [loading, setLoading] = useState(false);

  // One endpoint: the Stripe customer portal when subscribed (plan changes,
  // invoices, card), otherwise a Growth checkout.
  async function openStripe() {
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${slug}/billing/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "GROWTH", cadence: "monthly" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.error ?? "Could not open billing. Try again in a moment.");
      window.location.href = data.url;
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error");
      setLoading(false);
    }
  }


  let action: React.ReactNode = null;
  if (planName === "ENTERPRISE" && !subscribed) {
    action = <Btn href="/pricing">Talk to us</Btn>;
  } else if (canManage && stripeConfigured) {
    action = (
      <Btn variant={subscribed ? "ghost" : "primary"} size="md" disabled={loading} onClick={openStripe}>
        {loading ? "Opening" : subscribed ? "Manage billing" : "Choose Growth"}
      </Btn>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Billing and usage</h1>
        <p className="text-sm text-muted max-w-2xl">Your plan, seats and AI credits, what the workspace sent each month, and invoices.</p>
      </header>

      {notice === "success" && (
        <div role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-fg">
          Thanks. Your plan changes as soon as Stripe confirms the payment, usually within a minute.
        </div>
      )}
      {notice === "cancel" && (
        <div role="status" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Checkout was cancelled. Nothing was charged.
        </div>
      )}

      <UnderlineTabs
        label="Billing sections"
        active={tab}
        scroll={false}
        tabs={[
          { id: "plan", label: "Plan", href: `/w/${slug}/billing` },
          { id: "usage", label: "Usage and credits", href: `/w/${slug}/billing?tab=usage` },
          { id: "invoices", label: "Invoices", href: `/w/${slug}/billing?tab=invoices` },
        ]}
      />

      {tab === "usage" && props.usage ? (
        <UsageTab slug={slug} data={props.usage} canManage={canManage} stripeConfigured={stripeConfigured} notify={toast} />
      ) : tab === "plan" ? (
        <>
          <section className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-wrap items-center gap-5">
            <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold text-fg">{summary.heading}</h2>
                {summary.trialDaysLeft !== null && (
                  <span className="inline-flex items-center h-6 px-2 rounded-full bg-warning/10 text-warning text-xs font-medium">
                    {plural(summary.trialDaysLeft, "day")} left
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">{summary.body}</p>
            </div>
            {summary.trialUsed !== null && <TrialMeter used={summary.trialUsed} />}
            {action}
          </section>
          {!stripeConfigured && canManage && planName !== "ENTERPRISE" && (
            <p className="text-[13px] text-muted -mt-2">Online payments are not set up on this server yet, so plans cannot be changed here.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SeatsCard {...props} />
            <CreditsCard {...props} />
            <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-2.5">
              <span className="text-[13px] font-medium text-muted">Sent in {props.month.label}</span>
              <span className="text-[28px] font-semibold tracking-tight tabular-nums text-fg">
                {props.month.takeHomes + props.month.aiScreenings + props.month.interviews}
              </span>
              <span className="text-[13px] text-muted">
                {plural(props.month.takeHomes, "take home")}, {plural(props.month.aiScreenings, "AI screening")},{" "}
                {plural(props.month.interviews, "interview")}.{" "}
                <Link href={`/w/${slug}/billing?tab=usage`} className="text-secondary-soft hover:underline">
                  Usage
                </Link>
              </span>
            </div>
          </div>

          <section className="flex flex-col gap-3" aria-labelledby="addons-title">
            <div className="flex flex-col gap-1">
              <h2 id="addons-title" className="text-base font-semibold text-fg">
                Add-ons
              </h2>
              <p className="text-sm text-muted">Pay only for what the team turns on.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VideoAddonCard
                slug={slug}
                data={props.video}
                canManage={canManage}
                chooseGrowth={canManage && stripeConfigured && !subscribed && planName !== "ENTERPRISE" ? openStripe : null}
                notify={toast}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-base font-semibold text-fg">Compare plans</h2>
            <div className="rounded-xl border border-border bg-surface overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-panel text-left text-[12.5px] font-semibold text-muted">
                    <th className="px-4 py-2.5 font-semibold">
                      <span className="sr-only">Feature</span>
                    </th>
                    {props.compare.plans.map((p) => (
                      <th key={p.key} className={`px-4 py-2.5 font-semibold w-[200px] ${p.key === summary.compareKey ? "text-fg" : ""}`}>
                        {p.name}
                        {p.key === summary.compareKey && <span className="ml-1.5 text-secondary-soft">(yours)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow feature="Price" cells={props.compare.plans.map((p) => p.price)} current={summary.compareKey} keys={props.compare.plans.map((p) => p.key)} />
                  <CompareRow feature="Seats" cells={props.compare.plans.map((p) => p.seats)} current={summary.compareKey} keys={props.compare.plans.map((p) => p.key)} />
                  {props.compare.rows.map((r) => (
                    <CompareRow key={r.feature} feature={r.feature} cells={r.cells} current={summary.compareKey} keys={props.compare.plans.map((p) => p.key)} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-muted">
              A trial works like Growth for {TRIAL_DURATION_DAYS} days, with up to {TRIAL_SEAT_LIMIT} seats. Take homes, interviews and
              candidates are not limited by plan.
            </p>
          </section>
        </>
      ) : (
        <InvoicesTab {...props} loading={loading} openStripe={openStripe} />
      )}
      {toastNode}
    </div>
  );
}

/** How much of the trial is left, as a filling bar next to the trial heading. */
function TrialMeter({ used }: { used: number }) {
  const left = Math.round((1 - used) * 100);
  return (
    <div className="w-full sm:w-56 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Trial time left</span>
        <span className="tabular-nums">{left}%</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden" role="img" aria-label={`${left}% of the trial left`}>
        <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(left, 3)}%` }} />
      </div>
    </div>
  );
}

function CompareRow({ feature, cells, current, keys }: { feature: string; cells: string[]; current: string | null; keys: string[] }) {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2.5 text-fg">{feature}</td>
      {cells.map((c, i) => (
        <td key={keys[i]} className={`px-4 py-2.5 tabular-nums ${keys[i] === current ? "text-fg bg-secondary/[0.06]" : "text-muted"}`}>
          {c}
        </td>
      ))}
    </tr>
  );
}

function SeatsCard({ slug, seats, summary }: Props) {
  const pct = seats.limit ? Math.min(100, Math.round((seats.used / seats.limit) * 100)) : null;
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-2.5">
      <span className="text-[13px] font-medium text-muted">Seats</span>
      <span className="text-[28px] font-semibold tracking-tight tabular-nums text-fg">
        {seats.limit !== null ? `${seats.used} of ${seats.limit}` : plural(seats.used, "seat")}
      </span>
      {pct !== null && (
        <div className="h-2 rounded-full bg-border overflow-hidden" role="img" aria-label={`${seats.used} of ${seats.limit} seats used`}>
          <div className={`h-full rounded-full ${seats.full ? "bg-warning" : "bg-secondary"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className="text-[13px] text-muted">
        {summary.seatHint}
        {seats.pendingInvites > 0 && ` Includes ${plural(seats.pendingInvites, "pending invite")}.`}{" "}
        <Link href={`/w/${slug}/members`} className="text-secondary-soft hover:underline">
          Members
        </Link>
      </span>
    </div>
  );
}

function CreditsCard({ slug, credits, aiScreening }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-2.5">
      <span className="text-[13px] font-medium text-muted">AI credits</span>
      <span className="text-[28px] font-semibold tracking-tight tabular-nums text-fg">{credits.toLocaleString("en-GB")} left</span>
      <span className="text-[13px] text-muted">
        {aiScreening ? (
          <>
            Growth adds {INCLUDED_CREDITS_PER_SEAT} credits per seat each month. A screening uses 1 to 3 when the candidate starts it.{" "}
            <Link href={`/w/${slug}/billing?tab=usage`} className="text-secondary-soft hover:underline">
              Usage and credits
            </Link>
          </>
        ) : (
          "AI screening needs Growth or a trial."
        )}
      </span>
    </div>
  );
}

function InvoicesTab({
  subscribed,
  stripeConfigured,
  canManage,
  loading,
  openStripe,
}: Props & { loading: boolean; openStripe: () => void }) {
  let body: React.ReactNode;
  if (!stripeConfigured) {
    body = "Online payments are not set up on this server yet, so there are no invoices to show.";
  } else if (!subscribed) {
    body = "No invoices yet. They appear here once the workspace is on a paid plan.";
  } else if (!canManage) {
    body = "Invoices are kept in Stripe. Ask an owner or admin with billing access to download them.";
  } else {
    body = "Invoices, receipts and your payment card are kept in Stripe. Open the billing portal to download them.";
  }
  return (
    <section className="rounded-xl border border-border bg-surface px-5 py-5 flex flex-wrap items-center gap-4" aria-labelledby="invoices-title">
      <span aria-hidden className="w-10 h-10 shrink-0 rounded-full bg-panel flex items-center justify-center">
        <Receipt className="w-[18px] h-[18px] text-muted" />
      </span>
      <div className="flex-1 min-w-[240px] flex flex-col gap-0.5">
        <h2 id="invoices-title" className="text-base font-semibold text-fg">
          Invoices
        </h2>
        <p className="text-sm text-muted">{body}</p>
      </div>
      {stripeConfigured && subscribed && canManage && (
        <Btn variant="primary" size="md" disabled={loading} onClick={openStripe}>
          {loading ? "Opening" : "Open invoices"}
        </Btn>
      )}
    </section>
  );
}
