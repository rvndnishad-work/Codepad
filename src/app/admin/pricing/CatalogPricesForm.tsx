"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import {
  DEFAULT_CATALOG,
  annualMonthlyCents,
  annualSavingPercent,
  formatCents,
  formatCreditPrice,
  ladderIssues,
  packCentsPerCredit,
  planCentsPerCredit,
  resolveCatalog,
  type CatalogOverrides,
  type SelfServePlanKey,
} from "@/lib/billing/catalog";
import { saveCatalogPrices } from "./actions";

/* Plain strings; "" means "use the default". Prices in dollars, credits whole. */
type PlanFields = { monthly: string; annual: string; credits: string };
type PackFields = { credits: string; price: string };
type FormState = { plans: Record<string, PlanFields>; topups: Record<string, PackFields> };

const dollars = (c: number | undefined) => (c === undefined ? "" : (c / 100).toFixed(c % 100 === 0 ? 0 : 2));
const count = (n: number | undefined) => (n === undefined ? "" : String(n));

function toState(o: CatalogOverrides): FormState {
  const plans: Record<string, PlanFields> = {};
  for (const p of DEFAULT_CATALOG.plans) {
    const v = o.plans?.[p.key];
    plans[p.key] = { monthly: dollars(v?.monthlyCents), annual: dollars(v?.annualCents), credits: count(v?.credits) };
  }
  const topups: Record<string, PackFields> = {};
  for (const p of DEFAULT_CATALOG.topups) {
    const v = o.topups?.[p.id];
    topups[p.id] = { credits: count(v?.credits), price: dollars(v?.priceCents) };
  }
  return { plans, topups };
}

