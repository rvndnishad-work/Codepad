"use client";

/**
 * Billing and plan page. Every number arrives from the server, computed from
 * effectivePlan and the plan config (src/lib/billing/plans.ts); nothing here
 * hard-codes a price or a seat count.
 */
import Link from "next/link";
import { useState } from "react";
import { Btn, useToasts } from "../candidates/_components/ui";
import { plural } from "@/lib/workspace/display";
import type { PlanSummary } from "@/lib/billing/summary";
import { TRIAL_DURATION_DAYS, TRIAL_SEAT_LIMIT } from "@/lib/billing/trial";
import type { SeatUsage } from "@/lib/workspace/members";

export type BillingTab = "plan" | "invoices";

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
  compare: {
    plans: { key: string; name: string; price: string; seats: string }[];
    rows: { feature: string; cells: string[] }[];
  };
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

  const tabLink = (id: BillingTab, text: string) => (
    <Link
      key={id}
      href={id === "plan" ? `/w/${slug}/billing` : `/w/${slug}/billing?tab=${id}`}
      aria-current={tab === id ? "page" : undefined}
      className={`relative flex items-center h-10 text-sm whitespace-nowrap transition-colors ${
        tab === id ? "text-fg font-medium" : "text-muted hover:text-fg"
      }`}
    >
      {text}
      {tab === id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary" />}
    </Link>
  );

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
      <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Billing and plan</h1>

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

      <nav aria-label="Billing sections" className="flex gap-6 border-b border-border">
        {tabLink("plan", "Plan and usage")}
        {tabLink("invoices", "Invoices")}
      </nav>

      {tab === "plan" ? (
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
            {summary.trialUsed !== null && (
              <div
                className="h-2 w-full sm:w-52 rounded-full bg-panel overflow-hidden"
                role="img"
                aria-label={`${Math.round(summary.trialUsed * 100)}% of the trial used`}
              >
                <div className="h-full bg-warning" style={{ width: `${Math.round(summary.trialUsed * 100)}%` }} />
              </div>
            )}
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
                {plural(props.month.interviews, "interview")}
              </span>
            </div>
          </div>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-medium text-muted">Compare plans</h2>
            <div className="rounded-xl border border-border bg-surface overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-panel text-left text-xs font-medium text-muted">
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Feature</span>
                    </th>
                    {props.compare.plans.map((p) => (
                      <th key={p.key} className={`px-4 py-2.5 font-medium w-[200px] ${p.key === summary.compareKey ? "text-fg" : ""}`}>
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
        <div className="h-2 rounded-full bg-panel overflow-hidden" role="img" aria-label={`${seats.used} of ${seats.limit} seats used`}>
          <div className={`h-full ${seats.full ? "bg-warning" : "bg-secondary"}`} style={{ width: `${pct}%` }} />
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
            An AI screening uses 1 to 3 credits when the candidate starts it.{" "}
            <Link href={`/w/${slug}/ai-interviews`} className="text-secondary-soft hover:underline">
              Buy credits
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
    <section className="rounded-xl border border-border bg-surface px-5 py-6 flex flex-wrap items-center gap-4">
      <p className="flex-1 min-w-[260px] text-sm text-muted">{body}</p>
      {stripeConfigured && subscribed && canManage && (
        <Btn variant="primary" size="md" disabled={loading} onClick={openStripe}>
          {loading ? "Opening" : "Open invoices"}
        </Btn>
      )}
    </section>
  );
}
