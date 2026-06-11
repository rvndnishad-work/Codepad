import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata = {
  title: "Purchase — Interviewpad",
  robots: { index: false, follow: false },
};

/**
 * Stripe Checkout return page (success_url / cancel_url). Entitlement is granted
 * asynchronously by the webhook (fulfillContentPurchase), so this page just
 * confirms the outcome — the unlocked content appears once the webhook lands.
 */
export default async function PurchaseCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ok = status === "success";

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        {ok ? (
          <CheckCircle2 className="w-14 h-14 text-emerald-500" />
        ) : (
          <XCircle className="w-14 h-14 text-muted" />
        )}
        <h1 className="text-2xl font-bold text-fg">
          {ok ? "Payment complete" : "Checkout canceled"}
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          {ok
            ? "Thanks for your purchase! Your access unlocks within a few seconds once the payment is confirmed — reload the content page if it still looks locked."
            : "No charge was made. You can head back and try again whenever you're ready."}
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-sm font-bold transition-colors"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
