"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, Sparkles, Loader2 } from "lucide-react";
import { buyContentAction, subscribeTierAction } from "./actions";

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

async function go(start: () => Promise<string>, onErr: () => void) {
  try {
    const url = await start();
    window.location.assign(url);
  } catch (err) {
    toast.error("Couldn't start checkout", {
      description: err instanceof Error ? err.message : String(err),
    });
    onErr();
  }
}

/** One-time purchase of a specific item. */
export function BuyContentButton({
  spaceContentId,
  priceCents,
  currency = "usd",
}: {
  spaceContentId: string;
  priceCents: number;
  currency?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => {
        setBusy(true);
        go(() => buyContentAction(spaceContentId), () => setBusy(false));
      }}
      disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-sm font-bold transition-colors disabled:opacity-60"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
      Buy · {money(priceCents, currency)}
    </button>
  );
}

/** Subscribe to a membership tier (recurring). */
export function SubscribeButton({
  tierId,
  name,
  priceCents,
  currency = "usd",
}: {
  tierId: string;
  name: string;
  priceCents: number;
  currency?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => {
        setBusy(true);
        go(() => subscribeTierAction(tierId), () => setBusy(false));
      }}
      disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/40 bg-accent/[0.06] hover:bg-accent/10 text-fg text-sm font-bold transition-colors disabled:opacity-60"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
      {name} · {money(priceCents, currency)}/mo
    </button>
  );
}
