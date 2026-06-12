"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Trash2, Plus } from "lucide-react";
import {
  createTierAction,
  setTierPublishedAction,
  deleteTierAction,
} from "../../actions";

export type TierRow = {
  id: string;
  name: string;
  rank: number;
  priceCents: number;
  currency: string;
  published: boolean;
};

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-sm transition-colors placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function TiersManager({ spaceId, tiers }: { spaceId: string; tiers: TierRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [price, setPrice] = useState("9.00");
  const [busy, setBusy] = useState(false);

  async function createTier() {
    setBusy(true);
    try {
      await createTierAction(spaceId, {
        name,
        rank: parseInt(rank, 10),
        priceCents: Math.round(parseFloat(price) * 100),
      });
      toast.success("Membership tier created.");
      setName("");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't create tier", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(tierId: string, published: boolean) {
    try {
      await setTierPublishedAction(spaceId, tierId, published);
      toast.success(published ? "Tier published." : "Tier unpublished.");
      router.refresh();
    } catch (err) {
      toast.error("Action failed", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  async function remove(tierId: string) {
    try {
      await deleteTierAction(spaceId, tierId);
      toast.success("Tier deleted.");
      router.refresh();
    } catch (err) {
      toast.error("Delete failed", { description: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-tile">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-fg leading-tight">Membership tiers</h2>
          <p className="text-[11px] text-muted mt-0.5">Monthly subscriptions your audience can join</p>
        </div>
      </div>

      <div className="p-5 space-y-2.5">
        {tiers.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
            No tiers yet — add your first membership tier below.
          </div>
        )}
        {tiers.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg/50 px-3.5 py-3 transition-colors hover:border-accent/25"
          >
            <div className="w-8 h-8 rounded-lg bg-panel border border-border grid place-items-center text-[10px] font-black text-accent shrink-0">
              {t.rank}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-fg truncate">{t.name}</div>
              <div className="text-[11px] text-muted">{money(t.priceCents, t.currency)}/month</div>
            </div>
            <span
              className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                t.published ? "text-emerald-500 bg-emerald-500/10" : "text-muted bg-panel/80"
              }`}
            >
              {t.published ? "Live" : "Draft"}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => toggle(t.id, !t.published)}
                className="px-2.5 py-1 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg hover:border-border-strong transition-colors"
              >
                {t.published ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={() => remove(t.id)}
                className="w-7 h-7 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 grid place-items-center transition-colors"
                title="Delete tier"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-[1fr_60px_84px_auto] gap-2 items-end pt-3 border-t border-border mt-3">
          <Field label="Tier name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" className={inputCls} />
          </Field>
          <Field label="Rank">
            <input value={rank} onChange={(e) => setRank(e.target.value)} className={inputCls} />
          </Field>
          <Field label="$/month">
            <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <button
            onClick={createTier}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </section>
  );
}
