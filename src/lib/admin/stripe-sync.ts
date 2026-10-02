/**
 * Stripe snapshot on the workspace: status, billed seats, normalised monthly
 * revenue, interval, period end and past-due start. The admin dashboards read
 * these columns instead of calling Stripe on every page load.
 *
 * Kept fresh two ways:
 *   - the Stripe webhook calls `syncStripeFromWebhook` on subscription and
 *     invoice events;
 *   - the nightly `stripe-sync` cron calls `syncAllWorkspaces`.
 *
 * Seat and video add-on items are told apart the way billing does it
 * (`isVideoAddonItem` / `seatItem` in src/lib/video/addon.ts): the add-on
 * carries `metadata.kind = "video_addon"`, every other item is the seat line.
 *
 * MRR is list price × quantity per recurring item, normalised to a month.
 * Coupons and discounts are not taken off (Stripe does not put them on the
 * item); one-off invoice items are not recurring and are left out.
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isVideoAddonItem, seatItem } from "@/lib/video/addon";

// ── Pure helpers (unit tested) ───────────────────────────────────────────

export type RecurringItemLike = {
  id: string;
  quantity?: number | null;
  metadata?: Record<string, string> | null;
  current_period_end?: number | null;
  price?: {
    unit_amount?: number | null;
    unit_amount_decimal?: string | null;
    metadata?: Record<string, string> | null;
    recurring?: { interval: string; interval_count?: number | null } | null;
  } | null;
};

/**
 * One recurring charge normalised to cents a month. Yearly is divided by 12,
 * weekly × 52 / 12, daily × 365 / 12; `interval_count` divides further
 * (every 3 months = a third a month). Not rounded.
 */
export function monthlyCents(amountCents: number, interval: string, intervalCount = 1): number {
  const n = intervalCount > 0 ? intervalCount : 1;
  switch (interval) {
    case "year":
      return amountCents / (12 * n);
    case "month":
      return amountCents / n;
    case "week":
      return (amountCents * 52) / 12 / n;
    case "day":
      return (amountCents * 365) / 12 / n;
    default:
      return 0;
  }
}

function unitCents(item: RecurringItemLike): number {
  const p = item.price;
  if (!p) return 0;
  if (typeof p.unit_amount === "number") return p.unit_amount;
  const dec = p.unit_amount_decimal ? Number(p.unit_amount_decimal) : NaN;
  return Number.isFinite(dec) ? dec : 0;
}

/** Sum of every recurring item (unit price × quantity) in cents a month, rounded. */
export function subscriptionMrrCents(items: RecurringItemLike[]): number {
  let total = 0;
  for (const item of items) {
    const rec = item.price?.recurring;
    if (!rec) continue;
    const qty = item.quantity ?? 1;
    total += monthlyCents(unitCents(item) * qty, rec.interval, rec.interval_count ?? 1);
  }
  return Math.round(total);
}

/**
 * Past-due start: kept while the status stays past_due, stamped `now` when it
 * turns past_due, cleared for any other status.
 */
export function nextPastDueSince(status: string | null, previous: Date | null, now: Date): Date | null {
  if (status !== "past_due") return null;
  return previous ?? now;
}

export type StripeSnapshot = {
  stripeStatus: string | null;
  stripeSeatQuantity: number | null;
  stripeMrrCents: number | null;
  stripeInterval: string | null;
  stripeCurrentPeriodEnd: Date | null;
  stripePastDueSince: Date | null;
  stripeSyncedAt: Date;
};

export type SubscriptionLike = {
  status: string;
  items: { data: RecurringItemLike[] };
};

/** Snapshot columns from a Stripe subscription. Cancelled subscriptions bill nothing. */
export function snapshotFromSubscription(
  sub: SubscriptionLike,
  previousPastDueSince: Date | null,
  now: Date = new Date(),
): StripeSnapshot {
  const items = sub.items.data;
  const seat = seatItem(items);
  const ended = sub.status === "canceled" || sub.status === "incomplete_expired";
  const periodEnd = seat?.current_period_end ?? items.find((i) => i.current_period_end)?.current_period_end ?? null;
  return {
    stripeStatus: sub.status,
    stripeSeatQuantity: seat ? (seat.quantity ?? 1) : null,
    stripeMrrCents: ended ? 0 : subscriptionMrrCents(items),
    stripeInterval: seat?.price?.recurring?.interval ?? null,
    stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    stripePastDueSince: nextPastDueSince(sub.status, previousPastDueSince, now),
    stripeSyncedAt: now,
  };
}

