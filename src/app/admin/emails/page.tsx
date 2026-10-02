/**
 * Admin email log: every transactional email across workspaces, with
 * filters (template, status, workspace, date, recipient), server paging,
 * resend for invites that did not arrive, and the suppression list with a
 * way to lift a block. Counts say what they count: all time, or the rows
 * matching the current filters.
 */
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import { canOfferResend, problemExplanation, statusChip, templateLabel, type StatusTone } from "@/lib/workspace/email-activity";
import { Empty, FilterField, PageHeader, Pager, Pill, Segments, Table, buttonCls, inputCls, tdCls, thCls, type Tone } from "../interviews/_components/list";
import { dayParam, dayRange, hrefWith, one, pageParam, pageWindow, pick, utcStamp, type SearchParams } from "../interviews/_components/params";
import ConfirmAction from "../interviews/_components/ConfirmAction";
import { liftSuppressionAction, resendEmailAction } from "./actions";

export const metadata = { title: "Emails — Admin", robots: { index: false, follow: false } };

const PAGE_SIZE = 25;
const BASE = "/admin/emails";
const STATUSES = ["queued", "sent", "delivered", "opened", "clicked", "bounced", "complained", "failed", "suppressed"] as const;
const REASONS = ["hard_bounce", "complaint", "unsubscribe", "manual"] as const;
const TONE: Record<StatusTone, Tone> = { ok: "ok", bad: "bad", warn: "warn", neutral: "off" };

export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminAccess();
  const sp = await searchParams;
  const tab = one(sp.tab) === "suppressed" ? "suppressed" : "log";
  const [allTime, suppressedTotal] = await Promise.all([prisma.emailLog.count(), prisma.emailSuppression.count()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Emails"
        description={
          <>
            Every transactional email, updated by the Resend webhook. Invites that failed or bounced can be resent; a blocked
            address can be unblocked. Times are UTC.
          </>
        }
      />
      <UnderlineTabs
        label="Email sections"
        active={tab}
        tabs={[
          { id: "log", label: "Sent emails", href: BASE, count: allTime },
          { id: "suppressed", label: "Suppression list", href: `${BASE}?tab=suppressed`, count: suppressedTotal },
        ]}
      />
      {tab === "log" ? <LogTab sp={sp} allTime={allTime} /> : <SuppressedTab sp={sp} />}
    </div>
  );
}

/* ── Sent emails ─────────────────────────────────────────────────────────── */

