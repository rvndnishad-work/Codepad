"use client";

/**
 * Billing and usage, Usage and credits tab: the credit balance and buying
 * packs side by side, six months of usage next to the low-credit email, and
 * the credit history.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Btn } from "../candidates/_components/ui";
import { plural } from "@/lib/workspace/display";
import { LOW_CREDIT_CHOICES } from "@/lib/workspace/settings";
import type { UsageMonth } from "@/lib/billing/usage";
import { saveWorkspaceSettingsAction } from "../settings/actions";
import { buyCreditsAction } from "./actions";
import { payForCreditPack } from "@/lib/billing/razorpay-client";
import { INCLUDED_CREDITS_PER_SEAT } from "@/lib/billing/included-credits";
import { DEFAULT_LOW_CREDITS, RUNWAY_WINDOW_DAYS, creditHealth, creditRunway, packSavings, screeningsCovered, type CreditGlance } from "@/lib/billing/credit-glance";

export type LedgerRowView = {
  id: string;
  createdAt: string;
  label: string;
  detail: string;
  amount: number;
  balanceAfter: number;
};

export type UsageData = {
  credits: CreditGlance;
  /** Credits that come with paid seats. `left` of the balance can expire; `nextAt` is the next monthly grant. */
  included: { left: number; perMonth: number; nextAt: string | null };
  packs: { id: string; label: string; credits: number; priceCents: number; badge: string | null }[];
  months: UsageMonth[];
  ledger: { rows: LedgerRowView[]; page: number; pages: number; total: number };
  lowCreditThreshold: number | null;
  canEditAlert: boolean;
  aiScreening: boolean;
  purchase: "success" | "cancel" | null;
  /** Who takes credit pack payments: Razorpay's modal, Stripe's hosted page, or nobody yet. */
  checkout: "razorpay" | "stripe" | null;
};

type Notify = (text: string, tone?: "ok" | "error") => void;

export default function UsageTab({
  slug,
  data,
  canManage,
  notify,
}: {
  slug: string;
  data: UsageData;
  canManage: boolean;
  notify: Notify;
}) {
  return (
    <div className="flex flex-col gap-5">
      {data.purchase === "success" && (
        <div role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-fg">
          Thanks. The credits show up here as soon as Stripe confirms the payment, usually within a minute.
        </div>
      )}
      {data.purchase === "cancel" && (
        <div role="status" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Checkout was cancelled. Nothing was charged.
        </div>
      )}

      {/* Balance and buying sit side by side: see what is left, top up in the same place. */}
      <section
        className="rounded-xl border border-border bg-surface grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        aria-label="AI credits"
      >
        <CreditBalance data={data} />
        <div id="buy-credits" className="scroll-mt-6 border-t xl:border-t-0 xl:border-l border-border px-5 py-5 md:px-6">
          <BuyCredits slug={slug} data={data} canManage={canManage} notify={notify} />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <UsageChart months={data.months} />
        <CreditSettings slug={slug} data={data} notify={notify} />
      </div>

      <CreditHistory slug={slug} ledger={data.ledger} />
    </div>
  );
}

/* ── Balance: how many are left, how fast they go, when more arrive ────── */

const HEALTH = {
  ok: { label: "Healthy", chip: "bg-success/15 text-success", bar: "bg-secondary" },
  low: { label: "Running low", chip: "bg-warning/15 text-warning", bar: "bg-warning" },
  empty: { label: "Empty", chip: "bg-danger/15 text-danger", bar: "bg-danger" },
} as const;

