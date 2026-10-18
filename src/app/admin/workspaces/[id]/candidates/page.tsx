import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pageOf } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "../_data";
import { Empty, ListFilters, Pager, Pill, Table, fmtDate, one, statusLabel, statusTone, td, urlWith } from "../_ui";

export const metadata = { title: "Workspace candidates — Interviewpad Admin" };

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceCandidatesPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const q = one(sp.q)?.trim() ?? "";
  const status = one(sp.status) ?? "";
  const where: Prisma.CandidateWhereInput = {
    workspaceId: id,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, statuses] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.groupBy({ by: ["status"], where: { workspaceId: id }, _count: { _all: true } }),
  ]);
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const rows = await prisma.candidate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: paging.skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      stage: true,
      source: true,
      createdAt: true,
      owner: { select: { name: true, email: true } },
      _count: { select: { sessions: true, takeHomes: true, aiInterviewSessions: true } },
    },
  });
  const base = `/admin/workspaces/${id}/candidates`;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">Candidates</h2>
        <ListFilters q={q} status={status} statuses={statuses.map((s) => ({ id: s.status, label: `${statusLabel(s.status)} (${s._count._all})` }))} />
      </div>
      {rows.length === 0 ? (
        <Empty>{q || status ? "No candidates match." : "No candidates yet."}</Empty>
      ) : (
        <Table head={["Candidate", "Stage", "Status", "Owner", "Interviews", "AI", "Take homes", "Added"]}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-panel/40">
              <td className={td}>
                <div className="font-medium text-fg">{c.name}</div>
                <div className="text-xs text-muted">{c.email ?? "No email"}</div>
              </td>
              <td className={td}>{statusLabel(c.stage)}</td>
              <td className={td}>
                <Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill>
              </td>
              <td className={`${td} text-muted`}>{c.owner?.name ?? c.owner?.email ?? ""}</td>
              <td className={`${td} tabular-nums`}>{c._count.sessions}</td>
              <td className={`${td} tabular-nums`}>{c._count.aiInterviewSessions}</td>
              <td className={`${td} tabular-nums`}>{c._count.takeHomes}</td>
              <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(c.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={paging.page} pages={paging.pages} total={total} href={(p) => urlWith(base, { q, status, page: p })} />
    </section>
  );
}
