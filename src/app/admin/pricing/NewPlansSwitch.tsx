"use client";

import { useState, useTransition } from "react";
import { setNewPlansAction } from "./actions";

/** The launch switch for buying the new plans from Billing. */
export default function NewPlansSwitch({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flip = () => {
    const next = !on;
    if (next && !window.confirm("Turn on the new plans? Owners and admins will be able to buy Basic, Growth and Teams from Billing, charged through Razorpay.")) return;
    setError(null);
    start(async () => {
      const res = await setNewPlansAction(next);
      if (res.ok) setOn(res.on);
      else setError(res.error);
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="text-sm">
        <p className="font-medium text-fg">Sell the new plans on Billing</p>
        <p className="text-muted">
          {on
            ? "On. Workspace owners and admins can buy Basic, Growth and Teams. Payments already made are always applied."
            : "Off. Nobody can buy the new plans yet. Payments already made are still applied, and plans already bought keep running."}
        </p>
        {error && <p className="mt-1 text-danger">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Sell the new plans on Billing"
        disabled={pending}
        onClick={flip}
        className={`h-9 px-3.5 rounded-lg border text-[13px] font-medium ${on ? "border-secondary/60 bg-secondary/10 text-fg" : "border-border bg-bg text-muted"} disabled:opacity-60`}
      >
        {pending ? "Saving…" : on ? "On" : "Off"}
      </button>
    </div>
  );
}
