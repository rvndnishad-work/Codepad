/**
 * Turn HiringStats into display rows, shared by the page and the CSV export.
 * Pure (type-only import of the stats module).
 */
import type { CreditDay, HiringStats } from "@/lib/admin/stats/hiring";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function usd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: dollars >= 1000 ? 0 : 2, minimumFractionDigits: 0 })}`;
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function pct(r: number | null): string {
  return r === null ? "n/a" : `${Math.round(r * 100)}%`;
}

export function hours(seconds: number): string {
  const h = seconds / 3600;
  return h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1).replace(/\.0$/, "")} h`;
}

export function bytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} KB`;
  return `${n} B`;
}

export function agoShort(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "never";
  const min = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function shortDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export type Kpi = {
  id: string;
  label: string;
  value: string;
  /** Small text after the value, e.g. "of 91 members". */
  suffix?: string;
  suffixTone?: "warn";
  detail: string;
  /** Raw numbers for the CSV. */
  csv: [string, string | number][];
};

export function buildKpis(s: HiringStats, now: Date = new Date()): Kpi[] {
  const r = s.range === 365 ? "12 m" : `${s.range} d`;
  const packs = s.revenue.creditPacks;
  const paidDetail = s.paid.byPlan.length ? s.paid.byPlan.map((p) => `${num(p.count)} ${p.label}`).join(", ") : "None yet";
  const unbilled = s.seats.unbilled;
  const split = `${num(s.credits.included)} included, ${num(s.credits.bought)} bought${s.credits.estimated ? " (est.)" : ""}`;
  return [
    {
      id: "revenue",
      label: "Revenue a month",
      value: usd(s.revenue.mrrCents),
      detail: `Stripe, synced ${agoShort(s.revenue.lastSyncedAt, now)}${packs.cents > 0 ? `; ${usd(packs.cents)} packs in ${r}` : ""}`,
      csv: [
        ["Revenue a month (USD cents)", s.revenue.mrrCents],
        ["Live subscriptions", s.revenue.subscriptions],
        ["Stripe last synced", s.revenue.lastSyncedAt ?? ""],
        [`Credit packs sold in ${r}`, packs.packs],
        [`Credit pack revenue in ${r} (USD cents, from pack table)`, packs.cents],
        [`Credit packs without a matching price in ${r}`, packs.unpriced],
      ],
    },
    {
      id: "paid",
      label: "Paid workspaces",
      value: num(s.paid.total),
      detail: paidDetail,
      csv: [["Paid workspaces", s.paid.total], ...s.paid.byPlan.map((p): [string, number] => [`Paid workspaces: ${p.label}`, p.count])],
    },
    {
      id: "seats",
      label: "Seats billed",
      value: num(s.seats.billed),
      suffix: `of ${num(s.seats.members)} members`,
      suffixTone: unbilled > 0 ? "warn" : undefined,
      detail: unbilled > 0 ? `${num(unbilled)} unbilled in ${num(s.seats.unbilledWorkspaces)} ${s.seats.unbilledWorkspaces === 1 ? "workspace" : "workspaces"}` : "Every member is billed",
      csv: [
        ["Seats billed", s.seats.billed],
        ["Members in billed workspaces", s.seats.members],
        ["Unbilled seats", unbilled],
        ["Workspaces with unbilled seats", s.seats.unbilledWorkspaces],
      ],
    },
    {
      id: "credits",
      label: "AI credits used",
      value: num(s.credits.used),
      detail: s.credits.refunded > 0 ? `${split}; ${num(s.credits.refunded)} refunded` : split,
      csv: [
        [`AI credits used in ${r}`, s.credits.used],
        [`AI credits used from included in ${r}${s.credits.estimated ? " (estimate)" : ""}`, s.credits.included],
        [`AI credits used from bought in ${r}${s.credits.estimated ? " (estimate)" : ""}`, s.credits.bought],
        [`AI credits refunded in ${r}`, s.credits.refunded],
      ],
    },
    {
      id: "trials",
      label: "Trials",
      value: num(s.trials.active),
      detail: `${num(s.trials.endingIn7Days)} end this week, ${pct(s.trials.conversionRate)} convert`,
      csv: [
        ["Active trials", s.trials.active],
        ["Trials ending in 7 days", s.trials.endingIn7Days],
        [`Trials ended in ${r}`, s.trials.ended],
        [`Trials converted in ${r}`, s.trials.converted],
        [`Trial conversion in ${r}`, pct(s.trials.conversionRate)],
      ],
    },
    {
      id: "video",
      label: "Video add-on",
      value: num(s.video.workspaces),
      detail: `${hours(s.video.recordedSeconds)} recorded, ${bytes(s.video.storedBytes)} stored`,
      csv: [
        ["Workspaces with video on", s.video.workspaces],
        [`Recorded seconds in ${r}`, s.video.recordedSeconds],
        ["Recording bytes stored", s.video.storedBytes],
        ["Recordings expiring in 48 h", s.video.expiring48hCount],
        ["Recording bytes expiring in 48 h", s.video.expiring48hBytes],
      ],
    },
  ];
}

export function buildCompletion(s: HiringStats): Kpi[] {
  const r = s.range === 365 ? "12 m" : `${s.range} d`;
  const sc = s.screenings;
  const th = s.takeHomes;
  const iv = s.interviews;
  return [
    {
      id: "screenings",
      label: `AI screenings, ${r}`,
      value: num(sc.total),
      detail: `${pct(sc.completionRate)} completed, ${num(sc.refunded)} refunded`,
      csv: [
        [`AI screenings in ${r}`, sc.total],
        ["AI screenings completed", sc.completed],
        ["AI screenings expired", sc.expired],
        ["AI screenings refunded", sc.refunded],
        ["AI screening completion", pct(sc.completionRate)],
      ],
    },
    {
      id: "take-homes",
      label: `Take homes, ${r}`,
      value: num(th.total),
      detail: `${pct(th.completionRate)} submitted`,
      csv: [
        [`Take homes in ${r}`, th.total],
        ["Take homes submitted", th.submitted],
        ["Take home completion", pct(th.completionRate)],
      ],
    },
    {
      id: "interviews",
      label: `Live interviews, ${r}`,
      value: num(iv.total),
      detail: `${num(iv.abandoned)} abandoned${iv.medianMinutes !== null ? `, median ${iv.medianMinutes} min` : ""}`,
      csv: [
        [`Live interviews in ${r}`, iv.total],
        ["Live interviews completed", iv.completed],
        ["Live interviews abandoned", iv.abandoned],
        ["Live interview completion", pct(iv.completionRate)],
        ["Median live interview minutes", iv.medianMinutes ?? ""],
      ],
    },
  ];
}

/** Group days into buckets of `size` (a week for 12 months) so the chart keeps a readable bar count. */
export function bucketDays(days: CreditDay[], size: number): { start: string; end: string; used: number; refunded: number }[] {
  const out: { start: string; end: string; used: number; refunded: number }[] = [];
  const n = Math.max(1, size);
  // Align so the last bucket ends today.
  const offset = days.length % n;
  for (let i = offset === 0 ? 0 : offset - n; i < days.length; i += n) {
    const slice = days.slice(Math.max(0, i), i + n);
    if (slice.length === 0) continue;
    out.push({
      start: slice[0].day,
      end: slice[slice.length - 1].day,
      used: slice.reduce((s, d) => s + d.used, 0),
      refunded: slice.reduce((s, d) => s + d.refunded, 0),
    });
  }
  return out;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function kpiCsv(s: HiringStats, now: Date = new Date()): string {
  const rows: [string, string | number][] = [
    ["Range", s.range === 365 ? "12 months" : `${s.range} days`],
    ["From (UTC)", s.since.slice(0, 10)],
    ["Generated (UTC)", s.generatedAt],
    ...buildKpis(s, now).flatMap((k) => k.csv),
    ...buildCompletion(s).flatMap((k) => k.csv),
  ];
  const daily: [string, string | number][] = s.credits.days.map((d) => [`AI credits used on ${d.day}`, d.used]);
  return ["Metric,Value", ...[...rows, ...daily].map(([k, v]) => `${csvCell(k)},${csvCell(v)}`)].join("\n") + "\n";
}
