"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Trash2, Plus, Pencil, X, Check, Loader2 } from "lucide-react";
import {
  createTierAction,
  updateTierAction,
  setTierPublishedAction,
  deleteTierAction,
} from "../../actions";

export type TierRow = {
  id: string;
  name: string;
  description: string | null;
  benefits: string[];
  rank: number;
  priceCents: number;
  currency: string;
  published: boolean;
  hasStripePrice: boolean;
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

/** One benefit per line — the public page renders these as a checklist. */
function BenefitsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="What members get (one per line)">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={"All members-only tutorials\nNew content notifications\nEarly access to new series"}
        className={`${inputCls} font-normal leading-relaxed`}
      />
    </Field>
  );
}

export default function TiersManager({ spaceId, tiers }: { spaceId: string; tiers: TierRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rank, setRank] = useState(String((tiers.at(-1)?.rank ?? 0) + 1));
  const [price, setPrice] = useState("9.00");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function createTier() {
    setBusy(true);
    try {
      await createTierAction(spaceId, {
        name,
        rank: parseInt(rank, 10),
        priceCents: Math.round(parseFloat(price) * 100),
        description: description || undefined,
        benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean),
      });
      toast.success("Membership tier created.");
      setName("");
      setDescription("");
      setBenefits("");
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
          <p className="text-[11px] text-muted mt-0.5">
            Monthly subscriptions — the benefits list is what sells the tier on your public page.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-2.5">
        {tiers.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
            No tiers yet — add your first membership tier below.
          </div>
        )}
        {tiers.map((t) =>
          editingId === t.id ? (
            <TierEditForm
              key={t.id}
              spaceId={spaceId}
              tier={t}
              onClose={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-bg/50 px-3.5 py-3 transition-colors hover:border-accent/25"
            >
              <div className="flex items-center gap-3">
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
                    onClick={() => setEditingId(t.id)}
                    className="w-7 h-7 rounded-lg text-muted hover:text-fg hover:bg-panel/60 grid place-items-center transition-colors"
                    title="Edit tier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
              {(t.description || t.benefits.length > 0) && (
                <div className="mt-2 pl-11 space-y-1">
                  {t.description && <p className="text-[11px] text-muted">{t.description}</p>}
                  {t.benefits.length > 0 && (
                    <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {t.benefits.map((b, i) => (
                        <li key={i} className="text-[10px] text-muted flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 text-emerald-500" /> {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ),
        )}

        {/* Create form */}
        <div className="pt-3 border-t border-border mt-3 space-y-3">
          <div className="grid grid-cols-[1fr_60px_84px] gap-2">
            <Field label="Tier name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" className={inputCls} />
            </Field>
            <Field label="Rank">
              <input value={rank} onChange={(e) => setRank(e.target.value)} className={inputCls} />
            </Field>
            <Field label="$/month">
              <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="One-line pitch (optional)">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Everything, including deep-dive interview loops."
              className={inputCls}
            />
          </Field>
          <BenefitsField value={benefits} onChange={setBenefits} />
          <button
            onClick={createTier}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add tier
          </button>
        </div>
      </div>
    </section>
  );
}

function TierEditForm({
  spaceId,
  tier,
  onClose,
  onSaved,
}: {
  spaceId: string;
  tier: TierRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tier.name);
  const [description, setDescription] = useState(tier.description ?? "");
  const [benefits, setBenefits] = useState(tier.benefits.join("\n"));
  const [price, setPrice] = useState((tier.priceCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateTierAction(spaceId, tier.id, {
        name,
        description: description || null,
        benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean),
        ...(tier.hasStripePrice ? {} : { priceCents: Math.round(parseFloat(price) * 100) }),
      });
      toast.success("Tier updated.");
      onSaved();
    } catch (err) {
      toast.error("Update failed", { description: err instanceof Error ? err.message : String(err) });
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-bg/50 px-3.5 py-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Editing “{tier.name}”</span>
        <button onClick={onClose} className="w-6 h-6 rounded text-muted hover:text-fg grid place-items-center" title="Cancel">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-2">
        <Field label="Tier name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="$/month">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={tier.hasStripePrice}
            title={tier.hasStripePrice ? "Live Stripe pricing — create a new tier for a new price" : undefined}
            className={`${inputCls} disabled:opacity-50`}
          />
        </Field>
      </div>
      <Field label="One-line pitch">
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </Field>
      <BenefitsField value={benefits} onChange={setBenefits} />
      <button
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save tier
      </button>
    </div>
  );
}
