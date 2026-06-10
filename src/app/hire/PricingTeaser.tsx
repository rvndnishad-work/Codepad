import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * Compact pricing teaser for the recruiter page. Prices mirror /pricing
 * (monthly cadence) — if plans change there, update here too. Static server
 * component.
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
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest mb-2 px-3 py-1 rounded-full text-indigo-400 bg-indigo-500/10">
            Pricing
          </div>
          <h2 className="text-3xl font-black text-fg tracking-tight">
            Per-seat plans. Per-screening credits.
          </h2>
        </div>
        <Link
          href="/pricing"
          className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group whitespace-nowrap"
        >
          Full pricing
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl border p-6 flex flex-col ${
              plan.highlight
                ? "border-indigo-500/40 bg-indigo-500/5 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.25)]"
                : "border-border bg-panel"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-black text-fg">{plan.name}</h3>
              {plan.highlight && (
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full">
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
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className={`mt-auto text-center px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                plan.highlight
                  ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                  : "bg-surface hover:bg-elevated text-fg border border-border"
              }`}
            >
              Compare plans
            </Link>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted/70 mt-6">
        AI screenings are billed as credits on top of any plan — buy packs as you go, charged only when a candidate actually starts.
      </p>
    </section>
  );
}
