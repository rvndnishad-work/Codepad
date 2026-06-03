import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UserSquare, Mail, Tag } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Workspace candidates — Interviewpad Admin",
};

// Pipeline-status colors mirror the recruiter-side UI so admin and recruiter
// see the same chip for the same state.
const STATUS_BADGES: Record<string, string> = {
  active: "text-sky-600 dark:text-sky-400 bg-sky-500/[0.08] border-sky-500/20",
  hired: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20",
  rejected: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] border-rose-500/20",
  archived: "text-muted bg-panel/40 border-border",
};

export default async function WorkspaceCandidatesPage({ params }: Props) {
  const { id } = await params;

  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true } });
  if (!ws) notFound();

  const candidates = await prisma.candidate.findMany({
    where: { workspaceId: id },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      source: true,
      createdAt: true,
      _count: {
        select: {
          sessions: true,
          takeHomes: true,
          aiInterviewSessions: true,
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-fg">Candidates</h3>
        <p className="text-xs text-muted mt-0.5">
          {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"} in this workspace&apos;s pipeline
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 mx-auto mb-3">
            <UserSquare className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-fg">No candidates yet</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            This workspace hasn&apos;t added any candidates. They&apos;ll appear here once recruiters start their pipeline.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Live</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">AI</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Take-home</th>
                <th className="px-4 py-3 font-semibold">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-elevated/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-fg">{c.name}</div>
                    {c.email && (
                      <div className="text-xs text-muted font-mono mt-0.5 inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {c.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                        STATUS_BADGES[c.status] || STATUS_BADGES.active
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.source ? (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {c.source}
                      </span>
                    ) : (
                      <span className="text-muted/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-muted text-right">
                    {c._count.sessions}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-muted text-right">
                    {c._count.aiInterviewSessions}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-muted text-right">
                    {c._count.takeHomes}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(c.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
