"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, Lock, RotateCcw, Save } from "lucide-react";
import { PLAN_ORDER, formatUsd, type WorkspacePlanKey } from "@/lib/billing/plans";
import { PRICING_COPY_LIMITS, applyPricingCopy, type PricingCopy } from "@/lib/billing/pricing-copy";
import { DEFAULT_PRICES, PRICE_BOUNDS, resolvePrices, type EffectivePrices, type PriceOverrides } from "@/lib/billing/prices";
import { PUBLIC_CREDIT_PACKS, PUBLIC_PLANS } from "@/lib/billing/public-pricing";
import { resetPricingCopy, savePricingCopy } from "./actions";

/* ------------------------------------------------------------------ */
/* Form state: plain strings, "" means "use the default".             */
/* ------------------------------------------------------------------ */

type PlanFields = { name: string; audience: string; includes: string };
type PackFields = { credits: string; price: string; badge: string; hideBadge: boolean };
type FormState = {
  plans: Record<WorkspacePlanKey, PlanFields>;
  recommended: WorkspacePlanKey;
  growthMonthly: string;
  growthAnnual: string;
  videoMonthly: string;
  videoAnnual: string;
  packs: Record<string, PackFields>;
};

const DEFAULT_PLANS = Object.fromEntries(PUBLIC_PLANS.map((p) => [p.key, p])) as Record<WorkspacePlanKey, (typeof PUBLIC_PLANS)[number]>;
const DEFAULT_RECOMMENDED: WorkspacePlanKey = PUBLIC_PLANS.find((p) => p.recommended)?.key ?? "GROWTH";
const DEFAULT_BADGES = Object.fromEntries(PUBLIC_CREDIT_PACKS.map((p) => [p.id, p.badge]));

const centsText = (c: number | undefined) => (c === undefined ? "" : (c / 100).toFixed(c % 100 === 0 ? 0 : 2));

function toState(copy: PricingCopy, prices: PriceOverrides): FormState {
  const plans = {} as Record<WorkspacePlanKey, PlanFields>;
  for (const key of PLAN_ORDER) {
    const c = copy.plans?.[key];
    plans[key] = { name: c?.name ?? "", audience: c?.audience ?? "", includes: c?.includes?.join("\n") ?? "" };
  }
  const packs: Record<string, PackFields> = {};
  for (const p of DEFAULT_PRICES.packs) {
    const o = prices.packs?.[p.id];
    const badge = copy.packBadges?.[p.id];
    packs[p.id] = {
      credits: o?.credits !== undefined ? String(o.credits) : "",
      price: centsText(o?.priceCents),
      badge: typeof badge === "string" ? badge : "",
      hideBadge: badge === null,
    };
  }
  return {
    plans,
    recommended: PLAN_ORDER.find((k) => copy.plans?.[k]?.recommended) ?? DEFAULT_RECOMMENDED,
    growthMonthly: centsText(prices.growth?.monthlyCents),
    growthAnnual: centsText(prices.growth?.annualMonthlyCents),
    videoMonthly: centsText(prices.videoAddon?.monthlyCents),
    videoAnnual: centsText(prices.videoAddon?.annualCents),
    packs,
  };
}

/** "" -> undefined; "49" / "49.5" / "49.50" -> cents; anything else -> NaN. */
function parseDollars(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return Number.NaN;
  return Math.round(Number(t) * 100);
}

