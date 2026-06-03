import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getInterviewArenaSettings } from "@/lib/settings";
import CandidateCockpitClient from "../../interview/CandidateCockpitClient";

export const metadata = {
  title: "Candidate Prep Arena — Interviewpad",
};

export default async function CandidateInterviewPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/candidate/interview")}`);
  }

  const userId = session.user.id;
  const arenaSettings = await getInterviewArenaSettings();

  // Retrieve all mock and practice interview sessions created by this user
  const myPracticeSessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      rubric: true,
    },
  });

  return (
    <div className="min-h-screen bg-bg text-fg py-10 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <CandidateCockpitClient
          userId={userId}
          userName={session.user?.name ?? null}
          arenaSettings={arenaSettings}
          myPracticeSessions={myPracticeSessions}
        />
      </div>
    </div>
  );
}
