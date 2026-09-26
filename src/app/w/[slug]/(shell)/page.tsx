import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { validatePageAccess } from "@/lib/settings";
import WorkspaceDashboardClient from "./WorkspaceDashboardClient";
import { effectivePlan } from "@/lib/billing/trial";
import { planDisplay } from "@/lib/workspace/display";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** The old Candidates tab (table, board, leaderboard) lived at ?section=candidates. */
function legacyCandidatesUrl(slug: string, sp: Record<string, string | string[] | undefined>): string {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const view = one("view");
  if (view === "leaderboard") return `/w/${slug}/batches`;
  const q = new URLSearchParams();
  const stage = one("stage");
  if (stage) q.set("stage", stage);
  if (one("q")) q.set("q", one("q")!);
  if (view === "pipeline" || view === "board") q.set("view", "board");
  const qs = q.toString();
  return `/w/${slug}/candidates${qs ? `?${qs}` : ""}`;
}

/** The old Assessments section: live interviews, take-homes, prompt tasks and replays. */
function legacyAssessmentsUrl(slug: string, view: string | string[] | undefined): string {
  if (view === "interviews") return `/w/${slug}/interviews`;
  if (view === "attempts" || view === "scenarios") return `/w/${slug}/library?tab=prompts`;
  if (view === "replays") return `/w/${slug}/take-homes/all?filter=submitted`;
  return `/w/${slug}/take-homes`;
}

/** The old Billing tab, plus Stripe return URLs created before the move. */
function legacyBillingUrl(slug: string, sp: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const k of ["billing_success", "billing_cancel", "session_id"]) {
    const v = sp[k];
    if (typeof v === "string") q.set(k, v);
  }
  const qs = q.toString();
  return `/w/${slug}/billing${qs ? `?${qs}` : ""}`;
}

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

export default async function WorkspaceDashboardPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  if (sp.section === "candidates") redirect(legacyCandidatesUrl(slug, sp));
  if (sp.section === "library") redirect(`/w/${slug}/library`);
  // The Integrations tab only repeated the ATS form; ATS sync is its home.
  if (sp.section === "integrations") redirect(`/w/${slug}/ats`);
  if (sp.section === "assessments") redirect(legacyAssessmentsUrl(slug, sp.view));
  // Members and Billing moved to their own routes.
  if (sp.section === "members") redirect(`/w/${slug}/members`);
  if (sp.section === "billing" || sp.billing_success || sp.billing_cancel) redirect(legacyBillingUrl(slug, sp));

  // Gate workspace access based on admin visibility settings
  const session = await auth().catch(() => null);
  await validatePageAccess("/w", session);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      _count: { select: { members: true } },
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
        // Take-home sessions (IP-88) are also InterviewSession rows; exclude
        // them here so they don't show up under Interviews / Replays / counts.
        where: { type: { not: "take-home" } },
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
          scheduledAt: true,
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

  const pendingInviteCount = await prisma.workspaceInvite.count({
    where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } },
  });

  const [takeHomeSessionRows, aiInterviewRows] = await Promise.all([
    // Session-backed take-homes (IP-88/89) — the new multi-question model.
    prisma.interviewSession.findMany({
      where: { workspaceId: workspace.id, type: "take-home" },
      select: {
        id: true,
        title: true,
        candidateName: true,
        status: true,
        deadlineAt: true,
        candidateAccessToken: true,
        createdAt: true,
        finishedAt: true,
        challengeIds: true,
        playgroundIds: true,
        promptScenarioIds: true,
        candidate: { select: { id: true, email: true, stage: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // AI Screening sessions — previously unqueried, hence invisible on Overview
    prisma.aIInterviewSession.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        candidateName: true,
        candidateEmail: true,
        positionTitle: true,
        status: true,
        score: true,
        candidateId: true,
        inviteToken: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        templateId: true,
        candidate: { select: { stage: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const countIds = (raw: string | null | undefined): number => {
    try { const a = JSON.parse(raw ?? "[]"); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
  };
  const takeHomeSessions = takeHomeSessionRows.map((s) => ({
    id: s.id,
    title: s.title,
    candidateName: s.candidateName,
    candidateEmail: s.candidate?.email ?? null,
    status: s.status,
    deadlineAt: s.deadlineAt ? s.deadlineAt.toISOString() : null,
    candidateAccessToken: s.candidateAccessToken,
    questionCount: countIds(s.challengeIds) + countIds(s.playgroundIds) + countIds(s.promptScenarioIds),
    createdAt: s.createdAt.toISOString(),
    finishedAt: s.finishedAt ? s.finishedAt.toISOString() : null,
    candidateId: s.candidate?.id ?? null,
    candidateStage: s.candidate?.stage ?? null,
  }));

  const aiInterviewSessions = aiInterviewRows.map((s) => ({
    id: s.id,
    candidateName: s.candidateName,
    candidateEmail: s.candidateEmail,
    positionTitle: s.positionTitle,
    status: s.status,
    score: s.score ?? null,
    candidateId: s.candidateId ?? null,
    candidateStage: s.candidate?.stage ?? null,
    inviteToken: s.inviteToken,
    templateId: s.templateId,
    createdAt: s.createdAt.toISOString(),
    startedAt: s.startedAt ? s.startedAt.toISOString() : null,
    finishedAt: s.finishedAt ? s.finishedAt.toISOString() : null,
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
    scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
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

  const planFields = {
    planName: workspace.planName,
    trialEndsAt: workspace.trialEndsAt,
    stripeSubscriptionId: workspace.stripeSubscriptionId,
  };
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Main Interactive Client Component */}
      <WorkspaceDashboardClient
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          planName: workspace.planName,
        }}
        firstName={firstName}
        plan={planDisplay(planFields)}
        seatLimit={effectivePlan(planFields).seatLimit}
        challenges={workspace.challenges}
        takeHomes={formattedTakeHomes}
        takeHomeSessions={takeHomeSessions}
        aiInterviewSessions={aiInterviewSessions}
        memberCount={workspace._count.members}
        sessions={formattedSessions}
        candidates={formattedCandidates}
        pendingInviteCount={pendingInviteCount}
      />
    </div>
  );
}
