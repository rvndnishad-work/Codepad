import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WorkspaceDashboardClient from "./WorkspaceDashboardClient";
import { Building2 } from "lucide-react";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/crm/stages";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: workspace ? `${workspace.name} Workspace Dashboard — Interviewpad` : "Workspace not found",
  };
}

export default async function WorkspaceDashboardPage({ params }: Props) {
  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: { name: true, image: true, email: true },
          },
        },
        orderBy: { role: "asc" },
      },
      challenges: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          template: true,
          published: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      takeHomes: {
        include: {
          challenge: { select: { id: true, title: true, difficulty: true } },
          attempt: { select: { score: true, startedAt: true } },
          candidate: { select: { id: true, stage: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      sessions: {
        select: {
          id: true,
          title: true,
          candidateName: true,
          candidateId: true,
          type: true,
          status: true,
          verdict: true,
          shortCode: true,
          shareToken: true,
          totalSec: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      candidates: {
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { takeHomes: true, sessions: true } },
        },
      },
    },
  });

  if (!workspace) notFound();

  const [promptScenarios, promptAttempts, globalChallenges] = await Promise.all([
    prisma.promptScenario.findMany({
      where: {
        OR: [
          { workspaceId: workspace.id },
          { workspaceId: null },
        ]
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.promptAttempt.findMany({
      where: {
        OR: [
          { scenario: { workspaceId: workspace.id } },
          { sessionId: { in: workspace.sessions.map((s) => s.id) } },
        ]
      },
      include: {
        scenario: { select: { title: true, category: true, difficulty: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.challenge.findMany({
      where: {
        OR: [
          { published: true, workspaceId: null },
          { workspaceId: workspace.id },
        ],
      },
      select: { id: true, title: true, difficulty: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const formattedPromptAttempts = promptAttempts.map((a) => ({
    id: a.id,
    promptText: a.promptText,
    charCount: a.charCount,
    tokenEstimate: a.tokenEstimate,
    score: a.score,
    rubricScores: a.rubricScores,
    feedback: a.feedback,
    graderType: a.graderType,
    sessionId: a.sessionId,
    userId: a.userId,
    durationSec: a.durationSec,
    createdAt: a.createdAt.toISOString(),
    scenarioTitle: a.scenario.title,
    scenarioCategory: a.scenario.category,
    scenarioDifficulty: a.scenario.difficulty,
  }));

  // Map workspace take-homes into a flat, client-friendly structure
  const formattedTakeHomes = workspace.takeHomes.map((th) => ({
    id: th.id,
    candidateName: th.candidateName,
    candidateEmail: th.candidateEmail,
    token: th.token,
    status: th.status,
    expiresAt: th.expiresAt.toISOString(),
    timeLimitMin: th.timeLimitMin,
    startedAt: th.startedAt ? th.startedAt.toISOString() : null,
    submittedAt: th.submittedAt ? th.submittedAt.toISOString() : null,
    createdAt: th.createdAt.toISOString(),
    challengeId: th.challenge.id,
    challengeTitle: th.challenge.title,
    challengeDifficulty: th.challenge.difficulty,
    attemptId: th.attemptId,
    score: th.attempt?.score ?? null,
    attemptStartedAt: th.attempt?.startedAt ? th.attempt.startedAt.toISOString() : null,
    candidateId: th.candidate?.id ?? null,
    candidateStage: th.candidate?.stage ?? null,
  }));

  // Map workspace members
  const formattedMembers = workspace.members.map((m) => ({
    id: m.id,
    role: m.role,
    user: {
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    },
  }));

  // Map workspace interview sessions
  const formattedSessions = workspace.sessions.map((s) => ({
    id: s.id,
    title: s.title,
    candidateName: s.candidateName,
    candidateId: s.candidateId,
    type: s.type,
    status: s.status,
    verdict: s.verdict,
    shortCode: s.shortCode,
    shareToken: s.shareToken,
    totalSec: s.totalSec,
    startedAt: s.startedAt ? s.startedAt.toISOString() : null,
    finishedAt: s.finishedAt ? s.finishedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    interviewerName: s.user.name,
    interviewerEmail: s.user.email,
  }));

  // Map workspace candidates
  const formattedCandidates = workspace.candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    source: c.source,
    status: c.status,
    stage: c.stage,
    rejectReason: c.rejectReason,
    rejectReasonNote: c.rejectReasonNote,
    stageChangedAt: c.stageChangedAt ? c.stageChangedAt.toISOString() : null,
    tags: c.tags ? (JSON.parse(c.tags) as string[]) : [],
    takeHomeCount: c._count.takeHomes,
    sessionCount: c._count.sessions,
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }));

  // Bucket candidates for Pipeline view
  const buckets: Record<PipelineStage, typeof formattedCandidates> = {
    APPLIED: [],
    SCREENED: [],
    TAKE_HOME: [],
    ONSITE: [],
    OFFER: [],
    HIRED: [],
    REJECTED: [],
  };
  for (const c of formattedCandidates) {
    const s = (PIPELINE_STAGES as readonly string[]).includes(c.stage)
      ? (c.stage as PipelineStage)
      : "APPLIED";
    buckets[s].push(c);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-border pb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-500/80 flex items-center gap-1.5">
            <Building2 className="w-3 h-3" /> Workspace
          </div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight mt-1">{workspace.name}</h1>
          <p className="text-xs text-muted mt-1">Manage challenges, candidates, and your team.</p>
        </div>
        <div className="text-[11px] text-muted font-mono">
          <span className="text-muted/50">/</span>
          <span className="text-fg">{workspace.slug}</span>
        </div>
      </div>

      {/* Main Interactive Client Component */}
      <WorkspaceDashboardClient
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          planName: workspace.planName,
        }}
        challenges={workspace.challenges}
        pipelineChallenges={globalChallenges}
        takeHomes={formattedTakeHomes}
        members={formattedMembers}
        sessions={formattedSessions}
        candidates={formattedCandidates}
        initialBuckets={buckets as any}
        promptScenarios={promptScenarios}
        promptAttempts={formattedPromptAttempts}
      />
    </div>
  );
}
