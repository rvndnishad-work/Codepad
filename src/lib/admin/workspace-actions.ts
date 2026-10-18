/**
 * Admin console: everything an admin can do to one workspace from
 * /admin/workspaces/[id]. Billing (Stripe seats, retry, comp, plan, trial),
 * AI credits (grant, adjust, refund), the video add-on, lock and scheduled
 * deletion, and members.
 *
 * The pure rules sit at the top (unit tested in workspace-actions.test.ts).
 * The server functions below take an already-checked admin actor; the
 * server actions in src/app/admin/workspaces/[id]/actions.ts check the
 * permission and call these. Every mutation writes an AdminAuditLog row
 * (workspace.*) after it succeeds.
 *
 * Server modules marked "server-only" (handover, data privacy, credit
 * alerts) are imported lazily so the pure part stays importable in tests.
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { logAdminAction, type AdminActor } from "@/lib/admin/audit";
import { seatItem } from "@/lib/video/addon";
import { WORKSPACE_ROLES } from "@/lib/workspace/members";

/* ══ Pure rules ════════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const ok = <T extends object>(v?: T): Result<T> => ({ ok: true, ...(v ?? ({} as T)) });
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Plans an admin can set. LOCKED is no longer a plan: use the lock. */
export const ADMIN_PLANS = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"] as const;
export type AdminPlan = (typeof ADMIN_PLANS)[number];

/** Plan name for the console. Unknown names show as stored. */
export function planLabel(planName: string): string {
  return ({ FREE: "Free", STARTER: "Starter", GROWTH: "Growth", ENTERPRISE: "Enterprise", LOCKED: "Locked (old plan)" } as Record<string, string>)[planName] ?? planName;
}

export function isAdminPlan(v: unknown): v is AdminPlan {
  return typeof v === "string" && (ADMIN_PLANS as readonly string[]).includes(v);
}

/** A note an action requires: trimmed, 3 to 500 characters. */
export function cleanNote(note: unknown, { required = true } = {}): Result<{ note: string }> {
  const n = typeof note === "string" ? note.replace(/\s+/g, " ").trim() : "";
  if (!n) return required ? fail("Add a note that says why.") : ok({ note: "" });
  if (n.length < 3) return fail("The note is too short.");
  return ok({ note: n.slice(0, 500) });
}

/**
 * A credit amount typed by an admin. Grants are 1 to 10,000; adjustments
 * may be negative but never zero.
 */