async function LogTab({ sp, allTime }: { sp: SearchParams; allTime: number }) {
  const f = {
    q: one(sp.q).slice(0, 120),
    template: /^[a-z0-9_-]{1,60}$/.test(one(sp.template)) ? one(sp.template) : "",
    status: pick(one(sp.status), STATUSES),
    ws: one(sp.ws).slice(0, 80),
    from: dayParam(one(sp.from)),
    to: dayParam(one(sp.to)),
  };
  const filters = { ...f, page: String(pageParam(sp)) };

  // EmailLog.workspaceId has no relation, so the workspace filter resolves
  // names to ids first (capped; a vaguer search should be narrowed).
  const wsMatches = f.ws
    ? await prisma.workspace.findMany({
        where: { OR: [{ id: f.ws }, { name: { contains: f.ws, mode: "insensitive" } }, { slug: { contains: f.ws.toLowerCase() } }] },
        select: { id: true },
        take: 200,
      })
    : [];

  const and: Prisma.EmailLogWhereInput[] = [];
  if (f.q) and.push({ recipientEmail: { contains: f.q.toLowerCase(), mode: "insensitive" } });
  if (f.template) and.push({ template: f.template });
  if (f.ws) and.push({ workspaceId: { in: wsMatches.map((w) => w.id) } });
  const created = dayRange(f.from, f.to);
  if (created) and.push({ createdAt: created });
  const base: Prisma.EmailLogWhereInput = and.length ? { AND: and } : {};
  const where: Prisma.EmailLogWhereInput = f.status ? { AND: [...and, { status: f.status }] } : base;

  const [byStatus, templates] = await Promise.all([
    prisma.emailLog.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.emailLog.groupBy({ by: ["template"], _count: { _all: true }, orderBy: { template: "asc" } }),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const matching = byStatus.reduce((n, r) => n + r._count._all, 0);
  const total = f.status ? (counts[f.status] ?? 0) : matching;
  const win = pageWindow(pageParam(sp), total, PAGE_SIZE);

  const rows = total
    ? await prisma.emailLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: win.skip,
        take: win.take,
        select: { id: true, template: true, recipientEmail: true, workspaceId: true, sessionId: true, providerId: true, status: true, errorReason: true, createdAt: true, lastEventAt: true },
      })
    : [];
  const wsIds = [...new Set(rows.map((r) => r.workspaceId).filter((x): x is string => Boolean(x)))];
  const addrs = [...new Set(rows.map((r) => r.recipientEmail.trim().toLowerCase()))];
  const [wsRows, blocked] = await Promise.all([
    wsIds.length ? prisma.workspace.findMany({ where: { id: { in: wsIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    addrs.length ? prisma.emailSuppression.findMany({ where: { address: { in: addrs } }, select: { id: true, address: true, reason: true } }) : Promise.resolve([]),
  ]);
  const wsName = new Map(wsRows.map((w) => [w.id, w.name]));
  const blockBy = new Map(blocked.map((b) => [b.address, b]));
  const filtered = Boolean(f.q || f.template || f.ws || f.from || f.to || f.status);
  const scope = filtered && (f.q || f.template || f.ws || f.from || f.to) ? "matching the filters" : "all time";

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action={BASE} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <FilterField label="Recipient" className="min-w-[200px] flex-1">
          <span className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input name="q" defaultValue={f.q} placeholder="Email address" className={`${inputCls} w-full pl-8`} />
          </span>
        </FilterField>
        <FilterField label="Template">
          <select name="template" defaultValue={f.template} className={`${inputCls} w-52`}>
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t.template} value={t.template}>
                {templateLabel(t.template)} ({t._count._all.toLocaleString("en-US")})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Workspace">
          <input name="ws" defaultValue={f.ws} placeholder="Name or slug" className={`${inputCls} w-40`} />
        </FilterField>
        <FilterField label="From">
          <input type="date" name="from" defaultValue={f.from} className={`${inputCls} w-40`} />
        </FilterField>
        <FilterField label="To">
          <input type="date" name="to" defaultValue={f.to} className={`${inputCls} w-40`} />
        </FilterField>
        <button type="submit" className={buttonCls}>Apply</button>
        {filtered && <Link href={BASE} className="inline-flex h-9 items-center px-2 text-sm text-muted hover:text-fg">Clear</Link>}
      </form>

      <div className="flex flex-col gap-2">
        <Segments
          label="Filter by status"
          items={[
            { label: "All", href: hrefWith(BASE, filters, { status: "" }), on: !f.status, count: matching },
            ...STATUSES.filter((s) => counts[s] !== undefined || f.status === s).map((s) => ({
              label: statusChip(s).label,
              href: hrefWith(BASE, filters, { status: s }),
              on: f.status === s,
              count: counts[s] ?? 0,
            })),
          ]}
        />
        <p className="text-xs text-muted">
          Counts are {scope}. {allTime.toLocaleString("en-US")} emails logged all time.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty title={filtered ? "No emails match" : "No emails logged yet"} />
      ) : (
        <Table
          minWidth={1000}
          head={
            <>
              <th className={thCls}>Sent (UTC)</th>
              <th className={thCls}>Recipient</th>
              <th className={thCls}>Template</th>
              <th className={thCls}>Workspace</th>
              <th className={thCls}>Status</th>
              <th className={thCls}><span className="sr-only">Actions</span></th>
            </>
          }
        >
          {rows.map((r) => {
            const chip = statusChip(r.status);
            const why = problemExplanation(r.status, r.errorReason);
            const block = blockBy.get(r.recipientEmail.trim().toLowerCase());
            const resendable = canOfferResend(r) && Boolean(r.workspaceId);
            return (
              <tr key={r.id} className="align-top">
                <td className={`${tdCls} whitespace-nowrap text-muted`}>
                  {utcStamp(r.createdAt).replace(" UTC", "")}
                  {r.lastEventAt && <div className="text-xs text-subtle">last event {utcStamp(r.lastEventAt).replace(" UTC", "")}</div>}
                </td>
                <td className={`${tdCls} max-w-[260px] break-all text-fg`}>
                  {r.recipientEmail}
                  {block && <div className="mt-1"><Pill tone="bad">Blocked, {block.reason.replace(/_/g, " ")}</Pill></div>}
                </td>
                <td className={tdCls}>
                  <div className="text-fg">{templateLabel(r.template)}</div>
                  <div className="font-mono text-xs text-subtle">{r.template}</div>
                </td>
                <td className={tdCls}>
                  {r.workspaceId ? (
                    <Link href={`/admin/workspaces/${r.workspaceId}`} className="hover:underline underline-offset-2">{wsName.get(r.workspaceId) ?? "Deleted workspace"}</Link>
                  ) : (
                    <span className="text-subtle">None</span>
                  )}
                </td>
                <td className={`${tdCls} max-w-[280px]`}>
                  <Pill tone={TONE[chip.tone]}>{chip.label}</Pill>
                  {why && <div className="mt-1 text-xs text-muted">{why}</div>}
                </td>
                <td className={`${tdCls} text-right`}>
                  <div className="flex flex-col items-end gap-1.5">
                    {resendable && (
                      <ConfirmAction
                        small
                        label="Resend"
                        title={`Resend this ${templateLabel(r.template).toLowerCase()}?`}
                        body={block ? `${r.recipientEmail} is blocked. Lift the block first or the resend will be refused.` : `A fresh copy goes to the candidate, from ${wsName.get(r.workspaceId!) ?? "the workspace"}.`}
                        noteLabel="Why"
                        notePlaceholder="Candidate asked, address fixed…"
                        confirmLabel="Resend"
                        run={resendEmailAction.bind(null, r.id)}
                      />
                    )}
                    {block && (
                      <ConfirmAction
                        small
                        label="Lift block"
                        title={`Unblock ${block.address}?`}
                        body="Mail will go to this address again. If it still bounces, the webhook blocks it again."
                        noteLabel="Why"
                        confirmLabel="Lift block"
                        run={liftSuppressionAction.bind(null, block.id)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pager win={win} noun="emails" href={(p) => hrefWith(BASE, filters, { page: p })} />
    </div>
  );
}

/* ── Suppression list ────────────────────────────────────────────────────── */

async function SuppressedTab({ sp }: { sp: SearchParams }) {
  const f = { tab: "suppressed", q: one(sp.q).slice(0, 120), reason: pick(one(sp.reason), REASONS) };
  const filters = { ...f, page: String(pageParam(sp)) };
  const where: Prisma.EmailSuppressionWhereInput = {
    ...(f.q ? { address: { contains: f.q.toLowerCase() } } : {}),
    ...(f.reason ? { reason: f.reason } : {}),
  };
  const [count, byReason] = await Promise.all([
    prisma.emailSuppression.count({ where }),
    prisma.emailSuppression.groupBy({ by: ["reason"], _count: { _all: true } }),
  ]);
  const win = pageWindow(pageParam(sp), count, PAGE_SIZE);
  const rows = count
    ? await prisma.emailSuppression.findMany({ where, orderBy: [{ addedAt: "desc" }, { id: "desc" }], skip: win.skip, take: win.take })
    : [];
  const reasonCount = Object.fromEntries(byReason.map((r) => [r.reason, r._count._all]));

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action={BASE} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <input type="hidden" name="tab" value="suppressed" />
        <FilterField label="Address" className="min-w-[220px] flex-1">
          <input name="q" defaultValue={f.q} placeholder="Email address" className={`${inputCls} w-full`} />
        </FilterField>
        <FilterField label="Reason">
          <select name="reason" defaultValue={f.reason} className={`${inputCls} w-48`}>
            <option value="">All reasons</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")} ({(reasonCount[r] ?? 0).toLocaleString("en-US")} all time)
              </option>
            ))}
          </select>
        </FilterField>
        <button type="submit" className={buttonCls}>Apply</button>
      </form>
      <p className="text-sm text-muted">
        The Resend webhook blocks addresses that hard bounce or mark mail as spam. Nothing is sent to a blocked address until the block is lifted.
      </p>

      {rows.length === 0 ? (
        <Empty title={f.q || f.reason ? "No blocked addresses match" : "No blocked addresses"} />
      ) : (
        <Table
          minWidth={760}
          head={
            <>
              <th className={thCls}>Address</th>
              <th className={thCls}>Reason</th>
              <th className={thCls}>Blocked (UTC)</th>
              <th className={thCls}>Note</th>
              <th className={thCls}><span className="sr-only">Actions</span></th>
            </>
          }
        >
          {rows.map((s) => (
            <tr key={s.id} className="align-top">
              <td className={`${tdCls} break-all font-mono text-xs text-fg`}>
                <Link href={hrefWith(BASE, { q: s.address })} className="hover:underline">{s.address}</Link>
              </td>
              <td className={tdCls}><Pill tone={s.reason === "complaint" || s.reason === "hard_bounce" ? "bad" : "off"}>{s.reason.replace(/_/g, " ")}</Pill></td>
              <td className={`${tdCls} whitespace-nowrap text-muted`}>{utcStamp(s.addedAt).replace(" UTC", "")}</td>
              <td className={`${tdCls} max-w-[300px] break-words text-muted`}>{s.note ?? ""}</td>
              <td className={`${tdCls} text-right`}>
                <ConfirmAction
                  small
                  label="Lift block"
                  title={`Unblock ${s.address}?`}
                  body={s.reason === "complaint" ? "This person marked our mail as spam. Only unblock if they asked for it." : "Mail will go to this address again. If it still bounces, the webhook blocks it again."}
                  noteLabel="Why"
                  confirmLabel="Lift block"
                  run={liftSuppressionAction.bind(null, s.id)}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pager win={win} noun="addresses" href={(p) => hrefWith(BASE, filters, { page: p })} />
    </div>
  );
}
