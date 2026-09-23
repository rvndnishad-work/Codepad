import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";

import type { PricingPlanDef } from "@/lib/pricing-plans";

/**
 * Compact pricing teaser for the recruiter page. Renders the business tiers
 * from the same config /pricing reads (admin-editable `pricing_plans`, else
 * DEFAULT_PRICING), priced on annual billing because that is the cadence
 * /pricing opens on.
 */
function priceOf(plan: PricingPlanDef) {
  if (plan.monthly === null) return { price: "Custom", per: "/ tailored", note: "Talk to sales" };
  if (plan.monthly === 0) return { price: "$0", per: "free forever", note: null };
  const amount = plan.annual ?? plan.monthly;
  return { price: `$${amount}`, per: plan.seatBased ? "/ seat / mo" : "/ mo", note: "Billed annually" };
}

export default function PricingTeaser({ plans }: { plans: PricingPlanDef[] }) {
  if (plans.length === 0) return null;
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          tone="secondary"
          eyebrow="Pricing"
          eyebrowIcon={<Tag className="h-3 w-3" />}
          title="Per-seat plans."
          highlight="Per-screening credits."
          lede="Seats cover the workspace and everyone in it. AI screenings are credits on top, charged only when a candidate actually starts."
          linkHref="/pricing"
          linkLabel="Full pricing"
        />

        {/* A price table, not three floating cards. The recommended plan is
            marked by an ink header band — a change of surface, not a badge. */}
        <RevealOnScroll className="ip-frame grid grid-cols-1 gap-px bg-border md:grid-cols-3">
          {plans.map((plan) => {
            const highlight = plan.spotlight === "best";
            const { price, per, note } = priceOf(plan);
            return (
            <div key={plan.id} className="flex flex-col bg-surface">
              <div
                className={`flex items-center justify-between border-b border-border px-6 py-3 ${
                  highlight ? "bg-secondary text-secondary-ink" : ""
                }`}
              >
                <span
                  className="ip-label"
                  style={highlight ? { color: "inherit" } : undefined}
                >
                  {plan.name}
                </span>
                {highlight && (
                  <span className="ip-label" style={{ color: "inherit" }}>
                    Recommended
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="ip-nums text-4xl font-bold text-fg">{price}</span>
                  <span className="ip-label">{per}</span>
                </div>
                {note && <p className="ip-label mt-1">{note}</p>}
                <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{plan.blurb}</p>

                <ul className="mt-5 divide-y divide-border border-t border-border">
                  {plan.features.slice(0, 3).map((point) => (
                    <li key={point} className="flex items-start gap-2.5 py-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-[5px] w-[5px] shrink-0 bg-secondary"
                      />
                      <span className="text-[12.5px] leading-snug text-fg">{point}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/pricing"
                  className={`ip-link mt-6 self-start text-[13px] ${
                    highlight ? "text-secondary" : ""
                  }`}
                >
                  Compare plans
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            );
          })}
        </RevealOnScroll>
      </div>
    </section>
  );
}