export function parseCreditAmount(input: unknown, { allowNegative = false } = {}): Result<{ amount: number }> {
  const n = typeof input === "number" ? input : Number(String(input ?? "").trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fail("Enter a whole number of credits.");
  if (n === 0) return fail("The amount cannot be zero.");
  if (!allowNegative && n < 0) return fail("Enter a positive number of credits.");
  if (Math.abs(n) > 10_000) return fail("That is more than 10,000 credits. Split it or check the number.");
  return ok({ amount: n });
}

export type SeatDiff = {
  /** Seats on the Stripe subscription, or null when it is not known. */
  billed: number | null;
  members: number;
  /** members minus billed: positive means unbilled seats. */
  diff: number;
  inSync: boolean;
  /** The quantity a sync writes (Stripe needs at least one). */
  target: number;
};

/** Seats billed against members, and what "Sync seats" would set. */
export function seatDiff(billed: number | null | undefined, members: number): SeatDiff {
  const target = Math.max(1, members);
  const b = billed ?? null;
  return { billed: b, members, diff: b === null ? 0 : members - b, inSync: b !== null && b === target, target };
}

export type LedgerRowLite = { kind: string; amount: number };

/**
 * Can a screening's credits be refunded? It needs a CONSUMPTION row and no
 * REFUND row yet. The refund gives back exactly what was charged (the cost
 * depends on the engagement level, so it is not always one credit).
 */
export function refundEligibility(rows: LedgerRowLite[]): Result<{ amount: number }> {
  if (rows.some((r) => r.kind === "REFUND")) return fail("This session was already refunded.");
  const charged = rows.filter((r) => r.kind === "CONSUMPTION").reduce((s, r) => s - r.amount, 0);
  if (charged <= 0) return fail("This session was never charged, so there is nothing to refund.");
  return ok({ amount: charged });
}

/**
 * New trial end: N days from the current end, or from now when the trial
 * has already ended. 1 to 90 days.
 */
export function extendedTrialEnd(current: Date | null | undefined, days: number, now: Date = new Date()): Result<{ trialEndsAt: Date }> {
  if (!Number.isInteger(days) || days < 1 || days > 90) return fail("Extend by 1 to 90 days.");
  const from = current && current.getTime() > now.getTime() ? current : now;
  return ok({ trialEndsAt: new Date(from.getTime() + days * DAY_MS) });
}

/**
 * Included credits after the balance drops: the included part can never be
 * more than the whole balance.
 */
export function includedAfterBalance(includedLeft: number, newBalance: number): number {
  return Math.max(0, Math.min(includedLeft, newBalance));
}

/** One month of the subscription, in cents, for "Comp a month". */
export function compMonthCents(mrrCents: number | null | undefined): Result<{ cents: number }> {
  if (!mrrCents || mrrCents <= 0) return fail("No monthly amount is synced from Stripe yet, so there is nothing to comp.");
  return ok({ cents: Math.round(mrrCents) });
}

export type Tone = "ok" | "warn" | "bad" | "off" | "info";
export type StatusPill = { label: string; tone: Tone };

export type StatusInput = {
  planName: string;
  stripeStatus: string | null;
  stripeSubscriptionId?: string | null;
  stripePastDueSince?: Date | null;
  trialEndsAt: Date | null;
  lockedAt: Date | null;
  deletionScheduledAt: Date | null;
};

const shortDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** The status pills shown in the header and the list, most serious first. */
export function workspaceStatusPills(w: StatusInput, now: Date = new Date()): StatusPill[] {
  const pills: StatusPill[] = [];
  if (w.lockedAt) pills.push({ label: "Locked", tone: "bad" });
  if (w.deletionScheduledAt) pills.push({ label: `Deletion ${shortDate(new Date(w.deletionScheduledAt.getTime() + 30 * DAY_MS))}`, tone: "bad" });
  const s = w.stripeStatus;
  if (s === "past_due" || s === "unpaid") {
    pills.push({ label: w.stripePastDueSince ? `Past due, ${shortDate(w.stripePastDueSince)}` : "Past due", tone: "bad" });
  } else if (s === "canceled" || s === "incomplete_expired") {
    pills.push({ label: "Cancelled", tone: "off" });
  } else if (s === "incomplete") {
    pills.push({ label: "Incomplete", tone: "warn" });
  } else if (s === "active") {
    pills.push({ label: "Active", tone: "ok" });
  }
  if (w.trialEndsAt && !w.stripeSubscriptionId && w.planName === "FREE") {
    const left = Math.ceil((w.trialEndsAt.getTime() - now.getTime()) / DAY_MS);
    if (left > 0) pills.push({ label: left === 1 ? "Trial, 1 day left" : `Trial, ${left} days left`, tone: left <= 3 ? "warn" : "info" });
  }
  return pills;
}

/** Ledger kinds for the filter, with the admin wording. */
export const LEDGER_KINDS: { id: string; label: string; tone: Tone }[] = [
  { id: "GRANT", label: "Grant", tone: "info" },
  { id: "ADJUSTMENT", label: "Adjustment", tone: "info" },
  { id: "CONSUMPTION", label: "Used", tone: "off" },
  { id: "REFUND", label: "Refund", tone: "warn" },
  { id: "PURCHASE", label: "Bought", tone: "ok" },
  { id: "INCLUDED", label: "Included", tone: "info" },
  { id: "INCLUDED_EXPIRED", label: "Expired", tone: "off" },
  { id: "TRIAL", label: "Trial", tone: "info" },
];

export function ledgerKind(kind: string): { label: string; tone: Tone } {
  return LEDGER_KINDS.find((k) => k.id === kind) ?? { label: kind.charAt(0) + kind.slice(1).toLowerCase().replace(/_/g, " "), tone: "off" };
}

export const LEDGER_RANGES = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last year", days: 365 },
  { id: "all", label: "All time", days: null },
] as const;

