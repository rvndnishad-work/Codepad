"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncStripeNow } from "./actions";

/** Small link-style button that runs the Stripe snapshot now. */
export default function SyncStripeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncStripeNow();
            setMsg(r.ok ? (r.failed ? `${r.failed} failed` : "Synced") : r.error);
            if (r.ok) router.refresh();
          })
        }
        className="text-xs font-medium text-secondary underline-offset-2 hover:underline disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {msg && !pending && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
