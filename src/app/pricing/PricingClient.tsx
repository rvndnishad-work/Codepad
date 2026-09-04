"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  HelpCircle,
  Sparkles,
  Building2,
  Zap,
  ArrowRight,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WowReveal from "@/components/wow/WowReveal";
import type {
  PricingConfig,
  PricingPlanDef,
  PricingCheckoutPlan,
} from "@/lib/pricing-plans";

type Tab = "individual" | "business";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  planName: string;
}


const FAQS = [
  {
    q: "How do AI credits work?",
    a: "Every plan includes a monthly AI-credit allowance that powers screening runs, auto-grading and proctoring telemetry. Basic is a 10-credit trial that expires in 7 days. Yearly plans add +10% credits and unused credits carry forward — monthly plans reset on the 1st.",
  },
  {
    q: "How does seat-based metered billing work?",
    a: "SaaS plans are billed based on the number of teammate seats in your workspace. When you invite additional teammates, Stripe dynamically increments the license quantity and adjusts your billing. Evicting a member automatically scales down the Stripe seats instantly.",
  },
  {
    q: "Do candidates take up paid seats?",
    a: "No. Candidates taking a live panel or take-home assignment do not require accounts or seats. They hold guest assessment credentials through their individual tokens. You only pay for recruiter/interviewer seats.",
  },
  {
    q: "Can I manage my subscription?",
    a: "Absolutely. Clicking 'Manage billing' inside your workspace billing panel redirects you directly to the Stripe Customer Billing Portal, where you can modify credit cards, review past invoices, and adjust configurations.",
  },
  {
    q: "What languages are supported in VM sandboxes?",
    a: "Enterprise custom tier sandboxes natively run secure Node.js, Python, Go, and Java shell compilations. The standard tiers run Javascript, Typescript, and modern frontend frameworks directly inside browser workers.",
  },
];