/** Ledger filter from the URL: unknown values fall back to all kinds and 90 days. */
export function parseLedgerFilter(sp: { kind?: string; range?: string }, now: Date = new Date()): { kind: string | null; range: string; since: Date | null } {
  const kind = sp.kind && LEDGER_KINDS.some((k) => k.id === sp.kind) ? sp.kind : null;
  const r = LEDGER_RANGES.find((x) => x.id === sp.range) ?? LEDGER_RANGES[1];
  return { kind, range: r.id, since: r.days === null ? null : new Date(now.getTime() - r.days * DAY_MS) };
}

/** One CSV cell, quoted when needed, with formula injection neutralised. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Server paging from ?page=, 1-based, clamped. */
export function pageOf(raw: string | undefined, total: number, size: number): { page: number; skip: number; pages: number } {
  const pages = Math.max(1, Math.ceil(total / size));
  const n = Math.floor(Number(raw));
  const page = Number.isFinite(n) && n >= 1 ? Math.min(n, pages) : 1;
  return { page, skip: (page - 1) * size, pages };
}

/** Owners after an admin hands ownership to `targetId`: only them; the old owners become admins. */
export function ownerTransferPlan(members: { id: string; role: string }[], targetId: string): Result<{ demote: string[] }> {
  const target = members.find((m) => m.id === targetId);
  if (!target) return fail("That member is not in this workspace.");
  if (target.role === "OWNER" && members.filter((m) => m.role === "OWNER").length === 1) return fail("They are already the only owner.");
  return ok({ demote: members.filter((m) => m.role === "OWNER" && m.id !== targetId).map((m) => m.id) });
}

/** Role change by an admin: the same rules as the workspace, with the admin acting as an owner. */
export function adminRoleChange(members: { id: string; role: string }[], targetId: string, nextRole: string): Result {
  if (!(WORKSPACE_ROLES as readonly string[]).includes(nextRole)) return fail("Unknown role.");
  const target = members.find((m) => m.id === targetId);
  if (!target) return fail("That member is not in this workspace.");
  if (target.role === nextRole) return fail("They already have that role.");
  if (target.role === "OWNER" && !members.some((m) => m.role === "OWNER" && m.id !== targetId)) {
    return fail("This is the only owner. Transfer ownership first.");
  }
  return ok();
}

/* ══ Server ════════════════════════════════════════════════════════════════ */

type Ctx = { actor: AdminActor };

async function wsLabel(id: string) {
  return prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      trialEndedAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSeatQuantity: true,
      stripeMrrCents: true,
      stripeStatus: true,
      lockedAt: true,
      lockedReason: true,
      deletionScheduledAt: true,
      includedCreditsLeft: true,
      videoEnabled: true,
      _count: { select: { members: true } },
    },
  });
}

function stripeReady(subId: string | null | undefined): boolean {
  return Boolean(subId && process.env.STRIPE_SECRET_KEY);
}

function stripeMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message?: unknown }).message).slice(0, 300);
  return "unknown Stripe error";
}

async function audit(ctx: Ctx, ws: { id: string; name: string }, action: string, x: { before?: unknown; after?: unknown; note?: string | null } = {}) {
  await logAdminAction({ actor: ctx.actor, action, targetType: "workspace", targetId: ws.id, targetLabel: ws.name, ...x });
}

/* ── Subscription ───────────────────────────────────────────────────────── */

/** Set the Stripe seat quantity to the member count. */
export async function syncSeats(ctx: Ctx, workspaceId: string): Promise<Result<{ seats: number }>> {
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (!stripeReady(ws.stripeSubscriptionId)) return fail("This workspace has no Stripe subscription.");
  const d = seatDiff(ws.stripeSeatQuantity, ws._count.members);
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId!);
    const item = seatItem(sub.items.data);
    if (!item) return fail("The subscription has no seat line.");
    if (item.quantity !== d.target) {
      await stripe.subscriptionItems.update(item.id, { quantity: d.target, proration_behavior: "create_prorations" });
    }
    await prisma.workspace.update({ where: { id: ws.id }, data: { stripeSeatQuantity: d.target, stripeSyncedAt: new Date() } });
    await audit(ctx, ws, "workspace.seats.sync", { before: { seats: item.quantity ?? null }, after: { seats: d.target } });
    return ok({ seats: d.target });
  } catch (err) {
    console.error("[admin] seat sync failed", err);
    return fail(`Stripe refused the seat change: ${stripeMessage(err)}`);
  }
}

