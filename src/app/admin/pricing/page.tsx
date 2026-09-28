import Link from "next/link";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { PUBLIC_CREDIT_PACKS, PUBLIC_PLANS } from "@/lib/billing/public-pricing";

export const metadata = {
  title: "Pricing — Admin",
};

/**
 * Read-only. Public prices come from the plan config in code
 * (src/lib/billing/plans.ts and src/lib/ai-interview/credits.ts), the same
 * config the workspace billing page and the Stripe checkout use, so the page
 * can never advertise a price Stripe does not charge.
 */
export default async function AdminPricingPage() {
  await requireAdminAccess();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pricing page</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          What <Link href="/pricing" className="underline">/pricing</Link> shows. Prices come from the plan config in{" "}
          <code>src/lib/billing/plans.ts</code> and <code>src/lib/ai-interview/credits.ts</code>, which Stripe checkout
          also reads. Change them there and deploy.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Monthly</th>
              <th className="px-4 py-2 font-medium">Yearly</th>
              <th className="px-4 py-2 font-medium">Seats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PUBLIC_PLANS.map((p) => (
              <tr key={p.key}>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 tabular-nums">{p.price.monthly} {p.unit.monthly}</td>
                <td className="px-4 py-2 tabular-nums">{p.price.annual} {p.unit.annual}</td>
                <td className="px-4 py-2">{p.seats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">AI credit pack</th>
              <th className="px-4 py-2 font-medium">Credits</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Per credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PUBLIC_CREDIT_PACKS.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.label}</td>
                <td className="px-4 py-2 tabular-nums">{p.credits}</td>
                <td className="px-4 py-2 tabular-nums">{p.price}</td>
                <td className="px-4 py-2 tabular-nums">{p.perCredit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
