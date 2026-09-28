"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Minus } from "lucide-react";
import {
  ANNUAL_SAVING_PERCENT,
  LOWEST_CREDIT_PRICE,
  PUBLIC_COMPARISON,
  PUBLIC_CREDIT_PACKS,
  PUBLIC_PLANS,
  PUBLIC_PRICING_FAQ,
  SCREENING_CREDIT_COSTS,
  INCLUDED_CREDITS_PER_SEAT,
  TRIAL_CREDITS,
  type Cadence,
  type PublicPlan,
} from "@/lib/billing/public-pricing";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  planName: string;
}

const planLabel = (planName: string) =>
  planName === "GROWTH" ? "Growth" : planName === "ENTERPRISE" ? "Enterprise" : planName === "STARTER" ? "Starter" : "Free";

/**
 * Public pricing. Every number comes from src/lib/billing/public-pricing.ts,
 * which reads the same plan config the workspace billing page and the Stripe
 * checkout use.
 */
export default function PricingClient({
  workspaces,
  isSignedIn,
}: {
  workspaces: WorkspaceInfo[];
  isSignedIn: boolean;
}) {
  const [cadence, setCadence] = useState<Cadence>("annual");
  const [workspaceSlug, setWorkspaceSlug] = useState(workspaces[0]?.slug ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const workspace = workspaces.find((w) => w.slug === workspaceSlug);
  const onPaidPlan = workspace?.planName === "GROWTH" || workspace?.planName === "ENTERPRISE";

  const checkout = async () => {
    setError(null);
    if (!isSignedIn) {
      router.push("/login?next=/pricing");
      return;
    }
    if (!workspace) {
      router.push("/w/create");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/w/${workspace.slug}/billing/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "GROWTH", cadence }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Checkout did not start. Try again, or open Billing and usage in your workspace.");
    } catch {
      setError("Checkout did not start. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg transition-colors">
      {/* Header */}
      <section className="border-b border-border px-4 pb-12 pt-24 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <p className="ip-label">Pricing</p>
          <h1 className="ip-display ip-display-xl mt-4 max-w-3xl">
            AI screening is included with every seat.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
            Take-homes and live interviews on every plan. Each paid seat adds {INCLUDED_CREDITS_PER_SEAT} AI screening
            credits a month to your team pool, and new workspaces start with {TRIAL_CREDITS} free credits. Need more?
            Packs from {LOWEST_CREDIT_PRICE} a credit. Candidates never take a seat.
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
                  {c === "monthly" ? "Monthly" : `Yearly, save ${ANNUAL_SAVING_PERCENT}%`}
                </button>
              ))}
            </div>

            {isSignedIn && workspaces.length > 1 && (
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <span>Workspace</span>
                <select
                  id="pricing-workspace"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  className="border border-border-strong bg-surface px-3 py-2 text-[13px] text-fg"
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.slug}>
                      {w.name} ({planLabel(w.planName)})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="ip-frame grid grid-cols-1 gap-px bg-border md:grid-cols-3">
            {PUBLIC_PLANS.map((plan) => (
              <PlanColumn
                key={plan.key}
                plan={plan}
                cadence={cadence}
                loading={loading}
                current={workspace?.planName === plan.key || (plan.key === "FREE" && !!workspace && !onPaidPlan)}
                signedIn={isSignedIn}
                onCheckout={checkout}
              />
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-4 text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* AI screening credits */}
      <section className="border-t border-border px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="ip-label">AI screening credits</p>
            <h2 className="ip-display ip-display-md mt-3">Need more screenings? Top up with packs.</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted">
              Available on Growth and Enterprise. A screening uses credits once, when the candidate starts. How many
              depends on how present you want the AI interviewer to be. Included credits are used first and roll over
              for one month. Bought credits never expire.
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
                  <th scope="col" className="ip-label py-3 pr-4 font-medium">Pack</th>
                  <th scope="col" className="ip-label py-3 pr-4 text-right font-medium">Credits</th>
                  <th scope="col" className="ip-label py-3 pr-4 text-right font-medium">Price</th>
                  <th scope="col" className="ip-label py-3 text-right font-medium">Per credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PUBLIC_CREDIT_PACKS.map((p) => (
                  <tr key={p.id}>
                    <td className="py-4 pr-4">
                      <span className="font-medium">{p.label}</span>
                      {p.badge && <span className="ip-label ip-label-accent ml-2">{p.badge}</span>}
                    </td>
                    <td className="ip-nums py-4 pr-4 text-right">{p.credits.toLocaleString("en-US")}</td>
                    <td className="ip-nums py-4 pr-4 text-right font-semibold">{p.price}</td>
                    <td className="ip-nums py-4 text-right text-muted">{p.perCredit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[12.5px] text-muted">
              Buy packs from Billing and usage inside your workspace. Enterprise plans can agree volume pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="border-t border-border px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="ip-label">Compare plans</p>
          <h2 className="ip-display ip-display-md mt-3">What each plan includes</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className="ip-label py-3 pr-4 font-medium">Feature</th>
                  {PUBLIC_PLANS.map((p) => (
                    <th key={p.key} scope="col" className={`ip-label py-3 pr-4 font-medium ${p.recommended ? "ip-label-fg" : ""}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PUBLIC_COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row" className="py-3 pr-4 font-medium">{row.feature}</th>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="py-3 pr-4">
                        <Cell text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="pricing-faq" className="scroll-mt-24 border-t border-border px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="ip-label">Questions</p>
            <h2 className="ip-display ip-display-md mt-3">Before you buy</h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {PUBLIC_PRICING_FAQ.map((f) => (
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

      {/* Close */}
      <section className="border-t border-border px-4 py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <p className="ip-display ip-display-md max-w-xl">Start free. Every new workspace gets Growth for its first two weeks.</p>
          <div className="flex flex-wrap gap-3">
            <Link href={isSignedIn ? "/w/create" : "/login?next=/w/create"} className="ip-btn ip-btn-primary">
              Create a workspace <ArrowRight className="h-4 w-4" />
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

function Cell({ text }: { text: string }) {
  if (text === "Yes") return <Check aria-label="Yes" className="h-4 w-4 text-accent" />;
  if (text === "No") return <Minus aria-label="No" className="h-4 w-4 text-subtle" />;
  return <span className="text-muted">{text}</span>;
}

function PlanColumn({
  plan,
  cadence,
  loading,
  current,
  signedIn,
  onCheckout,
}: {
  plan: PublicPlan;
  cadence: Cadence;
  loading: boolean;
  current: boolean;
  signedIn: boolean;
  onCheckout: () => void;
}) {
  const note = plan.note[cadence];
  return (
    <div className="flex flex-col bg-surface">
      <div
        className={`flex items-center justify-between border-b border-border px-6 py-3 ${
          plan.recommended ? "bg-ink text-ink-fg" : ""
        }`}
      >
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
        <p className="text-[13px] leading-snug text-muted">{plan.audience}</p>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="ip-nums text-4xl font-bold">{plan.price[cadence]}</span>
          <span className="text-[13px] text-muted">{plan.unit[cadence]}</span>
        </div>
        <p className="mt-1 min-h-[1.25rem] text-[12.5px] text-muted">{note}</p>
        <p className="mt-4 text-[13px] font-medium">{plan.seats}</p>

        <ul className="mt-4 flex-1 divide-y divide-border border-t border-border">
          {plan.includes.map((line) => (
            <li key={line} className="flex items-start gap-2.5 py-2.5 text-[13px] leading-snug">
              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {current ? (
            <p className="ip-label ip-label-fg py-3">Your current plan</p>
          ) : plan.cta === "checkout" ? (
            <button type="button" onClick={onCheckout} disabled={loading} className="ip-btn ip-btn-primary w-full disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {signedIn ? `Upgrade to ${plan.name}` : `Start with ${plan.name}`}
            </button>
          ) : plan.cta === "sales" ? (
            <a href="mailto:sales@interviewpad.dev?subject=Enterprise%20plan" className="ip-btn ip-btn-ghost w-full">
              Talk to us
            </a>
          ) : (
            <Link href={signedIn ? "/w/create" : "/login?next=/w/create"} className="ip-btn ip-btn-ghost w-full">
              Create a free workspace
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