/** Pay the open invoice now with the card on file. */
export async function retryPayment(ctx: Ctx, workspaceId: string): Promise<Result<{ status: string }>> {
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (!stripeReady(ws.stripeSubscriptionId)) return fail("This workspace has no Stripe subscription.");
  const stripe = getStripe();
  let invoiceId: string | undefined;
  try {
    const open = await stripe.invoices.list({ subscription: ws.stripeSubscriptionId!, status: "open", limit: 1 });
    invoiceId = open.data[0]?.id;
    if (!invoiceId) return fail("There is no open invoice to pay.");
    const paid = await stripe.invoices.pay(invoiceId);
    await audit(ctx, ws, "workspace.payment.retry", { after: { invoiceId, status: paid.status } });
    return ok({ status: paid.status ?? "unknown" });
  } catch (err) {
    await audit(ctx, ws, "workspace.payment.retry", { after: { invoiceId: invoiceId ?? null, error: stripeMessage(err) } });
    return fail(`The payment did not go through: ${stripeMessage(err)}`);
  }
}

/**
 * Comp a month: a credit on the Stripe customer balance worth one month of
 * the subscription. Stripe takes it off the next invoice(s) automatically.
 * Chosen over a coupon because it needs no coupon objects, cannot stack
 * with an existing discount by accident, and shows in Stripe as one line
 * with our note. The idempotency key stops a double click from comping twice
 * on the same day.
 */
export async function compMonth(ctx: Ctx, workspaceId: string, noteIn: unknown): Promise<Result<{ cents: number }>> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (!ws.stripeCustomerId || !process.env.STRIPE_SECRET_KEY) return fail("This workspace has no Stripe customer.");
  const c = compMonthCents(ws.stripeMrrCents);
  if (!c.ok) return c;
  try {
    const day = new Date().toISOString().slice(0, 10);
    const txn = await getStripe().customers.createBalanceTransaction(
      ws.stripeCustomerId,
      { amount: -c.cents, currency: "usd", description: `Comp a month: ${n.note}`.slice(0, 350), metadata: { workspaceId: ws.id, by: ctx.actor.email ?? "" } },
      { idempotencyKey: `admin-comp:${ws.id}:${day}` },
    );
    await audit(ctx, ws, "workspace.comp", { after: { cents: c.cents, balanceTransaction: txn.id }, note: n.note });
    return ok({ cents: c.cents });
  } catch (err) {
    return fail(`Stripe refused the credit: ${stripeMessage(err)}`);
  }
}

/**
 * Change the plan in Stripe and in planName. With a live subscription:
 *   FREE cancels it now (no proration), STARTER or GROWTH reprice the seat
 *   line at the plan price for its interval, ENTERPRISE keeps the price.
 *   The subscription metadata.planName changes too, so the webhook keeps
 *   the same plan on the next update. If Stripe fails nothing is saved.
 * Without a subscription only planName changes.
 */
export async function changePlan(ctx: Ctx, workspaceId: string, planIn: unknown, noteIn: unknown): Promise<Result<{ planName: string; stripe: boolean }>> {
  if (!isAdminPlan(planIn)) return fail("Pick a plan.");
  const plan = planIn;
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (ws.planName === plan) return fail("The workspace is already on that plan.");

  let touchedStripe = false;
  const data: { planName: string; stripeSubscriptionId?: null; videoAddonItemId?: null; stripeStatus?: string } = { planName: plan };
  if (stripeReady(ws.stripeSubscriptionId)) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId!);
      if (plan === "FREE") {
        await stripe.subscriptions.cancel(sub.id, { prorate: false });
        Object.assign(data, { stripeSubscriptionId: null, videoAddonItemId: null, stripeStatus: "canceled" });
      } else {
        if (plan === "STARTER" || plan === "GROWTH") {
          const item = seatItem(sub.items.data);
          if (!item) return fail("The subscription has no seat line.");
          const { getEffectivePricing } = await import("@/lib/billing/pricing-copy-store");
          const { checkoutSeatChargeCents } = await import("@/lib/billing/plans");
          const interval = item.price?.recurring?.interval === "year" ? "year" : "month";
          const product = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
          const unit = checkoutSeatChargeCents(plan, interval === "year" ? "annual" : "monthly", (await getEffectivePricing()).growth);
          await stripe.subscriptionItems.update(item.id, {
            price_data: { currency: item.price.currency ?? "usd", product, unit_amount: unit, recurring: { interval } },
            proration_behavior: "create_prorations",
          });
        }
        await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, planName: plan } });
      }
      touchedStripe = true;
    } catch (err) {
      console.error("[admin] plan change failed", err);
      return fail(`Stripe refused the change, so nothing was saved: ${stripeMessage(err)}`);
    }
  }
  await prisma.workspace.update({ where: { id: ws.id }, data });
  await audit(ctx, ws, "workspace.plan", { before: { planName: ws.planName }, after: { planName: plan, stripe: touchedStripe }, note: n.note });
  return ok({ planName: plan, stripe: touchedStripe });
}

