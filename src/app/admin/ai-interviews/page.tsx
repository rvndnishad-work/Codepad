import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Download, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import { Empty, FilterField, PageHeader, Pager, Pill, Segments, StatTile, Table, buttonCls, inputCls, tdCls, thCls } from "../interviews/_components/list";
import { hrefWith, one, pageParam, pageWindow, pick, utcDay, utcMonthStart, utcStamp, type SearchParams } from "../interviews/_components/params";
import ConfirmAction from "../interviews/_components/ConfirmAction";
import { LEDGER_KINDS, creditTotals, kindMeta } from "./credits-math";
import { ledgerWhere, parseLedgerFilters } from "./ledger-query";
import CreditControls from "./CreditControls";
import { refundSessionAction } from "./actions";

export const metadata = { title: "AI credits — Admin", robots: { index: false, follow: false } };

const PAGE_SIZE = 25;
const BASE = "/admin/ai-interviews";
const TABS = ["workspaces", "ledger", "screenings"] as const;
type Tab = (typeof TABS)[number];
const PLANS = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"] as const;

const SCREENING_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "off" | "info" }> = {
  PENDING: { label: "Invited", tone: "info" },
  ACTIVE: { label: "In progress", tone: "warn" },
  COMPLETED: { label: "Completed", tone: "ok" },
  EXPIRED: { label: "Expired", tone: "off" },
  FAILED: { label: "Failed", tone: "bad" },
};
const screeningStatus = (s: string) => SCREENING_STATUS[s] ?? { label: s.charAt(0) + s.slice(1).toLowerCase(), tone: "off" as const };

/**
 * AI credits across workspaces. Every number is an aggregate in Postgres
 * (groupBy / aggregate), never a sum over loaded rows. Balances are the
 * ledger sum, the same number the workspace's Billing page shows
 * (getWorkspaceCredits); included credits are part of it and are shown as
 * such. Months are calendar months in UTC.
 */
