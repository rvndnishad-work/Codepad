"use client";

/**
 * Choosing one of the new plans (Basic, Growth, Teams) from Billing. The plan
 * belongs to the billing account, so it covers every workspace on it. Paid
 * once through Razorpay for a month or a year; nothing renews by itself.
 *
 * Prices and limits come from the server (the catalogue with admin
 * overrides). What each card says about upgrading or waiting uses the same
 * planChange rule the server charges by.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "../candidates/_components/ui";
import { amountDueCents, planChange } from "@/lib/billing/account-plan";
import { formatCents, type CatalogCadence, type SelfServePlanKey } from "@/lib/billing/catalog";
import { formatInr, usdCentsToInrPaise } from "@/lib/billing/fx-math";
import { runRazorpayCheckout } from "@/lib/billing/razorpay-client";

export type PlanPickerPlan = {
  key: SelfServePlanKey;
  name: string;
  monthlyCents: number;
  annualCents: number;
  creditsPerMonth: number;
  workspaceLimit: number;
  seatsPerWorkspace: number;
  growthTools: boolean;
};

export type PlanCheckoutData = {
  plans: PlanPickerPlan[];
  account: { planKey: string | null; planCadence: string | null; paidThrough: string | null };
  /** What the current period cost, for the upgrade credit. Null with no plan. */
  currentPeriodCents: number | null;
  /** Workspaces on the account, and the most people (members and invites) in any one of them. */
  workspaces: number;
  mostSeats: number;
  inrRate: number | null;
  initialCadence: CatalogCadence;
  /** Opened from the pricing page with a plan picked. */
  initialPlan: SelfServePlanKey | null;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function PlanPicker({ slug, data, notify }: { slug: string; data: PlanCheckoutData; notify: (text: string, tone?: "ok" | "error") => void }) {
  const router = useRouter();
  const [cadence, setCadence] = useState<CatalogCadence>(data.initialCadence);
  const [busy, setBusy] = useState<SelfServePlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  async function buy(key: SelfServePlanKey) {
    setError(null);
    setBusy(key);
    const base = `/api/w/${encodeURIComponent(slug)}/billing/razorpay/plan`;
    const res = await runRazorpayCheckout({
      createUrl: `${base}/order`,
      createBody: { plan: key, cadence },
      verifyUrl: `${base}/verify`,
      onOpen: () => setBusy(null),
      onAttemptFailed: (m) => notify(m, "error"),
    });
    setBusy(null);
    if (res.status === "paid") {
      const name = data.plans.find((p) => p.key === key)?.name ?? "Your plan";
      const through = typeof res.data.paidThrough === "string" ? fmtDate(res.data.paidThrough) : null;
      notify(through ? `Payment received. ${name} is on until ${through}.` : `Payment received. ${name} is on.`);
      router.replace(`/w/${encodeURIComponent(slug)}/billing`);
      router.refresh();
    } else if (res.status === "error") {
      setError(res.message);
    }
  }

  return (
    <section id="choose-plan" aria-labelledby="choose-plan-title" className="rounded-xl border border-secondary/40 bg-surface px-5 py-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="choose-plan-title" className="text-base font-semibold text-fg">
            Choose a plan
          </h2>
          <p className="text-sm text-muted max-w-2xl">
            Pay once for a month or a year. Nothing renews by itself: billing admins get a reminder a week before it ends. AI credits arrive each month,
            also on yearly plans, and roll over for one month.
          </p>
        </div>
        <fieldset>
          <legend className="sr-only">Billing period</legend>
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-panel">
            {(["monthly", "annual"] as const).map((c) => (
              <label
                key={c}
                className={`cursor-pointer px-3 h-8 inline-flex items-center rounded-md text-[13px] font-medium ${cadence === c ? "bg-surface text-fg shadow-sm" : "text-muted"}`}
              >
                <input type="radio" name="plan-cadence" value={c} checked={cadence === c} onChange={() => setCadence(c)} className="sr-only" />
                {c === "monthly" ? "Monthly" : "Yearly, 2 months free"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.plans.map((p) => {
          const list = cadence === "annual" ? p.annualCents : p.monthlyCents;
          const change = planChange(data.account, p.key, cadence, data.currentPeriodCents, now);
          const due = amountDueCents(list, change);
          const tooManyWorkspaces = data.workspaces > p.workspaceLimit;
          const tooManySeats = data.mostSeats > p.seatsPerWorkspace;
          const why =
            change.kind === "blocked"
              ? change.reason
              : tooManyWorkspaces
                ? `Covers ${p.workspaceLimit} ${p.workspaceLimit === 1 ? "workspace" : "workspaces"}; you have ${data.workspaces}.`
                : tooManySeats
                  ? `Allows ${p.seatsPerWorkspace} people in a workspace; one of yours has ${data.mostSeats}.`
                  : null;
          const current = data.account.planKey === p.key && change.kind === "renew";
          const label = change.kind === "renew" ? "Pay and renew" : change.kind === "upgrade" ? `Move up to ${p.name}` : `Start ${p.name}`;
          return (
            <div
              key={p.key}
              className={`rounded-xl border px-4 py-4 flex flex-col gap-3 ${data.initialPlan === p.key || current ? "border-secondary/60" : "border-border"} bg-bg`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-fg">{p.name}</h3>
                {current && <span className="text-xs font-medium text-secondary-soft">Your plan</span>}
              </div>
              <div>
                <span className="text-2xl font-semibold tabular-nums text-fg">{formatCents(list)}</span>
                <span className="text-sm text-muted"> a {cadence === "annual" ? "year" : "month"}</span>
              </div>
              <ul className="text-[13px] text-muted flex flex-col gap-1">
                <li>{p.creditsPerMonth.toLocaleString("en-US")} AI credits a month</li>
                <li>
                  {p.workspaceLimit} {p.workspaceLimit === 1 ? "workspace" : "workspaces"}, {p.seatsPerWorkspace} people in each
                </li>
                <li>{p.growthTools ? "ATS sync, API keys, MCP, Slack and Teams" : "AI screening, take homes and live interviews"}</li>
              </ul>
              {change.kind === "upgrade" && change.creditCents > 0 && !why && (
                <p className="text-[13px] text-muted">
                  {formatCents(change.creditCents)} off for the unused part of your current plan. You pay {formatCents(due)} today
                  {data.inrRate ? `, about ${formatInr(usdCentsToInrPaise(due, data.inrRate))}` : ""}.
                </p>
              )}
              {(change.kind !== "upgrade" || !change.creditCents) && !why && data.inrRate && (
                <p className="text-[13px] text-muted">Charged as about {formatInr(usdCentsToInrPaise(due, data.inrRate))}.</p>
              )}
              {why && <p className="text-[13px] text-muted">{why}</p>}
              <div className="mt-auto">
                <Btn variant={current || data.initialPlan === p.key ? "primary" : "ghost"} size="md" disabled={Boolean(why) || busy !== null} onClick={() => buy(p.key)}>
                  {busy === p.key ? "Opening" : label}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[13px] text-muted">
        Need more than {data.plans[data.plans.length - 1]?.workspaceLimit ?? 10} workspaces, single sign-on or a contract?{" "}
        <a href="/demo" className="text-secondary-soft hover:underline">
          Talk to us about Enterprise
        </a>
        . UPI, cards, netbanking and wallets are accepted.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