/** Push the trial end out by N days. Clears trialEndedAt so the trial cron sees it again. */
export async function extendTrial(ctx: Ctx, workspaceId: string, daysIn: unknown, noteIn: unknown): Promise<Result<{ trialEndsAt: string }>> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (ws.stripeSubscriptionId) return fail("This workspace pays already; a trial does nothing for it.");
  const e = extendedTrialEnd(ws.trialEndsAt, Number(daysIn));
  if (!e.ok) return e;
  await prisma.workspace.update({ where: { id: ws.id }, data: { trialEndsAt: e.trialEndsAt, trialEndedAt: null } });
  await audit(ctx, ws, "workspace.trial.extend", { before: { trialEndsAt: ws.trialEndsAt }, after: { trialEndsAt: e.trialEndsAt }, note: n.note });
  return ok({ trialEndsAt: e.trialEndsAt.toISOString() });
}

/* ── AI credits ─────────────────────────────────────────────────────────── */

async function afterBalanceChange(workspaceId: string) {
  try {
    const { checkLowCredits } = await import("@/lib/billing/credit-alerts");
    await checkLowCredits(workspaceId);
  } catch (err) {
    console.error("[admin] low-credit check failed", err);
  }
}

export async function grantWorkspaceCredits(
  ctx: Ctx,
  workspaceId: string,
  input: { amount: unknown; note: unknown; emailOwner?: boolean },
): Promise<Result<{ balance: number; emailed: number }>> {
  const a = parseCreditAmount(input.amount);
  if (!a.ok) return a;
  const n = cleanNote(input.note);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const balance = await prisma.$transaction(async (tx) => {
    await tx.aIInterviewCreditLedger.create({
      data: { workspaceId: ws.id, kind: "GRANT", amount: a.amount, adminUserId: ctx.actor.id ?? null, note: n.note },
    });
    const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id }, _sum: { amount: true } });
    return agg._sum.amount ?? 0;
  });
  await audit(ctx, ws, "workspace.credits.grant", { after: { amount: a.amount, balance, emailOwner: !!input.emailOwner }, note: n.note });
  await afterBalanceChange(ws.id);

  let emailed = 0;
  if (input.emailOwner) {
    const owners = await prisma.workspaceMember.findMany({ where: { workspaceId: ws.id, role: "OWNER" }, select: { user: { select: { email: true } } } });
    const to = owners.map((o) => o.user.email?.trim().toLowerCase()).filter((e): e is string => !!e);
    if (to.length) {
      const { emailManagers } = await import("@/lib/workspace/data-privacy-server");
      const { appOrigin } = await import("@/lib/interview/links");
      emailed = await emailManagers(
        ws.id,
        {
          subject: `${a.amount} AI screening credits added to ${ws.name}`,
          badge: "AI credits",
          heading: `We added ${a.amount} AI screening ${a.amount === 1 ? "credit" : "credits"} to ${ws.name}.`,
          paragraphs: [n.note, `Your balance is now ${balance} ${balance === 1 ? "credit" : "credits"}.`],
          cta: { label: "Open billing", url: `${await appOrigin()}/w/${ws.slug}/billing?tab=usage` },
        },
        to,
      ).catch(() => 0);
    }
  }
  return ok({ balance, emailed });
}

