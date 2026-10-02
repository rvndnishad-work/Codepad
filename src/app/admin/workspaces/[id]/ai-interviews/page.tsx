import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { pageOf } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "../_data";
import { Empty, ListFilters, Pager, Pill, Table, fmtDate, one, statusLabel, statusTone, td, urlWith } from "../_ui";

export const metadata = { title: "Workspace AI screenings — Interviewpad Admin" };

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceScreeningsPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const q = one(sp.q)?.trim() ?? "";
  const status = one(sp.status) ?? "";
  const where: Prisma.AIInterviewSessionWhereInput = {
    workspaceId: id,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { candidateName: { contains: q, mode: "insensitive" } },
            { candidateEmail: { contains: q, mode: "insensitive" } },
            { positionTitle: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, statuses] = await Promise.all([
    prisma.aIInterviewSession.count({ where }),
    prisma.aIInterviewSession.groupBy({ by: ["status"], where: { workspaceId: id }, _count: { _all: true } }),
  ]);
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const rows = await prisma.aIInterviewSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: paging.skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      positionTitle: true,
      status: true,
      practice: true,
      score: true,
      aiSummary: true,
      aiSuspicionScore: true,
      engagementLevel: true,
      createdAt: true,
      finishedAt: true,
      ledgerEntries: { select: { kind: true, amount: true } },
    },
  });
  const base = `/admin/workspaces/${id}/ai-interviews`;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">AI screenings</h2>
        <ListFilters
          q={q}
          status={status}
          placeholder="Search candidate, email or role"
          statuses={statuses.map((s) => ({ id: s.status, label: `${statusLabel(s.status)} (${s._count._all})` }))}
        />
      </div>
      {rows.length === 0 ? (
        <Empty>{q || status ? "No screenings match." : "No AI screenings yet."}</Empty>
      ) : (
        <Table head={["Candidate", "Role", "Status", "Score", "Credits", "Sent", "Finished", "Report"]}>
          {rows.map((s) => {
            const charged = -s.ledgerEntries.filter((l) => l.kind === "CONSUMPTION").reduce((a, l) => a + l.amount, 0);
            const refunded = s.ledgerEntries.some((l) => l.kind === "REFUND");
            return (
              <tr key={s.id} className="hover:bg-panel/40 align-top">
                <td className={td}>
                  <div className="font-medium text-fg">{s.candidateName}</div>
                  <div className="text-xs text-muted">{s.candidateEmail}</div>
                </td>
                <td className={td}>{s.positionTitle}</td>
                <td className={td}>
                  <Pill tone={statusTone(s.status)}>{statusLabel(s.status)}</Pill>
                  {s.practice && <span className="ml-1.5 text-xs text-muted">practice</span>}
                </td>
                <td className={`${td} tabular-nums`}>{s.score ?? ""}</td>
                <td className={`${td} tabular-nums whitespace-nowrap`}>
                  {charged || ""}
                  {refunded && <span className="ml-1.5"><Pill tone="warn">Refunded</Pill></span>}
                </td>
                <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(s.createdAt)}</td>
                <td className={`${td} text-muted whitespace-nowrap`}>{s.finishedAt ? fmtDate(s.finishedAt, true) : ""}</td>
                <td className={`${td} min-w-[180px]`}>
                  {s.aiSummary || s.aiSuspicionScore !== null ? (
                    <details>
                      <summary className="cursor-pointer text-secondary-soft text-[13px]">Summary</summary>
                      <div className="mt-2 max-w-md text-[13px] text-muted whitespace-pre-line">
                        {s.aiSuspicionScore !== null && <div>Suspicion score: {Math.round(s.aiSuspicionScore * 100) / 100}</div>}
                        {s.aiSummary}
                      </div>
                    </details>
                  ) : (
                    <span className="text-muted text-[13px]">No report yet</span>
                  )}
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
