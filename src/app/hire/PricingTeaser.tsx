import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";

/**
 * Compact pricing teaser for the recruiter page. Prices mirror /pricing
 * (monthly cadence) — if plans change there, update here too.
 */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    blurb: "Try real interviews with a small team.",
    points: ["Live interview rooms", "Manual scorecards", "Community challenges"],
    highlight: false,
  },
  {
    name: "Starter",
    price: "$19",
    blurb: "For teams running regular screens.",
    points: ["Take-home assignments", "Session replay", "ATS webhooks"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "$49",
    blurb: "Scale screening with AI + automation.",
    points: ["AI screening credits", "Custom challenge authoring", "External MCP tools"],
    highlight: true,
  },
];

export default function PricingTeaser() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="08"
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
          {PLANS.map((plan) => (
            <div key={plan.name} className="flex flex-col bg-surface">
              <div
                className={`flex items-center justify-between border-b border-border px-6 py-3 ${
                  plan.highlight ? "bg-secondary text-secondary-ink" : ""
                }`}
              >
                <span
                  className="ip-label"
                  style={plan.highlight ? { color: "inherit" } : undefined}
                >
                  {plan.name}
                </span>
                {plan.highlight && (
                  <span className="ip-label ip-label-xs" style={{ color: "inherit" }}>
                    Recommended
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="ip-nums text-4xl font-bold text-fg">{plan.price}</span>
                  <span className="ip-label">/ seat / month</span>
                </div>
                <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{plan.blurb}</p>

                <ul className="mt-5 divide-y divide-border border-t border-border">
                  {plan.points.map((point) => (
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
                    plan.highlight ? "text-secondary" : ""
                  }`}
                >
                  Compare plans
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </RevealOnScroll>
      </div>
    </section>
  );
}
