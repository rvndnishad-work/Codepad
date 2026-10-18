/**
 * Creator payouts from Stripe Connect webhooks.
 *
 * payout.* events fire on the connected account (event.account is set) when
 * Stripe moves money from the creator's Stripe balance to their bank.
 * transfer.* events fire on the platform when we move a creator's share to
 * their connected account (transfer.destination). Both land in CreatorPayout,
 * keyed by the Stripe id, so retries and out-of-order events just update the
 * same row.
 */
import { prisma } from "@/lib/prisma";

export const PAYOUT_EVENTS = [
  "payout.created",
  "payout.updated",
  "payout.paid",
  "payout.failed",
  "payout.canceled",
  "transfer.created",
  "transfer.reversed",
] as const;

export type PayoutRow = {
  stripeId: string;
  stripeAccountId: string;
  kind: "payout" | "transfer";
  amountCents: number;
  currency: string;
  status: "pending" | "in_transit" | "paid" | "failed" | "canceled";
  failureMessage: string | null;
  arrivalDate: Date | null;
};

type PayoutLike = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date?: number | null;
  failure_message?: string | null;
};
type TransferLike = {
  id: string;
  amount: number;
  currency: string;
  destination?: string | { id: string } | null;
  reversed?: boolean;
  amount_reversed?: number;
  created?: number;
};

const PAYOUT_STATUSES = new Set(["pending", "in_transit", "paid", "failed", "canceled"]);

/** Map a Stripe event to the row we store, or null when it is not a creator payout event. */
export function payoutRowFromEvent(event: { type: string; account?: string | null; data: { object: unknown } }): PayoutRow | null {
  if (event.type.startsWith("payout.")) {
    const p = event.data.object as PayoutLike;
    if (!event.account || !p?.id) return null; // a payout of the platform's own balance
    const status = event.type === "payout.failed" ? "failed" : event.type === "payout.paid" ? "paid" : p.status;
    return {
      stripeId: p.id,
      stripeAccountId: event.account,
      kind: "payout",
      amountCents: p.amount,
      currency: (p.currency || "usd").toLowerCase(),
      status: (PAYOUT_STATUSES.has(status) ? status : "pending") as PayoutRow["status"],
      failureMessage: p.failure_message ?? null,
      arrivalDate: p.arrival_date ? new Date(p.arrival_date * 1000) : null,
    };
  }
  if (event.type === "transfer.created" || event.type === "transfer.reversed") {
    const t = event.data.object as TransferLike;
    const dest = typeof t?.destination === "string" ? t.destination : t?.destination?.id;
    if (!dest || !t?.id) return null;
    // A transfer reaches the connected balance at once; a full reversal takes it back.
    const fullyReversed = event.type === "transfer.reversed" && (t.reversed || (t.amount_reversed ?? 0) >= t.amount);
    return {
      stripeId: t.id,
      stripeAccountId: dest,
      kind: "transfer",
      amountCents: t.amount - (event.type === "transfer.reversed" && !fullyReversed ? t.amount_reversed ?? 0 : 0),
      currency: (t.currency || "usd").toLowerCase(),
      status: fullyReversed ? "canceled" : "paid",
      failureMessage: fullyReversed ? "Transfer reversed" : null,
      arrivalDate: t.created ? new Date(t.created * 1000) : null,
    };
  }
  return null;
}

/** Store the event against the creator who owns the connected account. Unknown accounts are skipped. */
export async function recordCreatorPayoutEvent(event: { type: string; account?: string | null; data: { object: unknown } }) {
  const row = payoutRowFromEvent(event);
  if (!row) return { stored: false as const, reason: "not a creator payout" };
  const account = await prisma.creatorAccount.findUnique({
    where: { stripeAccountId: row.stripeAccountId },
    select: { userId: true },
  });
  if (!account) return { stored: false as const, reason: `no creator for ${row.stripeAccountId}` };
  await prisma.creatorPayout.upsert({
    where: { stripeId: row.stripeId },
    create: { ...row, creatorUserId: account.userId },
    update: {
      status: row.status,
      amountCents: row.amountCents,
      failureMessage: row.failureMessage,
      arrivalDate: row.arrivalDate,
    },
  });
  return { stored: true as const };
}
