/**
 * Billing and usage: credit history rows, the CSV export, the six-month
 * usage buckets, the low-credit email rule and the audit entries Stripe
 * events turn into. Pure, so the page, the CSV route, the webhook and the
 * tests share one set of rules.
 */
import { planConfig } from "./plans";

/* ── Credit history ─────────────────────────────────────────────────────── */

export type LedgerKind = "PURCHASE" | "CONSUMPTION" | "GRANT" | "REFUND" | string;

export const LEDGER_KIND_LABELS: Record<string, string> = {
  PURCHASE: "Bought",
  CONSUMPTION: "Used",
  GRANT: "Added by Interviewpad",
  REFUND: "Refunded",
};

export function ledgerKindLabel(kind: LedgerKind): string {
  return LEDGER_KIND_LABELS[kind] ?? kind.charAt(0) + kind.slice(1).toLowerCase().replace(/_/g, " ");
}

export type LedgerRow = {
  id: string;
  kind: LedgerKind;
  amount: number;
  createdAt: Date | string;
  note: string | null;
  /** Candidate name for a screening that used credits, when known. */
  candidateName?: string | null;
};

export type LedgerView = LedgerRow & { label: string; detail: string; balanceAfter: number };

/** Plain text for the "Details" column. Stripe ids and internal notes stay out. */
export function ledgerDetail(row: LedgerRow): string {
  switch (row.kind) {
    case "CONSUMPTION":
      return row.candidateName ? `AI screening with ${row.candidateName}` : "AI screening";
    case "REFUND":
      return row.candidateName ? `Screening with ${row.candidateName} refunded` : cleanNote(row.note) ?? "Screening refunded";
    case "PURCHASE": {
      const pack = /pack ([a-z]+)-\d+/i.exec(row.note ?? "")?.[1];
      return pack ? `${pack.charAt(0).toUpperCase()}${pack.slice(1)} pack` : "Credit pack";
    }
    default:
      return cleanNote(row.note) ?? "";
  }
}

function cleanNote(note: string | null): string | null {
  const n = note?.replace(/\s+/g, " ").trim();
  return n ? n.slice(0, 140) : null;
}

/**
 * Label each row and work out the balance after it. `rows` are newest
 * first and `balanceNow` is the balance after the newest row; `newerSum`
 * is the sum of any newer rows not in this page (0 on the first page).
 */
export function ledgerViews(rows: LedgerRow[], balanceNow: number, newerSum = 0): LedgerView[] {
  let after = balanceNow - newerSum;
  return rows.map((r) => {
    const view = { ...r, label: ledgerKindLabel(r.kind), detail: ledgerDetail(r), balanceAfter: after };
    after -= r.amount;
    return view;
  });
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  // Guard against spreadsheet formulas in free text.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const LEDGER_CSV_HEADER = ["Date (UTC)", "Type", "Credits", "Balance after", "Details"];

/** The credit history as CSV, one line per ledger row, newest first. */
export function ledgerCsv(views: LedgerView[]): string {
  const lines = [LEDGER_CSV_HEADER.map(csvCell).join(",")];
  for (const v of views) {
    const at = new Date(v.createdAt).toISOString().replace("T", " ").slice(0, 16);
    lines.push([at, v.label, v.amount, v.balanceAfter, v.detail].map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/* ── Six-month usage ────────────────────────────────────────────────────── */

export const USAGE_MONTHS = 6;

// Fixed names: Intl gives "Sep" or "Sept" depending on the runtime, which would differ between server and browser.
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type MonthBucket = { key: string; label: string; start: Date; end: Date };

/** The last `count` calendar months in UTC, oldest first, ending with the current month. */
export function usageMonths(now: Date = new Date(), count = USAGE_MONTHS): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    out.push({
      key: monthKey(start),
      label: MONTH_NAMES[start.getUTCMonth()],
      start,
      end,
    });
  }
  return out;
}

export function monthKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type UsageMonth = {
  key: string;
  label: string;
  takeHomes: number;
  aiScreenings: number;
  interviews: number;
  creditsUsed: number;
  creditsBought: number;
};

/**
 * Count what was sent and the credits moved in each month. Anything
 * outside the window is ignored. Credits used are shown as a positive number.
 */
export function usageByMonth(
  months: MonthBucket[],
  data: {
    takeHomes: (Date | string)[];
    aiScreenings: (Date | string)[];
    interviews: (Date | string)[];
    ledger: { kind: string; amount: number; createdAt: Date | string }[];
  },
): UsageMonth[] {
  const byKey = new Map<string, UsageMonth>(
    months.map((m) => [m.key, { key: m.key, label: m.label, takeHomes: 0, aiScreenings: 0, interviews: 0, creditsUsed: 0, creditsBought: 0 }]),
  );
  const bump = (at: Date | string, field: "takeHomes" | "aiScreenings" | "interviews") => {
    const m = byKey.get(monthKey(at));
    if (m) m[field] += 1;
  };
  data.takeHomes.forEach((d) => bump(d, "takeHomes"));
  data.aiScreenings.forEach((d) => bump(d, "aiScreenings"));
  data.interviews.forEach((d) => bump(d, "interviews"));
  for (const l of data.ledger) {
    const m = byKey.get(monthKey(l.createdAt));
    if (!m) continue;
    if (l.kind === "CONSUMPTION") m.creditsUsed += -l.amount;
    else if (l.kind === "REFUND") m.creditsUsed -= l.amount;
    else if (l.kind === "PURCHASE") m.creditsBought += l.amount;
  }
  for (const m of byKey.values()) m.creditsUsed = Math.max(0, m.creditsUsed);
  return months.map((m) => byKey.get(m.key)!);
}

/* ── Low-credit email ───────────────────────────────────────────────────── */

export type LowCreditDecision = "send" | "clear" | "none";

/**
 * Whether to email admins about low credits. One email per dip: once sent,
 * nothing more until the balance climbs back to the threshold or above,
 * which clears the stamp so the next dip emails again.
 */
export function lowCreditDecision(s: { threshold: number | null; alertedAt: Date | string | null }, balance: number): LowCreditDecision {
  if (s.threshold === null) return s.alertedAt ? "clear" : "none";
  if (balance < s.threshold) return s.alertedAt ? "none" : "send";
  return s.alertedAt ? "clear" : "none";
}

/* ── Stripe events to audit entries ─────────────────────────────────────── */

export const planDisplayName = (planName: string): string => planConfig(planName).name;

export type BillingAudit = { action: "PLAN_CHANGED" | "SUBSCRIPTION_CANCELLED"; meta: Record<string, unknown> };

/**
 * Audit entries for a customer.subscription.updated event: a plan change,
 * and a cancellation booked for the end of the period (Stripe keeps the
 * subscription until then).
 */
export function subscriptionUpdateAudits(a: {
  fromPlan: string;
  toPlan: string;
  cancelAtPeriodEnd: boolean;
  /** Stripe's previous_attributes.cancel_at_period_end, when it changed in this event. */
  previousCancelAtPeriodEnd?: boolean;
}): BillingAudit[] {
  const out: BillingAudit[] = [];
  if (a.fromPlan !== a.toPlan) {
    out.push({ action: "PLAN_CHANGED", meta: { from: planDisplayName(a.fromPlan), to: planDisplayName(a.toPlan), source: "stripe" } });
  }
  if (a.cancelAtPeriodEnd && a.previousCancelAtPeriodEnd === false) {
    out.push({ action: "SUBSCRIPTION_CANCELLED", meta: { plan: planDisplayName(a.fromPlan), atPeriodEnd: true, source: "stripe" } });
  }
  return out;
}
