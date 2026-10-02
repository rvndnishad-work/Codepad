import Link from "next/link";
import { Download, ExternalLink, Search } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { getHiringStats, getNeedsAttention, HIRING_RANGES, parseRange, rangeLabel, type AttentionItem } from "@/lib/admin/stats/hiring";
import { loadSwitchViews } from "@/app/admin/_components/switch-control/views";
import { SwitchControl } from "@/app/admin/_components/switch-control";
import CreditsChart from "./CreditsChart";
import SyncStripeButton from "./SyncStripeButton";
import { buildCompletion, buildKpis, type Kpi } from "./kpis";

export const metadata = { title: "Recruiters dashboard — Admin" };

const rangeParam = (r: number) => (r === 365 ? "12m" : `${r}d`);

function KpiCard({ kpi, extra }: { kpi: Kpi; extra?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-border bg-surface px-3.5 py-3 sm:px-4 sm:py-3.5">
      <div className="truncate text-xs font-semibold text-muted">{kpi.label}</div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="text-xl font-semibold tabular-nums tracking-tight text-fg sm:text-2xl">{kpi.value}</span>
        {kpi.suffix && <span className={`truncate text-xs font-medium ${kpi.suffixTone === "warn" ? "text-warning" : "text-muted"}`}>{kpi.suffix}</span>}
      </div>
      <div className="text-xs text-muted sm:text-[13px]">{kpi.detail}</div>
      {extra}
    </div>
  );
}

function Pill({ tone, children }: { tone: "bad" | "warn" | "ok" | "off"; children: React.ReactNode }) {
  const cls = {
    bad: "bg-danger/10 text-danger",
    warn: "bg-warning/10 text-warning",
    ok: "bg-success/10 text-success",
    off: "bg-panel text-muted",
  }[tone];
  return <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function ActionLink({ item, small }: { item: AttentionItem; small?: boolean }) {
  const cls = `inline-flex ${small ? "h-7 px-2.5" : "h-[30px] px-3"} items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface text-xs font-medium text-fg hover:bg-panel`;
  return item.action.external ? (
    <a href={item.action.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {item.action.label}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  ) : (
    <Link href={item.action.href} className={cls}>
      {item.action.label}
    </Link>
  );
}

function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="needs-attention">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3 sm:px-5">
        <h2 id="needs-attention" className="flex-1 text-[15px] font-semibold text-fg">
          Needs attention
        </h2>
        <Link href="/admin/workspaces" className="text-[13px] text-secondary hover:underline">
          All workspaces
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Nothing needs you right now: no past-due payments, trials ending in 3 days, low credits on an active batch or recordings about to expire.</p>
      ) : (
        <>
          {/* Phone: stacked rows */}
          <ul className="divide-y divide-border md:hidden">
            {items.map((it) => (
              <li key={`${it.kind}-${it.workspaceId}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/workspaces/${it.workspaceId}?tab=billing`} className="block truncate text-sm text-fg hover:underline">
                    {it.name}
                  </Link>
                  <div className="truncate text-xs text-muted">
                    {it.plan}
                    {it.detail ? `, ${it.detail}` : ""}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Pill tone={it.tone}>{it.reason}</Pill>
                  <ActionLink item={it} small />
                </div>
              </li>
            ))}
          </ul>
          {/* Wider: table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-muted">
                  <th className="px-5 py-2.5 font-semibold">Workspace</th>
                  <th className="px-3 py-2.5 font-semibold">Plan</th>
                  <th className="px-3 py-2.5 font-semibold">Why</th>
                  <th className="w-[170px] px-5 py-2.5">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={`${it.kind}-${it.workspaceId}`} className="border-t border-border">
                    <td className="max-w-[180px] truncate px-5 py-2.5">
                      <Link href={`/admin/workspaces/${it.workspaceId}?tab=billing`} className="text-secondary hover:underline">
                        {it.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-fg">{it.plan}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Pill tone={it.tone}>{it.reason}</Pill>
                        {it.detail && <span className="text-[13px] text-muted">{it.detail}</span>}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <ActionLink item={it} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default async function RecruitersDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminAccess("platform:admin");
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const [stats, attention, switches] = await Promise.all([getHiringStats(range), getNeedsAttention(), loadSwitchViews({ side: "hiring" })]);
  const kpis = buildKpis(stats);
  const completion = buildCompletion(stats);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-secondary">Recruiters</div>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted">Hiring side: workspaces, revenue, credits and every function you can switch.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Range" className="inline-flex h-9 overflow-hidden rounded-lg border border-border bg-surface">
            {HIRING_RANGES.map((r, i) => (
              <Link
                key={r}
                href={`/admin/recruiters?range=${rangeParam(r)}`}
                aria-current={r === range ? "page" : undefined}
                scroll={false}
                className={`flex min-w-[48px] items-center justify-center px-3 text-xs font-medium ${i > 0 ? "border-l border-border" : ""} ${
                  r === range ? "bg-panel text-fg" : "text-muted hover:bg-panel hover:text-fg"
                }`}
              >
                {rangeLabel(r)}
              </Link>
            ))}
          </nav>
          <a
            href={`/admin/recruiters/export?range=${rangeParam(range)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium text-fg hover:bg-panel"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export CSV
          </a>
          <Link
            href="/admin/workspaces"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-medium text-ink-fg hover:opacity-90"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            Find workspace
          </Link>
        </div>
      </header>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6 xl:gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} extra={k.id === "revenue" ? <SyncStripeButton /> : undefined} />
        ))}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <CreditsChart stats={stats} />
          <NeedsAttention items={attention} />
          <section aria-label="Completion" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {completion.map((k) => (
              <KpiCard key={k.id} kpi={k} />
            ))}
          </section>
        </div>

        <aside aria-labelledby="controls" className="flex flex-col rounded-xl border border-border bg-surface px-4 py-4 sm:px-5">
          <div className="mb-1 flex items-center gap-2.5">
            <h2 id="controls" className="flex-1 text-[15px] font-semibold text-fg">
              Controls
            </h2>
            <Link href="/admin/switches" className="text-[13px] text-secondary hover:underline">
              All switches
            </Link>
          </div>
          <p className="mb-2 text-[13px] text-muted">On, Read only (nothing new starts, existing work finishes) or Off. Every change asks for a note and is logged.</p>
          <div className="flex flex-col">
            {switches.map((v) => (
              <SwitchControl key={v.key} view={v} compact />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-fg">Whole hiring side</div>
              <div className="text-xs text-muted">Puts every /w page in maintenance</div>
            </div>
            <Link
              href="/admin/maintenance?area=hiring"
              className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg hover:bg-panel"
            >
              Schedule
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
