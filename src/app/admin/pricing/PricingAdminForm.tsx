"use client";

import { useState } from "react";
import { CheckCircle, RotateCcw, Save, Sparkles, Star, X, Plus } from "lucide-react";
import { updatePricingConfig } from "@/lib/pricing-settings";
import type {
  PricingConfig,
  PricingPlanDef,
  MatrixRow,
} from "@/lib/pricing-plans";

type Tab = "individual" | "business";

const field = "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-[#8b93ff]/60 focus:outline-none";
const flabel = "mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted";

/* ── Controls ── */

function PriceSlider({
  label, value, onChange, max = 500,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void; max?: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={flabel} style={{ marginBottom: 0 }}>{label}</span>
        <span className="wow-font-display text-2xl tabular-nums">
          {value === null ? <span className="text-muted">Custom</span> : `$${value}`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={max}
          step={5}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-[#8b93ff]"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Set custom (sales-led)"
          className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
            value === null ? "border-[#8b93ff] bg-[#8b93ff]/15 text-[#8b93ff]" : "border-border text-muted hover:text-fg"
          }`}
        >
          Custom
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#8b93ff]" : "bg-border"}`}>
        <span className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
      <span className="text-[13px] font-semibold text-fg">{label}</span>
    </button>
  );
}

function Select({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={flabel}>{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${field} appearance-none pr-9`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 block h-2 w-2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-muted" />
      </span>
    </label>
  );
}

function BadgeChips({ badges, onChange }: { badges: string[]; onChange: (b: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().toUpperCase().slice(0, 16);
    if (v && badges.length < 3 && !badges.includes(v)) onChange([...badges, v]);
    setDraft("");
  };
  return (
    <div>
      <span className={flabel}>Badges (max 3)</span>
      <div className="flex flex-wrap items-center gap-2">
        {badges.map((b) => (
          <span
            key={b}
            className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-black ${
              b === "BEST VALUE" ? "bg-[#22d3ee] text-black" : b === "EXPERTS' CHOICE" ? "bg-white text-black border border-border" : "bg-[#9dff00] text-black"
            }`}
          >
            {b}
            <button type="button" onClick={() => onChange(badges.filter((x) => x !== b))} aria-label={`Remove ${b}`} className="opacity-60 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {badges.length < 3 && (
          <span className="flex items-center gap-1">
            <input
              value={draft}
              maxLength={16}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
              placeholder="+ ADD"
              className="w-24 rounded-md border border-dashed border-border bg-transparent px-2 py-1 font-mono text-[11px] font-bold uppercase text-fg placeholder:text-muted/60 focus:border-[#8b93ff] focus:outline-none"
            />
            <button type="button" onClick={add} aria-label="Add badge" className="grid h-6 w-6 place-items-center rounded-full border border-border text-muted hover:border-[#8b93ff] hover:text-fg">
              <Plus className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function FeatureList({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().slice(0, 120);
    if (v && features.length < 8) onChange([...features, v]);
    setDraft("");
  };
  return (
    <div>
      <span className={flabel}>Features ({features.length}/8)</span>
      <ul className="space-y-1.5">
        {features.map((f, i) => (
          <li key={i} className="group flex items-center gap-2 rounded-xl border border-border/60 bg-bg px-3 py-2 text-[13px] font-medium">
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="flex-1 truncate" title={f}>{f}</span>
            <button
              type="button"
              onClick={() => onChange(features.filter((_, j) => j !== i))}
              aria-label={`Remove ${f}`}
              className="opacity-0 transition group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5 text-muted hover:text-red-500" />
            </button>
          </li>
        ))}
      </ul>
      {features.length < 8 && (
        <div className="mt-1.5 flex gap-1.5">
          <input
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="Add a feature…"
            className={field}
          />
          <button type="button" onClick={add} className="shrink-0 rounded-xl bg-ink px-3 text-ink-fg">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Live mini preview of the plan card ── */

function PreviewCta({ plan }: { plan: PricingPlanDef }) {
  if (plan.cta.kind === "sales") {
    return (
      <span className={`mt-6 block rounded-full py-3.5 text-center text-xs font-black uppercase tracking-widest ${plan.spotlight === "expert" ? "bg-[#0b0d12] text-white" : "border border-[var(--wow-card-border)] bg-[var(--wow-chip)] text-[var(--wow-fg)]"}`}>
        Contact Sales
      </span>
    );
  }
  if (plan.cta.kind === "free") {
    return (
      <span className={`mt-6 block rounded-full py-3.5 text-center text-xs font-black uppercase tracking-widest ${plan.spotlight === "expert" ? "bg-[#0b0d12] text-white" : "border border-[var(--wow-card-border)] bg-[var(--wow-chip)] text-[var(--wow-fg)]"}`}>
        Sign up free
      </span>
    );
  }
  return (
    <span className="mt-6 block rounded-full bg-gradient-to-r from-[#8b93ff] to-[#ff2fb3] py-3.5 text-center text-xs font-black uppercase tracking-widest text-white">
      Upgrade to {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
    </span>
  );
}

function PlanPreview({ plan, annual }: { plan: PricingPlanDef; annual: boolean }) {
  const price = plan.monthly === null ? "Custom" : `$${annual && plan.annual !== null ? plan.annual : plan.monthly}`;
  const credits = annual && plan.creditsAnnual ? plan.creditsAnnual : plan.credits;
  const creditsSub = annual && plan.creditsAnnualSub ? plan.creditsAnnualSub : plan.creditsSub;
  const expert = plan.spotlight === "expert";
  const card = (
    <div className={`flex flex-col gap-4 p-5 ${expert ? "bg-white text-[#0b0d12]" : ""}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="wow-font-display text-2xl">{plan.name || "NAME"}</span>
          {plan.badges.map((b) => (
            <span
              key={b}
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${
                b === "BEST VALUE" ? "bg-[#22d3ee] text-black" : expert || b === "EXPERTS' CHOICE" ? "bg-[#0b0d12] text-white" : "bg-[#9dff00] text-black"
              }`}
            >
              {b}
            </span>
          ))}
        </div>
        <p className={`mt-1 text-xs ${expert ? "text-black/60" : "text-muted"}`}>{plan.tagline || "Tagline…"}</p>
        <p className={`mt-2 text-[13px] leading-relaxed ${expert ? "text-black/60" : "text-muted"}`}>{plan.blurb || "Blurb…"}</p>
      </div>
      <p className="wow-font-display text-4xl tabular-nums">{price}</p>
      <div className={`rounded-2xl p-3 ${expert ? "bg-black/[0.04]" : "border border-[var(--wow-card-border)] bg-[var(--wow-stage)]"}`}>
        <p className="flex items-center gap-1.5 text-[13px] font-extrabold">
          <Sparkles className="h-3.5 w-3.5 text-[#8b93ff]" /> {credits || "Credits…"}
        </p>
        <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${expert ? "text-black/50" : "text-muted"}`}>
          {creditsSub || "—"}
        </p>
      </div>
      <ul className={`space-y-2 border-t pt-4 ${expert ? "border-black/10" : "border-[var(--wow-card-border)]"}`}>
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs font-medium">
            <CheckCircle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${expert ? "text-emerald-600" : "text-emerald-500"}`} /> {f}
          </li>
        ))}
        {plan.features.length === 0 && <li className="text-xs text-muted">No features yet — add some in the editor.</li>}
        {plan.mcp && (
          <li className="flex items-start gap-2 text-xs font-medium">
            <CheckCircle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${expert ? "text-emerald-600" : "text-emerald-500"}`} />
            <span>AI Screening + <span className="text-[#8b93ff] underline underline-offset-2">MCP API</span></span>
          </li>
        )}
      </ul>
      <PreviewCta plan={plan} />
    </div>
  );
  if (plan.spotlight === "best") {
    return (
      <div className="rounded-[1.7rem] bg-gradient-to-b from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee] p-[1.5px]">
        <div className="overflow-hidden rounded-[calc(1.7rem-1.5px)] bg-[var(--wow-bg-2)]">{card}</div>
      </div>
    );
  }
  return (
    <div className={`overflow-hidden rounded-3xl ${expert ? "" : "border border-border bg-surface"}`}>
      {card}
    </div>
  );
}

/* ── Plan editor ── */

function PlanEditor({
  plan, onChange, previewAnnual,
}: {
  plan: PricingPlanDef;
  onChange: (p: PricingPlanDef) => void;
  previewAnnual: boolean;
}) {
  const set = <K extends keyof PricingPlanDef>(k: K, v: PricingPlanDef[K]) =>
    onChange({ ...plan, [k]: v });
  const text = (k: "name" | "tagline" | "blurb" | "credits" | "creditsSub" | "creditsAnnual" | "creditsAnnualSub", lab: string, max: number) => (
    <label className="block">
      <span className={flabel}>{lab}</span>
      <input
        type="text"
        value={(plan[k] ?? "") as string}
        maxLength={max}
        onChange={(e) => set(k, e.target.value as never)}
        className={field}
      />
    </label>
  );
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black tracking-tight">
            {plan.name} <span className="ml-1 font-mono text-[10px] font-normal text-muted">id: {plan.id}</span>
          </h3>
          {plan.spotlight && (
            <span className="rounded-full bg-[#8b93ff]/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#8b93ff]">
              {plan.spotlight === "best" ? "Spotlight" : "Expert card"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {text("name", "Name", 24)}
          {text("tagline", "Tagline", 80)}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PriceSlider label="Monthly $" value={plan.monthly} onChange={(v) => set("monthly", v)} />
          <PriceSlider label="Annual $/mo" value={plan.annual} onChange={(v) => set("annual", v)} />
        </div>

        <BadgeChips badges={plan.badges} onChange={(b) => set("badges", b)} />

        <label className="block">
          <span className={flabel}>Blurb</span>
          <textarea value={plan.blurb} maxLength={200} rows={2} onChange={(e) => set("blurb", e.target.value)} className={field} />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {text("credits", "Credits line", 60)}
          {text("creditsSub", "Credits sub", 80)}
          {text("creditsAnnual", "Credits line (yearly)", 60)}
          {text("creditsAnnualSub", "Credits sub (yearly)", 80)}
        </div>

        <FeatureList features={plan.features} onChange={(f) => set("features", f)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Button"
            value={plan.cta.kind}
            options={[
              { value: "free", label: "Free / dashboard" },
              { value: "checkout", label: "Stripe checkout" },
              { value: "sales", label: "Contact sales" },
            ]}
            onChange={(v) => {
              const kind = v as "free" | "checkout" | "sales";
              onChange({ ...plan, cta: kind === "checkout" ? { kind, plan: "STARTER" } : { kind } });
            }}
          />
          {plan.cta.kind === "checkout" && (
            <Select
              label="Stripe plan"
              value={plan.cta.plan}
              options={[
                { value: "STARTER", label: "STARTER" },
                { value: "GROWTH", label: "GROWTH" },
              ]}
              onChange={(v) => onChange({ ...plan, cta: { kind: "checkout", plan: v as "STARTER" | "GROWTH" } })}
            />
          )}
          <Select
            label="Card style"
            value={plan.spotlight ?? "none"}
            options={[
              { value: "none", label: "Standard" },
              { value: "best", label: "Spotlight (gradient)" },
              { value: "expert", label: "Expert (white)" },
            ]}
            onChange={(v) => onChange({ ...plan, spotlight: v === "none" ? undefined : (v as "best" | "expert") })}
          />
        </div>

        <div className="flex flex-wrap gap-5">
          <Toggle label="Per-seat pricing" checked={plan.seatBased} onChange={(v) => set("seatBased", v)} />
          <Toggle label="MCP feature row" checked={plan.mcp === true} onChange={(v) => set("mcp", v || undefined)} />
        </div>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <div className="overflow-hidden rounded-3xl border border-dashed border-[#8b93ff]/40 bg-[#070b18] shadow-[0_24px_80px_-24px_rgba(139,147,255,0.4)]">
          {/* browser chrome — this is a window into /pricing, not a panel */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="mx-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[10px] text-white/60">
              interviewpad.dev/pricing
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
            </span>
          </div>
          <div className="relative bg-[#070b18] p-4">
            <div aria-hidden className="wow-grid-bg pointer-events-none absolute inset-0" />
            <div className="relative">
              <PlanPreview plan={plan} annual={previewAnnual} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Preview follows the {previewAnnual ? "yearly" : "monthly"} view — flip it on /pricing to check both.</p>
      </div>
    </div>
  );
}

/* ── Matrix editor ── */

function MatrixEditor({
  rows, planNames, onChange,
}: {
  rows: MatrixRow[];
  planNames: string[];
  onChange: (rows: MatrixRow[]) => void;
}) {
  const setCell = (ri: number, ci: number, text: string) => {
    onChange(rows.map((r, i) => {
      if (i !== ri) return r;
      return { ...r, cells: r.cells.map((c, j) => (j !== ci ? c : typeof c === "object" ? { ...c, text } : text)) };
    }));
  };
  const setHot = (ri: number, ci: number, hot: boolean) => {
    onChange(rows.map((r, i) => {
      if (i !== ri) return r;
      return {
        ...r,
        cells: r.cells.map((c, j) => {
          if (j !== ci) return c;
          const text = typeof c === "object" ? c.text : c;
          return hot ? { text, hot: true } : text;
        }),
      };
    }));
  };
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-base font-black tracking-tight">Comparison matrix</h3>
      <p className="mb-4 mt-1 text-xs text-muted">Columns follow plan order. Star ★ highlights a cell.</p>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted">
            <th className="pb-2 pr-2">Feature</th>
            {planNames.map((n) => (
              <th key={n} className="pb-2 pr-2">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border">
              <td className="py-2 pr-2">
                <input value={row.feature} maxLength={60} onChange={(e) => onChange(rows.map((r, i) => (i === ri ? { ...r, feature: e.target.value } : r)))} className={field} />
              </td>
              {[0, 1, 2].map((ci) => {
                const cell = row.cells[ci];
                const text = typeof cell === "object" ? cell.text : String(cell ?? "");
                const hot = typeof cell === "object" && cell.hot === true;
                return (
                  <td key={ci} className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <input value={text} maxLength={80} onChange={(e) => setCell(ri, ci, e.target.value)} className={field} />
                      <button
                        type="button"
                        title="Highlight cell"
                        aria-pressed={hot}
                        onClick={() => setHot(ri, ci, !hot)}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                          hot ? "bg-[#9dff00] text-black" : "border border-border text-muted hover:text-fg"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${hot ? "fill-black" : ""}`} />
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Shell ── */

export default function PricingAdminForm({
  initial,
  defaults,
}: {
  initial: PricingConfig;
  defaults: PricingConfig;
}) {
  const [tab, setTab] = useState<Tab>("individual");
  const [config, setConfig] = useState<PricingConfig>(initial);
  const [sel, setSel] = useState(0);
  const [previewAnnual, setPreviewAnnual] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const plans = config[tab];
  const selected = plans[Math.min(sel, plans.length - 1)];

  const save = async (payload: PricingConfig, note: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await updatePricingConfig(payload);
      setMessage({ type: "success", text: note });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky command bar */}
      <div className="sticky top-16 z-30 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-bg/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex rounded-full border border-border bg-surface p-1 font-mono text-[11px] uppercase tracking-widest">
          {(["individual", "business"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setSel(0); }}
              className={`rounded-full px-4 py-1.5 transition ${tab === t ? "bg-ink font-bold text-ink-fg" : "text-muted hover:text-fg"}`}
            >
              {t === "individual" ? "Individual" : "Business"}
            </button>
          ))}
        </div>
        {message && (
          <p className={`text-sm font-semibold ${message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {message.text}
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (window.confirm("Reset pricing page to defaults? Unsaved edits will be lost.")) {
                setConfig(defaults);
                setSel(0);
                void save(defaults, "Reset to defaults.");
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:text-fg disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(config, "Pricing saved — live on /pricing.")}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-5 py-2 text-sm font-bold text-ink-fg transition disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Plan switcher */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {plans.map((p, i) => {
          const price = p.monthly === null ? "Custom" : `$${p.monthly}`;
          const active = i === Math.min(sel, plans.length - 1);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSel(i)}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#8b93ff] bg-[#8b93ff]/[0.07] shadow-[0_12px_40px_-16px_rgba(139,147,255,0.6)]"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <span className={`wow-font-display text-3xl tabular-nums ${active ? "" : "text-muted"}`}>{price}</span>
              <span>
                <span className="block text-sm font-black tracking-tight">{p.name}</span>
                <span className="block max-w-[16ch] truncate text-xs text-muted">{p.tagline}</span>
              </span>
              {p.spotlight && (
                <span className="ml-auto rounded-full bg-[#9dff00] px-2 py-0.5 font-mono text-[9px] font-black text-black">★</span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <PlanEditor
          plan={selected}
          previewAnnual={previewAnnual}
          onChange={(p) => setConfig((c) => ({ ...c, [tab]: c[tab].map((x, j) => (j === sel ? p : x)) }))}
        />
      )}

      <label className="flex items-center gap-3 text-sm text-muted">
        <button
          type="button"
          role="switch"
          aria-checked={previewAnnual}
          aria-label="Preview yearly prices"
          onClick={() => setPreviewAnnual((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${previewAnnual ? "bg-[#8b93ff]" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-all ${previewAnnual ? "left-[22px]" : "left-0.5"}`} />
        </button>
        Preview the {previewAnnual ? "yearly" : "monthly"} prices above
      </label>

      <MatrixEditor
        rows={config.matrix[tab]}
        planNames={plans.map((p) => p.name)}
        onChange={(rows) => setConfig((c) => ({ ...c, matrix: { ...c.matrix, [tab]: rows } }))}
      />

      <p className="text-xs text-muted">
        Checkout buttons only support the STARTER and GROWTH billing plans —
        changing the mapping above changes which Stripe plan each tier buys.
        Prices are in USD per seat (business) or flat (individual).
      </p>
    </div>
  );
}