function CreditBalance({ data }: { data: UsageData }) {
  const { credits } = data;
  const health = creditHealth(credits.available, data.lowCreditThreshold);
  const tone = HEALTH[health];
  const runway = creditRunway(credits.available, credits.usedRecent);
  const total = Math.max(credits.balance, credits.available + credits.held, 1);
  const availPct = (credits.available / total) * 100;
  const heldPct = (credits.held / total) * 100;
  const threshold = data.lowCreditThreshold;

  return (
    <div className="px-5 py-5 md:px-6 flex flex-col gap-5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium text-muted">AI credits</h2>
        <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-xs font-medium ${tone.chip}`}>
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current" />
          {tone.label}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-[44px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-fg">
            {credits.available.toLocaleString("en-GB")}
          </span>
          <span className="text-[15px] text-muted">credits left to use</span>
        </div>
        <div
          className="h-2.5 rounded-full bg-panel overflow-hidden flex"
          role="img"
          aria-label={`${credits.available} credits available, ${credits.held} held by open invites`}
        >
          <span className={`h-full ${tone.bar}`} style={{ width: `${credits.available ? Math.max(availPct, 2) : 0}%` }} />
          {credits.held > 0 && (
            <span
              className="h-full bg-subtle/50"
              style={{
                width: `${Math.max(heldPct, 2)}%`,
                backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, rgb(var(--c-surface) / 0.45) 4px 6px)",
              }}
            />
          )}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Balance">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`w-2.5 h-2.5 rounded-sm ${tone.bar}`} />
            {plural(credits.available, "available", "available")}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="w-2.5 h-2.5 rounded-sm bg-subtle/50" />
            {credits.held.toLocaleString("en-GB")} held by open invites
          </li>
          <li className="text-subtle">{plural(credits.balance, "credit")} in all</li>
        </ul>
      </div>

      <dl className="grid grid-cols-3 rounded-lg border border-border divide-x divide-border">
        <Stat label="Used this month" value={credits.usedThisMonth.toLocaleString("en-GB")} />
        <Stat
          label="Recent pace"
          value={runway.perWeek === null ? "None" : `${runway.perWeek < 10 ? runway.perWeek.toFixed(1) : Math.round(runway.perWeek)} / week`}
        />
        <Stat label="Lasts" value={runway.weeks === null ? "No pace yet" : runway.label} />
      </dl>

      {health !== "ok" && (
        <div
          role="status"
          className={`rounded-lg border px-3 py-2.5 text-[13px] ${health === "empty" ? "border-danger/30 bg-danger/10 text-danger" : "border-warning/30 bg-warning/10 text-warning"}`}
        >
          {health === "empty"
            ? "No credits left. New AI screenings cannot start until you top up."
            : `Fewer than ${threshold ?? DEFAULT_LOW_CREDITS} credits left. Top up so screenings keep running.`}
        </div>
      )}

      <div className="flex flex-col gap-1.5 text-[13px] text-muted">
        <p>{includedLine(data.included)}</p>
        <p className="text-subtle">
          A screening uses 1 to 3 credits when the candidate starts it. Held credits are charged only if the candidate starts.
          {runway.perWeek !== null ? ` Pace is measured over the last ${RUNWAY_WINDOW_DAYS} days.` : ""}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 flex flex-col gap-0.5 min-w-0">
      <dt className="text-xs text-muted leading-snug">{label}</dt>
      <dd className="text-[15px] leading-snug font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function includedLine(included: UsageData["included"]): string {
  const next = included.nextAt
    ? new Date(included.nextAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  if (included.perMonth > 0) {
    const when = next ? ` on ${next}` : " once the subscription starts";
    const left = included.left > 0 ? ` ${plural(included.left, "included credit")} left, they roll over one month.` : "";
    return `Your plan adds ${plural(included.perMonth, "credit")}${when}, ${INCLUDED_CREDITS_PER_SEAT} per seat.${left} Bought credits never expire.`;
  }
  if (included.left > 0) {
    return `${plural(included.left, "included credit")} left from your last paid month${next ? `, they expire on ${next}` : ""}. Bought and trial credits never expire.`;
  }
  return `Growth adds ${INCLUDED_CREDITS_PER_SEAT} credits per seat every month. Bought and trial credits never expire.`;
}

/* ── Buy credits ────────────────────────────────────────────────────────── */

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

function BuyCredits({ slug, data, canManage, notify }: { slug: string; data: UsageData; canManage: boolean; notify: Notify }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>((data.packs.find((p) => p.badge) ?? data.packs[0])?.id ?? null);
  const buy = async (packId: string) => {
    setBusy(packId);
    if (data.checkout === "razorpay") {
      const res = await payForCreditPack({ slug, packId, onAttemptFailed: (m) => notify(m, "error") });
      setBusy(null);
      if (res.status === "paid") {
        notify(`Payment received. ${plural(res.credits, "credit")} added.`);
        router.refresh();
      } else if (res.status === "cancelled") {
        notify("Checkout was closed. Nothing was charged.");
      } else {
        notify(res.message, "error");
      }
      return;
    }
    const res = await buyCreditsAction(slug, packId);
    if (res.ok) {
      window.location.href = res.url;
      return;
    }
    setBusy(null);
    notify(res.error, "error");
  };

  let note: string | null = null;
  if (!data.aiScreening) note = "AI screening needs Growth or a trial. You can still buy credits now and use them after you upgrade.";
  if (!canManage) note = "Ask an owner or admin with billing access to buy credits.";
  else if (!data.checkout) note = "Online payments are not set up on this server yet, so credits cannot be bought here.";
  const canBuy = canManage && data.checkout !== null;
  const pack = data.packs.find((p) => p.id === picked) ?? null;
  const savings = packSavings(data.packs);

  return (
    <div className="flex flex-col gap-4 h-full" role="group" aria-labelledby="buy-credits-title">
      <div className="flex flex-col gap-0.5">
        <h2 id="buy-credits-title" className="text-base font-semibold text-fg">
          Buy credits
        </h2>
        <p className="text-[13px] text-muted">One-time packs, paid once. Bought credits never expire and larger packs cost less per credit.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {data.packs.map((p) => {
          const on = canBuy && p.id === picked;
          const save = savings[p.id];
          const inner = (
            <>
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center h-5 px-2 rounded-full bg-secondary text-bg text-xs font-medium whitespace-nowrap">
                  {p.badge}
                </span>
              )}
              <span className="text-xs font-medium text-muted">{p.label}</span>
              <span className="mt-1.5 text-[24px] leading-none font-semibold tracking-tight tabular-nums text-fg">{p.credits.toLocaleString("en-GB")}</span>
              <span className="text-xs text-subtle">credits</span>
              <span className="mt-3 text-[15px] font-semibold tabular-nums text-fg">{money(p.priceCents)}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums text-subtle">
                ${(p.priceCents / 100 / p.credits).toFixed(2)} each
                {save ? <span className="inline-flex items-center h-5 px-1.5 rounded bg-success/15 text-success font-medium">Save {save}%</span> : null}
              </span>
            </>
          );
          const cls = `relative flex flex-col items-start rounded-xl border px-4 pt-4 pb-3.5 text-left transition ${
            on ? "border-secondary ring-1 ring-secondary bg-secondary/[0.07]" : "border-border bg-bg/40"
          }`;
          return canBuy ? (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              aria-label={`${p.label}, ${p.credits} credits, $${(p.priceCents / 100).toFixed(0)}`}
              onClick={() => setPicked(p.id)}
              disabled={!!busy}
              className={`${cls} hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:opacity-60`}
            >
              {inner}
            </button>
          ) : (
            <div key={p.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
      {canBuy && pack && (
        <div className="mt-auto flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border bg-panel/60 px-4 py-3">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-sm text-fg">
              <span className="font-semibold tabular-nums">{pack.credits.toLocaleString("en-GB")} credits</span> for{" "}
              <span className="font-semibold tabular-nums">{money(pack.priceCents)}</span>
            </span>
            <span className="text-xs text-muted tabular-nums">
              Balance after: {(data.credits.available + pack.credits).toLocaleString("en-GB")} available. Covers about{" "}
              {screeningsCovered(pack.credits).min.toLocaleString("en-GB")} to {screeningsCovered(pack.credits).max.toLocaleString("en-GB")} screenings.
            </span>
          </div>
          <Btn variant="primary" size="md" className="sm:min-w-[180px] h-10 text-sm" disabled={!!busy} onClick={() => buy(pack.id)}>
            {busy ? (data.checkout === "razorpay" ? "Waiting for payment" : "Opening checkout") : `Buy ${pack.credits.toLocaleString("en-GB")} credits`}
          </Btn>
        </div>
      )}
      {note && <p className="text-[13px] text-muted">{note}</p>}
    </div>
  );
}

/* ── Alerts and how credits work ────────────────────────────────────────── */

function CreditSettings({ slug, data, notify }: { slug: string; data: UsageData; notify: Notify }) {
  return (
    <section className="rounded-xl border border-border bg-surface flex flex-col" aria-labelledby="credit-settings">
      <header className="px-5 pt-4 pb-3">
        <h2 id="credit-settings" className="text-base font-semibold text-fg">
          Alerts
        </h2>
        <p className="text-[13px] text-muted mt-0.5">Hear about a low balance before screenings stop.</p>
      </header>
      <div className="px-5 pb-5">
        <LowCreditEmail slug={slug} data={data} notify={notify} />
      </div>
      <div className="border-t border-border px-5 py-4 flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-fg">How credits work</h3>
        <ul className="flex flex-col gap-2 text-[13px] text-muted">
          <li className="flex gap-2">
            <span aria-hidden className="mt-[7px] w-1.5 h-1.5 shrink-0 rounded-full bg-secondary" />
            Only AI screenings use credits. Take homes and live interviews are free.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="mt-[7px] w-1.5 h-1.5 shrink-0 rounded-full bg-secondary" />
            A screening uses 1 to 3 credits, set by its engagement level.
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="mt-[7px] w-1.5 h-1.5 shrink-0 rounded-full bg-secondary" />
            An open invite holds its credits. They are charged only if the candidate starts.
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ── Low-credit email ───────────────────────────────────────────────────── */

function LowCreditEmail({ slug, data, notify }: { slug: string; data: UsageData; notify: Notify }) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(data.lowCreditThreshold);
  const [saving, setSaving] = useState(false);
  const choices: (number | null)[] = [null, ...LOW_CREDIT_CHOICES];
  if (value !== null && !choices.includes(value)) choices.push(value);

  const save = async (next: number | null) => {
    const before = value;
    setValue(next);
    setSaving(true);
    const res = await saveWorkspaceSettingsAction(slug, "billing", { lowCreditThreshold: next ?? "off" });
    setSaving(false);
    if (!res.ok) {
      setValue(before);
      notify(res.fieldErrors?.lowCreditThreshold ?? res.error, "error");
      return;
    }
    notify(next === null ? "Low-credit email turned off." : `We will email owners and admins when fewer than ${next} credits are left.`);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby="low-credit">
      <div className="flex items-center justify-between gap-3">
        <label id="low-credit" htmlFor="low-credit-threshold" className="text-sm font-medium text-fg">
          Low-credit email
        </label>
        <select
          id="low-credit-threshold"
          value={value === null ? "off" : String(value)}
          disabled={!data.canEditAlert || saving}
          onChange={(e) => save(e.target.value === "off" ? null : Number(e.target.value))}
          className="h-9 w-[160px] rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20 disabled:opacity-60"
        >
          {choices.map((c) => (
            <option key={c ?? "off"} value={c === null ? "off" : String(c)}>
              {c === null ? "Off" : `Below ${c} credits`}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[13px] text-muted">Email every owner and admin once when the balance drops below this. It resets after you top up.</p>
      {!data.canEditAlert && <p className="text-[13px] text-subtle">Only owners and admins can change this.</p>}
    </div>
  );
}

/* ── Six-month usage ────────────────────────────────────────────────────── */

const SERIES = [
  { key: "aiScreenings", label: "AI screenings", cls: "bg-secondary" },
  { key: "takeHomes", label: "Take homes", cls: "bg-warning" },
  { key: "interviews", label: "Interviews", cls: "bg-subtle" },
] as const;

function UsageChart({ months }: { months: UsageMonth[] }) {
  const totals = months.map((m) => m.takeHomes + m.aiScreenings + m.interviews);
  const max = Math.max(1, ...months.flatMap((m) => SERIES.map((s) => m[s.key])));
  // A round top for the scale, so the gridlines read as plain numbers.
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 100 ? 20 : 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).filter((t, i, all) => all.length <= 6 || i % 2 === 0 || t === top);
  const [showTable, setShowTable] = useState(false);
  const empty = totals.every((t) => t === 0) && months.every((m) => m.creditsUsed === 0 && m.creditsBought === 0 && m.creditsIncluded === 0);
  const current = months[months.length - 1];

  return (
    <section className="rounded-xl border border-border bg-surface flex flex-col min-w-0" aria-labelledby="usage-chart">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="usage-chart" className="text-base font-semibold text-fg">
            Sent in the last six months
          </h2>
          <p className="text-[13px] text-muted">Take homes, AI screenings and interviews sent each month.</p>
        </div>
        <button type="button" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="text-[13px] font-medium text-secondary-soft hover:underline">
          {showTable ? "Hide table" : "Show as a table"}
        </button>
      </header>
      {!empty && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-1 text-xs text-muted" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`w-2.5 h-2.5 rounded-sm ${s.cls}`} />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      {empty ? (
        <p className="px-5 pb-5 pt-2 text-sm text-muted">Nothing sent yet. Usage shows up here once you send a take home, a screening or an interview.</p>
      ) : (
        <div className="px-5 pb-4 flex-1 flex flex-col">
          <div className="flex gap-2 flex-1 min-h-[240px] mt-5">
            <div aria-hidden className="relative w-7 shrink-0">
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 translate-y-1/2 text-xs text-subtle tabular-nums" style={{ bottom: `${(t / top) * 100}%` }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="relative flex-1 flex items-end gap-2 sm:gap-4" role="list" aria-label="Sent each month">
              {ticks.map((t) => (
                <span
                  key={t}
                  aria-hidden
                  className={`absolute inset-x-0 border-t ${t === 0 ? "border-border-strong" : "border-border"}`}
                  style={{ bottom: `${(t / top) * 100}%` }}
                />
              ))}
              {months.map((m, i) => {
                const total = totals[i];
                const summary = `${m.label}: ${plural(total, "sent", "sent")}. ${plural(m.takeHomes, "take home")}, ${plural(m.aiScreenings, "AI screening")}, ${plural(m.interviews, "interview")}. ${plural(m.creditsUsed, "credit")} used.`;
                return (
                  <div key={m.key} role="listitem" className="group relative flex-1 h-full flex items-end justify-center">
                    <button
                      type="button"
                      aria-label={summary}
                      className="relative w-full max-w-[96px] h-full flex items-end justify-center gap-1 px-0.5 rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
                    >
                      {SERIES.map((s) => {
                        const v = m[s.key];
                        return (
                          <span
                            key={s.key}
                            className={`block flex-1 max-w-[24px] rounded-t-sm ${s.cls} transition-opacity group-hover:opacity-80`}
                            style={{ height: v ? `max(${(v / top) * 100}%, 3px)` : "0px" }}
                          />
                        );
                      })}
                    </button>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 hidden group-hover:flex group-focus-within:flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-border-strong bg-elevated px-3 py-2 text-xs text-fg shadow-lg shadow-black/30"
                    >
                      <span className="font-medium">
                        {m.label}: {total} sent
                      </span>
                      <span className="text-muted">
                        {m.aiScreenings} AI screenings, {m.takeHomes} take homes, {m.interviews} interviews
                      </span>
                      <span className="text-muted">{plural(m.creditsUsed, "credit")} used</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-2" aria-hidden>
            <span className="w-7 shrink-0" />
            <div className="flex-1 flex gap-2 sm:gap-4">
              {months.map((m) => (
                <span key={m.key} className="flex-1 text-center text-xs text-muted">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
          {current && (
            <p className="mt-3 text-[13px] text-muted">
              {current.label} so far: {plural(current.aiScreenings, "AI screening")}, {plural(current.takeHomes, "take home")},{" "}
              {plural(current.interviews, "interview")}. Only AI screenings use credits.
            </p>
          )}
        </div>
      )}

      {showTable && (
        <div className="border-t border-border overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-panel text-left text-[12.5px] font-semibold text-muted">
                <th className="px-4 py-2.5 font-semibold">Month</th>
                <th className="px-4 py-2.5 font-semibold text-right">Take homes</th>
                <th className="px-4 py-2.5 font-semibold text-right">AI screenings</th>
                <th className="px-4 py-2.5 font-semibold text-right">Interviews</th>
                <th className="px-4 py-2.5 font-semibold text-right">Credits used</th>
                <th className="px-4 py-2.5 font-semibold text-right">Credits included</th>
                <th className="px-4 py-2.5 font-semibold text-right">Credits bought</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} className="border-t border-border tabular-nums">
                  <td className="px-4 py-2.5 text-fg">
                    {m.label} {m.key.slice(0, 4)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted">{m.takeHomes}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{m.aiScreenings}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{m.interviews}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{m.creditsUsed}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{m.creditsIncluded}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{m.creditsBought}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Credit history ─────────────────────────────────────────────────────── */

function CreditHistory({ slug, ledger }: { slug: string; ledger: UsageData["ledger"] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const href = (page: number) => `/w/${slug}/billing?tab=usage${page > 1 ? `&page=${page}` : ""}#credit-history`;
  const go = (page: number) => start(() => router.push(href(page), { scroll: false }));
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <section id="credit-history" className="rounded-xl border border-border bg-surface" aria-labelledby="credit-history-title">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 id="credit-history-title" className="text-base font-semibold text-fg">
            Credit history
          </h2>
          <p className="text-[13px] text-muted mt-0.5">Every credit bought, used, refunded or added, newest first. Dates are in UTC.</p>
        </div>
        {ledger.total > 0 && (
          <a
            href={`/api/w/${slug}/billing/credits`}
            download
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium border border-border bg-surface text-fg hover:bg-panel hover:border-border-strong"
          >
            <Download className="w-3.5 h-3.5 text-muted" aria-hidden />
            Download CSV
          </a>
        )}
      </header>
      {ledger.total === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted border-t border-border pt-4">No credits yet. Packs you buy and screenings that use credits show up here.</p>
      ) : (
        <>
          <div className="border-t border-border overflow-x-auto">
            <table className={`w-full min-w-[620px] border-collapse text-sm ${pending ? "opacity-60" : ""}`}>
              <thead>
                <tr className="bg-panel text-left text-[12.5px] font-semibold text-muted">
                  <th className="px-4 py-2.5 font-semibold w-[130px]">Date</th>
                  <th className="px-4 py-2.5 font-semibold w-[190px]">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Details</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-[90px]">Credits</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-[130px] whitespace-nowrap">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmt(r.createdAt)}</td>
                    <td className="px-4 py-2.5 text-fg whitespace-nowrap">{r.label}</td>
                    <td className="px-4 py-2.5 text-muted truncate max-w-[320px]">{r.detail}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${r.amount > 0 ? "text-success" : r.amount < 0 ? "text-danger" : "text-muted"}`}>
                      {r.amount > 0 ? `+${r.amount}` : r.amount < 0 ? `\u2212${-r.amount}` : r.amount}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-fg">{r.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledger.pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border text-[13px] text-muted">
              <span>
                Page {ledger.page} of {ledger.pages}
              </span>
              <div className="flex gap-2">
                <Btn disabled={ledger.page <= 1 || pending} onClick={() => go(ledger.page - 1)}>
                  Newer
                </Btn>
                <Btn disabled={ledger.page >= ledger.pages || pending} onClick={() => go(ledger.page + 1)}>
                  Older
                </Btn>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
