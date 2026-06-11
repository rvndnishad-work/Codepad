import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { BuyContentButton, SubscribeButton } from "@/app/creator/BuyButton";
import type { PaywallOptions } from "@/lib/marketplace/access";

/** Generic paywall for any gated space content (tutorials, interview Q&A, …). */
export default function SpacePaywall({
  title,
  blurb,
  options,
}: {
  title: string;
  blurb?: string | null;
  options: PaywallOptions;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href={`/c/${options.spaceHandle}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the space
      </Link>
      <h1 className="text-2xl font-bold text-fg">{title}</h1>
      {blurb && <p className="text-sm text-muted mt-2">{blurb}</p>}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent"><Lock className="w-4 h-4" /> Members-only content</div>
        <p className="text-sm text-muted">Subscribe to the creator{options.oneTime ? ", or buy this item," : ""} to unlock it.</p>
        {options.oneTime && (
          <BuyContentButton spaceContentId={options.oneTime.spaceContentId} priceCents={options.oneTime.priceCents} currency={options.oneTime.currency} />
        )}
        {options.tiers.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {options.tiers.map((t) => <SubscribeButton key={t.id} tierId={t.id} name={t.name} priceCents={t.priceCents} currency={t.currency} />)}
          </div>
        )}
      </div>
    </div>
  );
}
