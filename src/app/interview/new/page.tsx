import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InterviewBuilder, {
  type ChallengeOption,
  type PlaygroundOption,
} from "./InterviewBuilder";

import { validatePageAccess, getInterviewArenaSettings } from "@/lib/settings";
import { templates } from "@/lib/templates";
import { classifyChallenge, classifyTemplate } from "@/lib/interview/stack";

/** Safe JSON.parse to string[] (Challenge.tags / step.languagesJson). */
function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const metadata = {
  title: "New Interview Session — Interviewpad",
};

export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; type?: string; workspaceSlug?: string }>;
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

  // When launched from a workspace's assessments tab, surface that workspace's
  // own challenges + prompt scenarios on top of the global bank. Verify the
  // user is actually a member first — never leak another workspace's private
  // question bank.
  let activeWorkspaceId: string | null = null;
  if (sp.workspaceSlug) {
    const ws = await prisma.workspace.findUnique({
      where: { slug: sp.workspaceSlug },
      select: { id: true, members: { where: { userId: session.user.id }, select: { id: true }, take: 1 } },
    });
    if (ws && ws.members.length > 0) activeWorkspaceId = ws.id;
  }

  const [wsChallengeRows, globalChallengeRows, snippetRows, wsPromptRows, globalPromptRows] =
    await Promise.all([
      activeWorkspaceId
        ? prisma.challenge.findMany({
            where: { workspaceId: activeWorkspaceId },
            orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
            select: {
              id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true, tags: true,
              steps: { select: { judgingMode: true, languagesJson: true }, orderBy: { position: "asc" }, take: 1 },
            },
          })
        : Promise.resolve([]),
      prisma.challenge.findMany({
        where: { published: true, workspaceId: null },
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        select: {
          id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true, tags: true,
          steps: { select: { judgingMode: true, languagesJson: true }, orderBy: { position: "asc" }, take: 1 },
        },
      }),
      prisma.snippet.findMany({
        where: { userId: session.user.id },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        select: { id: true, slug: true, title: true, template: true, updatedAt: true },
      }),
      activeWorkspaceId
        ? prisma.promptScenario.findMany({
            where: { workspaceId: activeWorkspaceId },
            orderBy: { createdAt: "asc" },
            select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true, objective: true },
          })
        : Promise.resolve([]),
      prisma.promptScenario.findMany({
        where: { published: true, workspaceId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true, objective: true },
      }),
    ]);

  // Workspace-owned first, then the global bank (de-duped by id in case a
  // workspace challenge is also somehow published globally).
  const seenChallenge = new Set<string>();
  const challengeRows = [
    ...wsChallengeRows.map((c) => ({ ...c, workspaceOwned: true })),
    ...globalChallengeRows.map((c) => ({ ...c, workspaceOwned: false })),
  ].filter((c) => (seenChallenge.has(c.id) ? false : (seenChallenge.add(c.id), true)));

  const promptScenarioRows = [
    ...wsPromptRows.map((p) => ({ ...p, workspaceOwned: true })),
    ...globalPromptRows.map((p) => ({ ...p, workspaceOwned: false })),
  ];

  const challenges: ChallengeOption[] = challengeRows.map((c) => {
    const step = c.steps?.[0];
    const meta = classifyChallenge({
      judgingMode: step?.judgingMode,
      languages: parseStringArray(step?.languagesJson),
      tags: parseStringArray(c.tags),
      category: c.category,
    });
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      difficulty: c.difficulty as "easy" | "medium" | "hard",
      estimatedMinutes: c.estimatedMinutes,
      category: c.category,
      workspaceOwned: c.workspaceOwned,
      paradigm: meta.paradigm,
      languages: meta.languages,
      frameworks: meta.frameworks,
    };
  });

  const playgrounds: PlaygroundOption[] = [
    ...templates.map((t) => {
      const meta = classifyTemplate(t.id);
      return {
        id: `template:${t.id}`,
        slug: t.id,
        title: t.title,
        template: t.id,
        updatedAt: new Date().toISOString(),
        isTemplate: true,
        paradigm: meta.paradigm,
        languages: meta.languages,
        frameworks: meta.frameworks,
      };
    }),
    ...snippetRows.map((s) => {
      const meta = classifyTemplate(s.template);
      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        template: s.template,
        updatedAt: s.updatedAt.toISOString(),
        isTemplate: false,
        paradigm: meta.paradigm,
        languages: meta.languages,
        frameworks: meta.frameworks,
      };
    }),
  ];

  const promptScenarios = promptScenarioRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty as "beginner" | "intermediate" | "advanced",
    estimatedMinutes: p.estimatedMinutes,
    category: p.category,
    objective: p.objective,
    workspaceOwned: p.workspaceOwned,
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
