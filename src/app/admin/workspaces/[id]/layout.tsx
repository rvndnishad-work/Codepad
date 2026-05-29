import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import WorkspaceTabs from "./WorkspaceTabs";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  GROWTH: "text-indigo-600 dark:text-indigo-300 border-indigo-500/25 bg-indigo-500/[0.08]",
  ENTERPRISE: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  LOCKED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
};

export default async function WorkspaceDetailLayout({ params, children }: Props) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) notFound();

  const { id } = await params;

  // Fetch the workspace metadata + counts for every tab in one round-trip.
  // The attempts count is a cross-table join (no direct workspaceId on
  // ChallengeAttempt) so it needs its own query — both run in parallel.
  const [workspace, attemptCount] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        planName: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            challenges: true,
            takeHomes: true,
            sessions: true,
            candidates: true,
            aiInterviewSessions: true,
          },
        },
      },
    }),
    prisma.challengeAttempt.count({
      where: { challenge: { workspaceId: id } },
    }),
  ]);

  if (!workspace) notFound();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/workspaces"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All workspaces
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm shrink-0 select-none">
            {workspace.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500/80 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Corporate workspace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-fg mt-0.5 truncate">{workspace.name}</h2>
            <div className="text-xs text-muted font-mono mt-1">/{workspace.slug}</div>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
            PLAN_BADGES[workspace.planName] || PLAN_BADGES.FREE
          }`}
        >
          {workspace.planName}
        </span>
      </div>

      {/* Tab navigation */}
      <WorkspaceTabs
        workspaceId={workspace.id}
        counts={{
          members: workspace._count.members,
          challenges: workspace._count.challenges,
          interviews: workspace._count.sessions,
          replays: workspace._count.takeHomes,
          candidates: workspace._count.candidates,
          aiInterviews: workspace._count.aiInterviewSessions,
          attempts: attemptCount,
        }}
      />

      {/* Tab content */}
      <div>{children}</div>
    </div>
  );
}
