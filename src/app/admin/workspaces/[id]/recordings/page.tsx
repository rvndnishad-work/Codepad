import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pageOf } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "../_data";
import { Empty, ListFilters, Pager, Pill, Table, fmtBytes, fmtDate, fmtDuration, one, statusLabel, statusTone, td, urlWith } from "../_ui";

export const metadata = { title: "Workspace recordings — Interviewpad Admin" };

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceRecordingsPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const q = one(sp.q)?.trim() ?? "";
  const status = one(sp.status) ?? "";
  const where: Prisma.InterviewRecordingWhereInput = {
    workspaceId: id,
    ...(status ? { status } : {}),
    ...(q
      ? { interviewSession: { OR: [{ title: { contains: q, mode: "insensitive" } }, { candidateName: { contains: q, mode: "insensitive" } }] } }
      : {}),
  };
  const [total, statuses] = await Promise.all([
    prisma.interviewRecording.count({ where }),
    prisma.interviewRecording.groupBy({ by: ["status"], where: { workspaceId: id }, _count: { _all: true } }),
  ]);
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const rows = await prisma.interviewRecording.findMany({
    where,
    orderBy: { startedAt: "desc" },
    skip: paging.skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      status: true,
      seconds: true,
      sizeBytes: true,
      startedAt: true,
      expiresAt: true,
      deletedAt: true,
      creditsCharged: true,
      error: true,
      interviewSession: { select: { id: true, title: true, candidateName: true } },
    },
  });
  const base = `/admin/workspaces/${id}/recordings`;
  const now = Date.now();

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">Recordings</h2>
        <ListFilters
          q={q}
          status={status}
          placeholder="Search interview or candidate"
          statuses={statuses.map((s) => ({ id: s.status, label: `${statusLabel(s.status)} (${s._count._all})` }))}
        />
      </div>
      {rows.length === 0 ? (
        <Empty>{q || status ? "No recordings match." : "No recordings yet."}</Empty>
      ) : (
        <Table head={["Started", "Interview", "Length", "Size", "Status", "Expires", "Credits", ""]}>
          {rows.map((r) => {
            const soon = !r.deletedAt && r.expiresAt.getTime() - now < 48 * 3_600_000;
            return (
              <tr key={r.id} className="hover:bg-panel/40">
                <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(r.startedAt, true)}</td>
                <td className={td}>
                  <div className="font-medium text-fg">{r.interviewSession.title}</div>
                  <div className="text-xs text-muted">{r.interviewSession.candidateName ?? ""}</div>
                </td>
                <td className={`${td} whitespace-nowrap`}>{r.seconds ? fmtDuration(r.seconds) : ""}</td>
                <td className={`${td} whitespace-nowrap`}>{r.sizeBytes ? fmtBytes(r.sizeBytes) : ""}</td>
                <td className={td} title={r.error ?? undefined}>
                  <Pill tone={r.deletedAt ? "off" : statusTone(r.status)}>{r.deletedAt ? "Deleted" : statusLabel(r.status)}</Pill>
                </td>
                <td className={`${td} whitespace-nowrap ${soon ? "text-warning" : "text-muted"}`}>{r.deletedAt ? "" : fmtDate(r.expiresAt, true)}</td>
                <td className={`${td} tabular-nums`}>{r.creditsCharged || ""}</td>
                <td className={`${td} text-right`}>
                  <Link className="text-[13px] text-secondary-soft hover:underline" href={`/admin/interviews/${r.interviewSession.id}`}>
                    Interview
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pager page={paging.page} pages={paging.pages} total={total} href={(p) => urlWith(base, { q, status, page: p })} />
    </section>
  );
}
