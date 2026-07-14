import Link from "next/link";
import { Lock, ArrowLeft, Check, Sparkles } from "lucide-react";
import { BuyContentButton, SubscribeButton } from "@/app/creator/BuyButton";
import type { PaywallOptions } from "@/lib/marketplace/access";

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

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
  const recommendedId = options.tiers.length > 1 ? options.tiers[options.tiers.length - 1].id : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href={`/c/${options.spaceHandle}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the space
      </Link>

      {/* Teaser header — show what they're missing, not just a wall. */}
      <div className="text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-accent-glow border border-accent/25 grid place-items-center text-accent mx-auto mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent mb-2">Members-only</div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-fg leading-tight">{title}</h1>
        {blurb && <p className="text-sm text-muted mt-3 leading-relaxed">{blurb}</p>}
      </div>

      {/* Blurred stand-in for the locked body. */}
      <div className="relative mt-8 select-none" aria-hidden>
        <div className="space-y-2.5 blur-[6px] opacity-50">
          <div className="h-3.5 rounded bg-panel w-11/12" />
          <div className="h-3.5 rounded bg-panel w-full" />
          <div className="h-3.5 rounded bg-panel w-4/5" />
          <div className="h-24 rounded-xl bg-panel w-full mt-4" />
          <div className="h-3.5 rounded bg-panel w-3/4 mt-4" />
          <div className="h-3.5 rounded bg-panel w-5/6" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
      </div>

      {/* Unlock options */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {options.tiers.map((t) => {
          const recommended = t.id === recommendedId;
          return (
            <div
              key={t.id}
              className={`rounded-2xl border p-5 space-y-3 relative flex flex-col ${
                recommended ? "border-accent/50 bg-accent/[0.05]" : "border-border bg-surface"
              }`}
            >
              {recommended && (
                <span className="absolute -top-2 right-4 text-[9px] font-bold uppercase tracking-wider text-bg bg-accent rounded-full px-2 py-0.5">
                  Best value
                </span>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-black text-fg flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> {t.name}
                </span>
                <span className="text-sm font-black text-fg">
                  {money(t.priceCents, t.currency)}
                  <span className="text-[10px] font-semibold text-muted">/mo</span>
                </span>
              </div>
              {t.description && <p className="text-[11px] text-muted leading-relaxed">{t.description}</p>}
              {t.benefits.length > 0 && (
                <ul className="space-y-1.5 flex-1">
                  {t.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-snug">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-[1px]" /> {b}
                    </li>
                  ))}
                </ul>
              )}
              <SubscribeButton tierId={t.id} name={t.name} priceCents={t.priceCents} currency={t.currency} />
            </div>
          );
        })}

        {options.oneTime && (
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 flex flex-col sm:col-span-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-black text-fg">Just this one</span>
              <span className="text-sm font-black text-fg">{money(options.oneTime.priceCents, options.oneTime.currency)}</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              One-time purchase — permanent access to this item, no subscription.
            </p>
            <div>
              <BuyContentButton
                spaceContentId={options.oneTime.spaceContentId}
                priceCents={options.oneTime.priceCents}
                currency={options.oneTime.currency}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
