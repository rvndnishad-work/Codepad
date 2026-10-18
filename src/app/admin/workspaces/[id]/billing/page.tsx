import Link from "next/link";
import { notFound } from "next/navigation";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { getStripe } from "@/lib/stripe";
import { seatItem } from "@/lib/video/addon";
import { INCLUDED_CREDITS_PER_SEAT } from "@/lib/billing/included-credits";
import { LEDGER_KINDS, LEDGER_RANGES, ledgerKind, pageOf, parseLedgerFilter, planLabel, seatDiff } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace, type AdminWorkspace } from "../_data";
import { Card, Kv, Pill, Pager, Table, Empty, td, fmtBytes, fmtDate, fmtDuration, fmtUsd, one, urlWith } from "../_ui";
import WorkspaceAction from "../WorkspaceAction";

export const metadata = { title: "Workspace billing and credits — Interviewpad Admin" };

const DAY = 86_400_000;
const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type StripeLive = { seatCents: number | null; interval: string | null; card: string | null; trialEnd: Date | null; error?: string };

/** Card and seat price straight from Stripe. Best effort: the page works without it. */
async function stripeLive(ws: AdminWorkspace): Promise<StripeLive | null> {
  if (!ws.stripeSubscriptionId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(ws.stripeSubscriptionId, {
      expand: ["default_payment_method", "customer.invoice_settings.default_payment_method"],
    });
    const seat = seatItem(sub.items.data);
    const customer = typeof sub.customer === "object" && !("deleted" in sub.customer && sub.customer.deleted) ? (sub.customer as Stripe.Customer) : null;
    const pm = (typeof sub.default_payment_method === "object" ? sub.default_payment_method : null) ??
      (typeof customer?.invoice_settings?.default_payment_method === "object" ? customer.invoice_settings.default_payment_method : null);
    const card = pm?.card ? `${pm.card.brand.charAt(0).toUpperCase()}${pm.card.brand.slice(1)} ending ${pm.card.last4}` : pm ? pm.type : null;
    return {
      seatCents: seat?.price?.unit_amount ?? null,
      interval: seat?.price?.recurring?.interval ?? null,
      card,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    };
  } catch (err) {
    return { seatCents: null, interval: null, card: null, trialEnd: null, error: err instanceof Error ? err.message : "Stripe error" };
  }
}

function statusPill(ws: AdminWorkspace) {
  const s = ws.stripeStatus;
  if (!ws.stripeSubscriptionId && !s) return <Pill tone="off">No subscription</Pill>;
  if (s === "past_due" || s === "unpaid")
    return <Pill tone="bad">{ws.stripePastDueSince ? `Past due, ${fmtDate(ws.stripePastDueSince)}` : "Past due"}</Pill>;
  if (s === "active") return <Pill tone="ok">Active</Pill>;
  if (s === "trialing") return <Pill tone="info">Trialing</Pill>;
  if (s === "canceled") return <Pill tone="off">Cancelled</Pill>;
  return <Pill tone="warn">{s ?? "Not synced yet"}</Pill>;
}

