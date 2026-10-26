import FeaturePaused from "@/components/FeaturePaused";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getInterviewArenaSettings, validatePageAccess } from "@/lib/settings";
import CandidateCockpitClient from "../../interview/CandidateCockpitClient";
import { loadAiPracticeRuns } from "@/lib/mock-interview/server";

export const metadata = {
  title: "Candidate Prep Arena",
};

export default async function CandidateInterviewPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/interview", session);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/candidate/interview")}`);
  }

  const userId = session.user.id;
  const arenaSettings = await getInterviewArenaSettings();

  // Retrieve all mock and practice interview sessions created by this user
  const [myPracticeSessions, aiRuns] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        rubric: true,
      },
    }),
    // AI practice runs are AI interviews, not rooms: listed alongside them.
    loadAiPracticeRuns(session.user?.email),
  ]);

  return (
    <div className="min-h-screen bg-[var(--wow-bg)] text-[var(--wow-fg)] transition-colors">
      <FeaturePaused featureKey="mock-interviews" wrapperClassName="mx-auto w-full max-w-6xl px-4 pt-4" />
      <CandidateCockpitClient
        userId={userId}
        userName={session.user?.name ?? null}
        arenaSettings={arenaSettings}
        myPracticeSessions={myPracticeSessions}
        aiRuns={aiRuns}
      />
    </div>
  );
}
