"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { startOnboardingAction } from "./actions";

export default function OnboardingCard({ hasAccount }: { hasAccount: boolean }) {
  const [busy, setBusy] = useState(false);

  async function onboard() {
    setBusy(true);
    try {
      const url = await startOnboardingAction();
      window.location.assign(url);
    } catch (err) {
      toast.error("Couldn't start onboarding", {
        description: err instanceof Error ? err.message : String(err),
      });
      setBusy(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-accent-glow p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-surface border border-accent/25 grid place-items-center text-accent shadow-tile shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-fg">Set up payouts</div>
            <p className="text-xs text-muted mt-0.5">
              {hasAccount
                ? "Finish Stripe onboarding to start selling your content."
                : "Connect Stripe to receive payments from memberships and sales."}
            </p>
          </div>
        </div>
        <button
          onClick={onboard}
          disabled={busy}
          className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Redirecting…" : hasAccount ? "Continue onboarding" : "Start onboarding"}
        </button>
      </div>
    </div>
  );
}
