import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Code2, ExternalLink } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Workspace attempts — Interviewpad Admin",
};

// ChallengeAttempt.status values per schema.
const STATUS_BADGES: Record<string, string> = {
  in_progress: "text-sky-600 dark:text-sky-400 bg-sky-500/[0.08] border-sky-500/20",
  passed: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20",
  failed: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] border-rose-500/20",
  abandoned: "text-muted bg-panel/40 border-border",
};

export default async function WorkspaceAttemptsPage({ params }: Props) {
  const { id } = await params;

  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true } });
  if (!ws) notFound();

  // ChallengeAttempt has no direct workspaceId — join through Challenge.
  // This intentionally scopes to attempts on the workspace's PRIVATE
  // challenges, which is the "this recruiter's data" interpretation.
  // Member attempts on public challenges are personal practice, not
  // recruiter-owned activity.
  const attempts = await prisma.challengeAttempt.findMany({
    where: { challenge: { workspaceId: id } },
    orderBy: [{ startedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      score: true,
      durationSec: true,
      startedAt: true,
      finishedAt: true,
      user: { select: { id: true, name: true, email: true } },
      challenge: { select: { id: true, slug: true, title: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-fg">Attempts</h3>
        <p className="text-xs text-muted mt-0.5">
          {attempts.length} most recent {attempts.length === 1 ? "attempt" : "attempts"} on this workspace&apos;s challenges (capped at 100)
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-3">
            <Code2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-fg">No attempts yet</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            No one has attempted this workspace&apos;s private challenges. Attempts will appear here as candidates work through them.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Challenge</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Score</th>
                <th className="px-4 py-3 font-semibold text-right tabular-nums">Duration</th>
                <th className="px-4 py-3 font-semibold">Started</th>
                <th className="px-4 py-3 font-semibold text-right">Replay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-elevated/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/u/${a.user.id}`}
                      className="font-semibold text-fg hover:text-accent transition"
                    >
                      {a.user.name || "Anonymous"}
                    </Link>
                    <div className="text-xs text-muted font-mono mt-0.5 truncate max-w-[200px]">
                      {a.user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <Link
                      href={`/challenge/${a.challenge.slug}`}
                      target="_blank"
                      className="text-fg hover:text-accent transition inline-flex items-center gap-1"
                    >
                      {a.challenge.title}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                        STATUS_BADGES[a.status] || STATUS_BADGES.in_progress
                      }`}
                    >
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-fg text-right">
                    {a.score !== null ? a.score : <span className="text-muted/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono tabular-nums text-muted text-right">
                    {a.durationSec !== null ? formatDuration(a.durationSec) : <span className="text-muted/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(a.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/attempts/${a.id}/replay`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-muted hover:text-fg hover:border-border-strong transition"
                      title="Open replay"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
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
 * Compact duration: "8m 12s" / "1h 4m" / "47s". Drops the small unit when
 * the large one is dominant so the column stays scannable.
 */
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return sec % 60 ? `${m}m ${sec % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}
