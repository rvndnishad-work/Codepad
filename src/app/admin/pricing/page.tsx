import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { getPricingSettings } from "@/lib/billing/pricing-copy-store";
import PricingCopyForm from "./PricingCopyForm";

export const metadata = {
  title: "Pricing — Admin",
};

/**
 * Edits /pricing and the /hire teaser: the wording, and the prices Stripe
 * checkout charges (Growth seat, credit packs, video add-on). Everything is
 * stored in one SiteSetting row and read by getEffectivePricing(), which the
 * checkouts and every price label use, so the page and Stripe always agree.
 */
export default async function AdminPricingPage() {
  await requireAdminAccess();
  const { copy, prices } = await getPricingSettings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Edit what <Link href="/pricing" className="underline">/pricing</Link> and the pricing section of{" "}
            <Link href="/hire" className="underline">/hire</Link> say, and the prices Stripe checkout charges: the
            Growth seat, AI credit packs and the built-in video add-on. The public pages, the workspace billing page
            and checkout all read the same prices, so what people see is what they pay.
          </p>
          <p className="mt-2 text-xs text-muted">
            Empty fields use the defaults in <code>src/lib/billing/plans.ts</code>,{" "}
            <code>src/lib/ai-interview/credit-packs.ts</code> and <code>src/lib/video/addon.ts</code>.
          </p>
        </div>
        <Link
          href="/pricing"
          target="_blank"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-fg transition hover:bg-bg"
        >
          View /pricing <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <PricingCopyForm initialCopy={copy} initialPrices={prices} />
    </div>
  );
}