/** Add or take away credits with a required note. Taking away also trims the included part. */
export async function adjustWorkspaceCredits(ctx: Ctx, workspaceId: string, input: { amount: unknown; note: unknown }): Promise<Result<{ balance: number }>> {
  const a = parseCreditAmount(input.amount, { allowNegative: true });
  if (!a.ok) return a;
  const n = cleanNote(input.note);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const res = await prisma.$transaction(async (tx) => {
    await tx.aIInterviewCreditLedger.create({
      data: { workspaceId: ws.id, kind: "ADJUSTMENT", amount: a.amount, adminUserId: ctx.actor.id ?? null, note: n.note },
    });
    const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id }, _sum: { amount: true } });
    const balance = agg._sum.amount ?? 0;
    const cur = await tx.workspace.findUnique({ where: { id: ws.id }, select: { includedCreditsLeft: true } });
    const left = includedAfterBalance(cur?.includedCreditsLeft ?? 0, balance);
    if (cur && left !== cur.includedCreditsLeft) await tx.workspace.update({ where: { id: ws.id }, data: { includedCreditsLeft: left } });
    return { balance };
  });
  await audit(ctx, ws, "workspace.credits.adjust", { after: { amount: a.amount, balance: res.balance }, note: n.note });
  await afterBalanceChange(ws.id);
  return ok(res);
}

/**
 * Refund one screening. Locks the session row first, so two clicks (or two
 * admins) cannot both refund it: the second sees the first REFUND row.
 */
export async function refundSession(ctx: Ctx, workspaceId: string, input: { sessionId: unknown; note: unknown }): Promise<Result<{ amount: number }>> {
  const n = cleanNote(input.note);
  if (!n.ok) return n;
  const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
  if (!sessionId) return fail("Pick a session.");
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const res = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; workspaceId: string; candidateName: string }[]>`
      SELECT id, "workspaceId", "candidateName" FROM "AIInterviewSession" WHERE id = ${sessionId} FOR UPDATE`;
    const s = locked[0];
    if (!s || s.workspaceId !== ws.id) return fail("That session is not in this workspace.");
    const rows = await tx.aIInterviewCreditLedger.findMany({ where: { sessionId, workspaceId: ws.id }, select: { kind: true, amount: true } });
    const e = refundEligibility(rows);
    if (!e.ok) return e;
    await tx.aIInterviewCreditLedger.create({
      data: { workspaceId: ws.id, kind: "REFUND", amount: e.amount, sessionId, adminUserId: ctx.actor.id ?? null, note: n.note },
    });
    return ok({ amount: e.amount, candidateName: s.candidateName });
  });
  if (!res.ok) return res;
  await audit(ctx, ws, "workspace.credits.refund", { after: { sessionId, amount: res.amount, candidate: res.candidateName }, note: n.note });
  await afterBalanceChange(ws.id);
  return ok({ amount: res.amount });
}

/** Screenings that can be refunded: charged, not refunded yet. Newest first. */
export async function refundableSessions(workspaceId: string, take = 50) {
  const charged = await prisma.aIInterviewCreditLedger.findMany({
    where: { workspaceId, kind: "CONSUMPTION", sessionId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: take * 2,
    select: { sessionId: true, amount: true, createdAt: true, session: { select: { candidateName: true, positionTitle: true, status: true } } },
  });
  const ids = charged.map((c) => c.sessionId!);
  const refunded = ids.length
    ? new Set((await prisma.aIInterviewCreditLedger.findMany({ where: { kind: "REFUND", sessionId: { in: ids } }, select: { sessionId: true } })).map((r) => r.sessionId))
    : new Set<string | null>();
  const seen = new Set<string>();
  return charged
    .filter((c) => !refunded.has(c.sessionId) && !seen.has(c.sessionId!) && seen.add(c.sessionId!))
    .slice(0, take)
    .map((c) => ({
      id: c.sessionId!,
      label: `${c.session?.candidateName ?? "Candidate"}, ${c.session?.positionTitle ?? "screening"}`,
      status: c.session?.status ?? "",
      amount: -c.amount,
      at: c.createdAt.toISOString(),
    }));
}

/* ── Video add-on ───────────────────────────────────────────────────────── */

/** Turn the add-on off through the workspace code path (removes the Stripe line first). */
export async function turnVideoOff(ctx: Ctx, workspaceId: string, noteIn: unknown): Promise<Result> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (!ws.videoEnabled) return fail("Video is already off.");
  const { setVideoAddon } = await import("@/lib/video/addon-server");
  const r = await setVideoAddon({ workspaceId: ws.id, on: false, actorUserId: ctx.actor.id ?? null, actorEmail: ctx.actor.email ?? null });
  if (!r.ok) return fail(r.error);
  await audit(ctx, ws, "workspace.video", { before: { videoEnabled: true }, after: { videoEnabled: false }, note: n.note });
  return ok();
}

