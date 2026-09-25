import { notFound, redirect } from "next/navigation";
import {
  LibraryError,
  loadChallengeCategories,
  loadPublicCategories,
  loadQuestionnaires,
  loadWorkspaceChallenges,
  resolveLibraryActor,
  searchPublicQuestions,
} from "@/lib/library/library-server";
import { prisma } from "@/lib/prisma";
import LibraryClient, { type LibraryTab } from "./LibraryClient";

/** Attempts on this workspace's scenarios, or inside its sessions (take-homes included), with who wrote them. */
async function loadPromptAttempts(workspaceId: string) {
  const sessions = await prisma.interviewSession.findMany({
    where: { workspaceId },
    select: { id: true, candidateName: true, candidate: { select: { name: true } } },
  });
  const attempts = await prisma.promptAttempt.findMany({
    where: { OR: [{ scenario: { workspaceId } }, { sessionId: { in: sessions.map((x) => x.id) } }] },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { scenario: { select: { title: true, category: true, difficulty: true } } },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(attempts.map((a) => a.userId).filter((x): x is string => !!x))] } },
    select: { id: true, name: true, email: true },
  });
  const bySession = new Map(sessions.map((x) => [x.id, x.candidate?.name ?? x.candidateName]));
  const byUser = new Map(users.map((u) => [u.id, u.name ?? u.email]));
  return attempts.map((a) => ({
    ...a,
    candidateName: (a.sessionId && bySession.get(a.sessionId)) || (a.userId && byUser.get(a.userId)) || null,
  }));
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; open?: string; tech?: string }>;
};

export const metadata = { title: "Question library — Interviewpad", robots: { index: false, follow: false } };

const TABS: LibraryTab[] = ["questionnaires", "public", "challenges", "prompts"];

export default async function QuestionLibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const actor = await resolveLibraryActor(slug).catch((err) => {
    if (err instanceof LibraryError && err.status === 401) redirect(`/login?next=/w/${slug}/library`);
    if (err instanceof LibraryError && err.status === 404) notFound();
    redirect("/dashboard");
  });

  const tab = TABS.includes(sp.tab as LibraryTab) ? (sp.tab as LibraryTab) : "questionnaires";
  const tech = sp.tech ?? null;
  const [questionnaires, bank, firstPage, challenges, challengeBank, promptScenarios, promptAttempts] = await Promise.all([
    loadQuestionnaires(actor.workspaceId),
    loadPublicCategories(),
    searchPublicQuestions({ tech }),
    loadWorkspaceChallenges(actor.workspaceId),
    loadChallengeCategories(actor.workspaceId),
    prisma.promptScenario.findMany({
      where: { OR: [{ workspaceId: actor.workspaceId }, { workspaceId: null }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        objective: true,
        expectedTraits: true,
        difficulty: true,
        category: true,
        estimatedMinutes: true,
        workspaceId: true,
        published: true,
      },
    }),
    loadPromptAttempts(actor.workspaceId),
  ]);

  return (
    <LibraryClient
      slug={slug}
      initialTab={tab}
      initialOpen={sp.open ?? null}
      canManage={actor.canManage}
      aiScreening={actor.aiScreening}
      questionnaires={questionnaires}
      categories={bank.categories}
      rounds={bank.rounds}
      bankTotal={bank.total}
      firstPage={{ ...firstPage, tech }}
      challenges={challenges}
      challengeCategories={challengeBank.categories}
      challengeTotal={challengeBank.total}
      workspaceId={actor.workspaceId}
      promptScenarios={promptScenarios}
      promptAttempts={promptAttempts.map((a) => ({
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
        candidateName: a.candidateName,
      }))}
    />
  );
}