export default async function WorkspaceBillingPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const filter = parseLedgerFilter({ kind: one(sp.kind), range: one(sp.range) }, now);
  const ledgerWhere = { workspaceId: id, ...(filter.kind ? { kind: filter.kind } : {}), ...(filter.since ? { createdAt: { gte: filter.since } } : {}) };

  const [live, balanceAgg, used30, batch, rec30, stored, expiring, recCredits, ledgerTotal] = await Promise.all([
    stripeLive(ws),
    prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: id }, _sum: { amount: true } }),
    prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: id, kind: "CONSUMPTION", createdAt: { gte: since30 } }, _sum: { amount: true } }),
    prisma.aIScreeningBatch.findFirst({
      where: { workspaceId: id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, positionTitle: true, _count: { select: { sessions: true } } },
    }),
    prisma.interviewRecording.aggregate({ where: { workspaceId: id, startedAt: { gte: since30 } }, _sum: { seconds: true }, _count: { _all: true } }),
    prisma.interviewRecording.aggregate({ where: { workspaceId: id, deletedAt: null, status: "ready" }, _sum: { sizeBytes: true }, _count: { _all: true } }),
    prisma.interviewRecording.count({ where: { workspaceId: id, deletedAt: null, expiresAt: { gt: now, lte: new Date(now.getTime() + 2 * DAY) } } }),
    prisma.interviewRecording.aggregate({ where: { workspaceId: id }, _sum: { creditsCharged: true } }),
    prisma.aIInterviewCreditLedger.count({ where: ledgerWhere }),
  ]);
  const paging = pageOf(one(sp.page), ledgerTotal, PAGE_SIZE);
  const [ledger, batchDone] = await Promise.all([
    prisma.aIInterviewCreditLedger.findMany({
      where: ledgerWhere,
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: PAGE_SIZE,
      select: { id: true, kind: true, amount: true, note: true, createdAt: true, adminUserId: true, stripeChargeId: true, sessionId: true, session: { select: { candidateName: true, positionTitle: true } } },
    }),
    batch ? prisma.aIInterviewSession.count({ where: { batchId: batch.id, status: "COMPLETED" } }) : Promise.resolve(0),
  ]);
  const adminIds = [...new Set(ledger.map((l) => l.adminUserId).filter((x): x is string => !!x))];
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, email: true } }) : [];
  const adminName = new Map(admins.map((a) => [a.id, a.name ?? a.email ?? "admin"]));

  const balance = balanceAgg._sum.amount ?? 0;
  const seats = seatDiff(ws.stripeSeatQuantity, ws.counts.members);
  const included = Math.min(ws.includedCreditsLeft, Math.max(0, balance));
  const base = `/admin/workspaces/${id}/billing`;
  const qs = { kind: filter.kind ?? undefined, range: filter.range === "90" ? undefined : filter.range };
  const trialDays = ws.trialEndsAt ? Math.ceil((ws.trialEndsAt.getTime() - now.getTime()) / DAY) : null;
  const hasSub = !!ws.stripeSubscriptionId;
  const openPlan = one(sp.open) === "plan";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card
          title="Subscription"
          right={
            ws.stripeCustomerId ? (
              <a className="text-[13px] text-secondary-soft hover:underline" href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`} target="_blank" rel="noreferrer">
                Open in Stripe
              </a>
            ) : null
          }
        >
          <Kv k="Status">{statusPill(ws)}</Kv>
          <Kv k="Plan">{planLabel(ws.planName)}</Kv>
          <Kv k="Price">
            {live?.seatCents != null ? `${fmtUsd(live.seatCents)} a seat, ${live.interval === "year" ? "yearly" : "monthly"}` : <span className="text-muted">{hasSub ? "Not read from Stripe" : "None"}</span>}
          </Kv>
          <Kv k="Seats billed">
            {seats.billed ?? "Not synced"}{" "}
            <span className="ml-1.5">
              <Pill tone={seats.inSync ? "ok" : seats.billed === null ? "off" : "warn"}>{ws.counts.members === 1 ? "1 member" : `${ws.counts.members} members`}</Pill>
            </span>
          </Kv>
          <Kv k="Next invoice">
            {ws.stripeCurrentPeriodEnd ? `${ws.stripeMrrCents != null ? `${fmtUsd(ws.stripeInterval === "year" ? ws.stripeMrrCents * 12 : ws.stripeMrrCents)} on ` : ""}${fmtDate(ws.stripeCurrentPeriodEnd)}` : <span className="text-muted">Unknown</span>}
          </Kv>
          <Kv k="Payment method">{live?.card ?? <span className="text-muted">{hasSub ? "Not read from Stripe" : "None"}</span>}</Kv>
          <Kv k="Trial">
            {trialDays === null
              ? "No trial"
              : trialDays > 0
                ? `Ends ${fmtDate(ws.trialEndsAt)}, ${trialDays} ${trialDays === 1 ? "day" : "days"} left`
                : `Ended ${fmtDate(ws.trialEndsAt)}${hasSub ? ", converted" : ""}`}
          </Kv>
          {ws.stripeSyncedAt && <p className="mt-1 text-xs text-subtle">Synced from Stripe {fmtDate(ws.stripeSyncedAt, true)} UTC.</p>}
          {live?.error && <p className="mt-1 text-xs text-warning">Stripe could not be read: {live.error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {hasSub && !seats.inSync && <WorkspaceAction kind="sync-seats" workspaceId={id} label={`Sync seats to ${seats.target}`} />}
            {hasSub && <WorkspaceAction kind="retry-payment" workspaceId={id} label="Retry payment" />}
            {ws.stripeCustomerId && <WorkspaceAction kind="comp" workspaceId={id} label="Comp a month" disabled={!ws.stripeMrrCents} />}
            <WorkspaceAction kind="plan" workspaceId={id} label="Change plan" currentPlan={ws.planName} autoOpen={openPlan} />
            {!hasSub && <WorkspaceAction kind="trial" workspaceId={id} label="Extend trial" />}
          </div>
        </Card>

        <Card title="AI credits">
          <div className="flex items-baseline gap-3">
            <div className="text-[22px] font-semibold tabular-nums text-fg">{balance}</div>
            <div className="text-sm text-muted">
              {Math.max(0, balance - included)} bought or granted, {included} included
            </div>
          </div>
          <Kv k="Used in 30 days">{-(used30._sum.amount ?? 0)}</Kv>
          <Kv k="Included a month">
            {ws.includedCreditsLastGrant ? `${ws.includedCreditsLastGrant}, from ${Math.round(ws.includedCreditsLastGrant / INCLUDED_CREDITS_PER_SEAT)} seats` : "None"}
          </Kv>
          <Kv k="Low credit warning">
            {ws.lowCreditThreshold === null ? "Off" : `at ${ws.lowCreditThreshold}${ws.lowCreditAlertedAt ? `, emailed ${fmtDate(ws.lowCreditAlertedAt)}` : ""}`}
          </Kv>
          <Kv k="Active batch">{batch ? `${batch.positionTitle}, ${batchDone} of ${batch._count.sessions} done` : "None"}</Kv>
          <div className="mt-3 flex flex-wrap gap-2">
            <WorkspaceAction kind="grant" workspaceId={id} label="Grant credits" variant="primary" />
            <WorkspaceAction kind="adjust" workspaceId={id} label="Adjust" />
            <WorkspaceAction kind="refund" workspaceId={id} label="Refund a session" />
          </div>
        </Card>

        <Card title="Video add-on" right={<Pill tone={ws.videoEnabled ? "ok" : "off"}>{ws.videoEnabled ? "On" : "Off"}</Pill>}>
          <Kv k="Since">{ws.videoEnabled && ws.videoEnabledAt ? `${fmtDate(ws.videoEnabledAt)}${ws.videoAddonItemId ? ", billed" : ", not billed"}` : "Off"}</Kv>
          <Kv k="Recorded, 30 days">
            {fmtDuration(rec30._sum.seconds)}, {rec30._count._all} {rec30._count._all === 1 ? "recording" : "recordings"}
          </Kv>
          <Kv k="Stored now">
            {fmtBytes(stored._sum.sizeBytes)}, {stored._count._all} {stored._count._all === 1 ? "file" : "files"}
          </Kv>
          <Kv k="Expiring in 48 h">{expiring === 1 ? "1 recording" : `${expiring} recordings`}</Kv>
          <Kv k="Recording credits">{recCredits._sum.creditsCharged ?? 0} charged</Kv>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/admin/workspaces/${id}/recordings`} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel">
              Recordings
            </Link>
            {ws.videoEnabled && <WorkspaceAction kind="video-off" workspaceId={id} label="Turn add-on off" />}
          </div>
        </Card>
      </div>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <h2 className="flex-1 text-[15px] font-semibold text-fg">Credit ledger</h2>
          <form className="flex flex-wrap items-center gap-2">
            <select name="kind" defaultValue={filter.kind ?? ""} aria-label="Kind" className="h-8 rounded-lg border border-border bg-bg px-2 text-[13px] text-fg">
              <option value="">All kinds</option>
              {LEDGER_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <select name="range" defaultValue={filter.range} aria-label="Dates" className="h-8 rounded-lg border border-border bg-bg px-2 text-[13px] text-fg">
              {LEDGER_RANGES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <button className="h-8 px-3 rounded-lg border border-border text-[13px] font-medium text-fg hover:bg-panel">Apply</button>
          </form>
          <a className="text-[13px] text-secondary-soft hover:underline" href={urlWith(`${base}/ledger.csv`, { kind: filter.kind, range: filter.range })}>
            Export CSV
          </a>
        </div>
        {ledger.length === 0 ? (
          <Empty>No ledger rows match.</Empty>
        ) : (
          <Table head={["When", "Kind", "Amount", "Detail", "By"]}>
            {ledger.map((l) => {
              const k = ledgerKind(l.kind);
              const detail =
                l.session ? `${l.kind === "REFUND" ? "Refund, " : "AI screening, "}${l.session.candidateName}, ${l.session.positionTitle}${l.note && l.kind !== "CONSUMPTION" ? `. ${l.note}` : ""}` : l.note ?? "";
              const by = l.adminUserId ? adminName.get(l.adminUserId) ?? "admin" : l.kind === "PURCHASE" ? "customer" : "system";
              return (
                <tr key={l.id} className="hover:bg-panel/40">
                  <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(l.createdAt, true)}</td>
                  <td className={td}>
                    <Pill tone={k.tone}>{k.label}</Pill>
                  </td>
                  <td className={`${td} tabular-nums`}>{l.amount > 0 ? `+${l.amount}` : l.amount}</td>
                  <td className={`${td} max-w-[420px]`}>
                    <span className="line-clamp-2">{detail}</span>
                  </td>
                  <td className={`${td} text-muted`}>{by}</td>
                </tr>
              );
            })}
          </Table>
        )}
        <Pager page={paging.page} pages={paging.pages} total={ledgerTotal} href={(p) => urlWith(base, { ...qs, page: p })} />
      </section>

      <section className="rounded-xl border border-danger/40 bg-surface px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[260px]">
          <div className="text-sm font-medium text-fg">Danger zone</div>
          <p className="text-sm text-muted">
            Lock stops every sign-in and candidate link but keeps data. Deletion uses the 30-day undo the workspace owner also has, and cancels the Stripe
            subscription first.
            {ws.deletionScheduledAt && ` Deletion was scheduled on ${fmtDate(ws.deletionScheduledAt)}; it is erased on ${fmtDate(new Date(ws.deletionScheduledAt.getTime() + 30 * DAY))}.`}
          </p>
        </div>
        {ws.lockedAt ? (
          <WorkspaceAction kind="unlock" workspaceId={id} label="Unlock" />
        ) : (
          <WorkspaceAction kind="lock" workspaceId={id} label="Lock" variant="danger" />
        )}
        {ws.deletionScheduledAt ? (
          <WorkspaceAction kind="undelete" workspaceId={id} label="Cancel deletion" />
        ) : (
          <WorkspaceAction kind="delete" workspaceId={id} workspaceName={ws.name} label="Schedule deletion" variant="danger" />
        )}
      </section>
    </div>
  );
}
