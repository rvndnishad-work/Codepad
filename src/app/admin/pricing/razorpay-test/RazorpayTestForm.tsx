"use client";

import { useState } from "react";
import { runRazorpayCheckout } from "@/lib/billing/razorpay-client";

type Outcome =
  | { kind: "paid"; data: Record<string, unknown> }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

const fmt = (minor: unknown, currency: unknown) =>
  typeof minor === "number" && typeof currency === "string"
    ? `${currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `}${(minor / 100).toLocaleString(currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2 })}`
    : "?";

export default function RazorpayTestForm({ live }: { live: boolean }) {
  const [amount, setAmount] = useState("1");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const pay = async () => {
    if (live && !window.confirm(`These are live keys. ${currency} ${amount} will be charged to a real card or account. Continue?`)) return;
    setBusy(true);
    setOutcome(null);
    setFailures([]);
    const res = await runRazorpayCheckout({
      createUrl: "/api/admin/razorpay-test/order",
      createBody: { amount, currency },
      verifyUrl: "/api/admin/razorpay-test/verify",
      onAttemptFailed: (m) => setFailures((f) => [...f, m]),
    });
    setBusy(false);
    setOutcome(res.status === "paid" ? { kind: "paid", data: res.data } : res.status === "cancelled" ? { kind: "cancelled" } : { kind: "error", message: res.message });
  };

  const field = "h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20";

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void pay();
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Currency
          <select className={`${field} w-28`} value={currency} onChange={(e) => setCurrency(e.target.value as "INR" | "USD")} disabled={busy}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Amount
          <input
            className={`${field} w-40 tabular-nums`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.00"
            disabled={busy}
            aria-describedby="amount-help"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !amount.trim()}
          className="h-10 rounded-lg bg-secondary px-4 text-sm font-medium text-bg hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Waiting for payment" : "Pay with Razorpay"}
        </button>
      </form>
      <p id="amount-help" className="-mt-2 text-xs text-muted">
        In {currency === "INR" ? "rupees" : "dollars"}, at least 1.00 and at most 50,000.00. Up to two decimal places.
      </p>

      {failures.map((m, i) => (
        <p key={i} role="alert" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          Attempt failed: {m}
        </p>
      ))}

      {outcome?.kind === "cancelled" && <p role="status" className="text-sm text-muted">Checkout closed. Nothing was charged.</p>}
      {outcome?.kind === "error" && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {outcome.message}
        </p>
      )}
      {outcome?.kind === "paid" && (
        <div role="status" className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-fg">
          <p className="font-medium">Payment {String(outcome.data.status)}. Signature verified.</p>
          <dl className="mt-2 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-muted">Charged</dt>
            <dd className="tabular-nums">{fmt(outcome.data.amount, outcome.data.currency)}</dd>
            <dt className="text-muted">Order</dt>
            <dd className="tabular-nums">{fmt(outcome.data.order_amount, outcome.data.order_currency)}</dd>
            <dt className="text-muted">Method</dt>
            <dd>{String(outcome.data.method ?? "unknown")}</dd>
            <dt className="text-muted">Payment id</dt>
            <dd className="font-mono text-xs break-all">{String(outcome.data.payment_id)}</dd>
            <dt className="text-muted">Order id</dt>
            <dd className="font-mono text-xs break-all">{String(outcome.data.order_id)}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}
