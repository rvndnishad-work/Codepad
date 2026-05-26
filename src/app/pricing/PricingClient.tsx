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
  Award, 
  Globe, 
  ArrowRight, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  planName: string;
}

export default function PricingClient({
  workspaces,
  isSignedIn,
}: {
  workspaces: WorkspaceInfo[];
  isSignedIn: boolean;
}) {
  const [selectedWorkspaceSlug, setSelectedWorkspaceSlug] = useState<string>(
    workspaces[0]?.slug || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const router = useRouter();

  const handleCheckout = async (plan: "STARTER" | "GROWTH") => {
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

  // Dynamic price calculation
  const starterPrice = cadence === "monthly" ? 19 : 15;
  const growthPrice = cadence === "monthly" ? 49 : 39;

  return (
    <div className="bg-bg min-h-screen relative overflow-hidden py-20 md:py-28 font-sans">
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] -mb-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-xs font-black text-accent uppercase tracking-widest"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Recruiter seat billing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-black tracking-tight text-fg leading-tight"
          >
            Sleek plans for teams of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-400">any shape or scale.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted text-sm md:text-base leading-relaxed font-medium"
          >
            Equip your recruitment team with secure evaluation sandboxes, automated grading, 
            typing-rhythm anti-cheat heuristics, and direct ATS integrations. Cancel or adjust seats anytime.
          </motion.p>
        </div>

        {/* Billing Cadence Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs font-black uppercase tracking-wider transition-colors ${cadence === "monthly" ? "text-fg" : "text-muted"}`}>Monthly</span>
          <button
            type="button"
            onClick={() => setCadence(cadence === "monthly" ? "annual" : "monthly")}
            className="w-12 h-6 rounded-full bg-surface border border-border hover:bg-elevated relative p-1 transition-colors focus:outline-none"
            aria-label="Toggle billing cadence"
          >
            <div
              className={`w-4 h-4 rounded-full bg-accent transition-transform ${
                cadence === "annual" ? "translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${cadence === "annual" ? "text-fg" : "text-muted"}`}>
            Annual
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Save 20%
            </span>
          </span>
        </div>

        {/* Workspace Upgrade Selector Bar */}
        {isSignedIn && workspaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto p-5 rounded-2xl border border-border bg-surface/50 backdrop-blur-xl shadow-xl text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl" />
            <h3 className="text-xs font-black text-fg mb-3 flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              Upgrade Workspace: <span className="text-accent">{selectedWorkspace?.name}</span>
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedWorkspaceSlug}
                onChange={(e) => setSelectedWorkspaceSlug(e.target.value)}
                className="flex-1 w-full bg-panel border border-border rounded-xl px-4 py-3 text-sm font-semibold text-fg focus:outline-none focus:border-accent/50"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.slug}>
                    {w.name} ({w.planName === "GROWTH" ? "Growth Plan" : w.planName === "STARTER" ? "Starter Plan" : "Free Plan"})
                  </option>
                ))}
              </select>
            </div>
            {(isAlreadyGrowth || isAlreadyStarter) && (
              <p className="text-[10px] text-emerald-400 mt-2.5 font-bold flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                This workspace is currently on the active {selectedWorkspace?.planName} tier.
              </p>
            )}
          </motion.div>
        )}

        {/* Pricing Cards Subscription Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
          
          {/* Card 1: Free Trial */}
          <div className="rounded-3xl border border-border bg-panel/30 hover:border-border-strong transition-colors p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-muted mb-2">Sandbox Core</div>
                <h3 className="text-xl font-black text-fg">Free Trial</h3>
                <p className="text-muted text-xs leading-relaxed mt-2 font-medium">
                  Standard in-browser coding playground and sandboxed sharing tools.
                </p>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-fg">$0</span>
                <span className="text-muted text-xs font-semibold">/ month</span>
              </div>

              <div className="border-t border-border pt-4 space-y-3.5">
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">1 Workspace instance</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">Up to 3 team members</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">5 public challenges</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">Sandpack frontend runtimes</span>
                </div>
              </div>
            </div>

            <Link
              href={isSignedIn ? "/dashboard" : "/login"}
              className="block text-center w-full py-3.5 mt-6 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-xs font-black uppercase tracking-wider transition-all"
            >
              {isSignedIn ? "Go to Dashboard" : "Sign up free"}
            </Link>
          </div>

          {/* Card 2: Starter Plan */}
          <div className="rounded-3xl border border-border bg-panel/30 hover:border-border-strong transition-colors p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-muted mb-2">Solo Hiring</div>
                <h3 className="text-xl font-black text-fg">Starter</h3>
                <p className="text-muted text-xs leading-relaxed mt-2 font-medium">
                  Ideal for solo recruiters and boutique agencies needing core screening.
                </p>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-fg">${starterPrice}</span>
                <span className="text-muted text-xs font-semibold">/ seat / month</span>
              </div>

              <div className="border-t border-border pt-4 space-y-3.5">
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">Up to 5 team members</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">25 candidates / month</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">Standard blur & paste proctoring</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 font-medium">Manual scorecards & rubrics</span>
                </div>
              </div>
            </div>

            {isSignedIn ? (
              workspaces.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleCheckout("STARTER")}
                  disabled={isLoading}
                  className={`block text-center w-full py-3.5 mt-6 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                    isAlreadyStarter
                      ? "bg-bg border-border text-muted hover:text-fg hover:bg-surface"
                      : "bg-surface border-border hover:bg-elevated text-fg"
                  }`}
                >
                  {isLoading ? "Loading..." : isAlreadyStarter ? "Manage billing" : "Upgrade to Starter"}
                </button>
              ) : (
                <Link
                  href="/w/create"
                  className="block text-center w-full py-3.5 mt-6 rounded-xl bg-surface border border-border text-fg text-xs font-black uppercase tracking-wider"
                >
                  Create Workspace
                </Link>
              )
            ) : (
              <Link
                href="/login?next=/pricing"
                className="block text-center w-full py-3.5 mt-6 rounded-xl bg-surface border border-border text-fg text-xs font-black uppercase tracking-wider"
              >
                Sign In to Upgrade
              </Link>
            )}
          </div>

          {/* Card 3: Growth Plan (Popular) */}
          <div className="rounded-3xl border border-accent/40 bg-gradient-to-b from-accent/[0.03] to-transparent p-6 flex flex-col justify-between relative overflow-hidden shadow-xl scale-[1.02]">
            <div className="absolute top-0 right-0 bg-accent text-bg text-[8px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-xl">
              Most Popular
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-accent mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  Enterprise SaaS
                </div>
                <h3 className="text-xl font-black text-fg">Growth Plan</h3>
                <p className="text-muted text-xs leading-relaxed mt-2 font-medium">
                  Advanced automated testing, integrations, and full AI proctoring telemetry.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-fg">${growthPrice}</span>
                <span className="text-muted text-xs font-semibold">/ seat / month</span>
              </div>

              <div className="border-t border-border pt-4 space-y-3.5">
                <div className="flex gap-2.5 items-start font-bold">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg leading-tight">Unlimited candidates / assessments</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">Keystroke rhythm AI plagiarism checks</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">Monaco timeline player replay</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">Greenhouse, Lever, & Ashby sync</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">
                    AI Screening + <a href="/docs/mcp" className="text-accent underline underline-offset-2">MCP API</a> (talk to your pipeline from Claude/Cursor)
                  </span>
                </div>
              </div>
            </div>

            {isSignedIn ? (
              workspaces.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleCheckout("GROWTH")}
                  disabled={isLoading}
                  className={`block text-center w-full py-3.5 mt-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    isAlreadyGrowth
                      ? "bg-bg border border-border text-muted hover:text-fg"
                      : "bg-accent text-bg hover:brightness-95 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]"
                  }`}
                >
                  {isLoading ? "Loading..." : isAlreadyGrowth ? "Manage billing" : "Upgrade to Growth"}
                </button>
              ) : (
                <Link
                  href="/w/create"
                  className="block text-center w-full py-3.5 mt-6 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider"
                >
                  Create Workspace
                </Link>
              )
            ) : (
              <Link
                href="/login?next=/pricing"
                className="block text-center w-full py-3.5 mt-6 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider"
              >
                Sign In to Upgrade
              </Link>
            )}
          </div>

          {/* Card 4: Enterprise */}
          <div className="rounded-3xl border border-border bg-panel/30 hover:border-border-strong transition-colors p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-muted mb-2">Enterprise Scale</div>
                <h3 className="text-xl font-black text-fg">Enterprise</h3>
                <p className="text-muted text-xs leading-relaxed mt-2 font-medium">
                  High-scale VM execution engines, SSO integrations, and custom SLAs.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-fg">Custom</span>
                <span className="text-muted text-xs font-semibold">/ scale</span>
              </div>

              <div className="border-t border-border pt-4 space-y-3.5">
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">SSO, SAML & audit logs sync</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">Full calendar OAuth integration</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">Dedicated warm Docker virtual machines</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs text-fg/80 leading-tight">24/7 dedicated support CSM & custom SLA</span>
                </div>
              </div>
            </div>

            <a
              href="mailto:sales@interviewpad.dev?subject=Enterprise%20Plan%20Inquiry"
              className="block text-center w-full py-3.5 mt-6 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-xs font-black uppercase tracking-wider transition-all"
            >
              Contact Sales
            </a>
          </div>

        </div>

        {/* Feature Comparison Matrix */}
        <div className="border-t border-border pt-16 space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-fg">Feature Comparison Matrix</h2>
            <p className="text-xs text-muted">A comprehensive breakdown of all features across our tiers.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-panel/20 backdrop-blur-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-panel/50">
                  <th className="p-4 font-black text-muted uppercase tracking-wider w-1/3">Feature</th>
                  <th className="p-4 font-black text-muted uppercase tracking-wider text-center">Free Trial</th>
                  <th className="p-4 font-black text-muted uppercase tracking-wider text-center bg-indigo-500/[0.02]">Starter</th>
                  <th className="p-4 font-black text-muted uppercase tracking-wider text-center bg-accent/[0.02]">Growth</th>
                  <th className="p-4 font-black text-muted uppercase tracking-wider text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-4 font-bold text-fg">Teammate seats</td>
                  <td className="p-4 text-center text-muted">Up to 3</td>
                  <td className="p-4 text-center text-fg font-semibold bg-indigo-500/[0.02]">Up to 5</td>
                  <td className="p-4 text-center text-fg font-semibold bg-accent/[0.02]">Unlimited (Metered)</td>
                  <td className="p-4 text-center text-fg font-semibold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-fg">Candidates / Month</td>
                  <td className="p-4 text-center text-muted">5 total</td>
                  <td className="p-4 text-center text-fg font-semibold bg-indigo-500/[0.02]">25 / mo</td>
                  <td className="p-4 text-center text-fg font-semibold bg-accent/[0.02]">Unlimited</td>
                  <td className="p-4 text-center text-fg font-semibold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-fg">Proctoring Telemetry</td>
                  <td className="p-4 text-center text-muted">—</td>
                  <td className="p-4 text-center text-fg bg-indigo-500/[0.02]">Standard blur & paste</td>
                  <td className="p-4 text-center text-fg font-bold bg-accent/[0.02]">Advanced AI keystroke check</td>
                  <td className="p-4 text-center text-fg font-bold">Advanced + Dedicated VM log</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-fg">Session timeline replay</td>
                  <td className="p-4 text-center text-muted">—</td>
                  <td className="p-4 text-center text-muted bg-indigo-500/[0.02]">—</td>
                  <td className="p-4 text-center text-emerald-400 font-bold bg-accent/[0.02]">Yes (Full Monaco Replay)</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">Yes (Full Monaco Replay)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-fg">ATS sync integration</td>
                  <td className="p-4 text-center text-muted">—</td>
                  <td className="p-4 text-center text-muted bg-indigo-500/[0.02]">—</td>
                  <td className="p-4 text-center text-fg bg-accent/[0.02]">Yes (Standard webhook sync)</td>
                  <td className="p-4 text-center text-fg font-bold">Custom Harvest API</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-fg">SSO / SAML login</td>
                  <td className="p-4 text-center text-muted">—</td>
                  <td className="p-4 text-center text-muted bg-indigo-500/[0.02]">—</td>
                  <td className="p-4 text-center text-muted bg-accent/[0.02]">—</td>
                  <td className="p-4 text-center text-emerald-400 font-bold">Yes (OIDC & SAML)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-fg">Support tier</td>
                  <td className="p-4 text-center text-muted">Community</td>
                  <td className="p-4 text-center text-fg bg-indigo-500/[0.02]">Email support</td>
                  <td className="p-4 text-center text-fg font-bold bg-accent/[0.02]">Priority (24h)</td>
                  <td className="p-4 text-center text-fg font-bold">24/7 Dedicated CSM + custom MSA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="border-t border-border pt-16 max-w-4xl mx-auto space-y-10">
          <div className="text-center">
            <h2 className="text-2xl font-black text-fg">Frequently Asked Questions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent shrink-0" />
                How does seat-based metered billing work?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                SaaS plans are billed based on the number of teammate seats in your workspace. When you invite 
                additional teammates, Stripe dynamically increments the license quantity and adjusts your billing. 
                Evicting a member automatically scales down the Stripe seats instantly.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent shrink-0" />
                Do candidates take up paid seats?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                No. Candidates taking a live panel or take-home assignment do not require accounts or seats. 
                They hold guest assessment credentials through their individual tokens. You only pay for recruiter/interviewer seats.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent shrink-0" />
                Can I manage my subscription?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                Absolutely. Clicking 'Manage billing' inside your workspace billing panel redirects you directly to the 
                Stripe Customer Billing Portal, where you can modify credit cards, review past invoices, and adjust configurations.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent shrink-0" />
                What languages are supported in VM sandboxes?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                Enterprise custom tier sandboxes natively run secure Node.js, Python, Go, and Java shell compilations. 
                The standard Starter & Growth tiers run Javascript, Typescript, and modern frontend frameworks directly inside browser workers.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
