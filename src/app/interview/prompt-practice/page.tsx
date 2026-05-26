import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import PromptPracticeClient from "./PromptPracticeClient";

export const metadata = {
  title: "AI Prompt Engineering Arena — Interviewpad",
  description: "Sharpen and evaluate your prompt engineering skills against industry-standard engineering scenarios graded by Gemini AI.",
};

export default async function PromptPracticePage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/interview/new", session);
  const userId = session?.user?.id || null;

  // Fetch all published built-in prompt scenarios + custom platform-wide scenarios
  const promptScenarios = await prisma.promptScenario.findMany({
    where: {
      published: true,
      workspaceId: null, // Limit practice arena to platform built-in library for standardized practice
    },
    orderBy: { estimatedMinutes: "asc" },
  });

  // Fetch previous attempts of the current developer for tracking progress
  const pastAttempts = userId
    ? await prisma.promptAttempt.findMany({
        where: { userId },
        include: {
          scenario: {
            select: {
              title: true,
              category: true,
              difficulty: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const formattedAttempts = pastAttempts.map((a) => ({
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
    scenarioTitle: a.scenario.title,
    scenarioCategory: a.scenario.category,
    scenarioDifficulty: a.scenario.difficulty,
  }));

  const formattedScenarios = promptScenarios.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    objective: s.objective,
    difficulty: s.difficulty,
    category: s.category,
    estimatedMinutes: s.estimatedMinutes,
  }));

  return (
    <PromptPracticeClient
      scenarios={formattedScenarios}
      initialAttempts={formattedAttempts}
      userId={userId}
    />
  );
}
