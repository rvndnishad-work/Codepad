"use client";

/**
 * Billing and usage, Usage and credits tab: credit balance, buying credit
 * packs, the low-credit email, six months of usage and the credit history.
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

export type LedgerRowView = {
  id: string;
  createdAt: string;
  label: string;
  detail: string;
  amount: number;
  balanceAfter: number;
};

export type UsageData = {
  credits: { balance: number; held: number; available: number; usedThisMonth: number };
  packs: { id: string; label: string; credits: number; priceCents: number; badge: string | null }[];
  months: UsageMonth[];
  ledger: { rows: LedgerRowView[]; page: number; pages: number; total: number };
  lowCreditThreshold: number | null;
  canEditAlert: boolean;
  aiScreening: boolean;
  purchase: "success" | "cancel" | null;
};

type Notify = (text: string, tone?: "ok" | "error") => void;

export default function UsageTab({
  slug,
  data,
  canManage,
  stripeConfigured,
  notify,
}: {
  slug: string;
  data: UsageData;
  canManage: boolean;
  stripeConfigured: boolean;
  notify: Notify;
}) {
  const { credits } = data;
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Free to use" value={credits.available} hint={credits.held ? `${plural(credits.balance, "credit")} in all` : "Credits never expire."} />
        <Stat label="Held by open invites" value={credits.held} hint="Charged only if the candidate starts." />
        <Stat label="Used this month" value={credits.usedThisMonth} hint="1 to 3 credits per screening started." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        <BuyCredits slug={slug} data={data} canManage={canManage} stripeConfigured={stripeConfigured} notify={notify} />
        <LowCreditEmail slug={slug} data={data} notify={notify} />
      </div>

      <UsageChart months={data.months} />
      <CreditHistory slug={slug} ledger={data.ledger} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <span className="text-[28px] font-semibold tracking-tight tabular-nums text-fg">{value.toLocaleString("en-GB")}</span>
      <span className="text-[13px] text-muted">{hint}</span>
    </div>
  );
}

/* ── Buy credits ────────────────────────────────────────────────────────── */

