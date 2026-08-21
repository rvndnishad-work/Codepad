import Link from "next/link";
import { ArrowRight, Check, Tag } from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
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
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <SectionHeading
        eyebrow="Pricing"
        eyebrowIcon={<Tag className="w-3.5 h-3.5" />}
        title="Per-seat plans."
        highlight="Per-screening credits."
        linkHref="/pricing"
        linkLabel="Full pricing"
        align="left"
      />

      <RevealOnScroll stagger={0.1} amount={0.15} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <RevealItem key={plan.name}>
            <div
              className={`h-full rounded-3xl border p-6 flex flex-col transition-colors ${
                plan.highlight
                  ? "border-secondary/40 bg-secondary/5 shadow-tile-hover"
                  : "border-border bg-panel shadow-tile hover:border-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-black text-fg">{plan.name}</h3>
                {plan.highlight && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-secondary bg-secondary/10 border border-secondary/25 px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-3xl font-black text-fg">{plan.price}</span>
                <span className="text-xs text-muted font-bold"> / seat / month</span>
              </div>
              <p className="text-muted text-sm mb-4">{plan.blurb}</p>
              <ul className="space-y-2 mb-6">
                {plan.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted">
                    <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className={`mt-auto text-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  plan.highlight
                    ? "bg-secondary hover:brightness-110 text-white"
                    : "bg-surface hover:bg-elevated text-fg border border-border"
                }`}
              >
                Compare plans
              </Link>
            </div>
          </RevealItem>
        ))}
      </RevealOnScroll>
      <RevealOnScroll delay={0.15}>
        <p className="text-center text-xs text-muted/70 mt-6">
          AI screenings are billed as credits on top of any plan — buy packs as you go, charged only when a candidate actually starts.
        </p>
      </RevealOnScroll>
    </section>
  );
}