function parseCount(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

function inBounds(v: number | undefined, b: { min: number; max: number }) {
  return v === undefined || (Number.isInteger(v) && v >= b.min && v <= b.max);
}

type Built = { copy: PricingCopy; prices: PriceOverrides; errors: Record<string, string> };

function build(s: FormState): Built {
  const errors: Record<string, string> = {};
  const range = (b: { min: number; max: number }) => `Use ${formatUsd(b.min)} to ${formatUsd(b.max)}.`;

  const copyPlans: NonNullable<PricingCopy["plans"]> = {};
  for (const key of PLAN_ORDER) {
    const f = s.plans[key];
    const c: NonNullable<NonNullable<PricingCopy["plans"]>[WorkspacePlanKey]> = {};
    if (f.name.trim()) c.name = f.name.trim();
    if (f.audience.trim()) c.audience = f.audience.trim();
    const lines = f.includes.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length) c.includes = lines;
    if (s.recommended !== DEFAULT_RECOMMENDED && s.recommended === key) c.recommended = true;
    if (Object.keys(c).length) copyPlans[key] = c;
  }
  const packBadges: Record<string, string | null> = {};
  const packPrices: NonNullable<PriceOverrides["packs"]> = {};
  for (const p of DEFAULT_PRICES.packs) {
    const f = s.packs[p.id];
    if (f.hideBadge) packBadges[p.id] = null;
    else if (f.badge.trim()) packBadges[p.id] = f.badge.trim();
    const credits = parseCount(f.credits);
    const priceCents = parseDollars(f.price);
    if (!inBounds(credits, PRICE_BOUNDS.packCredits))
      errors[`pack.${p.id}.credits`] = `Whole number, 1 to ${PRICE_BOUNDS.packCredits.max.toLocaleString("en-US")}.`;
    if (!inBounds(priceCents, PRICE_BOUNDS.packPriceCents)) errors[`pack.${p.id}.price`] = range(PRICE_BOUNDS.packPriceCents);
    const o: { credits?: number; priceCents?: number } = {};
    if (credits !== undefined && !Number.isNaN(credits)) o.credits = credits;
    if (priceCents !== undefined && !Number.isNaN(priceCents)) o.priceCents = priceCents;
    if (Object.keys(o).length) packPrices[p.id] = o;
  }

  const gm = parseDollars(s.growthMonthly);
  const ga = parseDollars(s.growthAnnual);
  if (!inBounds(gm, PRICE_BOUNDS.seatCents)) errors.growthMonthly = range(PRICE_BOUNDS.seatCents);
  if (!inBounds(ga, PRICE_BOUNDS.seatCents)) errors.growthAnnual = range(PRICE_BOUNDS.seatCents);
  if (!errors.growthMonthly && !errors.growthAnnual) {
    const m = gm ?? DEFAULT_PRICES.growth.monthlyCents;
    const a = ga ?? DEFAULT_PRICES.growth.annualMonthlyCents;
    if (a > m) errors.growthAnnual = "Cannot be more than the monthly price.";
  }
  const vm = parseDollars(s.videoMonthly);
  const va = parseDollars(s.videoAnnual);
  if (!inBounds(vm, PRICE_BOUNDS.videoMonthlyCents)) errors.videoMonthly = range(PRICE_BOUNDS.videoMonthlyCents);
  if (!inBounds(va, PRICE_BOUNDS.videoAnnualCents)) errors.videoAnnual = range(PRICE_BOUNDS.videoAnnualCents);

  const prices: PriceOverrides = {};
  const growth: NonNullable<PriceOverrides["growth"]> = {};
  if (gm !== undefined && !errors.growthMonthly) growth.monthlyCents = gm;
  if (ga !== undefined && !errors.growthAnnual) growth.annualMonthlyCents = ga;
  if (Object.keys(growth).length) prices.growth = growth;
  const video: NonNullable<PriceOverrides["videoAddon"]> = {};
  if (vm !== undefined && !errors.videoMonthly) video.monthlyCents = vm;
  if (va !== undefined && !errors.videoAnnual) video.annualCents = va;
  if (Object.keys(video).length) prices.videoAddon = video;
  if (Object.keys(packPrices).length) prices.packs = packPrices;

  const copy: PricingCopy = {};
  if (Object.keys(copyPlans).length) copy.plans = copyPlans;
  if (Object.keys(packBadges).length) copy.packBadges = packBadges;
  return { copy, prices, errors };
}

