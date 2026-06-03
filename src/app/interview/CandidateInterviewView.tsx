import { prisma } from "@/lib/prisma";
import { getInterviewArenaSettings } from "@/lib/settings";
import CandidateCockpitClient from "./CandidateCockpitClient";

type Props = {
  userId: string;
  userName: string | null;
};

export default async function CandidateInterviewView({ userId, userName }: Props) {
  const arenaSettings = await getInterviewArenaSettings();

  // Practice sessions the candidate created themselves
  const myPracticeSessions = await prisma.interviewSession.findMany({
    where: { userId, type: "mock" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      rubric: true,
    }
  });

  return (
    <CandidateCockpitClient
      userId={userId}
      userName={userName}
      arenaSettings={arenaSettings}
      myPracticeSessions={myPracticeSessions}
    />
  );
}
