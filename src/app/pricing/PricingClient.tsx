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
  const router = useRouter();

  const handleCheckout = async () => {
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

  return (
    <div className="bg-bg min-h-screen relative overflow-hidden py-20 md:py-28">
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb),0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] -mb-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-xs font-black text-accent mb-6 uppercase tracking-widest"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Recruiter seat billing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-fg mb-6 leading-tight"
          >
            Simple, per-seat <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">metered pricing.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted text-base md:text-lg leading-relaxed font-medium"
          >
            Equip your recruitment team with secure evaluation sandboxes, automated grading, 
            AI plagiarism checks, and direct ATS integrations. Cancel or adjust seats anytime.
          </motion.p>
        </div>

        {/* Workspace Upgrade Selector Bar */}
        {isSignedIn && workspaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto mb-16 p-5 rounded-2xl border border-accent/25 bg-surface/50 backdrop-blur-xl shadow-[0_4px_30px_rgba(var(--accent-rgb),0.05)] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl" />
            <h3 className="text-sm font-black text-fg mb-3 flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              Select Workspace to Manage / Upgrade
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedWorkspaceSlug}
                onChange={(e) => setSelectedWorkspaceSlug(e.target.value)}
                className="flex-1 w-full bg-panel border border-border rounded-xl px-4 py-3 text-sm font-semibold text-fg focus:outline-none focus:border-accent/50"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.slug}>
                    {w.name} ({w.planName === "GROWTH" ? "Growth Plan" : "Free Plan"})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-bg font-bold text-sm hover:brightness-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                {isLoading ? (
                  <>
                    Loading <Loader2 className="w-4 h-4 animate-spin" />
                  </>
                ) : isAlreadyGrowth ? (
                  "Manage billing portal"
                ) : (
                  "Upgrade workspace"
                )}
              </button>
            </div>
            {isAlreadyGrowth && (
              <p className="text-[11px] text-emerald-400 mt-2 font-bold flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                This workspace is already on the premium Growth plan.
              </p>
            )}
          </motion.div>
        )}

        {/* Pricing Cards Subscription Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
          
          {/* Card 1: Free Trial */}
          <div className="rounded-3xl border border-border bg-panel/30 hover:border-border-strong transition-colors p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="text-xs uppercase tracking-widest font-black text-muted mb-4">Sandbox Core</div>
              <h3 className="text-2xl font-black text-fg mb-2">Free Trial</h3>
              <p className="text-muted text-xs leading-relaxed mb-6 font-medium">
                Standard in-browser coding playground and sandboxed sharing tools.
              </p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl md:text-5xl font-black text-fg">$0</span>
                <span className="text-muted text-sm font-semibold">/ month</span>
              </div>

              <div className="border-t border-border pt-6 space-y-4 mb-8">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 font-medium">1 Workspace instance</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 font-medium">Up to 3 team members</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 font-medium">Standard stopwatch testing</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 font-medium">5 public challenges</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 font-medium">Sandpack frontend runtimes</span>
                </div>
              </div>
            </div>

            <Link
              href={isSignedIn ? "/dashboard" : "/login"}
              className="block text-center w-full py-4 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-sm font-black transition-all"
            >
              {isSignedIn ? "Go to Dashboard" : "Sign up free"}
            </Link>
          </div>

          {/* Card 2: Growth Plan (Popular) */}
          <div className="rounded-3xl border border-accent/40 bg-gradient-to-b from-accent/5 to-transparent p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_8px_40px_rgba(var(--accent-rgb),0.1)] scale-[1.03] md:-translate-y-1">
            <div className="absolute top-0 right-0 bg-accent text-bg text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-bl-2xl">
              Most Popular
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest font-black text-accent mb-4 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Recruiter SaaS
              </div>
              <h3 className="text-2xl font-black text-fg mb-2">Growth Plan</h3>
              <p className="text-muted text-xs leading-relaxed mb-6 font-medium">
                Advanced proctoring, autograders, and teammate subscriptions.
              </p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl md:text-5xl font-black text-fg">$49</span>
                <span className="text-muted text-xs md:text-sm font-semibold">/ seat / month</span>
              </div>

              <div className="border-t border-border pt-6 space-y-4 mb-8">
                <div className="flex gap-3 items-start font-bold">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg leading-relaxed">Unlimited candidates & assessments</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">Structured 1-5 rubrics scorecard</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">AI Proctoring (tab-blurs & pastes)</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">Monaco session timeline replay player</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">Greenhouse, Lever, & Ashby webhooks</span>
                </div>
              </div>
            </div>

            {isSignedIn ? (
              workspaces.length > 0 ? (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl bg-accent text-bg text-sm font-black hover:brightness-95 transition-all shadow-[0_0_30px_rgba(var(--accent-rgb),0.25)] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      Redirecting <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : isAlreadyGrowth ? (
                    "Manage Subscription"
                  ) : (
                    "Upgrade Selected Workspace"
                  )}
                </button>
              ) : (
                <Link
                  href="/w/create"
                  className="block text-center w-full py-4 rounded-xl bg-accent text-bg text-sm font-black hover:brightness-95 transition-all shadow-[0_0_30px_rgba(var(--accent-rgb),0.25)]"
                >
                  Create Workspace to Upgrade
                </Link>
              )
            ) : (
              <Link
                href="/login?next=/pricing"
                className="block text-center w-full py-4 rounded-xl bg-accent text-bg text-sm font-black hover:brightness-95 transition-all shadow-[0_0_30px_rgba(var(--accent-rgb),0.25)]"
              >
                Sign In to Upgrade
              </Link>
            )}
          </div>

          {/* Card 3: Enterprise */}
          <div className="rounded-3xl border border-border bg-panel/30 hover:border-border-strong transition-colors p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="text-xs uppercase tracking-widest font-black text-muted mb-4">Enterprise Custom</div>
              <h3 className="text-2xl font-black text-fg mb-2">Enterprise Plan</h3>
              <p className="text-muted text-xs leading-relaxed mb-6 font-medium">
                High-scale VM execution engines and customized legal API keys.
              </p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl md:text-5xl font-black text-fg">Custom</span>
                <span className="text-muted text-xs md:text-sm font-semibold">/ scale</span>
              </div>

              <div className="border-t border-border pt-6 space-y-4 mb-8">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">Full Google/Outlook calendar OAuth sync</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">Lever & Greenhouse Harvest write APIs</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">S3 PDF summaries with custom branding</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">Multi-language warm docker virtual machines</span>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-fg/80 leading-relaxed">24/7 dedicated support SLA & custom MSA</span>
                </div>
              </div>
            </div>

            <a
              href="mailto:sales@interviewpad.dev?subject=Enterprise%20Plan%20Inquiry"
              className="block text-center w-full py-4 rounded-xl border border-border bg-surface hover:bg-elevated text-fg text-sm font-black transition-all"
            >
              Contact Sales
            </a>
          </div>

        </div>

        {/* Seat Scale Billing Explanation FAQ */}
        <div className="border-t border-border pt-20 max-w-4xl mx-auto mb-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-fg">Seat Billing & Scaling FAQs</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-black text-fg mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent" />
                How does seat-based metered billing work?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                The Growth plan is billed based on the number of teammate seats in your workspace. When you invite 
                additional teammates, Stripe dynamically increments the license quantity and adjusts your billing. 
                Evicting a member automatically scales down the Stripe seats instantly.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-black text-fg mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent" />
                Do candidates take up paid seats?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                No. Candidates taking a live panel or take-home assignment do not require accounts or seats. 
                They hold guest assessment credentials through their individual tokens. You only pay for recruiter/interviewer seats.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-black text-fg mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent" />
                Can I manage my subscription?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                Absolutely. Clicking 'Manage billing' inside your workspace billing panel redirects you directly to the 
                Stripe Customer Billing Portal, where you can modify credit cards, review past invoices, and adjust configurations.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-black text-fg mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-accent" />
                What languages are supported inVM sandboxes?
              </h4>
              <p className="text-xs md:text-sm text-muted leading-relaxed font-medium">
                Enterprise custom tier sandboxes natively run secure Node.js, Python, Go, and Java shell compilations. 
                The standard Growth tier runs Javascript, Typescript, and modern frontend frameworks directly inside browser workers.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