/* ── Lock and deletion ──────────────────────────────────────────────────── */

export async function lockWorkspace(ctx: Ctx, workspaceId: string, reasonIn: unknown): Promise<Result> {
  const n = cleanNote(reasonIn);
  if (!n.ok) return fail("Add the reason for locking. The workspace owner may be told it.");
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (ws.lockedAt) return fail("The workspace is already locked.");
  const now = new Date();
  const claimed = await prisma.workspace.updateMany({
    where: { id: ws.id, lockedAt: null },
    data: { lockedAt: now, lockedReason: n.note, lockedById: ctx.actor.id ?? null },
  });
  if (!claimed.count) return fail("The workspace is already locked.");
  await audit(ctx, ws, "workspace.lock", { after: { lockedAt: now }, note: n.note });
  return ok();
}

export async function unlockWorkspace(ctx: Ctx, workspaceId: string, noteIn: unknown): Promise<Result> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (!ws.lockedAt) return fail("The workspace is not locked.");
  await prisma.workspace.update({ where: { id: ws.id }, data: { lockedAt: null, lockedReason: null, lockedById: null } });
  await audit(ctx, ws, "workspace.unlock", { before: { lockedAt: ws.lockedAt, lockedReason: ws.lockedReason }, note: n.note });
  return ok();
}

/**
 * Schedule deletion with the workspace's own 30-day undo. Cancels the
 * Stripe subscription first and stops if that fails, so nobody keeps
 * paying for a workspace that is closed. The nightly erase job does the
 * rest after 30 days; an owner can still undo the deletion (they would
 * subscribe again).
 */
export async function scheduleDeletion(ctx: Ctx, workspaceId: string, input: { confirmName: unknown; note: unknown }): Promise<Result<{ finalAt: string }>> {
  const n = cleanNote(input.note);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (typeof input.confirmName !== "string" || input.confirmName.trim() !== ws.name.trim()) return fail("Type the workspace name exactly to confirm.");
  if (ws.deletionScheduledAt) return fail("Deletion is already scheduled.");

  let cancelled: string | null = null;
  if (stripeReady(ws.stripeSubscriptionId)) {
    try {
      await getStripe().subscriptions.cancel(ws.stripeSubscriptionId!, { prorate: false });
      cancelled = ws.stripeSubscriptionId;
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code !== "resource_missing") return fail(`Could not cancel the Stripe subscription, so nothing changed: ${stripeMessage(err)}`);
    }
  }
  const now = new Date();
  await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      deletionScheduledAt: now,
      deletionRequestedById: ctx.actor.id ?? null,
      ...(ws.stripeSubscriptionId ? { stripeSubscriptionId: null, videoAddonItemId: null, stripeStatus: "canceled", planName: "FREE" } : {}),
    },
  });
  const finalAt = new Date(now.getTime() + 30 * DAY_MS);
  await audit(ctx, ws, "workspace.delete.schedule", {
    before: { planName: ws.planName, stripeSubscriptionId: ws.stripeSubscriptionId },
    after: { deletionScheduledAt: now, finalAt, cancelledSubscription: cancelled },
    note: n.note,
  });
  return ok({ finalAt: finalAt.toISOString() });
}

export async function cancelScheduledDeletion(ctx: Ctx, workspaceId: string, noteIn: unknown): Promise<Result> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  if (!ws.deletionScheduledAt) return fail("Deletion is not scheduled.");
  await prisma.workspace.update({ where: { id: ws.id }, data: { deletionScheduledAt: null, deletionRequestedById: null } });
  await audit(ctx, ws, "workspace.delete.cancel", { before: { deletionScheduledAt: ws.deletionScheduledAt }, note: n.note });
  return ok();
}

/* ── Members ────────────────────────────────────────────────────────────── */

