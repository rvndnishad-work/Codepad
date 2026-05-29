import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import PromptLabClient from "./PromptLabClient";

export const metadata = {
  title: "Prompt Lab — Interviewpad",
  description: "Practice prompt engineering against scoring scenarios, then experiment freely in the live playground.",
};

export default async function PromptLabPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/interview/new", session);
  const userId = session?.user?.id || null;

  // Fetch in parallel: scenarios + exemplars (all platform-wide) + the user's
  // attempts + the set of attemptIds they've already upvoted (for community
  // tab's initial state).
  const [scenarios, exemplars, attempts, upvoted] = await Promise.all([
    prisma.promptScenario.findMany({
      where: { published: true, workspaceId: null },
      orderBy: { estimatedMinutes: "asc" },
    }),
    prisma.promptExemplar.findMany({
      where: { scenario: { published: true, workspaceId: null } },
      orderBy: { createdAt: "asc" },
    }),
    userId
      ? prisma.promptAttempt.findMany({
          where: { userId },
          include: {
            scenario: { select: { id: true, title: true, category: true, difficulty: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    userId
      ? prisma.promptUpvote.findMany({
          where: { userId },
          select: { attemptId: true },
        })
      : Promise.resolve([] as { attemptId: string }[]),
  ]);

  return (
    <PromptLabClient
      userId={userId}
      scenarios={scenarios.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        objective: s.objective,
        difficulty: s.difficulty,
        category: s.category,
        estimatedMinutes: s.estimatedMinutes,
      }))}
      exemplars={exemplars.map((e) => ({
        id: e.id,
        scenarioId: e.scenarioId,
        title: e.title,
        summary: e.summary,
        promptText: e.promptText,
        rubricScores: e.rubricScores,
        source: e.source,
      }))}
      initialAttempts={attempts.map((a) => ({
        id: a.id,
        promptText: a.promptText,
        charCount: a.charCount,
        tokenEstimate: a.tokenEstimate,
        score: a.score,
        rubricScores: a.rubricScores,
        feedback: a.feedback,
        graderType: a.graderType,
        durationSec: a.durationSec,
        createdAt: a.createdAt.toISOString(),
        scenarioId: a.scenarioId,
        scenarioTitle: a.scenario.title,
        scenarioCategory: a.scenario.category,
        scenarioDifficulty: a.scenario.difficulty,
        shared: a.shared,
        shareTitle: a.shareTitle,
        shareNote: a.shareNote,
        shareUpvotes: a.shareUpvotes,
      }))}
      initialUpvotedIds={upvoted.map((u) => u.attemptId)}
    />
  );
}