export default function PricingClient({
  workspaces,
  isSignedIn,
  config,
}: {
  workspaces: WorkspaceInfo[];
  isSignedIn: boolean;
  config: PricingConfig;
}) {
  const [tab, setTab] = useState<Tab>("individual");
  const [selectedWorkspaceSlug, setSelectedWorkspaceSlug] = useState<string>(
    workspaces[0]?.slug || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [cadence, setCadence] = useState<"monthly" | "annual">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const router = useRouter();

  const handleCheckout = async (plan: PricingCheckoutPlan) => {
    if (!isSignedIn) {
      router.push("/login?next=/pricing");
      return;
    }

    if (workspaces.length === 0) {
      router.push("/w/create");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/w/${selectedWorkspaceSlug}/billing/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, cadence }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Billing session error:", data.error);
        alert(`Billing upgrade failed: ${data.error || "unknown error"}`);
      }
    } catch (err) {
      console.error("Checkout dispatch error:", err);
      alert("Failed to initiate billing session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWorkspace = workspaces.find((w) => w.slug === selectedWorkspaceSlug);
  const isAlreadyGrowth = selectedWorkspace?.planName === "GROWTH";
  const isAlreadyStarter = selectedWorkspace?.planName === "STARTER";
  const plans = config[tab];

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] transition-colors">
      {/* ── Dark cinematic header ── */}
      <section className="wow-noise relative overflow-hidden bg-[#070b18] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[380px] w-[820px] -translate-x-1/2 rounded-full bg-[#4f46e5]/25 blur-[130px]" />
          <div className="absolute right-[-120px] top-1/3 h-[300px] w-[300px] rounded-full bg-[#22d3ee]/10 blur-[100px]" />
          <div className="wow-grid-bg absolute inset-0" />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070b18]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-24 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#8b93ff]/30 bg-[#8b93ff]/10 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#c7d2fe]"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Recruiter plans · per seat</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="wow-font-display mx-auto mt-6 max-w-3xl text-5xl md:text-7xl"
          >
            PAY FOR SEATS.<br /><span className="wow-gradient-boss">SPEND ON SIGNAL.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/65 md:text-base"
          >
            Individual plans for solo recruiters, business plans for teams —
            every tier metered in AI credits, cancelable anytime.
          </motion.p>

          {/* Audience tabs + helper + cadence + workspace — one control deck
              sitting right above the cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 xl:flex-row xl:gap-4"
          >
            <div className="flex rounded-full border border-white/15 bg-white/5 p-1 font-mono text-[11px] uppercase tracking-[0.18em] backdrop-blur">
              {(["individual", "business"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={`rounded-full px-5 py-2 transition ${
                    tab === t ? "bg-white font-bold text-[#070b18]" : "text-white/55 hover:text-white"
                  }`}
                >
                  {t === "individual" ? "Individual plans" : "Business plans"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 pl-4 font-mono text-[11px] uppercase tracking-[0.16em]">
                <span className={cadence === "monthly" ? "font-bold text-white" : "text-white/50"}>Monthly</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cadence === "annual"}
                  aria-label="Toggle annual billing"
                  onClick={() => setCadence(cadence === "monthly" ? "annual" : "monthly")}
                  className="relative h-6 w-11 rounded-full bg-[#9dff00]/90 p-0.5 transition"
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-[#0a1024] transition-transform ${cadence === "annual" ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
                <span className={cadence === "annual" ? "font-bold text-white" : "text-white/50"}>Annual</span>
              </div>
              {isSignedIn && workspaces.length > 1 && (
                <label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-4 pr-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
                  <Building2 className="h-3.5 w-3.5 text-[#8b93ff]" />
                  <span className="sr-only">Workspace to upgrade</span>
                  <select
                    value={selectedWorkspaceSlug}
                    onChange={(e) => setSelectedWorkspaceSlug(e.target.value)}
                    className="max-w-[180px] truncate rounded-full bg-transparent py-1 pr-1 font-semibold text-white focus:outline-none [&>option]:bg-[#0a1024]"
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.slug}>
                        {w.name} · {w.planName === "GROWTH" ? "Growth" : w.planName === "STARTER" ? "Starter" : "Free"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </motion.div>
          {(isAlreadyGrowth || isAlreadyStarter) && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-300">
              <CheckCircle className="h-3.5 w-3.5" />
              {selectedWorkspace?.name} is on the active {selectedWorkspace?.planName} tier
            </p>
          )}
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="px-4 pb-16 pt-10 md:pb-20 md:pt-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-5 md:grid-cols-3"
          >
            {plans.map((plan) => (
              <PlanTile
                key={plan.name}
                plan={plan}
                cadence={cadence}
                signedIn={isSignedIn}
                hasWorkspace={workspaces.length > 0}
                loading={isLoading}
                isCurrentPlan={
                  plan.cta.kind === "checkout"
                    ? plan.cta.plan === "GROWTH"
                      ? isAlreadyGrowth
                      : isAlreadyStarter
                    : false
                }
                onCheckout={handleCheckout}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        <WowReveal className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {["Cancel anytime", "Candidates never take seats", "SOC 2 ready · AES-256"].map((t) => (
            <span key={t} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--wow-faint)]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {t}
            </span>
          ))}
        </WowReveal>
      </section>

      {/* ── Comparison matrix (follows the tab) ── */}
      <section className="px-4 pb-4">
        <div className="mx-auto max-w-6xl">
          <WowReveal className="text-center">
            <h2 className="wow-font-display text-4xl md:text-5xl">EVERY FEATURE, <span className="wow-gradient-boss">EVERY TIER.</span></h2>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--wow-faint)]">
              {tab === "individual" ? "Individual plans" : "Business plans"} · yearly adds +10% credits with carry-forward
            </p>
          </WowReveal>
          <WowReveal className="mt-8">
            <div className="overflow-x-auto rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--wow-card-border)]">
                    <th className="p-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--wow-faint)]">Feature</th>
                    {plans.map((p) => (
                      <th
                        key={p.name}
                        className={`p-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] ${
                          p.spotlight === "best" ? "bg-[#8b93ff]/[0.07] text-[#8b93ff]" : "text-[var(--wow-faint)]"
                        }`}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--wow-card-border)]">
                  {config.matrix[tab].map((row) => (
                    <tr key={row.feature} className="transition-colors hover:bg-[var(--wow-stage)]">
                      <td className="p-4 font-bold text-[var(--wow-fg)]">{row.feature}</td>
                      {row.cells.map((c, i) => {
                        const hot = typeof c !== "string" && c.hot;
                        const text = typeof c === "string" ? c : c.text;
                        const dim = text === "—";
                        const spotlightCol = plans[i]?.spotlight === "best";
                        return (
                          <td
                            key={i}
                            className={`p-4 text-center tabular-nums ${spotlightCol ? "bg-[#8b93ff]/[0.07]" : ""} ${
                              hot ? "font-bold text-[var(--wow-fg)]" : dim ? "text-[var(--wow-faint)]" : "font-medium text-[var(--wow-muted)]"
                            }`}
                          >
                            {hot ? (
                              <span className="inline-flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> {text}
                              </span>
                            ) : (
                              text
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WowReveal>
        </div>
      </section>

      {/* ── FAQ accordion ── */}
      <section id="pricing-faq" className="scroll-mt-24 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <WowReveal className="text-center">
            <h2 className="wow-font-display text-4xl md:text-5xl">FAIR <span className="wow-gradient-boss">QUESTIONS.</span></h2>
          </WowReveal>
          <div className="mt-8 space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <WowReveal key={f.q} delay={i * 0.05}>
                  <div
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      open ? "border-[#8b93ff]/50 bg-[var(--wow-card)]" : "border-[var(--wow-card-border)] bg-[var(--wow-card)]"
                    } backdrop-blur-sm`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 p-5 text-left"
                    >
                      <HelpCircle className={`h-4 w-4 shrink-0 ${open ? "text-[#8b93ff]" : "text-[var(--wow-faint)]"}`} />
                      <span className="flex-1 text-[15px] font-bold tracking-tight text-[var(--wow-fg)]">{f.q}</span>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--wow-card-border)] transition-transform duration-300 ${open ? "rotate-45 border-[#8b93ff] text-[#8b93ff]" : "text-[var(--wow-faint)]"}`}>
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <p className="px-5 pb-5 pl-[3.25rem] text-sm leading-relaxed text-[var(--wow-muted)]">{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </WowReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing band ── */}
      <section className="px-4 pb-20">
        <div className="wow-noise relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#0c1030] px-6 py-14 text-center text-white md:py-16">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-160px] h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-[#4f46e5]/30 blur-[110px]" />
          <h2 className="wow-font-display relative mx-auto max-w-2xl text-4xl md:text-6xl">START FREE.<br /><span className="wow-gradient-boss">SCALE ON PROOF.</span></h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/65">
            Open a workspace in minutes, run your first interviews free, and
            upgrade the moment the pipeline demands it.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={isSignedIn ? "/dashboard" : "/login?next=/pricing"} className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-black uppercase tracking-wider text-[#0c1030] transition hover:scale-[1.03]">
              {isSignedIn ? "Open dashboard" : "Get started free"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="mailto:sales@interviewpad.dev?subject=Enterprise%20Plan%20Inquiry" className="rounded-full border border-white/25 px-8 py-[14px] text-sm font-bold uppercase tracking-wider text-white transition hover:border-white/60">
              Talk to sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function checkoutLabel(loading: boolean, current: boolean | undefined, upgrade: string) {
  if (loading) return "Loading...";
  if (current) return "Manage billing";
  return upgrade;
}

/** Animated price that re-ticks when the cadence flips. */
function Price({ value, per, note }: { value: string; per: string; note?: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="wow-font-display text-4xl tabular-nums md:text-5xl"
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--wow-faint)]">{per}</span>
      </div>
      {note && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-500">{note}</p>}
    </div>
  );
}

function PlanTile({
  plan, cadence, signedIn, hasWorkspace, loading, isCurrentPlan, onCheckout,
}: {
  plan: PricingPlanDef;
  cadence: "monthly" | "annual";
  signedIn: boolean;
  hasWorkspace: boolean;
  loading: boolean;
  isCurrentPlan: boolean | undefined;
  onCheckout: (plan: PricingCheckoutPlan) => void;
}) {
  const isAnnual = cadence === "annual";
  const isFree = plan.monthly === 0;
  const price =
    plan.monthly === null ? "Custom" : `$${isAnnual && plan.annual !== null ? plan.annual : plan.monthly}`;
  const per =
    plan.monthly === null
      ? "/ tailored"
      : isFree
        ? "free forever"
        : plan.seatBased
          ? isAnnual
            ? "/ seat / mo · billed annually"
            : "/ seat / mo"
          : isAnnual
            ? "/ mo · billed annually"
            : "/ mo";
  const credits = isAnnual && plan.creditsAnnual ? plan.creditsAnnual : plan.credits;
  const creditsSub = isAnnual && plan.creditsAnnualSub ? plan.creditsAnnualSub : plan.creditsSub;

  const body = (
    <>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="wow-font-display text-3xl">{plan.name}</h3>
          {plan.badges.map((b) => (
            <span
              key={b}
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wide ${
                b === "BEST VALUE"
                  ? "bg-[#22d3ee] text-[#070b18]"
                  : b === "EXPERTS' CHOICE"
                    ? "bg-white text-black"
                    : "bg-[#9dff00] text-black"
              }`}
            >
              {b}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[13px] text-[var(--wow-muted)]">{plan.tagline}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--wow-muted)]">{plan.blurb}</p>
      </div>

      <Price value={price} per={per} note={!isFree && isAnnual && plan.monthly !== null ? "yearly · +10% credits · carry-forward" : undefined} />

      <div className="rounded-2xl border border-[var(--wow-card-border)] bg-[var(--wow-stage)] p-3.5">
        <p className="flex items-center gap-1.5 text-[14px] font-extrabold">
          <Sparkles className="h-3.5 w-3.5 text-[#8b93ff]" /> {credits}
        </p>
        {creditsSub && (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--wow-faint)]">— {creditsSub}</p>
        )}
      </div>

      <ul className="flex-1 space-y-3 border-t border-[var(--wow-card-border)] pt-5">
        {plan.features.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-[var(--wow-fg)]">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {p}
          </li>
        ))}
        {plan.mcp && (
          <li className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-[var(--wow-fg)]">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>AI Screening + <Link href="/docs/mcp" className="text-[#8b93ff] underline underline-offset-2">MCP API</Link></span>
          </li>
        )}
      </ul>
    </>
  );

  const action =
    plan.cta.kind === "sales" ? (
      <a
        href="mailto:sales@interviewpad.dev?subject=Enterprise%20Plan%20Inquiry"
        className="mt-6 block rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-chip)] py-3.5 text-center text-xs font-black uppercase tracking-widest text-[var(--wow-fg)] transition hover:scale-[1.02] hover:border-[#8b93ff]"
      >
        Contact Sales
      </a>
    ) : plan.cta.kind === "free" ? (
      <Link
        href={signedIn ? "/dashboard" : "/login"}
        className="mt-6 block rounded-full border border-[var(--wow-card-border)] bg-[var(--wow-chip)] py-3.5 text-center text-xs font-black uppercase tracking-widest text-[var(--wow-fg)] transition hover:scale-[1.02] hover:border-[#8b93ff]"
      >
        {signedIn ? "Go to Dashboard" : "Sign up free"}
      </Link>
    ) : !signedIn ? (
      <Link
        href="/login?next=/pricing"
        className="mt-6 block rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3] py-3.5 text-center text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_36px_-10px_rgba(255,47,179,0.7)] transition hover:scale-[1.02]"
      >
        Sign In to Upgrade
      </Link>
    ) : !hasWorkspace ? (
      <Link
        href="/w/create"
        className="mt-6 block rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3] py-3.5 text-center text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_36px_-10px_rgba(255,47,179,0.7)] transition hover:scale-[1.02]"
      >
        Create Workspace
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => plan.cta.kind === "checkout" && onCheckout(plan.cta.plan)}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3] py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_36px_-10px_rgba(255,47,179,0.7)] transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {checkoutLabel(loading, isCurrentPlan, `Upgrade to ${plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}`)}
      </button>
    );

  if (plan.spotlight === "best") {
    return (
      <div className="h-full rounded-[1.7rem] bg-gradient-to-b from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee] p-[1.5px] shadow-[0_20px_80px_-20px_rgba(255,47,179,0.55)] xl:scale-[1.03]">
        <div className="flex h-full flex-col gap-5 overflow-hidden rounded-[calc(1.7rem-1.5px)] bg-[var(--wow-bg-2)] p-6">
          {body}
          {action}
        </div>
      </div>
    );
  }

  if (plan.spotlight === "expert") {
    return (
      <div className="flex h-full flex-col gap-5 rounded-[1.7rem] bg-white p-6 text-[#0b0d12] shadow-[0_20px_80px_-24px_rgba(0,0,0,0.5)] transition hover:-translate-y-1">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="wow-font-display text-3xl text-[#0b0d12]">{plan.name}</h3>
            {plan.badges.map((b) => (
              <span key={b} className="rounded-md bg-[#0b0d12] px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wide text-white">
                ◆ {b}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[13px] text-black/60">{plan.tagline}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-black/60">{plan.blurb}</p>
        </div>
        <div>
          <p className="wow-font-display text-4xl tabular-nums md:text-5xl">Custom</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-black/50">/ tailored</p>
        </div>
        <div className="rounded-2xl bg-black/[0.04] p-3.5">
          <p className="flex items-center gap-1.5 text-[14px] font-extrabold">
            <Sparkles className="h-3.5 w-3.5 text-[#6d5ef0]" /> {plan.credits}
          </p>
          {plan.creditsSub && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black/50">— {plan.creditsSub}</p>
          )}
        </div>
        <ul className="flex-1 space-y-3 border-t border-black/10 pt-5">
          {plan.features.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {p}
            </li>
          ))}
        </ul>
        <a
          href="mailto:sales@interviewpad.dev?subject=Enterprise%20Plan%20Inquiry"
          className="mt-6 block rounded-full bg-[#0b0d12] py-3.5 text-center text-xs font-black uppercase tracking-widest text-white transition hover:scale-[1.02]"
        >
          Contact Sales
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#8b93ff]/50 hover:shadow-[0_20px_60px_-20px_rgba(139,147,255,0.45)]">
      {body}
      {action}
    </div>
  );
}

