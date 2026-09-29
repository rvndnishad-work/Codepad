import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { loadInterviewReport } from "@/lib/interview/report-server";
import { loadReportScorecards } from "@/lib/interview/scorecard-server";
import { reportRecordings } from "@/lib/recording/live-server";
import { loadCandidateRounds } from "@/lib/interview/rounds-server";
import { hasResult, roundAfter, roundStateLabel } from "@/lib/interview/rounds";
import InterviewReportView from "./InterviewReportView";
import type { NextStepData } from "./NextStepPanel";

export const metadata = { title: "Interview report", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; id: string }> };

/** Report for a live interview, for any member of the workspace. */
export default async function InterviewReportPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/interviews/${id}/report`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");

  const s = await prisma.interviewSession.findFirst({
    where: { id, workspaceId: workspace.id, type: { not: "take-home" } },
    select: { id: true, userId: true, createdById: true, candidateId: true, candidateRoundId: true, format: true },
  });
  if (!s) notFound();
  const report = await loadInterviewReport(s.id);
  if (!report) notFound();

  const [canManage, canConduct, canPipeline, scorecards, recordings, nextStep] = await Promise.all([
    canMember(member, "interview:manage"),
    canMember(member, "interview:conduct"),
    canMember(member, "candidate:manage_pipeline"),
    loadReportScorecards(s.id, { userId: session.user.id }),
    // Members only: signed links to the call recording, fresh on each load.
    reportRecordings(s.id),
    s.candidateId && s.candidateRoundId ? loadNextStep(workspace.id, slug, s.candidateId, s.candidateRoundId, s.format) : null,
  ]);
  const isHost = s.userId === session.user.id;
  return (
    <InterviewReportView
      report={report}
      slug={slug}
      canDelete={isHost || canManage}
      scorecards={scorecards}
      scorecardHref={scorecards?.viewer.state ? `/w/${slug}/interviews/${s.id}/scorecard` : null}
      canEditPassMark={isHost || canManage}
      canNudge={isHost || s.createdById === session.user.id || canConduct}
      recordings={recordings}
      nextStep={nextStep ? { ...nextStep, canDecide: canPipeline } : null}
    />
  );
}

/** The "What next?" panel's data, when this interview is a round with a result. */
async function loadNextStep(workspaceId: string, slug: string, candidateId: string, roundId: string, sessionFormat: string | null): Promise<NextStepData | null> {
  const [cand, rounds] = await Promise.all([
    prisma.candidate.findFirst({ where: { id: candidateId, workspaceId }, select: { name: true, stage: true } }),
    loadCandidateRounds(workspaceId, slug, [candidateId]),
  ]);
  const cr = rounds.get(candidateId);
  const round = cr?.progress.rounds.find((r) => r.id === roundId);
  if (!cand || !cr || !round || (!hasResult(round.state) && !round.nextStep)) return null;
  const meta = cr.meta.get(round.id);
  const next = roundAfter(cr.progress, round.id);
  const nextFormat = next ? (cr.meta.get(next.id)?.format ?? null) : null;
  const decidedBy = meta?.decidedById ? await prisma.user.findUnique({ where: { id: meta.decidedById }, select: { name: true, email: true } }) : null;
  const wizard = (r: { id: string }, format: string | null) =>
    `/w/${slug}/interviews/new?candidateId=${candidateId}&rounds=${candidateId}:${r.id}${format ? `&format=${format}` : ""}`;
  return {
    slug,
    candidateId,
    candidateName: cand.name,
    stage: cand.stage.toUpperCase(),
    roundId: round.id,
    roundName: round.name,
    number: round.number,
    total: cr.progress.total,
    state: round.state,
    stateLabel: roundStateLabel(round.state, round.kind),
    score: meta?.latest?.score ?? null,
    decided: round.nextStep,
    decidedBy: decidedBy ? decidedBy.name || decidedBy.email : null,
    next: next ? { name: next.name, number: next.number } : null,
    // A rebook repeats this interview's own format when the round has none.
    rebookHref: wizard(round, meta?.format ?? sessionFormat),
    nextHref: next && next.kind === "interview" ? wizard(next, nextFormat) : null,
    nextBooked: !!next && next.state !== "not_started" && next.state !== "stopped",
    profileHref: `/w/${slug}/candidates/${candidateId}`,
    canDecide: false,
  };
}
