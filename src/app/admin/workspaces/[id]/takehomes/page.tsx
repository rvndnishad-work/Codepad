import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pageOf } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "../_data";
import { Empty, ListFilters, Pager, Pill, Table, fmtDate, one, statusLabel, statusTone, td, urlWith } from "../_ui";

export const metadata = { title: "Workspace take homes — Interviewpad Admin" };

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Take homes come in two shapes: interview sessions of type "take-home"
 * (the current, multi-question kind) and the older single-question
 * TakeHomeAssignment. Each is its own server-paged list.
 */
export default async function WorkspaceTakeHomesPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const q = one(sp.q)?.trim() ?? "";
  const status = one(sp.status) ?? "";
  const sWhere: Prisma.InterviewSessionWhereInput = {
    workspaceId: id,
    type: "take-home",
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { candidateName: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const lWhere: Prisma.TakeHomeAssignmentWhereInput = {
    workspaceId: id,
    ...(q ? { OR: [{ candidateName: { contains: q, mode: "insensitive" } }, { candidateEmail: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, legacyTotal, statuses] = await Promise.all([
    prisma.interviewSession.count({ where: sWhere }),
    prisma.takeHomeAssignment.count({ where: lWhere }),
    prisma.interviewSession.groupBy({ by: ["status"], where: { workspaceId: id, type: "take-home" }, _count: { _all: true } }),
  ]);
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const lpaging = pageOf(one(sp.lpage), legacyTotal, PAGE_SIZE);
  const [rows, legacy] = await Promise.all([
    prisma.interviewSession.findMany({
      where: sWhere,
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: PAGE_SIZE,
      select: { id: true, title: true, candidateName: true, status: true, deadlineAt: true, finishedAt: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
    legacyTotal
      ? prisma.takeHomeAssignment.findMany({
          where: lWhere,
          orderBy: { createdAt: "desc" },
          skip: lpaging.skip,
          take: PAGE_SIZE,
          select: { id: true, candidateName: true, candidateEmail: true, status: true, expiresAt: true, submittedAt: true, attemptId: true, challenge: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);
  const base = `/admin/workspaces/${id}/takehomes`;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <h2 className="flex-1 text-[15px] font-semibold text-fg">Take homes</h2>
          <ListFilters
            q={q}
            status={status}
            placeholder="Search title or candidate"
            statuses={statuses.map((s) => ({ id: s.status, label: `${statusLabel(s.status)} (${s._count._all})` }))}
          />
        </div>
        {rows.length === 0 ? (
          <Empty>{q || status ? "No take homes match." : "No take homes yet."}</Empty>
        ) : (
          <Table head={["Take home", "Candidate", "Reviewer", "Status", "Deadline", "Submitted", ""]}>
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-panel/40">
                <td className={`${td} font-medium text-fg`}>{s.title}</td>
                <td className={td}>{s.candidateName ?? ""}</td>
                <td className={`${td} text-muted`}>{s.user.name ?? s.user.email}</td>
                <td className={td}>
                  <Pill tone={statusTone(s.status)}>{statusLabel(s.status)}</Pill>
                </td>
                <td className={`${td} text-muted whitespace-nowrap`}>{s.deadlineAt ? fmtDate(s.deadlineAt, true) : ""}</td>
                <td className={`${td} text-muted whitespace-nowrap`}>{s.finishedAt ? fmtDate(s.finishedAt, true) : ""}</td>
                <td className={`${td} text-right`}>
                  <Link className="text-[13px] text-secondary-soft hover:underline" href={`/admin/interviews/${s.id}`}>
                    Report
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={paging.page} pages={paging.pages} total={total} href={(p) => urlWith(base, { q, status, page: p, lpage: lpaging.page })} />
      </section>

      {legacyTotal > 0 && (
        <section className="rounded-xl border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-[15px] font-semibold text-fg">Older single-question take homes</h2>
          </div>
          <Table head={["Candidate", "Question", "Status", "Expires", "Submitted", ""]}>
            {legacy.map((t) => (
              <tr key={t.id} className="hover:bg-panel/40">
                <td className={td}>
                  <div className="font-medium text-fg">{t.candidateName}</div>
                  <div className="text-xs text-muted">{t.candidateEmail}</div>
                </td>
                <td className={td}>{t.challenge.title}</td>
                <td className={td}>
                  <Pill tone={statusTone(t.status)}>{statusLabel(t.status)}</Pill>
                </td>
                <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(t.expiresAt)}</td>
                <td className={`${td} text-muted whitespace-nowrap`}>{t.submittedAt ? fmtDate(t.submittedAt, true) : ""}</td>
                <td className={`${td} text-right`}>
                  {t.attemptId && (
                    <Link className="text-[13px] text-secondary-soft hover:underline" href={`/admin/attempts/${t.attemptId}`}>
                      Attempt
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={lpaging.page} pages={lpaging.pages} total={legacyTotal} href={(p) => urlWith(base, { q, status, page: paging.page, lpage: p })} />
        </section>
      )}
    </div>
  );
}
