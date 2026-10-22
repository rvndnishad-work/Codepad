"use client";

/**
 * Choosing Growth from the Billing page. With Razorpay the workspace pays once
 * for a number of seats for a month or a year (prepaid); with Stripe only the
 * billing period is chosen here and Stripe's checkout counts the seats.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "../candidates/_components/ui";
import { formatUsd } from "@/lib/billing/plans";
import { formatInr, usdCentsToInrPaise } from "@/lib/billing/fx-math";
import { PREPAID_MAX_SEATS, type PrepaidCadence } from "@/lib/billing/prepaid";
import { runRazorpayCheckout } from "@/lib/billing/razorpay-client";

export type GrowthCheckoutData = {
  provider: "razorpay" | "stripe";
  /** Effective Growth seat price: per month, and per month when paid yearly. */
  price: { monthlyCents: number; annualMonthlyCents: number };
  /** Today's USD to INR rate, for the rupee estimate (Razorpay only). */
  inrRate: number | null;
  /** Members plus pending invites: the fewest seats a purchase may cover. */
  minSeats: number;
  initialCadence: PrepaidCadence;
  /** The current prepaid period, when there is one (Razorpay only). */
  prepaid: { through: string; seats: number; active: boolean } | null;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
};

export default function GrowthCheckout({
  slug,
  data,
  onStripe,
  onClose,
  notify,
}: {
  slug: string;
  data: GrowthCheckoutData;
  onStripe: (cadence: PrepaidCadence) => void;
  onClose: () => void;
  notify: (text: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [cadence, setCadence] = useState<PrepaidCadence>(data.initialCadence);
  const [seats, setSeats] = useState(Math.max(data.minSeats, data.prepaid?.seats ?? 0, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perSeat = cadence === "annual" ? data.price.annualMonthlyCents * 12 : data.price.monthlyCents;
  const totalCents = seats * perSeat;
  const validSeats = Number.isInteger(seats) && seats >= data.minSeats && seats <= PREPAID_MAX_SEATS;
  const renewing = Boolean(data.prepaid?.active);

  async function pay() {
    setError(null);
    if (data.provider === "stripe") return onStripe(cadence);
    if (!validSeats) return setError(`Choose between ${data.minSeats} and ${PREPAID_MAX_SEATS} seats.`);
    setBusy(true);
    const base = `/api/w/${encodeURIComponent(slug)}/billing/razorpay/seats`;
    const res = await runRazorpayCheckout({
      createUrl: `${base}/order`,
      createBody: { seats, cadence },
      verifyUrl: `${base}/verify`,
      onOpen: () => setBusy(false),
      onAttemptFailed: (m) => notify(m, "error"),
    });
    setBusy(false);
    if (res.status === "paid") {
      const through = typeof res.data.paidThrough === "string" ? fmtDate(res.data.paidThrough) : null;
      notify(through ? `Payment received. Growth is on until ${through}.` : "Payment received. Growth is on.");
      onClose();
      router.replace(`/w/${encodeURIComponent(slug)}/billing`);
      router.refresh();
    } else if (res.status === "error") {
      setError(res.message);
    }
  }

  const periodWord = cadence === "annual" ? "year" : "month";
  return (
    <section id="choose-growth" aria-labelledby="choose-growth-title" className="rounded-xl border border-secondary/40 bg-surface px-5 py-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="choose-growth-title" className="text-base font-semibold text-fg">
            {renewing ? "Renew Growth" : "Choose Growth"}
          </h2>
          <p className="text-sm text-muted max-w-2xl">
            {data.provider === "razorpay"
              ? renewing && data.prepaid
                ? `Paid until ${fmtDate(data.prepaid.through)}. Paying now adds one ${periodWord} after that date, for the seats you choose.`
                : `Pay once for a ${periodWord}. Nothing renews by itself: billing admins get a reminder a week before it ends.`
              : "Stripe bills each seat in the workspace every period until you cancel."}
          </p>
        </div>
        <Btn variant="quiet" onClick={onClose}>
          Close
        </Btn>
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[13px] font-medium text-muted mb-1.5">Billing period</legend>
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-panel">
            {(["monthly", "annual"] as const).map((c) => (
              <label
                key={c}
                className={`cursor-pointer px-3 h-8 inline-flex items-center rounded-md text-[13px] font-medium ${cadence === c ? "bg-surface text-fg shadow-sm" : "text-muted"}`}
              >
                <input type="radio" name="growth-cadence" value={c} checked={cadence === c} onChange={() => setCadence(c)} className="sr-only" />
                {c === "monthly" ? "Monthly" : "Yearly"}
              </label>
            ))}
          </div>
        </fieldset>

        {data.provider === "razorpay" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Seats</span>
            <input
              type="number"
              inputMode="numeric"
              min={data.minSeats}
              max={PREPAID_MAX_SEATS}
              step={1}
              value={Number.isFinite(seats) ? seats : ""}
              onChange={(e) => setSeats(Math.floor(Number(e.target.value)))}
              className="h-9 w-28 rounded-lg border border-border bg-bg px-3 text-sm text-fg tabular-nums"
            />
          </label>
        )}

        <div className="flex flex-col gap-0.5 min-w-[200px]">
          <span className="text-[13px] font-medium text-muted">{data.provider === "razorpay" ? "You pay today" : "Price per seat"}</span>
          {data.provider === "razorpay" ? (
            <>
              <span className="text-xl font-semibold tabular-nums text-fg">{validSeats ? formatUsd(totalCents) : "–"}</span>
              <span className="text-xs text-muted tabular-nums">
                {seats} × {formatUsd(perSeat)} a {periodWord}
                {validSeats && data.inrRate ? `, charged as about ${formatInr(usdCentsToInrPaise(totalCents, data.inrRate))}` : ""}
              </span>
            </>
          ) : (
            <span className="text-xl font-semibold tabular-nums text-fg">
              {formatUsd(cadence === "annual" ? data.price.annualMonthlyCents : data.price.monthlyCents)}
              <span className="text-sm font-normal text-muted"> a month{cadence === "annual" ? ", billed yearly" : ""}</span>
            </span>
          )}
        </div>

        <Btn variant="primary" size="md" disabled={busy || (data.provider === "razorpay" && !validSeats)} onClick={pay}>
          {busy ? "Opening" : data.provider === "razorpay" ? (renewing ? "Pay and renew" : "Pay and start Growth") : "Continue to checkout"}
        </Btn>
      </div>

      {data.provider === "razorpay" && (
        <p className="text-[13px] text-muted">
          At least {data.minSeats} seat{data.minSeats === 1 ? "" : "s"}: one for everyone in or invited to the workspace. UPI, cards, netbanking and
          wallets are accepted.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