async function membersOf(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { id: true, userId: true, role: true, user: { select: { name: true, email: true } } },
  });
}

export async function changeMemberRole(ctx: Ctx, workspaceId: string, memberId: string, role: string): Promise<Result> {
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const members = await membersOf(ws.id);
  const check = adminRoleChange(members, memberId, role);
  if (!check.ok) return check;
  const m = members.find((x) => x.id === memberId)!;
  await prisma.workspaceMember.update({ where: { id: memberId }, data: { role } });
  await audit(ctx, ws, "workspace.member.role", { before: { member: m.user.email, role: m.role }, after: { role } });
  return ok();
}

/** Make one member the only owner; the other owners become admins. */
export async function transferOwnership(ctx: Ctx, workspaceId: string, memberId: string, noteIn: unknown): Promise<Result> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const members = await membersOf(ws.id);
  const plan = ownerTransferPlan(members, memberId);
  if (!plan.ok) return plan;
  await prisma.$transaction([
    prisma.workspaceMember.update({ where: { id: memberId }, data: { role: "OWNER" } }),
    ...(plan.demote.length ? [prisma.workspaceMember.updateMany({ where: { id: { in: plan.demote } }, data: { role: "ADMIN" } })] : []),
  ]);
  const target = members.find((m) => m.id === memberId)!;
  await audit(ctx, ws, "workspace.owner.transfer", {
    before: { owners: members.filter((m) => m.role === "OWNER").map((m) => m.user.email) },
    after: { owner: target.user.email },
    note: n.note,
  });
  return ok();
}

/**
 * Remove a member with the workspace's own handover: their candidates,
 * interviews and reviews go to `takeoverMemberId`, their API keys are
 * revoked, and the Stripe seat count follows.
 */
export async function removeMember(ctx: Ctx, workspaceId: string, memberId: string, takeoverMemberId: string, noteIn: unknown): Promise<Result> {
  const n = cleanNote(noteIn);
  if (!n.ok) return n;
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const members = await membersOf(ws.id);
  const target = members.find((m) => m.id === memberId);
  if (!target) return fail("That member is not in this workspace.");
  if (target.role === "OWNER" && !members.some((m) => m.role === "OWNER" && m.id !== memberId)) {
    return fail("This is the only owner. Transfer ownership first.");
  }
  const takeover = members.find((m) => m.id === takeoverMemberId && m.id !== memberId);
  if (!takeover || takeover.role === "VIEWER") return fail("Pick a member who stays and is not a viewer to take over their work.");

  const { removeMemberWithHandover } = await import("@/lib/workspace/handover-server");
  const names = Object.fromEntries(members.map((m) => [m.userId, m.user.name ?? m.user.email ?? "a member"]));
  try {
    const outcome = await removeMemberWithHandover({
      workspace: { id: ws.id, memberCount: members.length, stripeSubscriptionId: ws.stripeSubscriptionId },
      target: { memberId: target.id, userId: target.userId, email: target.user.email, name: target.user.name, role: target.role },
      choices: { ownerUserId: takeover.userId, interviewMode: "reassign", interviewerUserId: takeover.userId, reviewerUserId: takeover.userId },
      actor: { userId: ctx.actor.id ?? "", email: ctx.actor.email ?? null },
      names,
    });
    await audit(ctx, ws, "workspace.member.remove", { before: { member: target.user.email, role: target.role }, after: { takeover: takeover.user.email, ...outcome }, note: n.note });
    return ok();
  } catch (err) {
    console.error("[admin] member removal failed", err);
    return fail("Could not remove the member. Nothing changed.");
  }
}

export async function revokeInvite(ctx: Ctx, workspaceId: string, inviteId: string): Promise<Result> {
  const ws = await wsLabel(workspaceId);
  if (!ws) return fail("Workspace not found.");
  const inv = await prisma.workspaceInvite.findFirst({ where: { id: inviteId, workspaceId: ws.id, acceptedAt: null }, select: { id: true, email: true, role: true } });
  if (!inv) return fail("That invite is gone or was accepted.");
  await prisma.workspaceInvite.delete({ where: { id: inv.id } });
  await audit(ctx, ws, "workspace.invite.revoke", { before: { email: inv.email, role: inv.role } });
  return ok();
}