/** Snapshot for a workspace with no subscription on file. */
export function snapshotWithoutSubscription(previousStatus: string | null, now: Date = new Date()): StripeSnapshot {
  return {
    // A workspace that used to have one keeps "canceled" so lists can tell it apart from never-paid.
    stripeStatus: previousStatus ? "canceled" : null,
    stripeSeatQuantity: null,
    stripeMrrCents: previousStatus ? 0 : null,
    stripeInterval: null,
    stripeCurrentPeriodEnd: null,
    stripePastDueSince: null,
    stripeSyncedAt: now,
  };
}

/** Video add-on item on a subscription, if any. */
export function hasVideoAddonItem(items: RecurringItemLike[]): boolean {
  return items.some((i) => isVideoAddonItem(i));
}

// ── Server ───────────────────────────────────────────────────────────────

export type SyncResult =
  | { ok: true; workspaceId: string; status: string | null; mrrCents: number | null }
  | { ok: false; workspaceId: string; error: string };

/**
 * Read the workspace subscription from Stripe and write the snapshot.
 * `subscriptionId` overrides the stored one (a webhook can arrive before
 * checkout stores it). Throws only when Stripe is not configured.
 */
export async function syncWorkspaceStripe(
  workspaceId: string,
  opts: { subscriptionId?: string | null } = {},
): Promise<SyncResult> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, stripeSubscriptionId: true, stripeStatus: true, stripePastDueSince: true },
  });
  if (!ws) return { ok: false, workspaceId, error: "workspace not found" };
  const now = new Date();
  const subId = opts.subscriptionId ?? ws.stripeSubscriptionId;
  try {
    let data: StripeSnapshot;
    if (!subId) {
      data = snapshotWithoutSubscription(ws.stripeStatus, now);
    } else {
      const sub = await getStripe().subscriptions.retrieve(subId);
      data = snapshotFromSubscription(sub as unknown as SubscriptionLike, ws.stripePastDueSince, now);
    }
    await prisma.workspace.update({ where: { id: ws.id }, data });
    return { ok: true, workspaceId, status: data.stripeStatus, mrrCents: data.stripeMrrCents };
  } catch (err) {
    const message = String((err as Error)?.message ?? err).slice(0, 300);
    // A subscription Stripe no longer knows is gone.
    if ((err as { code?: string })?.code === "resource_missing") {
      const data = snapshotWithoutSubscription(ws.stripeStatus ?? "canceled", now);
      await prisma.workspace.update({ where: { id: ws.id }, data });
      return { ok: true, workspaceId, status: data.stripeStatus, mrrCents: data.stripeMrrCents };
    }
    return { ok: false, workspaceId, error: message };
  }
}

/**
 * Every workspace that has, or had, a Stripe subscription. Paged by id, a few
 * at a time so a large customer list does not hit Stripe rate limits.
 */
export async function syncAllWorkspaces(): Promise<{ total: number; synced: number; failed: number; errors: string[] }> {
  if (!process.env.STRIPE_SECRET_KEY) return { total: 0, synced: 0, failed: 0, errors: ["STRIPE_SECRET_KEY is not set"] };
  const PAGE = 100;
  const CONCURRENCY = 4;
  let cursor: string | undefined;
  let total = 0;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  for (;;) {
    const page = await prisma.workspace.findMany({
      where: { OR: [{ stripeSubscriptionId: { not: null } }, { stripeStatus: { not: null } }] },
      select: { id: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (page.length === 0) break;
    for (let i = 0; i < page.length; i += CONCURRENCY) {
      const results = await Promise.all(page.slice(i, i + CONCURRENCY).map((w) => syncWorkspaceStripe(w.id)));
      for (const r of results) {
        total++;
        if (r.ok) synced++;
        else {
          failed++;
          if (errors.length < 10) errors.push(`${r.workspaceId}: ${r.error}`);
        }
      }
    }
    cursor = page[page.length - 1].id;
    if (page.length < PAGE) break;
  }
  return { total, synced, failed, errors };
}

/**
 * Webhook entry point: find the workspace by subscription or customer and
 * sync it. Never throws; a sync failure must not fail the webhook (the
 * nightly job catches up).
 */
export async function syncStripeFromWebhook(ref: { subscriptionId?: string | null; customerId?: string | null }): Promise<void> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return;
    const or = [
      ...(ref.subscriptionId ? [{ stripeSubscriptionId: ref.subscriptionId }] : []),
      ...(ref.customerId ? [{ stripeCustomerId: ref.customerId }] : []),
    ];
    if (or.length === 0) return;
    const rows = await prisma.workspace.findMany({ where: { OR: or }, select: { id: true, stripeSubscriptionId: true }, take: 5 });
    for (const ws of rows) {
      // Found by customer before checkout stored the subscription: use the event one.
      await syncWorkspaceStripe(ws.id, { subscriptionId: ws.stripeSubscriptionId ?? ref.subscriptionId ?? null });
    }
  } catch (err) {
    console.error("[stripe-sync] webhook sync failed", err);
  }
}
