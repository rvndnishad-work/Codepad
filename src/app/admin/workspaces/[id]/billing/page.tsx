import { CreditCard } from "lucide-react";

export const metadata = {
  title: "Workspace billing — Interviewpad Admin",
};

export default function WorkspaceBillingPage() {
  return (
    <div className="rounded-xl border border-border bg-surface p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-3">
        <CreditCard className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-fg">Billing — coming soon</p>
      <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
        Stripe invoices, seat history, plan changes, and metered usage will appear here.
      </p>
    </div>
  );
}
