"use client";

import { useState, useTransition } from "react";
import { setSwitchoverAction } from "./actions";

export type SwitchoverStatus = {
  at: string | null;
  plansOn: boolean;
  /** Workspaces in each group today, and how many have had notice. */
  counts: { free: number; stripe: number; prepaid: number; noticed: number; paused: number };
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Starts the 30-day move of existing workspaces to the new plans. */
export default function SwitchoverControl({ initial }: { initial: SwitchoverStatus }) {
  const [at, setAt] = useState(initial.at);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const passed = at ? new Date(at).getTime() <= Date.now() : false;
  const c = initial.counts;

  const act = (go: boolean) => {
    const msg = go
      ? `Start the move? Every workspace on the old pricing gets 30 days' notice by email: ${c.free} free or trial, ${c.stripe} on Stripe, ${c.prepaid} on prepaid Growth. This cannot be unsent.`
      : "Call off the move? Notices already sent stay sent, so tell those customers yourself.";
    if (!window.confirm(msg)) return;
    setError(null);
    start(async () => {
      const res = await setSwitchoverAction(go);
      if (res.ok) setAt(res.at);
      else setError(res.error);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-fg">Move existing workspaces to the new plans</p>
          <p className="text-muted max-w-2xl">
            {!at
              ? "Not started. Starting gives every workspace on the old pricing 30 days' notice. On the date, Stripe subscriptions end at their period end (never cut short), prepaid Growth runs to its end, and workspaces nothing pays for pause until they choose a plan."
              : passed
                ? `Done on ${fmt(at)}. The hourly sweep keeps ending Stripe subscriptions at period end and pausing workspaces whose paid time runs out.`
                : `Notice period. The move happens on ${fmt(at)}. Notices go out hourly, ${c.noticed} sent so far.`}
          </p>
          <p className="mt-1 text-muted">
            Today: {c.free} free or trial, {c.stripe} on Stripe, {c.prepaid} on prepaid Growth, {c.paused} paused.
          </p>
          {error && <p className="mt-1 text-danger">{error}</p>}
        </div>
        {!at ? (
          <button
            type="button"
            disabled={pending || !initial.plansOn}
            onClick={() => act(true)}
            title={initial.plansOn ? undefined : "Put the new plans on sale first"}
            className="h-9 px-3.5 rounded-lg border border-border bg-bg text-[13px] font-medium text-fg disabled:opacity-60"
          >
            {pending ? "Starting…" : "Start the 30-day move"}
          </button>
        ) : !passed ? (
          <button type="button" disabled={pending} onClick={() => act(false)} className="h-9 px-3.5 rounded-lg border border-border bg-bg text-[13px] font-medium text-muted disabled:opacity-60">
            {pending ? "Calling off…" : "Call off"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
