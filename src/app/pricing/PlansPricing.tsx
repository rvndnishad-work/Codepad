"use client";

/**
 * Public pricing for the new plans (Basic, Growth, Teams, Enterprise) and
 * top-ups. Every number comes from buildPlansPage (src/lib/billing/
 * plans-public.ts), which reads the same catalogue the checkout charges.
 * Shown once an admin puts the new plans on sale.
 */
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import type { PlansPage, PlansPagePlan } from "@/lib/billing/plans-public";
import { SCREENING_CREDIT_COSTS } from "@/lib/billing/public-pricing";

type Cadence = "monthly" | "annual";

export default function PlansPricing({
  page,
  isSignedIn,
  workspaceSlug,
  initialCadence,
}: {
  page: PlansPage;
  isSignedIn: boolean;
  /** A workspace the viewer can manage billing for: plan buttons go to its Billing page. */
  workspaceSlug: string | null;
  initialCadence: Cadence;
}) {
  const [cadence, setCadence] = useState<Cadence>(initialCadence);

  // The picked plan and period travel to Billing, through sign-in and creating a first workspace if needed.
  const planHref = (key: string) => {
    const q = `upgrade=${key.toLowerCase()}&cadence=${cadence}`;
    if (!isSignedIn) return `/login?next=${encodeURIComponent(`/pricing?cadence=${cadence}`)}`;
    if (!workspaceSlug) return `/w/create?plan=${key.toLowerCase()}&cadence=${cadence}`;
    return `/w/${encodeURIComponent(workspaceSlug)}/billing?${q}`;
  };

  return (
    <div className="min-h-screen bg-bg text-fg transition-colors">
      <section className="border-b border-border px-4 pb-12 pt-24 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <p className="ip-label">Pricing</p>
          <h1 className="ip-display ip-display-xl mt-4 max-w-3xl">One flat price, with AI screening credits every month.</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
            Every plan includes take homes, live interviews and AI screening. Credits arrive each month, and you decide how many each of your workspaces gets.
            Candidates never take a seat. Want to try it first? Book a demo and we will set up a free pilot for your team.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Billing period" className="inline-flex border border-border-strong bg-surface p-1">
              {(["monthly", "annual"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={cadence === c}
                  onClick={() => setCadence(c)}
                  className={`px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    cadence === c ? "bg-ink text-ink-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {c === "monthly" ? "Monthly" : page.savingPercent > 0 ? `Yearly, save ${page.savingPercent}%` : "Yearly"}
                </button>
              ))}
            </div>
            <Link href="/demo?source=pricing" className="ip-btn ip-btn-ghost">
              Book a demo
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="ip-frame grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
            {page.plans.map((p) => (
              <PlanColumn key={p.key} plan={p} cadence={cadence} href={p.key === "ENTERPRISE" ? "/demo?source=pricing&plan=enterprise" : planHref(p.key)} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="ip-label">AI screening credits</p>
            <h2 className="ip-display ip-display-md mt-3">Need more? Top up any time.</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted">
              A screening uses credits once, when the candidate starts. How many depends on how present you want the AI interviewer to be. Plan
              credits are used first and roll over for one month. Top-up credits never expire.
            </p>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {SCREENING_CREDIT_COSTS.map((c) => (
                <li key={c.level} className="flex items-baseline justify-between gap-4 py-3">
                  <span>
                    <span className="block text-[14px] font-medium">{c.label}</span>
                    <span className="block text-[12.5px] text-muted">{c.hint}</span>
                  </span>
                  <span className="ip-nums whitespace-nowrap text-[14px] font-semibold">
                    {c.credits} {c.credits === 1 ? "credit" : "credits"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className="ip-label py-3 pr-4 font-medium">Top-up</th>
                  <th scope="col" className="ip-label py-3 pr-4 text-right font-medium">Credits</th>
                  <th scope="col" className="ip-label py-3 pr-4 text-right font-medium">Price</th>
                  <th scope="col" className="ip-label py-3 text-right font-medium">Per credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.topups.map((t) => (
                  <tr key={t.id}>
                    <td className="py-4 pr-4">
                      <span className="font-medium">{t.label}</span>
                      {t.badge && <span className="ip-label ip-label-accent ml-2">{t.badge}</span>}
                    </td>
                    <td className="ip-nums py-4 pr-4 text-right">{t.credits.toLocaleString("en-US")}</td>
                    <td className="ip-nums py-4 pr-4 text-right font-semibold">{t.price}</td>
                    <td className="ip-nums py-4 text-right text-muted">{t.perCredit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[12.5px] text-muted">
              Buy top-ups from Billing and usage in your workspace, on any plan or pilot. A plan credit always costs less than a top-up credit, so
              if you top up every month, the next plan up is the better deal.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="ip-label">Compare plans</p>
          <h2 className="ip-display ip-display-md mt-3">What each plan includes</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className="ip-label py-3 pr-4 font-medium">Feature</th>
                  {page.plans.map((p) => (
                    <th key={p.key} scope="col" className={`ip-label py-3 pr-4 font-medium ${p.recommended ? "ip-label-fg" : ""}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.compare.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row" className="py-3 pr-4 font-medium">{row.feature}</th>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="py-3 pr-4">
                        {cell === "Yes" ? (
                          <Check aria-label="Yes" className="h-4 w-4 text-accent" />
                        ) : cell === "No" ? (
                          <Minus aria-label="No" className="h-4 w-4 text-subtle" />
                        ) : (
                          <span className="text-muted">{cell}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="pricing-faq" className="scroll-mt-24 border-t border-border px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="ip-label">Questions</p>
            <h2 className="ip-display ip-display-md mt-3">Before you buy</h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {page.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                  {f.q}
                  <span aria-hidden className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <p className="ip-display ip-display-md max-w-xl">See it with your own roles first. We set up a free pilot after a short demo.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo?source=pricing" className="ip-btn ip-btn-primary">
              Book a demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/hire" className="ip-btn ip-btn-ghost">
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlanColumn({ plan, cadence, href }: { plan: PlansPagePlan; cadence: Cadence; href: string }) {
  return (
    <div className="flex flex-col bg-surface">
      <div className={`flex items-center justify-between border-b border-border px-6 py-3 ${plan.recommended ? "bg-ink text-ink-fg" : ""}`}>
        <span className="ip-label" style={plan.recommended ? { color: "inherit" } : undefined}>
          {plan.name}
        </span>
        {plan.recommended && (
          <span className="ip-label" style={{ color: "inherit" }}>
            Recommended
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="min-h-[2.5rem] text-[13px] leading-snug text-muted">{plan.audience}</p>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="ip-nums text-4xl font-bold">{plan.price[cadence]}</span>
          <span className="text-[13px] text-muted">{plan.unit[cadence]}</span>
        </div>
        <p className="mt-1 min-h-[1.25rem] text-[12.5px] text-muted">{plan.note[cadence]}</p>
        <ul className="mt-4 flex-1 divide-y divide-border border-t border-border">
          {plan.includes.map((line) => (
            <li key={line} className="flex items-start gap-2.5 py-2.5 text-[13px] leading-snug">
              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Link href={href} className={`ip-btn w-full ${plan.recommended ? "ip-btn-primary" : "ip-btn-ghost"}`}>
            {plan.key === "ENTERPRISE" ? "Talk to us" : `Choose ${plan.name}`}
          </Link>
        </div>
      </div>
    </div>
  );
}
