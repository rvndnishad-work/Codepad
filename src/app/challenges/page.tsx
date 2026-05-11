import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChallengeList, { type ChallengeListItem } from "./ChallengeList";

export const metadata = {
  title: "Challenges — Interviewpad",
  description:
    "Practice coding challenges with hidden tests. Sharpen your interview skills.",
};

export default async function ChallengesPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  const rows = await prisma.challenge.findMany({
    where: { published: true },
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      tags: true,
      category: true,
      estimatedMinutes: true,
    },
  });

  // Fetch user's attempts (best status per challenge) so we can show
  // "Passed" / "Attempted" badges on the list.
  let attemptsByChallenge: Record<string, "passed" | "failed" | "in_progress"> = {};
  if (userId) {
    const attempts = await prisma.challengeAttempt.findMany({
      where: { userId },
      select: { challengeId: true, status: true },
    });
    for (const a of attempts) {
      const status = a.status as "passed" | "failed" | "in_progress" | "abandoned";
      if (status === "abandoned") continue;
      const prev = attemptsByChallenge[a.challengeId];
      // passed > failed > in_progress
      if (status === "passed" || !prev || (status === "failed" && prev === "in_progress")) {
        attemptsByChallenge[a.challengeId] = status;
      }
    }
  }

  const items: ChallengeListItem[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    tags: parseTags(c.tags),
    category: c.category,
    estimatedMinutes: c.estimatedMinutes,
    userStatus: attemptsByChallenge[c.id] ?? null,
  }));

  return <ChallengeList items={items} signedIn={!!userId} />;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}