/** Dollars text to cents; undefined when blank, NaN when not a number (the server reports it). */
function cents(text: string): number | undefined {
  const t = text.trim().replace(/^\$/, "");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : Number.NaN;
}
function whole(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

function toOverrides(s: FormState): CatalogOverrides {
  const out: CatalogOverrides = {};
  const plans: NonNullable<CatalogOverrides["plans"]> = {};
  for (const p of DEFAULT_CATALOG.plans) {
    const f = s.plans[p.key];
    const o: { monthlyCents?: number; annualCents?: number; credits?: number } = {};
    const m = cents(f.monthly);
    const a = cents(f.annual);
    const c = whole(f.credits);
    if (m !== undefined) o.monthlyCents = m;
    if (a !== undefined) o.annualCents = a;
    if (c !== undefined) o.credits = c;
    if (Object.keys(o).length) plans[p.key as SelfServePlanKey] = o;
  }
  if (Object.keys(plans).length) out.plans = plans;
  const topups: NonNullable<CatalogOverrides["topups"]> = {};
  for (const p of DEFAULT_CATALOG.topups) {
    const f = s.topups[p.id];
    const o: { credits?: number; priceCents?: number } = {};
    const c = whole(f.credits);
    const pr = cents(f.price);
    if (c !== undefined) o.credits = c;
    if (pr !== undefined) o.priceCents = pr;
    if (Object.keys(o).length) topups[p.id] = o;
  }
  if (Object.keys(topups).length) out.topups = topups;
  return out;
}

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg tabular-nums placeholder:text-subtle focus:border-fg focus:outline-none";

function Field({ id, label, value, placeholder, onChange, prefix }: { id: string; label: string; value: string; placeholder: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <span className="flex items-center gap-1">
        {prefix && <span aria-hidden className="text-subtle">{prefix}</span>}
        <input id={id} inputMode="decimal" className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

/**
 * Prices, credits and top-up packs for the new flat plans (Basic, Growth,
 * Teams). Not live: checkout and /pricing still use the plans above until the
 * switch-over. Shows the effective price per credit and warns when the
 * ladder breaks (a bigger plan not cheaper per credit, or a top-up as cheap
 * as plan credits).
 */
export default function CatalogPricesForm({ initialCatalog, initialVersion }: { initialCatalog: CatalogOverrides; initialVersion: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toState(initialCatalog));
  const [state, setState] = useState(saved);
  const [version, setVersion] = useState(initialVersion);
  useEffect(() => setVersion(initialVersion), [initialVersion]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const overrides = useMemo(() => toOverrides(state), [state]);
  const effective = useMemo(() => resolveCatalog(overrides), [overrides]);
  const issues = useMemo(() => ladderIssues(effective), [effective]);
  const dirty = JSON.stringify(state) !== JSON.stringify(saved);

  const setPlan = (key: string, field: keyof PlanFields, v: string) =>
    setState((s) => ({ ...s, plans: { ...s.plans, [key]: { ...s.plans[key], [field]: v } } }));
  const setPack = (id: string, field: keyof PackFields, v: string) =>
    setState((s) => ({ ...s, topups: { ...s.topups, [id]: { ...s.topups[id], [field]: v } } }));

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await saveCatalogPrices(overrides, note, version);
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      const next = toState(res.catalog);
      setSaved(next);
      setState(next);
      setVersion(res.version);
      setNote("");
      setMessage({ type: "success", text: "Saved. These prices are not charged until the new plans go live." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Could not save. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-fg">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p>
          <span className="font-bold">Not live yet.</span> Checkout, Billing and /pricing still sell the plans above. These prices start
          being charged when the new plans switch on. Workspace and seat caps are set in code.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {effective.plans.map((p) => {
          const d = DEFAULT_CATALOG.plans.find((x) => x.key === p.key)!;
          const f = state.plans[p.key];
          return (
            <fieldset key={p.key} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-bg/50 p-4">
              <legend className="px-1 text-xs font-bold uppercase tracking-widest text-fg">{p.name}</legend>
              <div className="grid grid-cols-3 gap-2">
                <Field id={`cat-${p.key}-m`} label="Monthly" prefix="$" value={f.monthly} placeholder={dollars(d.monthlyCents)} onChange={(v) => setPlan(p.key, "monthly", v)} />
                <Field id={`cat-${p.key}-a`} label="Yearly" prefix="$" value={f.annual} placeholder={dollars(d.annualCents)} onChange={(v) => setPlan(p.key, "annual", v)} />
                <Field id={`cat-${p.key}-c`} label="Credits/mo" value={f.credits} placeholder={String(d.creditsPerMonth)} onChange={(v) => setPlan(p.key, "credits", v)} />
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted">Per credit</dt>
                <dd className="text-right font-mono text-fg">{formatCreditPrice(planCentsPerCredit(p))}</dd>
                <dt className="text-muted">Yearly, a month</dt>
                <dd className="text-right font-mono text-fg">
                  {formatCents(annualMonthlyCents(p))} ({annualSavingPercent(p)}% off)
                </dd>
                <dt className="text-muted">Workspaces</dt>
                <dd className="text-right font-mono text-fg">{p.workspaceLimit}</dd>
                <dt className="text-muted">Seats each</dt>
                <dd className="text-right font-mono text-fg">{p.seatsPerWorkspace}</dd>
              </dl>
            </fieldset>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {effective.topups.map((p) => {
          const d = DEFAULT_CATALOG.topups.find((x) => x.id === p.id)!;
          const f = state.topups[p.id];
          return (
            <fieldset key={p.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-bg/50 p-4">
              <legend className="px-1 text-xs font-bold uppercase tracking-widest text-fg">{p.label}</legend>
              <div className="grid grid-cols-2 gap-2">
                <Field id={`cat-${p.id}-c`} label="Credits" value={f.credits} placeholder={String(d.credits)} onChange={(v) => setPack(p.id, "credits", v)} />
                <Field id={`cat-${p.id}-p`} label="Price" prefix="$" value={f.price} placeholder={dollars(d.priceCents)} onChange={(v) => setPack(p.id, "price", v)} />
              </div>
              <p className="flex justify-between text-xs">
                <span className="text-muted">Per credit</span>
                <span className="font-mono text-fg">{formatCreditPrice(packCentsPerCredit(p))}</span>
              </p>
            </fieldset>
          );
        })}
      </div>

      {issues.length > 0 && (
        <div role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-fg">
          <p className="font-bold">The price ladder is off. You can still save.</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="catalog-note" className="text-sm font-bold text-fg">
          Note for the history
        </label>
        <input
          id="catalog-note"
          className={inputCls}
          value={note}
          maxLength={500}
          placeholder="What changed and why"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {message && (
          <p role="status" className={`mr-auto text-sm ${message.type === "error" ? "text-danger" : "text-success"}`}>
            {message.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => setState(saved)}
          disabled={!dirty || busy}
          className="rounded-xl border border-border px-5 py-2 text-sm font-bold text-fg transition hover:bg-bg disabled:opacity-50"
        >
          Undo changes
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy || !note.trim()}
          className="flex items-center gap-2 rounded-xl bg-fg px-5 py-2 text-sm font-bold text-bg transition hover:bg-fg/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save new plan prices
        </button>
      </div>
    </div>
  );
}
