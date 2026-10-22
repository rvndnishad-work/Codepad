import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { razorpayConfigured } from "@/lib/razorpay";
import { getEffectivePricing } from "@/lib/billing/pricing-copy-store";
import { getUsdInrRate } from "@/lib/billing/fx";
import { formatInr, usdCentsToInrPaise } from "@/lib/billing/fx-math";
import { formatUsd } from "@/lib/billing/plans";
import RazorpayTestForm from "./RazorpayTestForm";

export const metadata = { title: "Razorpay test payment — Admin" };

/**
 * Admin-only Razorpay check: pay any amount in INR or USD through the live
 * keys and modal, and see what Razorpay recorded. Also shows today's rate and
 * what each credit pack charges in rupees.
 */
export default async function RazorpayTestPage() {
  await requireAdminAccess();
  const [fx, pricing] = await Promise.all([getUsdInrRate(), getEffectivePricing()]);
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const mode = !keyId ? "missing" : keyId.startsWith("rzp_test_") ? "test" : "live";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link href="/admin/pricing" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-3.5 w-3.5" /> Pricing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Razorpay test payment</h1>
        <p className="mt-1 text-sm text-muted">
          Pay any amount with the server&apos;s Razorpay keys to check currencies and payment methods. Nothing is credited to any
          workspace. Rupee orders offer UPI, netbanking and wallets; dollar orders offer cards only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span
          className={`inline-flex items-center h-7 px-2.5 rounded-full font-medium ${
            mode === "live" ? "bg-danger/15 text-danger" : mode === "test" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
          }`}
        >
          {mode === "live" ? "Live keys: real money is charged" : mode === "test" ? "Test keys: no real money" : "Razorpay keys not set"}
        </span>
        <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-panel text-muted">
          {fx ? `USD to INR ${fx.rate.toFixed(2)} (${fx.source === "live" ? "live rate" : "fallback rate"})` : "No exchange rate available"}
        </span>
      </div>

      {razorpayConfigured() ? <RazorpayTestForm live={mode === "live"} /> : (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on this server to run a test payment.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-fg">What credit packs charge today</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Pack</th>
                <th className="px-4 py-2 font-medium text-right">Price</th>
                <th className="px-4 py-2 font-medium text-right">Razorpay charges</th>
              </tr>
            </thead>
            <tbody>
              {pricing.packs.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 text-fg">
                    {p.label} ({p.credits.toLocaleString("en-US")} credits)
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg">{formatUsd(p.priceCents)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-fg">{fx ? formatInr(usdCentsToInrPaise(p.priceCents, fx.rate)) : "Unavailable"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Rounded up to the next rupee. The rate is refreshed once a day.</p>
      </section>
    </div>
  );
}
