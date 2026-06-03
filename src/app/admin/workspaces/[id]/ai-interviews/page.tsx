import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Sparkles, Mail } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Workspace AI interviews — Interviewpad Admin",
};

// AIInterviewSession.status values are uppercase per schema convention.
const STATUS_BADGES: Record<string, string> = {
  PENDING: "text-amber-600 dark:text-amber-400 bg-amber-500/[0.08] border-amber-500/20",
  IN_PROGRESS: "text-sky-600 dark:text-sky-400 bg-sky-500/[0.08] border-sky-500/20",
  COMPLETED: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20",
  EXPIRED: "text-muted bg-panel/40 border-border",
  CANCELLED: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] border-rose-500/20",
};

export default async function WorkspaceAIInterviewsPage({ params }: Props) {
  const { id } = await params;

  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true } });
  if (!ws) notFound();

  const sessions = await prisma.aIInterviewSession.findMany({
    where: { workspaceId: id },
    // Latest activity first. createdAt is the invite-creation time, which
    // is the most useful "when did this enter the pipeline" sort key.
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      positionTitle: true,
      status: true,
      score: true,
      aiSuspicionScore: true,
      startedAt: true,
      createdAt: true,
    },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-fg">AI Interviews</h3>
        <p className="text-xs text-muted mt-0.5">
          {sessions.length} most recent AI-screened {sessions.length === 1 ? "session" : "sessions"} (capped at 100)
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 mx-auto mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-fg">No AI interviews yet</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            This workspace hasn&apos;t run any AI screenings. They&apos;ll appear here once the first invite is sent.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Score</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Suspicion</th>
                <th className="px-4 py-3 font-semibold">Started</th>
                <th className="px-4 py-3 font-semibold">Invited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-elevated/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-fg">{s.candidateName}</div>
                    <div className="text-xs text-muted font-mono mt-0.5 inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {s.candidateEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{s.positionTitle || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                        STATUS_BADGES[s.status] || STATUS_BADGES.PENDING
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-fg text-right">
                    {s.score !== null ? s.score : <span className="text-muted/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-right">
                    <SuspicionScore score={s.aiSuspicionScore} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {s.startedAt
                      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(s.startedAt)
                      : <span className="text-muted/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(s.createdAt)}
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

/**
 * Suspicion score is 0..1; render as a percentage with color tiers so the
 * eye can spot high-risk sessions at a glance.
 */
function SuspicionScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted/50">—</span>;
  const pct = Math.round(score * 100);
  const tone =
    pct >= 70 ? "text-rose-500" : pct >= 40 ? "text-amber-500" : "text-emerald-500";
  return <span className={tone}>{pct}%</span>;
}
