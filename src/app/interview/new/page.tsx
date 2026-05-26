import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InterviewBuilder, {
  type ChallengeOption,
  type PlaygroundOption,
} from "./InterviewBuilder";

import { validatePageAccess, getInterviewArenaSettings } from "@/lib/settings";
import { templates } from "@/lib/templates";

export const metadata = {
  title: "New Interview Session — Interviewpad",
};

export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; type?: string }>;
}) {
  const session = await auth().catch(() => null);
  await validatePageAccess("/interview/new", session);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/interview/new")}`);
  }

  const sp = searchParams ? await searchParams : {};
  const queryRole = sp.role ?? null;
  const dbUserType = (session.user as { userType?: string | null } | undefined)?.userType ?? null;
  const userType = queryRole === "candidate" ? "candidate" : dbUserType;
  const arenaSettings = await getInterviewArenaSettings();

  const [challengeRows, snippetRows, promptScenarioRows] = await Promise.all([
    prisma.challenge.findMany({
      where: { published: true },
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        estimatedMinutes: true,
        category: true,
      },
    }),
    prisma.snippet.findMany({
      where: { userId: session.user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        template: true,
        updatedAt: true,
      },
    }),
    prisma.promptScenario.findMany({
      where: { published: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        estimatedMinutes: true,
        category: true,
        objective: true,
      },
    }),
  ]);

  const challenges: ChallengeOption[] = challengeRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    estimatedMinutes: c.estimatedMinutes,
    category: c.category,
  }));

  const playgrounds: PlaygroundOption[] = [
    ...templates.map((t) => ({
      id: `template:${t.id}`,
      slug: t.id,
      title: t.title,
      template: t.id,
      updatedAt: new Date().toISOString(),
      isTemplate: true,
    })),
    ...snippetRows.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      template: s.template,
      updatedAt: s.updatedAt.toISOString(),
      isTemplate: false,
    })),
  ];

  const promptScenarios = promptScenarioRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty as "beginner" | "intermediate" | "advanced",
    estimatedMinutes: p.estimatedMinutes,
    category: p.category,
    objective: p.objective,
  }));

  return (
    <InterviewBuilder
      challenges={challenges}
      playgrounds={playgrounds}
      promptScenarios={promptScenarios}
      userType={userType}
      arenaSettings={arenaSettings}
    />
  );
}
