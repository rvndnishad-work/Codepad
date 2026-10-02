import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { Empty, FilterField, PageHeader, Pager, Pill, Segments, Table, buttonCls, inputCls, tdCls, thCls } from "./_components/list";
import { dayParam, dayRange, hrefWith, one, pageParam, pageWindow, utcDay, type SearchParams } from "./_components/params";
import { INTERVIEW_TYPES, interviewStatus, interviewTypeLabel } from "./_components/status";

export const metadata = { title: "Interviews — Admin", robots: { index: false, follow: false } };

const PAGE_SIZE = 25;
const BASE = "/admin/interviews";

/**
 * Every live interview, take-home and practice session across workspaces.
 * Paged on the server; the status counts come from one groupBy over the
 * filtered set (not the page). Secrets (proctor secret, candidate access
 * token, share token) are never selected here.
 */
export default async function AdminInterviewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminAccess();
  const sp = await searchParams;
  const f = {
    q: one(sp.q).slice(0, 120),
    status: one(sp.status).slice(0, 40),
    ws: one(sp.ws).slice(0, 80),
    type: INTERVIEW_TYPES.some((t) => t.id === one(sp.type)) ? one(sp.type) : "",
    from: dayParam(one(sp.from)),
    to: dayParam(one(sp.to)),
  };
  const filters = { ...f, page: String(pageParam(sp)) };

  const and: Prisma.InterviewSessionWhereInput[] = [];
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { id: f.q },
        { title: c },
        { candidateName: c },
        { candidate: { is: { OR: [{ email: c }, { name: c }] } } },
        { user: { is: { OR: [{ email: c }, { name: c }] } } },
      ],
    });
  }
  if (f.ws) {
    and.push({ workspace: { is: { OR: [{ name: { contains: f.ws, mode: "insensitive" } }, { slug: { contains: f.ws.toLowerCase() } }] } } });
  }
  if (f.type === "workspace") and.push({ workspaceId: { not: null }, type: { not: "take-home" } });
  else if (f.type === "take-home") and.push({ type: "take-home" });
  else if (f.type === "practice") and.push({ workspaceId: null });
  const created = dayRange(f.from, f.to);
  if (created) and.push({ createdAt: created });
  const base: Prisma.InterviewSessionWhereInput = and.length ? { AND: and } : {};
  const where: Prisma.InterviewSessionWhereInput = f.status ? { AND: [...and, { status: f.status }] } : base;

  const byStatus = await prisma.interviewSession.groupBy({ by: ["status"], where: base, _count: { _all: true } });
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const allCount = byStatus.reduce((n, r) => n + r._count._all, 0);
  const total = f.status ? (counts[f.status] ?? 0) : allCount;
  const win = pageWindow(pageParam(sp), total, PAGE_SIZE);

  const rows = total
    ? await prisma.interviewSession.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: win.skip,
        take: win.take,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          candidateName: true,
          scheduledAt: true,
          startedAt: true,
          finishedAt: true,
          deadlineAt: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          candidate: { select: { name: true, email: true } },
          workspace: { select: { id: true, name: true, slug: true } },
          _count: { select: { recordings: true, scorecards: true } },
        },
      })
    : [];

  const statusOrder = ["scheduled", "in_progress", "active", "completed", "submitted", "cancelled", "abandoned", "expired"];
  const statuses = [...new Set([...statusOrder.filter((s) => counts[s] !== undefined), ...Object.keys(counts)])];
  if (f.status && !statuses.includes(f.status)) statuses.push(f.status);
  const filtered = Boolean(f.q || f.ws || f.type || f.from || f.to || f.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Interviews"
        description="Live interviews, take-homes and practice sessions across every workspace. Times are UTC."
      />

      <form method="get" action={BASE} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <FilterField label="Search" className="min-w-[220px] flex-1">
          <span className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input name="q" defaultValue={f.q} placeholder="Title, candidate, host email or id" className={`${inputCls} w-full pl-8`} />
          </span>
        </FilterField>
        <FilterField label="Workspace">
          <input name="ws" defaultValue={f.ws} placeholder="Name or slug" className={`${inputCls} w-44`} />
        </FilterField>
        <FilterField label="Kind">
          <select name="type" defaultValue={f.type} className={`${inputCls} w-40`}>
            <option value="">All kinds</option>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Created from">
          <input type="date" name="from" defaultValue={f.from} className={`${inputCls} w-40`} />
        </FilterField>
        <FilterField label="Created to">
          <input type="date" name="to" defaultValue={f.to} className={`${inputCls} w-40`} />
        </FilterField>
        <button type="submit" className={buttonCls}>Apply</button>
        {filtered && (
          <Link href={BASE} className="inline-flex h-9 items-center px-2 text-sm text-muted hover:text-fg">
            Clear
          </Link>
        )}
      </form>

      <Segments
        label="Filter by status"
        items={[
          { label: "All", href: hrefWith(BASE, filters, { status: "" }), on: !f.status, count: allCount },
          ...statuses.map((s) => ({ label: interviewStatus(s).label, href: hrefWith(BASE, filters, { status: s }), on: f.status === s, count: counts[s] ?? 0 })),
        ]}
      />

      {rows.length === 0 ? (
        <Empty title={filtered ? "No interviews match" : "No interviews yet"}>
          {filtered && <Link href={BASE} className="text-secondary-soft hover:underline">Clear the filters</Link>}
        </Empty>
      ) : (
        <Table
          minWidth={980}
          head={
            <>
              <th className={thCls}>Interview</th>
              <th className={thCls}>Candidate</th>
              <th className={thCls}>Host</th>
              <th className={thCls}>Workspace</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>When</th>
              <th className={`${thCls} text-right`}>Recordings</th>
              <th className={thCls}><span className="sr-only">Open</span></th>
            </>
          }
        >
          {rows.map((s) => {
            const st = interviewStatus(s.status);
            const candidate = s.candidate?.name || s.candidateName;
            return (
              <tr key={s.id} className="hover:bg-panel/60">
                <td className={tdCls}>
                  <Link href={`${BASE}/${s.id}`} className="font-medium text-fg hover:underline underline-offset-2">
                    {s.title}
                  </Link>
                  <div className="text-xs text-subtle">{interviewTypeLabel(s.type, Boolean(s.workspace))}</div>
                </td>
                <td className={tdCls}>
                  {candidate ? <div className="text-fg">{candidate}</div> : <span className="text-subtle">None</span>}
                  {s.candidate?.email && <div className="text-xs text-muted">{s.candidate.email}</div>}
                </td>
                <td className={tdCls}>
                  <Link href={`/admin/users?q=${encodeURIComponent(s.user.email ?? s.user.id)}`} className="text-fg hover:underline underline-offset-2">
                    {s.user.name ?? s.user.email ?? "Unknown"}
                  </Link>
                  {s.user.name && s.user.email && <div className="text-xs text-muted">{s.user.email}</div>}
                </td>
                <td className={tdCls}>
                  {s.workspace ? (
                    <Link href={`/admin/workspaces/${s.workspace.id}`} className="text-fg hover:underline underline-offset-2">
                      {s.workspace.name}
                    </Link>
                  ) : (
                    <span className="text-subtle">Personal</span>
                  )}
                </td>
                <td className={tdCls}><Pill tone={st.tone}>{st.label}</Pill></td>
                <td className={`${tdCls} whitespace-nowrap text-muted`}>
                  {s.scheduledAt ? (
                    <>
                      <div className="text-fg">{utcDay(s.scheduledAt)}</div>
                      <div className="text-xs">scheduled</div>
                    </>
                  ) : (
                    <>
                      <div className="text-fg">{utcDay(s.createdAt)}</div>
                      <div className="text-xs">created</div>
                    </>
                  )}
                </td>
                <td className={`${tdCls} text-right tabular-nums text-muted`}>{s._count.recordings || ""}</td>
                <td className={`${tdCls} text-right`}>
                  <Link href={`${BASE}/${s.id}`} className="text-sm text-secondary-soft hover:underline">Open</Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Pager win={win} noun="interviews" href={(p) => hrefWith(BASE, filters, { page: p })} />
    </div>
  );
}
