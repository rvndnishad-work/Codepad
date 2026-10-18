import Link from "next/link";
import { ChevronRight, Download, ScrollText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { actionLabel } from "@/lib/admin/audit";
import { ACTION_GROUPS, AUDIT_PAGE_SIZE, auditFilterParams, auditWhere, isFiltered, parseAuditFilters, type AuditFilters } from "./query";
import { jsonDiff } from "./diff";
import { Pill, btnCls, cardCls, inputCls } from "../jobs/ui";

export const metadata = {
  title: "Audit log — Interviewpad Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const DANGER = /\.(delete|suspend|lock|signout|2fa\.reset|refund)|delete\.schedule|unassign/;

function groupLabel(action: string): string {
  const g = action.split(".")[0];
  return ACTION_GROUPS.find((x) => x.id === g)?.label ?? g;
}

function dayLabel(d: Date, now: Date): string {
  const k = d.toISOString().slice(0, 10);
  if (k === now.toISOString().slice(0, 10)) return "Today";
  if (k === new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function AdminAuditPage({ searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const f = parseAuditFilters(await searchParams);
  const where = auditWhere(f);

  const [total, actors, types] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.groupBy({
      by: ["actorId", "actorEmail"],
      where: { actorId: { not: null } },
      orderBy: { actorEmail: "asc" },
      take: 100,
    }),
    prisma.adminAuditLog.groupBy({
      by: ["targetType"],
      where: { targetType: { not: null } },
      orderBy: { targetType: "asc" },
      take: 50,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
  });

  const actorIds = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x))];
  const users = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const names = new Map(users.map((u) => [u.id, u.name?.trim() || u.email || u.id]));
  const actorName = (r: (typeof rows)[number]) =>
    r.via === "system" ? "System" : (r.actorId && names.get(r.actorId)) || r.actorEmail || "Unknown";

  const now = new Date();
  const groups: { day: string; rows: typeof rows }[] = [];
  for (const r of rows) {
    const day = dayLabel(r.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(r);
    else groups.push({ day, rows: [r] });
  }

  const href = (patch: Partial<AuditFilters>) => {
    const s = auditFilterParams(f, { page: 1, ...patch }).toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };
  const exportHref = `/api/admin/audit/export?${auditFilterParams(f, { page: 1 }).toString()}`;
  const first = total === 0 ? 0 : (page - 1) * AUDIT_PAGE_SIZE + 1;
  const last = Math.min(total, page * AUDIT_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Audit log</h1>
          <p className="text-sm text-muted max-w-2xl">
            Every change made in the admin console, by the assistant, or by a system job on your behalf. Newest first,
            times in UTC.
          </p>
        </div>
        <a href={exportHref} className={btnCls("ghost", "md")} aria-disabled={total === 0}>
          <Download className="w-3.5 h-3.5 text-muted" aria-hidden />
          Export CSV
        </a>
      </header>

      <form method="get" action="/admin/audit" className={`${cardCls} p-3 flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">By</span>
          <select name="actor" defaultValue={f.actor} className={`${inputCls} min-w-[180px]`}>
            <option value="">Anyone</option>
            {actors.map((a) => (
              <option key={a.actorId ?? ""} value={a.actorId ?? ""}>
                {a.actorEmail ?? a.actorId}
              </option>
            ))}
            <option value="via:assistant">The assistant</option>
            <option value="via:system">System jobs</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">Action</span>
          <select name="group" defaultValue={f.group} className={`${inputCls} min-w-[160px]`}>
            <option value="">All actions</option>
            {ACTION_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">Target</span>
          <select name="type" defaultValue={f.type} className={`${inputCls} min-w-[140px]`}>
            <option value="">Any target</option>
            {types.map((t) => (
              <option key={t.targetType ?? ""} value={t.targetType ?? ""}>
                {t.targetType}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">From</span>
          <input type="date" name="from" defaultValue={f.from} className={`${inputCls} w-40`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">To</span>
          <input type="date" name="to" defaultValue={f.to} className={`${inputCls} w-40`} />
        </label>
        <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <span className="text-xs font-medium text-subtle">Search</span>
          <input type="search" name="q" defaultValue={f.q} placeholder="Target name, note or id" className={`${inputCls} w-full`} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={btnCls("primary", "md")}>
            Apply
          </button>
          {isFiltered(f) && (
            <Link href="/admin/audit" className={btnCls("quiet", "md")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center flex flex-col items-center gap-2`}>
          <span aria-hidden className="w-11 h-11 mb-1 rounded-full bg-panel flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-muted" />
          </span>
          <p className="text-[15px] font-medium text-fg">{isFiltered(f) ? "Nothing matches these filters" : "Nothing recorded yet"}</p>
          <p className="text-[13px] text-muted max-w-sm">
            {isFiltered(f)
              ? "Try another person, action or date range."
              : "Changes to switches, maintenance, workspaces, users, roles, settings and content show up here as they happen."}
          </p>
        </div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          {groups.map((g, gi) => (
            <section key={`${g.day}-${gi}`} aria-label={g.day}>
              <h2 className={`px-4 py-2 text-[12.5px] font-semibold text-muted bg-panel border-b border-border ${gi > 0 ? "border-t" : ""}`}>
                {g.day}
              </h2>
              <ul>
                {g.rows.map((r, i) => {
                  const diff = jsonDiff(r.before, r.after);
                  const time = r.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
                  return (
                    <li key={r.id} className={i === 0 ? "" : "border-t border-border"}>
                      <details className="group">
                        <summary className="list-none cursor-pointer grid grid-cols-[16px_48px_1fr] sm:grid-cols-[16px_56px_1fr_140px] gap-x-3 gap-y-1 items-start px-4 py-2.5 hover:bg-panel/60 [&::-webkit-details-marker]:hidden">
                          <ChevronRight className="w-4 h-4 mt-0.5 text-subtle transition-transform group-open:rotate-90" aria-hidden />
                          <time dateTime={r.createdAt.toISOString()} className="font-mono text-[13px] text-subtle pt-px tabular-nums">
                            {time}
                          </time>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <p className="text-sm text-fg">
                              <span className="font-medium">{actorName(r)}</span>
                              {r.via === "assistant" && <span className="text-muted"> (via the assistant)</span>}{" "}
                              <span className="text-muted">{actionLabel(r.action).toLowerCase()}</span>
                              {r.targetLabel && <span className="font-medium"> {r.targetLabel}</span>}
                            </p>
                            {r.note && <p className="text-[13px] text-muted truncate">Note: {r.note}</p>}
                          </div>
                          <span className="col-start-3 sm:col-start-auto sm:justify-self-end">
                            <Pill tone={DANGER.test(r.action) ? "bad" : r.via === "system" ? "off" : "info"}>{groupLabel(r.action)}</Pill>
                          </span>
                        </summary>
                        <div className="px-4 pb-4 sm:pl-[100px] flex flex-col gap-3">
                          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[13px]">
                            <dt className="text-subtle">Action</dt>
                            <dd className="font-mono text-muted">{r.action}</dd>
                            {r.targetType && (
                              <>
                                <dt className="text-subtle">Target</dt>
                                <dd className="font-mono text-muted break-all">
                                  {r.targetType}
                                  {r.targetId ? ` ${r.targetId}` : ""}
                                </dd>
                              </>
                            )}
                            <dt className="text-subtle">By</dt>
                            <dd className="text-muted break-all">
                              {r.actorEmail ?? (r.via === "system" ? "System job" : "Unknown")}
                              {r.ip ? ` from ${r.ip}` : ""}
                            </dd>
                            <dt className="text-subtle">When</dt>
                            <dd className="text-muted">{r.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC</dd>
                            {r.note && (
                              <>
                                <dt className="text-subtle">Note</dt>
                                <dd className="text-fg whitespace-pre-wrap">{r.note}</dd>
                              </>
                            )}
                          </dl>
                          {diff.length > 0 ? (
                            <div className="rounded-lg border border-border overflow-x-auto">
                              <table className="w-full text-[13px]">
                                <thead className="bg-panel text-xs text-subtle">
                                  <tr>
                                    <th className="text-left font-semibold px-3 py-2">Field</th>
                                    <th className="text-left font-semibold px-3 py-2">Before</th>
                                    <th className="text-left font-semibold px-3 py-2">After</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {diff.map((d) => (
                                    <tr key={d.path} className="border-t border-border align-top">
                                      <td className="px-3 py-2 font-mono text-muted whitespace-nowrap">{d.path}</td>
                                      <td className="px-3 py-2 font-mono break-all text-danger">{d.before || <span className="text-subtle">empty</span>}</td>
                                      <td className="px-3 py-2 font-mono break-all text-success">{d.after || <span className="text-subtle">empty</span>}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-[13px] text-subtle">No before and after values recorded.</p>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Showing {first} to {last} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className={btnCls()}>
                Previous
              </Link>
            ) : (
              <span className={`${btnCls()} opacity-50`}>Previous</span>
            )}
            {page < pages ? (
              <Link href={href({ page: page + 1 })} className={btnCls()}>
                Next
              </Link>
            ) : (
              <span className={`${btnCls()} opacity-50`}>Next</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