/** Every effective price that differs between two sets, as "label: old -> new". */
function priceChanges(before: EffectivePrices, after: EffectivePrices): { label: string; from: string; to: string }[] {
  const out: { label: string; from: string; to: string }[] = [];
  const add = (label: string, a: number, b: number, fmt: (n: number) => string = formatUsd) => {
    if (a !== b) out.push({ label, from: fmt(a), to: fmt(b) });
  };
  add("Growth seat, monthly", before.growth.monthlyCents, after.growth.monthlyCents);
  add("Growth seat, yearly (per month)", before.growth.annualMonthlyCents, after.growth.annualMonthlyCents);
  add("Video add-on, monthly", before.videoAddon.monthlyCents, after.videoAddon.monthlyCents);
  add("Video add-on, yearly", before.videoAddon.annualCents, after.videoAddon.annualCents);
  before.packs.forEach((p, i) => {
    const q = after.packs[i];
    add(`${p.label} pack price`, p.priceCents, q.priceCents);
    add(`${p.label} pack credits`, p.credits, q.credits, (n) => n.toLocaleString("en-US"));
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces.                                        */
/* ------------------------------------------------------------------ */

const inputCls =
  "w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm text-fg placeholder:text-muted/70 focus:outline-none focus:border-accent transition";
const sectionTitle = "text-xs font-black uppercase tracking-[0.2em] text-muted";

function ResetButton({ onClick, label = "Reset" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-bold text-muted transition hover:text-fg">
      <RotateCcw className="h-3 w-3" />
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  overridden,
  onReset,
  error,
  children,
}: {
  label: string;
  hint?: string;
  overridden: boolean;
  onReset: () => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-bold text-fg">{label}</label>
        {overridden && <ResetButton onClick={onReset} />}
      </div>
      {children}
      {error ? <p className="text-[11px] font-bold text-danger">{error}</p> : hint ? <p className="text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

function DollarInput({ value, onChange, placeholder, invalid }: { value: string; onChange: (v: string) => void; placeholder: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-7 font-mono tabular-nums ${invalid ? "border-danger" : ""}`}
      />
    </div>
  );
}

function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right text-fg">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function PricingCopyForm({ initialCopy, initialPrices }: { initialCopy: PricingCopy; initialPrices: PriceOverrides }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toState(initialCopy, initialPrices));
  const [state, setState] = useState(saved);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const built = useMemo(() => build(state), [state]);
  const savedBuilt = useMemo(() => build(saved), [saved]);
  const hasErrors = Object.keys(built.errors).length > 0;
  const dirty = JSON.stringify([built.copy, built.prices]) !== JSON.stringify([savedBuilt.copy, savedBuilt.prices]);
  const anyOverride = Object.keys(savedBuilt.copy).length > 0 || Object.keys(savedBuilt.prices).length > 0;

  const effective = useMemo(() => resolvePrices(built.prices), [built.prices]);
  const preview = useMemo(() => applyPricingCopy(built.copy, effective), [built.copy, effective]);
  const changes = useMemo(() => priceChanges(resolvePrices(savedBuilt.prices), effective), [savedBuilt.prices, effective]);

  const setPlan = (key: WorkspacePlanKey, patch: Partial<PlanFields>) =>
    setState((s) => ({ ...s, plans: { ...s.plans, [key]: { ...s.plans[key], ...patch } } }));
  const setPack = (id: string, patch: Partial<PackFields>) =>
    setState((s) => ({ ...s, packs: { ...s.packs, [id]: { ...s.packs[id], ...patch } } }));
  const set = (patch: Partial<FormState>) => setState((s) => ({ ...s, ...patch }));

  const doSave = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const res = await savePricingCopy({ ...built.copy, prices: built.prices });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      const next = toState(res.copy, res.prices);
      setSaved(next);
      setState(next);
      setConfirming(false);
      setMessage({ type: "success", text: changes.length ? "Saved. New prices apply to new checkouts." : "Saved. /pricing now shows the new wording." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Could not save. Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  };

  const onSave = () => {
    if (!dirty || hasErrors) return;
    if (changes.length) setConfirming(true);
    else void doSave();
  };

  const doReset = async () => {
    setBusy("reset");
    setMessage(null);
    try {
      await resetPricingCopy();
      const next = toState({}, {});
      setSaved(next);
      setState(next);
      setConfirmReset(false);
      setMessage({ type: "success", text: "Everything is back to the defaults in code." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Could not reset. Try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-fg">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          <strong className="font-bold">New prices apply to new checkouts. Current subscribers keep their price.</strong>{" "}
          <span className="text-muted">
            Seat and add-on lines already on a Stripe subscription keep the amount they were created with until the
            workspace subscribes again. Credit packs charge the new price from the next purchase.
          </span>
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const def = DEFAULT_PLANS[key];
          const f = state.plans[key];
          const live = preview.plans.find((p) => p.key === key)!;
          return (
            <section key={key} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className={sectionTitle}>{live.name}</h3>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-fg">
                  <input
                    type="radio"
                    name="recommended"
                    checked={state.recommended === key}
                    onChange={() => set({ recommended: key })}
                    className="accent-accent"
                  />
                  Recommended
                </label>
              </div>

              {/* Price */}
              {key === "GROWTH" ? (
                <div className="space-y-4 rounded-xl border border-border bg-bg/50 p-4">
                  <Field
                    label="Monthly, per seat"
                    overridden={!!state.growthMonthly}
                    onReset={() => set({ growthMonthly: "" })}
                    error={built.errors.growthMonthly}
                    hint="Charged every month for each seat."
                  >
                    <DollarInput
                      value={state.growthMonthly}
                      onChange={(v) => set({ growthMonthly: v })}
                      placeholder={centsText(DEFAULT_PRICES.growth.monthlyCents)}
                      invalid={!!built.errors.growthMonthly}
                    />
                  </Field>
                  <Field
                    label="Yearly, per seat per month"
                    overridden={!!state.growthAnnual}
                    onReset={() => set({ growthAnnual: "" })}
                    error={built.errors.growthAnnual}
                    hint={`Charged once a year: ${formatUsd(effective.growth.annualMonthlyCents * 12)} per seat.`}
                  >
                    <DollarInput
                      value={state.growthAnnual}
                      onChange={(v) => set({ growthAnnual: v })}
                      placeholder={centsText(DEFAULT_PRICES.growth.annualMonthlyCents)}
                      invalid={!!built.errors.growthAnnual}
                    />
                  </Field>
                  <div className="border-t border-border pt-2">
                    <LockedRow label="Seats" value={live.seats} />
                    <LockedRow label="Yearly note" value={live.note.annual ?? ""} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-bg/50 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted">
                    <Lock className="h-3 w-3" /> Set in code so checkout charges the same
                  </p>
                  <LockedRow label="Monthly" value={`${live.price.monthly} ${live.unit.monthly}`} />
                  <LockedRow label="Yearly" value={`${live.price.annual} ${live.unit.annual}`} />
                  <LockedRow label="Seats" value={live.seats} />
                  {live.note.monthly && <LockedRow label="Note" value={live.note.monthly} />}
                </div>
              )}

              {/* Wording */}
              <Field label="Name" overridden={!!f.name} onReset={() => setPlan(key, { name: "" })}>
                <input
                  value={f.name}
                  maxLength={PRICING_COPY_LIMITS.name}
                  onChange={(e) => setPlan(key, { name: e.target.value })}
                  placeholder={def.name}
                  className={inputCls}
                />
              </Field>
              <Field label="Who it is for" overridden={!!f.audience} onReset={() => setPlan(key, { audience: "" })}>
                <textarea
                  rows={2}
                  value={f.audience}
                  maxLength={PRICING_COPY_LIMITS.audience}
                  onChange={(e) => setPlan(key, { audience: e.target.value })}
                  placeholder={def.audience}
                  className={`${inputCls} resize-y`}
                />
              </Field>
              <Field
                label="What is included"
                overridden={!!f.includes.trim()}
                onReset={() => setPlan(key, { includes: "" })}
                hint={`One line each, up to ${PRICING_COPY_LIMITS.includes} lines. Empty uses the default list.`}
              >
                <textarea
                  rows={6}
                  value={f.includes}
                  onChange={(e) => setPlan(key, { includes: e.target.value })}
                  placeholder={def.includes.join("\n")}
                  className={`${inputCls} resize-y leading-relaxed`}
                />
                {!f.includes.trim() && (
                  <button
                    type="button"
                    onClick={() => setPlan(key, { includes: def.includes.join("\n") })}
                    className="text-[11px] font-bold text-accent hover:underline"
                  >
                    Start from the default list
                  </button>
                )}
              </Field>
            </section>
          );
        })}
      </div>
      {state.recommended !== DEFAULT_RECOMMENDED && (
        <p className="-mt-3 flex items-center gap-2 text-xs text-muted">
          {DEFAULT_PLANS[state.recommended].name} is marked recommended instead of {DEFAULT_PLANS[DEFAULT_RECOMMENDED].name}.
          <ResetButton onClick={() => set({ recommended: DEFAULT_RECOMMENDED })} />
        </p>
      )}

      {/* Credit packs */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h3 className={sectionTitle}>AI credit packs</h3>
          <p className="mt-1 text-xs text-muted">
            One-time purchases. The workspace gets the credits of the pack it paid for, even if the pack changes later.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Pack</th>
                <th className="py-2 pr-3 font-medium">Credits</th>
                <th className="py-2 pr-3 font-medium">Price</th>
                <th className="py-2 pr-3 font-medium">Per credit</th>
                <th className="py-2 font-medium">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DEFAULT_PRICES.packs.map((def) => {
                const f = state.packs[def.id];
                const live = preview.packs.find((p) => p.id === def.id)!;
                const cErr = built.errors[`pack.${def.id}.credits`];
                const pErr = built.errors[`pack.${def.id}.price`];
                return (
                  <tr key={def.id} className="align-top">
                    <td className="py-3 pr-3 font-medium">{def.label}</td>
                    <td className="w-32 py-3 pr-3">
                      <input
                        inputMode="numeric"
                        value={f.credits}
                        onChange={(e) => setPack(def.id, { credits: e.target.value })}
                        placeholder={String(def.credits)}
                        className={`${inputCls} font-mono tabular-nums ${cErr ? "border-danger" : ""}`}
                      />
                      {cErr && <p className="mt-1 text-[11px] font-bold text-danger">{cErr}</p>}
                      {f.credits && <div className="mt-1"><ResetButton onClick={() => setPack(def.id, { credits: "" })} /></div>}
                    </td>
                    <td className="w-36 py-3 pr-3">
                      <DollarInput
                        value={f.price}
                        onChange={(v) => setPack(def.id, { price: v })}
                        placeholder={centsText(def.priceCents)}
                        invalid={!!pErr}
                      />
                      {pErr && <p className="mt-1 text-[11px] font-bold text-danger">{pErr}</p>}
                      {f.price && <div className="mt-1"><ResetButton onClick={() => setPack(def.id, { price: "" })} /></div>}
                    </td>
                    <td className="py-3 pr-3 pt-5 font-mono tabular-nums text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {live.perCredit}
                      </span>
                    </td>
                    <td className="py-3">
                      <input
                        value={f.badge}
                        disabled={f.hideBadge}
                        maxLength={PRICING_COPY_LIMITS.badge}
                        onChange={(e) => setPack(def.id, { badge: e.target.value })}
                        placeholder={DEFAULT_BADGES[def.id] ?? "No badge"}
                        className={`${inputCls} disabled:opacity-50`}
                      />
                      <div className="mt-1 flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            checked={f.hideBadge}
                            onChange={(e) => setPack(def.id, { hideBadge: e.target.checked })}
                            className="accent-accent"
                          />
                          No badge
                        </label>
                        {(f.badge || f.hideBadge) && <ResetButton onClick={() => setPack(def.id, { badge: "", hideBadge: false })} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Video add-on */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h3 className={sectionTitle}>Built-in video add-on</h3>
          <p className="mt-1 text-xs text-muted">A flat price per workspace, added to its subscription when an admin switches video on.</p>
        </div>
        <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Monthly"
            overridden={!!state.videoMonthly}
            onReset={() => set({ videoMonthly: "" })}
            error={built.errors.videoMonthly}
            hint="For monthly subscriptions."
          >
            <DollarInput
              value={state.videoMonthly}
              onChange={(v) => set({ videoMonthly: v })}
              placeholder={centsText(DEFAULT_PRICES.videoAddon.monthlyCents)}
              invalid={!!built.errors.videoMonthly}
            />
          </Field>
          <Field
            label="Yearly"
            overridden={!!state.videoAnnual}
            onReset={() => set({ videoAnnual: "" })}
            error={built.errors.videoAnnual}
            hint="Charged once a year on yearly subscriptions."
          >
            <DollarInput
              value={state.videoAnnual}
              onChange={(v) => set({ videoAnnual: v })}
              placeholder={centsText(DEFAULT_PRICES.videoAddon.annualCents)}
              invalid={!!built.errors.videoAnnual}
            />
          </Field>
        </div>
      </section>

      {/* Confirm price changes */}
      {confirming && (
        <section role="alertdialog" aria-labelledby="confirm-prices" className="space-y-4 rounded-2xl border border-warning/50 bg-surface p-6">
          <h3 id="confirm-prices" className="flex items-center gap-2 text-sm font-bold text-fg">
            <AlertTriangle className="h-4 w-4 text-warning" /> Change what Stripe charges?
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {changes.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
                <span className="text-muted">{c.label}</span>
                <span className="font-mono tabular-nums">
                  <span className="text-muted line-through">{c.from}</span> <span aria-hidden>→</span>{" "}
                  <span className="font-bold text-fg">{c.to}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">New prices apply to new checkouts. Current subscribers keep their price.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={doSave}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-xl bg-fg px-5 py-2 text-sm font-bold text-bg transition hover:bg-fg/90 disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Confirm and save
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy !== null}
              className="rounded-xl border border-border px-5 py-2 text-sm font-bold text-fg transition hover:bg-bg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Footer controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-4">
          {message && (
            <p role="status" className={`text-xs font-bold ${message.type === "success" ? "text-success" : "text-danger"}`}>
              {message.text}
            </p>
          )}
          <Link href="/pricing" target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-fg">
            View /pricing <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {confirmReset ? (
            <>
              <span className="text-xs text-muted">Reset all wording and prices to the defaults?</span>
              <button
                type="button"
                onClick={doReset}
                disabled={busy !== null}
                className="flex items-center gap-2 rounded-xl border border-danger/50 px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/10 disabled:opacity-50"
              >
                {busy === "reset" && <Loader2 className="h-4 w-4 animate-spin" />}
                Yes, reset
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="text-sm font-bold text-muted hover:text-fg">
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={busy !== null || (!anyOverride && !dirty)}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-fg transition hover:bg-bg disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset all to defaults
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || hasErrors || busy !== null || confirming}
            className="flex items-center gap-2 rounded-xl bg-fg px-6 py-2.5 text-sm font-bold text-bg shadow-soft transition hover:bg-fg/90 active:scale-95 disabled:opacity-50"
          >
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
