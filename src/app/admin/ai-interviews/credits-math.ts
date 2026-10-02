/**
 * Pure credit maths for the admin AI credits page: totals from a groupBy by
 * ledger kind, labels, and the rules for adjustments and refunds. Tested in
 * credits-math.test.ts.
 */
import type { Tone } from "../interviews/_components/list";

/** Ledger kinds the page knows. ADJUST is written by the admin adjust action. */
export const LEDGER_KINDS = ["GRANT", "PURCHASE", "INCLUDED", "TRIAL", "CONSUMPTION", "REFUND", "ADJUSTMENT", "INCLUDED_EXPIRED"] as const;
export type LedgerKindId = (typeof LEDGER_KINDS)[number];

export const KIND_META: Record<string, { label: string; tone: Tone }> = {
  GRANT: { label: "Granted", tone: "info" },
  PURCHASE: { label: "Bought", tone: "ok" },
  INCLUDED: { label: "Included with plan", tone: "ok" },
  TRIAL: { label: "Trial", tone: "ok" },
  CONSUMPTION: { label: "Used", tone: "off" },
  REFUND: { label: "Refunded", tone: "warn" },
  ADJUST: { label: "Adjusted", tone: "warn" },
  INCLUDED_EXPIRED: { label: "Expired", tone: "off" },
};

export function kindMeta(kind: string): { label: string; tone: Tone } {
  return KIND_META[kind] ?? { label: kind.charAt(0) + kind.slice(1).toLowerCase().replace(/_/g, " "), tone: "off" };
}

export type KindSum = { kind: string; sum: number; count: number };

export type CreditTotals = {
  /** Sum of every row: what all workspaces hold right now. */
  balance: number;
  /** Credits handed out by people: admin grants plus Stripe purchases. */
  lifetimeGranted: number;
  granted: number;
  purchased: number;
  /** Free credits from plans and trials. */
  included: number;
  /** Credits spent, net of refunds (positive number). */
  used: number;
  refunded: number;
  expired: number;
  /** Net admin adjustments (signed). */
  adjusted: number;
};

/** Totals from a `groupBy({ by: ["kind"], _sum: { amount } })`. */
export function creditTotals(rows: KindSum[]): CreditTotals {
  const s = (k: string) => rows.filter((r) => r.kind === k).reduce((n, r) => n + r.sum, 0);
  const granted = s("GRANT");
  const purchased = s("PURCHASE");
  const refunded = s("REFUND");
  return {
    balance: rows.reduce((n, r) => n + r.sum, 0),
    lifetimeGranted: granted + purchased,
    granted,
    purchased,
    included: s("INCLUDED") + s("TRIAL"),
    used: Math.max(0, -s("CONSUMPTION") - refunded),
    refunded,
    expired: -s("INCLUDED_EXPIRED"),
    adjusted: s("ADJUSTMENT"),
  };
}

export const MAX_GRANT = 10_000;

/** Validate a grant amount: a whole number from 1 to MAX_GRANT. */
export function grantError(amount: number): string | null {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_GRANT) return `Grant a whole number from 1 to ${MAX_GRANT.toLocaleString("en-US")}.`;
  return null;
}

/**
 * Validate a signed adjustment against the current balance. A debit cannot
 * take the balance below zero, so a workspace never owes credits.
 */
export function adjustError(amount: number, balance: number): string | null {
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_GRANT) {
    return `Use a whole number from -${MAX_GRANT.toLocaleString("en-US")} to ${MAX_GRANT.toLocaleString("en-US")}, not 0.`;
  }
  if (balance + amount < 0) return `The workspace has ${balance} credits, so you can take off at most ${Math.max(0, balance)}.`;
  return null;
}

/**
 * Included credits left after the balance changes: they can never be more
 * than the balance itself (they are a part of it).
 */
export function includedAfter(includedLeft: number, newBalance: number): number {
  return Math.max(0, Math.min(includedLeft, newBalance));
}

/**
 * What a refund of a session gives back: exactly what it was charged, read
 * from its CONSUMPTION rows. Null with a reason when it cannot be refunded.
 */
export function refundAmount(rows: { kind: string; amount: number }[]): { amount: number } | { error: string } {
  if (rows.some((r) => r.kind === "REFUND")) return { error: "This screening was already refunded." };
  const charged = -rows.filter((r) => r.kind === "CONSUMPTION").reduce((n, r) => n + r.amount, 0);
  if (charged <= 0) return { error: "This screening was never charged, so there is nothing to refund." };
  return { amount: charged };
}
