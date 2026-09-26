"use client";

/**
 * Workspace home (/w/[slug]). Members and Billing used to be tabs here; they
 * now live at /w/[slug]/members and /w/[slug]/billing, and the old
 * ?section= URLs redirect from page.tsx.
 */
import { useRouter } from "next/navigation";
import WorkspaceOverview from "./WorkspaceOverview";
import type { PlanDisplay } from "@/lib/workspace/display";

type Challenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  template: string;
  published: boolean;
};

type TakeHome = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  token: string;
  status: string;
  expiresAt: string;
  timeLimitMin: number;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt?: string;
  challengeId?: string;
  challengeTitle: string;
  challengeDifficulty?: string;
  attemptId: string | null;
  score: number | null;
  attemptStartedAt?: string | null;
  candidateId?: string | null;
  candidateStage?: string | null;
};

type InterviewSessionItem = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateId: string | null;
  type: string;
  status: string;
  verdict: string | null;
  shortCode: string | null;
  shareToken: string;
  totalSec: number;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  interviewerName: string | null;
  interviewerEmail: string | null;
};

type CandidateItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  /** Pipeline stage (APPLIED … HIRED/REJECTED) — see src/lib/crm/stages.ts. */
  stage: string;
  stageChangedAt: string | null;
  tags: string[];
  takeHomeCount: number;
  sessionCount: number;
  updatedAt: string;
  createdAt: string;
};

type TakeHomeSession = {
  id: string;
  title: string;
  candidateName: string | null;
  candidateEmail: string | null;
  status: string;
  deadlineAt: string | null;
  candidateAccessToken: string | null;
  questionCount: number;
  createdAt: string;
  finishedAt: string | null;
  candidateId: string | null;
  candidateStage: string | null;
};

type AIInterviewSessionItem = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  status: string;
  score: number | null;
  candidateId: string | null;
  candidateStage: string | null;
  inviteToken: string;
  templateId: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Props = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    planName: string;
  };
  firstName: string | null;
  plan: PlanDisplay;
  seatLimit: number | null;
  challenges: Challenge[];
  takeHomes: TakeHome[];
  takeHomeSessions?: TakeHomeSession[];
  aiInterviewSessions?: AIInterviewSessionItem[];
  memberCount: number;
  pendingInviteCount: number;
  sessions: InterviewSessionItem[];
  candidates: CandidateItem[];
};

export default function WorkspaceDashboardClient({
  workspace,
  firstName,
  plan,
  seatLimit,
  challenges,
  takeHomes,
  takeHomeSessions = [],
  aiInterviewSessions = [],
  memberCount,
  pendingInviteCount,
  sessions,
  candidates,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <WorkspaceOverview
        slug={workspace.slug}
        firstName={firstName}
        plan={plan}
        seatLimit={seatLimit}
        setup={{
          assessments: challenges.length + takeHomes.length + takeHomeSessions.length + sessions.length,
          members: memberCount,
          pendingInvites: pendingInviteCount,
        }}
        candidates={candidates}
        sessions={sessions}
        takeHomes={takeHomes}
        takeHomeSessions={takeHomeSessions}
        aiInterviewSessions={aiInterviewSessions}
        onAddCandidate={() => router.push(`/w/${workspace.slug}/candidates?add=1`)}
        onBulkImport={() => router.push(`/w/${workspace.slug}/candidates?import=1`)}
        onSendTakeHome={() => router.push(`/w/${workspace.slug}/take-homes/new`)}
      />
    </div>
  );
}
