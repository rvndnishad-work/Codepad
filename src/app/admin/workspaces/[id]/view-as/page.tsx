import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { buildOverview, type OverviewInput } from "@/lib/workspace/overview";
import { loadOverviewExtras } from "@/lib/workspace/overview-server";
import { getAdminWorkspace } from "../_data";
import { Card, Empty, Kpi, fmtDate } from "../_ui";

export const metadata = { title: "View as owner — Interviewpad Admin" };

/** How many recent rows of each kind feed the snapshot (the workspace dashboard reads at most 200). */
const TAKE = 200;

type Props = { params: Promise<{ id: string }> };

/**
 * "View as owner": a read-only snapshot of what the owner sees on their
 * Overview, built with the workspace's own overview code
 * (src/lib/workspace/overview.ts). It never opens /w/[slug] as the owner and
 * offers no actions, so nothing can be changed from here. Each visit is
 * logged as workspace.view_as.
 */
export default async function ViewAsOwnerPage({ params }: Props) {
  const session = await requireAdminAccess("platform:admin");
  const { id } = await params;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const [candidates, sessions, takeHomes, takeHomeSessions, ai, extras] = await Promise.all([
    prisma.candidate.findMany({
      where: { workspaceId: id },
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: { id: true, name: true, stage: true, createdAt: true, stageChangedAt: true },
    }),
    prisma.interviewSession.findMany({
      where: { workspaceId: id, type: { not: "take-home" } },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, title: true, candidateName: true, candidateId: true, shareToken: true, scheduledAt: true, startedAt: true, finishedAt: true, createdAt: true, user: { select: { name: true } } },
    }),
    prisma.takeHomeAssignment.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: {
        id: true,
        candidateName: true,
        status: true,
        expiresAt: true,
        submittedAt: true,
        attemptId: true,
        candidateId: true,
        createdAt: true,
        challenge: { select: { title: true } },
        attempt: { select: { score: true } },
        candidate: { select: { stage: true } },
      },
    }),
    prisma.interviewSession.findMany({
      where: { workspaceId: id, type: "take-home" },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, title: true, candidateName: true, status: true, deadlineAt: true, finishedAt: true, createdAt: true, candidate: { select: { id: true, stage: true } } },
    }),
    prisma.aIInterviewSession.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, candidateName: true, positionTitle: true, status: true, score: true, candidateId: true, finishedAt: true, createdAt: true, candidate: { select: { stage: true } } },
    }),
    loadOverviewExtras(id, ws.slug).catch(() => undefined),
  ]);

  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  const input: OverviewInput = {
    slug: ws.slug,
    candidates: candidates.map((c) => ({ id: c.id, name: c.name, stage: c.stage, createdAt: c.createdAt.toISOString(), stageChangedAt: iso(c.stageChangedAt) })),
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      candidateName: s.candidateName,
      candidateId: s.candidateId,
      shareToken: s.shareToken,
      scheduledAt: iso(s.scheduledAt),
      startedAt: iso(s.startedAt),
      finishedAt: iso(s.finishedAt),
      createdAt: s.createdAt.toISOString(),
      interviewerName: s.user.name,
    })),
    takeHomes: takeHomes.map((t) => ({
      id: t.id,
      candidateName: t.candidateName,
      challengeTitle: t.challenge.title,
      status: t.status,
      expiresAt: t.expiresAt.toISOString(),
      submittedAt: iso(t.submittedAt),
      attemptId: t.attemptId,
      candidateId: t.candidateId,
      candidateStage: t.candidate?.stage ?? null,
      createdAt: t.createdAt.toISOString(),
      score: t.attempt?.score ?? null,
    })),
    takeHomeSessions: takeHomeSessions.map((s) => ({
      id: s.id,
      title: s.title,
      candidateName: s.candidateName,
      status: s.status,
      deadlineAt: iso(s.deadlineAt),
      finishedAt: iso(s.finishedAt),
      createdAt: s.createdAt.toISOString(),
      candidateId: s.candidate?.id ?? null,
      candidateStage: s.candidate?.stage ?? null,
    })),
    aiInterviewSessions: ai.map((s) => ({
      id: s.id,
      candidateName: s.candidateName,
      positionTitle: s.positionTitle,
      status: s.status,
      score: s.score,
      candidateId: s.candidateId,
      candidateStage: s.candidate?.stage ?? null,
      finishedAt: iso(s.finishedAt),
      createdAt: s.createdAt.toISOString(),
    })),
    extras,
  };
  const o = buildOverview(input);

  await logAdminAction({
    actor: { id: session?.user?.id, email: session?.user?.email },
    action: "workspace.view_as",
    targetType: "workspace",
    targetId: ws.id,
    targetLabel: ws.name,
  });

  return (
    <div className="flex flex-col gap-4">
      <div role="note" className="flex flex-wrap items-center gap-3 rounded-xl border border-secondary/40 bg-surface px-4 py-3 text-sm text-fg">
        <Eye className="w-4 h-4 text-secondary-soft" aria-hidden />
        <span className="flex-1">
          Read-only snapshot of the Overview {ws.owner ? `${ws.owner.name ?? ws.owner.email} sees` : "the owner sees"}, built with the workspace&apos;s own overview
          code. Nothing here can be changed, and this visit is in the audit log.
        </span>
        <Link href={`/admin/workspaces/${id}`} className="text-[13px] text-secondary-soft hover:underline">
          Back to admin view
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Active candidates" value={o.kpis.active} hint={`${o.kpis.addedThisWeek} added this week`} />
        <Kpi label="To review" value={o.kpis.toReview} hint={o.kpis.reviewOverdue ? `${o.kpis.reviewOverdue} waiting over 48 h` : "None overdue"} />
        <Kpi label="Upcoming interviews" value={o.kpis.upcomingInterviews} hint={`${o.kpis.interviewsThisWeek} finished this week`} />
        <Kpi label="Passed" value={o.kpis.passed} hint={`${o.kpis.passedThisMonth} in 30 days`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card title="Needs their attention">
          {o.attention.length === 0 ? (
            <Empty>Nothing waiting.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {o.attention.slice(0, 15).map((a) => (
                <li key={`${a.kind}-${a.id}`} className="py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-subtle">{a.tag}</span>
                    <span className="font-medium text-fg">{a.name}</span>
                  </div>
                  <div className="text-muted">
                    {a.detail} · {a.action}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Upcoming">
            {o.upcoming.length === 0 ? (
              <Empty>Nothing scheduled.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {o.upcoming.slice(0, 10).map((u) => (
                  <li key={u.id} className="py-2 text-sm flex justify-between gap-3">
                    <span className="text-fg">
                      {u.name} <span className="text-muted">· {u.detail}</span>
                    </span>
                    <span className="text-muted whitespace-nowrap">{u.at ? fmtDate(u.at, true) : "Not scheduled"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="AI screening scores">
            <p className="text-sm text-muted">
              {o.scores.count ? `${o.scores.count} scored, average ${o.scores.average}.` : "No scored screenings yet."}
            </p>
            {o.scores.count > 0 && (
              <ul className="mt-2 text-sm">
                {o.scores.buckets.map((b) => (
                  <li key={b.label} className="flex justify-between py-1">
                    <span className="text-muted">{b.label}</span>
                    <span className="tabular-nums text-fg">{b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