function BuyCredits({ slug, data, canManage, stripeConfigured, notify }: { slug: string; data: UsageData; canManage: boolean; stripeConfigured: boolean; notify: Notify }) {
  const [busy, setBusy] = useState<string | null>(null);
  const buy = async (packId: string) => {
    setBusy(packId);
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
  else if (!stripeConfigured) note = "Online payments are not set up on this server yet, so credits cannot be bought here.";

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="buy-credits">
      <header className="px-5 pt-4 pb-3">
        <h2 id="buy-credits" className="text-base font-semibold text-fg">
          Buy credits
        </h2>
        <p className="text-[13px] text-muted mt-0.5">One-time packs. Credits never expire and are only charged when a candidate starts.</p>
      </header>
      <ul className="divide-y divide-border border-t border-border">
        {data.packs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-[160px]">
              <div className="flex items-center gap-2 text-sm font-medium text-fg">
                {p.label}, {p.credits} credits
                {p.badge && <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-secondary/15 text-secondary-soft text-xs font-medium">{p.badge}</span>}
              </div>
              <div className="text-[13px] text-muted">
                ${(p.priceCents / 100).toFixed(0)} one time, about ${(p.priceCents / 100 / p.credits).toFixed(2)} a credit
              </div>
            </div>
            {canManage && stripeConfigured && (
              <Btn variant="primary" disabled={!!busy} onClick={() => buy(p.id)}>
                {busy === p.id ? "Opening checkout" : "Buy"}
              </Btn>
            )}
          </li>
        ))}
      </ul>
      {note && <p className="px-5 py-3 border-t border-border text-[13px] text-muted">{note}</p>}
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
    <section className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-3" aria-labelledby="low-credit">
      <div>
        <h2 id="low-credit" className="text-base font-semibold text-fg">
          Low-credit email
        </h2>
        <p className="text-[13px] text-muted mt-0.5">Email every owner and admin once when the balance drops below this. It resets after you top up.</p>
      </div>
      <label htmlFor="low-credit-threshold" className="sr-only">
        Email when credits drop below
      </label>
      <select
        id="low-credit-threshold"
        value={value === null ? "off" : String(value)}
        disabled={!data.canEditAlert || saving}
        onChange={(e) => save(e.target.value === "off" ? null : Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-border bg-bg px-3 text-[13px] text-fg focus:outline-none focus:border-secondary/60 disabled:opacity-60"
      >
        {choices.map((c) => (
          <option key={c ?? "off"} value={c === null ? "off" : String(c)}>
            {c === null ? "Off" : `Below ${c} credits`}
          </option>
        ))}
      </select>
      {!data.canEditAlert && <p className="text-[13px] text-subtle">Only owners and admins can change this.</p>}
    </section>
  );
}

/* ── Six-month usage ────────────────────────────────────────────────────── */

function UsageChart({ months }: { months: UsageMonth[] }) {
  const totals = months.map((m) => m.takeHomes + m.aiScreenings + m.interviews);
  const max = Math.max(1, ...totals);
  // A round top for the scale, so the gridline reads as a plain number.
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 100 ? 20 : 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / step) * step;
  const [showTable, setShowTable] = useState(false);
  const empty = totals.every((t) => t === 0) && months.every((m) => m.creditsUsed === 0 && m.creditsBought === 0);

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="usage-chart">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4 pb-2">
        <div>
          <h2 id="usage-chart" className="text-base font-semibold text-fg">
            Sent in the last six months
          </h2>
          <p className="text-[13px] text-muted mt-0.5">Take homes, AI screenings and interviews sent each month.</p>
        </div>
        <button type="button" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="text-[13px] font-medium text-secondary-soft hover:underline">
          {showTable ? "Hide table" : "Show as a table"}
        </button>
      </header>

      {empty ? (
        <p className="px-5 pb-5 pt-2 text-sm text-muted">Nothing sent yet. Usage shows up here once you send a take home, a screening or an interview.</p>
      ) : (
        <div className="px-5 pb-4">
          <div className="relative h-44 flex items-end gap-3 sm:gap-6 border-b border-border" role="list" aria-label="Sent each month">
            <span aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
            <span aria-hidden className="absolute right-0 -top-5 text-xs text-subtle tabular-nums">{top}</span>
            {months.map((m, i) => {
              const total = totals[i];
              const pct = (total / top) * 100;
              const summary = `${m.label}: ${plural(total, "sent", "sent")}. ${plural(m.takeHomes, "take home")}, ${plural(m.aiScreenings, "AI screening")}, ${plural(m.interviews, "interview")}. ${plural(m.creditsUsed, "credit")} used.`;
              return (
                <div key={m.key} role="listitem" className="group relative flex-1 h-full flex items-end justify-center">
                  <button
                    type="button"
                    aria-label={summary}
                    className="relative w-full max-w-[56px] h-full flex items-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 rounded-t"
                  >
                    <span
                      className="block w-full rounded-t bg-secondary transition-opacity group-hover:opacity-80"
                      style={{ height: total ? `max(${pct}%, 4px)` : "0px" }}
                    />
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 hidden group-hover:flex group-focus-within:flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-border-strong bg-elevated px-3 py-2 text-xs text-fg shadow-lg shadow-black/30"
                  >
                    <span className="font-medium">
                      {m.label}: {total} sent
                    </span>
                    <span className="text-muted">
                      {m.takeHomes} take homes, {m.aiScreenings} AI screenings, {m.interviews} interviews
                    </span>
                    <span className="text-muted">{plural(m.creditsUsed, "credit")} used</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 sm:gap-6 pt-2" aria-hidden>
            {months.map((m) => (
              <span key={m.key} className="flex-1 text-center text-xs text-muted">
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {showTable && (
        <div className="border-t border-border overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-panel text-left text-xs font-medium text-muted">
                <th className="px-4 py-2.5 font-medium">Month</th>
                <th className="px-4 py-2.5 font-medium text-right">Take homes</th>
                <th className="px-4 py-2.5 font-medium text-right">AI screenings</th>
                <th className="px-4 py-2.5 font-medium text-right">Interviews</th>
                <th className="px-4 py-2.5 font-medium text-right">Credits used</th>
                <th className="px-4 py-2.5 font-medium text-right">Credits bought</th>
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
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium border border-border bg-surface text-fg hover:bg-panel hover:border-border-strong"
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
                <tr className="bg-panel text-left text-xs font-medium text-muted">
                  <th className="px-4 py-2.5 font-medium w-[130px]">Date</th>
                  <th className="px-4 py-2.5 font-medium w-[170px]">Type</th>
                  <th className="px-4 py-2.5 font-medium">Details</th>
                  <th className="px-4 py-2.5 font-medium text-right w-[90px]">Credits</th>
                  <th className="px-4 py-2.5 font-medium text-right w-[110px]">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmt(r.createdAt)}</td>
                    <td className="px-4 py-2.5 text-fg">{r.label}</td>
                    <td className="px-4 py-2.5 text-muted truncate max-w-[320px]">{r.detail}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${r.amount > 0 ? "text-success" : "text-fg"}`}>
                      {r.amount > 0 ? `+${r.amount}` : r.amount}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{r.balanceAfter}</td>
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
