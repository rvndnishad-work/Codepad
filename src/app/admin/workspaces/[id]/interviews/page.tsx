import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pageOf } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "../_data";
import { Empty, ListFilters, Pager, Pill, Table, fmtDate, one, statusLabel, statusTone, td, urlWith } from "../_ui";

export const metadata = { title: "Workspace interviews — Interviewpad Admin" };

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Live interviews (InterviewSession rows of the workspace that are not take homes). Secrets are never selected. */
export default async function WorkspaceInterviewsPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const q = one(sp.q)?.trim() ?? "";
  const status = one(sp.status) ?? "";
  const where: Prisma.InterviewSessionWhereInput = {
    workspaceId: id,
    type: { not: "take-home" },
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { candidateName: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, statuses] = await Promise.all([
    prisma.interviewSession.count({ where }),
    prisma.interviewSession.groupBy({ by: ["status"], where: { workspaceId: id, type: { not: "take-home" } }, _count: { _all: true } }),
  ]);
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const rows = await prisma.interviewSession.findMany({
    where,
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    skip: paging.skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      candidateName: true,
      status: true,
      verdict: true,
      scheduledAt: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      _count: { select: { recordings: true, scorecards: true } },
    },
  });
  const base = `/admin/workspaces/${id}/interviews`;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">Interviews</h2>
        <ListFilters
          q={q}
          status={status}
          placeholder="Search title or candidate"
          statuses={statuses.map((s) => ({ id: s.status, label: `${statusLabel(s.status)} (${s._count._all})` }))}
        />
      </div>
      {rows.length === 0 ? (
        <Empty>{q || status ? "No interviews match." : "No interviews yet."}</Empty>
      ) : (
        <Table head={["Interview", "Candidate", "Host", "When", "Status", "Scorecards", "Recordings", ""]}>
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-panel/40">
              <td className={`${td} font-medium text-fg`}>{s.title}</td>
              <td className={td}>{s.candidateName ?? ""}</td>
              <td className={`${td} text-muted`}>{s.user.name ?? s.user.email}</td>
              <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(s.scheduledAt ?? s.startedAt ?? s.createdAt, true)}</td>
              <td className={td}>
                <Pill tone={statusTone(s.status)}>{statusLabel(s.status)}</Pill>
                {s.verdict && <span className="ml-1.5 text-xs text-muted">{statusLabel(s.verdict)}</span>}
              </td>
              <td className={`${td} tabular-nums`}>{s._count.scorecards}</td>
              <td className={`${td} tabular-nums`}>{s._count.recordings}</td>
              <td className={`${td} text-right`}>
                <Link className="text-[13px] text-secondary-soft hover:underline" href={`/admin/interviews/${s.id}`}>
                  Report
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={paging.page} pages={paging.pages} total={total} href={(p) => urlWith(base, { q, status, page: p })} />
    </section>
  );
}
