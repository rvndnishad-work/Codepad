import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { BuyContentButton, SubscribeButton } from "@/app/creator/BuyButton";
import type { PaywallOptions } from "@/lib/marketplace/access";

/**
 * Paywall shown in place of a sold challenge's runnable content when the viewer
 * lacks access. Offers the relevant membership tiers and/or a one-time buy.
 * Access is granted by the webhook after checkout (see fulfillment.ts).
 */
export default function ChallengePaywall({
  title,
  description,
  options,
}: {
  title: string;
  description: string;
  options: PaywallOptions;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href={`/c/${options.spaceHandle}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the space
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-fg">{title}</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <Lock className="w-4 h-4" /> Premium content
        </div>
        <p className="text-sm text-muted">
          Unlock the full problem, runnable editor, and reference solutions —
          subscribe to the creator or buy this item.
        </p>
        {options.oneTime && (
          <BuyContentButton
            spaceContentId={options.oneTime.spaceContentId}
            priceCents={options.oneTime.priceCents}
            currency={options.oneTime.currency}
          />
        )}
        {options.tiers.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {options.tiers.map((t) => (
              <SubscribeButton
                key={t.id}
                tierId={t.id}
                name={t.name}
                priceCents={t.priceCents}
                currency={t.currency}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 prose prose-sm dark:prose-invert max-w-none opacity-90">
        <MarkdownRenderer content={description} />
      </div>
    </div>
  );
}
