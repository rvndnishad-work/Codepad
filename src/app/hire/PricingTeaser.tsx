import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

import RevealLines from "@/components/wow/RevealLines";
import { LOWEST_CREDIT_PRICE, PUBLIC_PLANS } from "@/lib/billing/public-pricing";

/**
 * Compact pricing teaser for the recruiter page. Reads the same plan data as
 * /pricing (src/lib/billing/public-pricing.ts), priced on yearly billing
 * because that is the cadence /pricing opens on.
 */
export default function PricingTeaser() {
  const plans = PUBLIC_PLANS;
  return (
    <div>
      <WowReveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary"><Tag className="h-3.5 w-3.5" /> pricing</p>
            <RevealLines as="h3" className="wow-font-display mt-3 text-4xl md:text-6xl" lines={[<span key="l0">Per-seat plans.</span>, <span key="l1" className="wow-gradient-boss">Per-screening credits.</span>]} />
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
              Seats cover the workspace and everyone in it. AI screenings are
              credits on top, from {LOWEST_CREDIT_PRICE} each, charged only when a candidate starts.
            </p>
          </div>
          <Link href="/pricing" className="ip-link text-[13px] text-secondary">
            Full pricing
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </WowReveal>

      {/* A price table, not three floating cards. The recommended plan is
          marked by an ink header band — a change of surface, not a badge. */}
      <WowReveal className="ip-frame mt-10 grid grid-cols-1 gap-px bg-border md:grid-cols-3">
        {plans.map((plan) => {
          const highlight = plan.recommended;
          const price = plan.price.annual;
          const per = plan.unit.annual;
          const note = plan.note.annual;
          return (
          <div key={plan.key} className="flex flex-col bg-surface">
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
              <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{plan.audience}</p>

              <ul className="mt-5 divide-y divide-border border-t border-border">
                {plan.includes.slice(0, 3).map((point) => (
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
      </WowReveal>
    </div>
  );
}