export default async function AdminAiCreditsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminAccess();
  const sp = await searchParams;
  const tab: Tab = pick(one(sp.tab), TABS) || "workspaces";
  const monthStart = utcMonthStart();

  const [allTime, thisMonth, withCredits] = await Promise.all([
    prisma.aIInterviewCreditLedger.groupBy({ by: ["kind"], _sum: { amount: true }, _count: { _all: true } }),
    prisma.aIInterviewCreditLedger.groupBy({ by: ["kind"], where: { createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM (SELECT "workspaceId" FROM "AIInterviewCreditLedger" GROUP BY "workspaceId" HAVING sum(amount) > 0) t`,
  ]);
  const toSums = (rows: typeof allTime) => rows.map((r) => ({ kind: r.kind, sum: r._sum.amount ?? 0, count: r._count._all }));
  const total = creditTotals(toSums(allTime));
  const month = creditTotals(toSums(thisMonth));
  const monthName = monthStart.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI credits"
        description="Balances, the credit ledger and AI screenings across every workspace. Grants, adjustments and refunds need a note and are audit logged. Times are UTC."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Held by workspaces" value={total.balance.toLocaleString("en-US")} sub={`${Number(withCredits[0]?.n ?? 0)} workspaces have credits`} />
        <StatTile
          label="Lifetime granted"
          value={total.lifetimeGranted.toLocaleString("en-US")}
          sub={`${total.granted.toLocaleString("en-US")} granted, ${total.purchased.toLocaleString("en-US")} bought`}
        />
        <StatTile label="Included and trial, lifetime" value={total.included.toLocaleString("en-US")} sub={`${total.expired.toLocaleString("en-US")} expired unused`} />
        <StatTile label={`Used in ${monthName}`} value={month.used.toLocaleString("en-US")} sub={`net of ${month.refunded.toLocaleString("en-US")} refunded`} />
        <StatTile label={`Bought in ${monthName}`} value={month.purchased.toLocaleString("en-US")} sub={`${month.granted.toLocaleString("en-US")} granted by admins`} />
      </div>

      <UnderlineTabs
        label="AI credits sections"
        active={tab}
        tabs={[
          { id: "workspaces", label: "Workspaces", href: BASE },
          { id: "ledger", label: "Ledger", href: `${BASE}?tab=ledger` },
          { id: "screenings", label: "Screenings", href: `${BASE}?tab=screenings` },
        ]}
      />

      {tab === "workspaces" && <WorkspacesTab sp={sp} monthStart={monthStart} monthName={monthName} />}
      {tab === "ledger" && <LedgerTab sp={sp} />}
      {tab === "screenings" && <ScreeningsTab sp={sp} />}
    </div>
  );
}

/* ── Workspaces ──────────────────────────────────────────────────────────── */

async function WorkspacesTab({ sp, monthStart, monthName }: { sp: SearchParams; monthStart: Date; monthName: string }) {
  const f = { tab: "workspaces", q: one(sp.q).slice(0, 80), plan: pick(one(sp.plan), PLANS) };
  const filters = { ...f, page: String(pageParam(sp)) };
  const where: Prisma.WorkspaceWhereInput = {
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { slug: { contains: f.q.toLowerCase() } }, { id: f.q }] } : {}),
    ...(f.plan ? { planName: f.plan } : {}),
  };
  const count = await prisma.workspace.count({ where });
  const win = pageWindow(pageParam(sp), count, PAGE_SIZE);
  const rows = count
    ? await prisma.workspace.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: win.skip,
        take: win.take,
        select: {
          id: true,
          name: true,
          slug: true,
          planName: true,
          includedCreditsLeft: true,
          _count: { select: { aiInterviewSessions: { where: { practice: false } } } },
        },
      })
    : [];
  const ids = rows.map((r) => r.id);
  const [balances, used] = ids.length
    ? await Promise.all([
        prisma.aIInterviewCreditLedger.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids } }, _sum: { amount: true }, _max: { createdAt: true } }),
        prisma.aIInterviewCreditLedger.groupBy({
          by: ["workspaceId", "kind"],
          where: { workspaceId: { in: ids }, kind: { in: ["CONSUMPTION", "REFUND"] }, createdAt: { gte: monthStart } },
          _sum: { amount: true },
        }),
      ])
    : [[], []];
  const bal = new Map(balances.map((b) => [b.workspaceId, { balance: b._sum.amount ?? 0, last: b._max.createdAt }]));
  const usedBy = new Map<string, number>();
  for (const u of used) usedBy.set(u.workspaceId, (usedBy.get(u.workspaceId) ?? 0) - (u._sum.amount ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action={BASE} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <FilterField label="Workspace" className="min-w-[220px] flex-1">
          <span className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input name="q" defaultValue={f.q} placeholder="Name, slug or id" className={`${inputCls} w-full pl-8`} />
          </span>
        </FilterField>
        <FilterField label="Plan">
          <select name="plan" defaultValue={f.plan} className={`${inputCls} w-40`}>
            <option value="">All plans</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </FilterField>
        <button type="submit" className={buttonCls}>Apply</button>
      </form>

      {rows.length === 0 ? (
        <Empty title="No workspaces match" />
      ) : (
        <Table
          minWidth={900}
          head={
            <>
              <th className={thCls}>Workspace</th>
              <th className={thCls}>Plan</th>
              <th className={`${thCls} text-right`}>Balance</th>
              <th className={`${thCls} text-right`}>Used in {monthName}</th>
              <th className={`${thCls} text-right`}>Screenings</th>
              <th className={thCls}>Last ledger row</th>
              <th className={thCls}><span className="sr-only">Actions</span></th>
            </>
          }
        >
          {rows.map((w) => {
            const b = bal.get(w.id);
            const balance = b?.balance ?? 0;
            const included = Math.min(w.includedCreditsLeft, Math.max(0, balance));
            return (
              <tr key={w.id} className="hover:bg-panel/60">
                <td className={tdCls}>
                  <Link href={`/admin/workspaces/${w.id}`} className="font-medium text-fg hover:underline underline-offset-2">{w.name}</Link>
                  <div className="text-xs text-subtle">{w.slug}</div>
                </td>
                <td className={tdCls}><Pill tone={w.planName === "FREE" ? "off" : "info"}>{w.planName.charAt(0) + w.planName.slice(1).toLowerCase()}</Pill></td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  <div className={balance <= 0 ? "text-muted" : balance < 5 ? "text-warning" : "text-fg"}>{balance.toLocaleString("en-US")}</div>
                  {included > 0 && <div className="text-xs text-subtle">{included} included</div>}
                </td>
                <td className={`${tdCls} text-right tabular-nums text-muted`}>{(usedBy.get(w.id) ?? 0).toLocaleString("en-US")}</td>
                <td className={`${tdCls} text-right tabular-nums text-muted`}>
                  <Link href={hrefWith(BASE, { tab: "screenings", ws: w.slug })} className="hover:underline">{w._count.aiInterviewSessions}</Link>
                </td>
                <td className={`${tdCls} whitespace-nowrap text-muted`}>
                  {b?.last ? <Link href={hrefWith(BASE, { tab: "ledger", ws: w.id })} className="hover:underline">{utcDay(b.last)}</Link> : "None"}
                </td>
                <td className={`${tdCls} text-right`}>
                  <CreditControls workspaceId={w.id} name={w.name} balance={balance} />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pager win={win} noun="workspaces" href={(p) => hrefWith(BASE, filters, { page: p })} />
    </div>
  );
}

/* ── Ledger ──────────────────────────────────────────────────────────────── */

async function LedgerTab({ sp }: { sp: SearchParams }) {
  const lf = parseLedgerFilters(sp);
  const f = { tab: "ledger", ...lf };
  const filters = { ...f, page: String(pageParam(sp)) };
  const where = ledgerWhere(lf);
  const [count, sum] = await Promise.all([
    prisma.aIInterviewCreditLedger.count({ where }),
    prisma.aIInterviewCreditLedger.aggregate({ where, _sum: { amount: true } }),
  ]);
  const win = pageWindow(pageParam(sp), count, PAGE_SIZE);
  const rows = count
    ? await prisma.aIInterviewCreditLedger.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: win.skip,
        take: win.take,
        select: {
          id: true,
          kind: true,
          amount: true,
          note: true,
          adminUserId: true,
          stripeChargeId: true,
          createdAt: true,
          workspace: { select: { id: true, name: true } },
          session: { select: { id: true, candidateName: true } },
        },
      })
    : [];
  const adminIds = [...new Set(rows.map((r) => r.adminUserId).filter((x): x is string => Boolean(x)))];
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, email: true, name: true } }) : [];
  const adminBy = new Map(admins.map((a) => [a.id, a]));
  const filtered = Boolean(lf.ws || lf.kind || lf.from || lf.to);
  const csvHref = hrefWith("/api/admin/ai-interviews/ledger", lf);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action={BASE} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <input type="hidden" name="tab" value="ledger" />
        <FilterField label="Workspace" className="min-w-[200px] flex-1">
          <input name="ws" defaultValue={lf.ws} placeholder="Name, slug or id" className={`${inputCls} w-full`} />
        </FilterField>
        <FilterField label="Kind">
          <select name="kind" defaultValue={lf.kind} className={`${inputCls} w-44`}>
            <option value="">All kinds</option>
            {LEDGER_KINDS.map((k) => (
              <option key={k} value={k}>{kindMeta(k).label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" name="from" defaultValue={lf.from} className={`${inputCls} w-40`} />
        </FilterField>
        <FilterField label="To">
          <input type="date" name="to" defaultValue={lf.to} className={`${inputCls} w-40`} />
        </FilterField>
        <button type="submit" className={buttonCls}>Apply</button>
        {filtered && <Link href={`${BASE}?tab=ledger`} className="inline-flex h-9 items-center px-2 text-sm text-muted hover:text-fg">Clear</Link>}
        <a href={csvHref} className={`${buttonCls} ml-auto`}>
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </form>
      <p className="text-sm text-muted">
        {count.toLocaleString("en-US")} rows{filtered ? " match" : " in total"}, net {(sum._sum.amount ?? 0) > 0 ? "+" : ""}
        {(sum._sum.amount ?? 0).toLocaleString("en-US")} credits. The export holds the same rows (up to 10,000).
      </p>

      {rows.length === 0 ? (
        <Empty title={filtered ? "No ledger rows match" : "No ledger rows yet"} />
      ) : (
        <Table
          minWidth={980}
          head={
            <>
              <th className={thCls}>When (UTC)</th>
              <th className={thCls}>Workspace</th>
              <th className={thCls}>Kind</th>
              <th className={`${thCls} text-right`}>Credits</th>
              <th className={thCls}>Details</th>
              <th className={thCls}>By</th>
            </>
          }
        >
          {rows.map((r) => {
            const k = kindMeta(r.kind);
            const admin = r.adminUserId ? adminBy.get(r.adminUserId) : null;
            return (
              <tr key={r.id}>
                <td className={`${tdCls} whitespace-nowrap text-muted`}>{utcStamp(r.createdAt).replace(" UTC", "")}</td>
                <td className={tdCls}>
                  <Link href={`/admin/workspaces/${r.workspace.id}`} className="hover:underline underline-offset-2">{r.workspace.name}</Link>
                </td>
                <td className={tdCls}><Pill tone={k.tone}>{k.label}</Pill></td>
                <td className={`${tdCls} text-right font-mono tabular-nums ${r.amount < 0 ? "text-muted" : "text-fg"}`}>
                  {r.amount > 0 ? `+${r.amount}` : r.amount}
                </td>
                <td className={`${tdCls} max-w-[320px] text-muted`}>
                  {r.session && <div className="text-fg">Screening with {r.session.candidateName}</div>}
                  {r.note && <div className="line-clamp-2 break-words">{r.note}</div>}
                  {r.stripeChargeId && <div className="font-mono text-xs text-subtle">{r.stripeChargeId}</div>}
                </td>
                <td className={tdCls}>
                  {r.adminUserId ? (
                    <Link href={`/admin/users?q=${encodeURIComponent(admin?.email ?? r.adminUserId)}`} className="hover:underline underline-offset-2">
                      {admin?.email ?? admin?.name ?? "Deleted user"}
                    </Link>
                  ) : (
                    <span className="text-subtle">{r.kind === "PURCHASE" ? "Stripe" : "System"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pager win={win} noun="rows" href={(p) => hrefWith(BASE, filters, { page: p })} />
    </div>
  );
}

/* ── Screenings ──────────────────────────────────────────────────────────── */

async function ScreeningsTab({ sp }: { sp: SearchParams }) {
  const f = { tab: "screenings", q: one(sp.q).slice(0, 120), ws: one(sp.ws).slice(0, 80), status: pick(one(sp.status), Object.keys(SCREENING_STATUS)) };
  const filters = { ...f, page: String(pageParam(sp)) };
  const and: Prisma.AIInterviewSessionWhereInput[] = [{ practice: false }];
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    and.push({ OR: [{ id: f.q }, { candidateName: c }, { candidateEmail: c }, { positionTitle: c }] });
  }
  if (f.ws) and.push({ workspace: { is: { OR: [{ name: { contains: f.ws, mode: "insensitive" } }, { slug: { contains: f.ws.toLowerCase() } }] } } });
  const base: Prisma.AIInterviewSessionWhereInput = { AND: and };
  const where: Prisma.AIInterviewSessionWhereInput = f.status ? { AND: [...and, { status: f.status }] } : base;

  const byStatus = await prisma.aIInterviewSession.groupBy({ by: ["status"], where: base, _count: { _all: true } });
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const all = byStatus.reduce((n, r) => n + r._count._all, 0);
  const total = f.status ? (counts[f.status] ?? 0) : all;
  const win = pageWindow(pageParam(sp), total, PAGE_SIZE);
  const rows = total
    ? await prisma.aIInterviewSession.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: win.skip,
        take: win.take,
        select: {
          id: true,
          candidateName: true,
          candidateEmail: true,
          positionTitle: true,
          status: true,
          score: true,
          engagementLevel: true,
          createdAt: true,
          finishedAt: true,
          workspace: { select: { id: true, name: true } },
          ledgerEntries: { where: { kind: { in: ["CONSUMPTION", "REFUND"] } }, select: { kind: true, amount: true } },
        },
      })
    : [];
  const statuses = [...new Set([...Object.keys(SCREENING_STATUS).filter((s) => counts[s] !== undefined), ...Object.keys(counts)])];

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action={BASE} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <input type="hidden" name="tab" value="screenings" />
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <FilterField label="Search" className="min-w-[220px] flex-1">
          <input name="q" defaultValue={f.q} placeholder="Candidate, email, role or id" className={`${inputCls} w-full`} />
        </FilterField>
        <FilterField label="Workspace">
          <input name="ws" defaultValue={f.ws} placeholder="Name or slug" className={`${inputCls} w-44`} />
        </FilterField>
        <button type="submit" className={buttonCls}>Apply</button>
      </form>
      <Segments
        label="Filter by status"
        items={[
          { label: "All", href: hrefWith(BASE, filters, { status: "" }), on: !f.status, count: all },
          ...statuses.map((s) => ({ label: screeningStatus(s).label, href: hrefWith(BASE, filters, { status: s }), on: f.status === s, count: counts[s] ?? 0 })),
        ]}
      />
      <p className="text-sm text-muted">Practice runs are free and are left out.</p>

      {rows.length === 0 ? (
        <Empty title="No screenings match" />
      ) : (
        <Table
          minWidth={1000}
          head={
            <>
              <th className={thCls}>Candidate</th>
              <th className={thCls}>Workspace</th>
              <th className={thCls}>Role</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Score</th>
              <th className={`${thCls} text-right`}>Charged</th>
              <th className={thCls}>Invited</th>
              <th className={thCls}><span className="sr-only">Refund</span></th>
            </>
          }
        >
          {rows.map((s) => {
            const st = screeningStatus(s.status);
            const charged = -s.ledgerEntries.filter((e) => e.kind === "CONSUMPTION").reduce((n, e) => n + e.amount, 0);
            const refunded = s.ledgerEntries.filter((e) => e.kind === "REFUND").reduce((n, e) => n + e.amount, 0);
            return (
              <tr key={s.id} className="align-top">
                <td className={tdCls}>
                  <div className="text-fg">{s.candidateName}</div>
                  <div className="text-xs text-muted">{s.candidateEmail}</div>
                </td>
                <td className={tdCls}>
                  <Link href={`/admin/workspaces/${s.workspace.id}`} className="hover:underline underline-offset-2">{s.workspace.name}</Link>
                </td>
                <td className={`${tdCls} text-muted`}>{s.positionTitle}</td>
                <td className={tdCls}><Pill tone={st.tone}>{st.label}</Pill></td>
                <td className={`${tdCls} text-right tabular-nums`}>{s.score ?? ""}</td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {charged > 0 ? charged : <span className="text-subtle">0</span>}
                  {refunded > 0 && <div className="text-xs text-warning">refunded {refunded}</div>}
                </td>
                <td className={`${tdCls} whitespace-nowrap text-muted`}>{utcDay(s.createdAt)}</td>
                <td className={`${tdCls} text-right`}>
                  {charged > 0 && refunded === 0 && (
                    <ConfirmAction
                      small
                      label="Refund"
                      title={`Refund ${charged} credit${charged === 1 ? "" : "s"} to ${s.workspace.name}?`}
                      body={`For the screening with ${s.candidateName}. A screening can be refunded once.`}
                      noteLabel="Why"
                      notePlaceholder="Grading failed, candidate had a broken sandbox…"
                      confirmLabel="Refund"
                      run={refundSessionAction.bind(null, s.id)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pager win={win} noun="screenings" href={(p) => hrefWith(BASE, filters, { page: p })} />
    </div>
  );
}
